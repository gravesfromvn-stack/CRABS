import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {getChatGPTUser} from '../../chatgpt-auth';
import {sameOrigin} from '../../../lib/validation';
import {OTA_MAILBOX,channels,properties,hash} from '../../../lib/ota';
import {threadState,prepareDraft,refreshDrafts,type OtaEvent} from '../../../lib/ota-store';
import {activeTemplates,templateVersion} from '../../../lib/ota-template-store';
import {planReply,nextStep,draftSource,sourceLabels,situationLabels} from '../../../lib/ota-templates';
import {guestDraftProblems,constraintsOf,tourKnowledgeForAI,tourEvidenceNote,type DraftProblem} from '../../../lib/tour-advice';
import {threadStay} from '../../../lib/ota-stay';
import {rewriteReply} from '../../../lib/ota-rewrite';
import {hotelKnowledge} from '../../../lib/luxe-knowledge';
import {policyFor} from '../../../lib/hotel-policy-config';
import {catalogApprovedAmounts,catalogPolicy,preferredFor} from '../../../lib/service-catalog';
import {guestContact} from '../../../lib/guest-contact';
import {whatsappTourMessage} from '../../../lib/service-replies';
import {simulateConversation} from '../../../lib/conversation-sim';
export const dynamic='force-dynamic';
const res=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
const mutations=z.discriminatedUnion('action',[
 z.object({action:z.literal('connect')}),
 z.object({action:z.literal('resolve'),eventId:z.string().min(1).max(100),propertyId:z.string().refine(v=>properties.some(p=>p.id===v)),channel:z.enum(channels),bookingId:z.string().trim().regex(/^[A-Za-z0-9-]{5,40}$/),guestText:z.string().trim().min(2).max(12000),confirmed:z.literal(true)}),
 z.object({action:z.literal('save'),id:z.string().min(1).max(100),revision:z.number().int().nonnegative(),contextKey:z.string().length(64),body:z.string().trim().min(1).max(6000),operationId:z.string().uuid(),cuaAmounts:z.array(z.number().int().min(1).max(1000000000)).max(40).optional()}),
 z.object({action:z.literal('rewrite'),id:z.string().min(1).max(100),revision:z.number().int().nonnegative(),contextKey:z.string().length(64),body:z.string().trim().max(6000),intent:z.string().trim().min(3).max(2000),operationId:z.string().uuid()}),
 z.object({action:z.literal('suggest'),id:z.string().min(1).max(100),revision:z.number().int().nonnegative(),contextKey:z.string().length(64),operationId:z.string().uuid()}),
 z.object({action:z.literal('approve'),id:z.string().min(1).max(100),revision:z.number().int().positive(),contextKey:z.string().length(64)}),
 z.object({action:z.literal('autodraft'),id:z.string().min(1).max(100).optional()}),
 z.object({action:z.literal('sent'),id:z.string().min(1).max(100),revision:z.number().int().positive(),contextKey:z.string().length(64),body:z.string().trim().min(1).max(6000),operationId:z.string().uuid(),confirmed:z.literal(true)})
]);
type State=NonNullable<Awaited<ReturnType<typeof threadState>>>;
// Same checks as automatic drafts, for any guest-facing text in this conversation.
// Amounts Cua computed in the CRM (e.g. a direct extension rate) are recorded in the draft notes and allowed.
const cuaAmountsMark=(a:number[])=>a.length?`[Giá Cua tính: ${a.join(',')}]\n`:'';
const cuaAmountsIn=(notes='')=>(notes.match(/\[Giá Cua tính: ([\d,]+)\]/)?.[1]||'').split(',').filter(Boolean).map(Number);
function draftChecks(s:State,body:string,notes=''):DraftProblem[]{const c=constraintsOf(s.events.filter(e=>e.kind==='guest').map(e=>e.guest_text).join('\n'));return guestDraftProblems(body,{facts:s.profile.facts,advice:s.tour,known:{date:!!c.date,party:!!c.party},allowedAmounts:[...catalogApprovedAmounts(s.catalog,s.thread.property_id),...cuaAmountsIn(notes)]});}
const attentionOf=(p:DraftProblem[])=>p.map(x=>'Kiểm tra nháp: '+x.text).join('\n');
// Room/stay requests: status comes only from staff-recorded operations tasks, never from inference.
const roomStatus:Record<string,string>={unchecked:'Khách yêu cầu · chưa kiểm tra',waiting:'Đang kiểm tra',confirmed:'Khách sạn xác nhận đáp ứng',unavailable:'Không đáp ứng được'};
async function roomTasks(db:D1Database,owner:string,id:string){try{const rows=await db.prepare("SELECT payload FROM ops_tasks WHERE owner=? AND source_kind='ota' AND source_id=?").bind(owner,id).all<{payload:string}>();return rows.results.map(r=>JSON.parse(r.payload) as {kind:string;title:string;supplierStatus:string;supplierEvidence:string}).filter(t=>t.kind==='room'||t.kind==='stay').map(t=>({title:t.title,status:roomStatus[t.supplierStatus]||t.supplierStatus,evidence:t.supplierEvidence}));}catch{return [];}}
// What the guest needs, what the system prepared and from which source, and what Cua must do next.
async function guidance(db:D1Database,owner:string,s:State){
 const plan=planReply(s,await activeTemplates(db,owner)),latest=s.drafts[0];
 const used=latest?.template_id?await templateVersion(db,owner,latest.template_id,latest.template_version):null;
 const guest=s.events.filter(e=>e.kind==='guest'&&e.guest_text).at(-1),answered=Boolean(guest&&s.sent.some(x=>x.created>=guest.received));
 const checks=latest?.body?draftChecks(s,latest.body,latest.notes):[];
 // Stay extension asked in unanswered messages: nights, current check-out and party for the calculator.
 const lastSentAt=s.sent.map(x=>x.created).sort().at(-1)||'';
 const extText=s.events.filter(e=>e.kind==='guest'&&e.guest_text&&e.received>lastSentAt).map(e=>e.guest_text).join(' ').toLowerCase();
 const words:Record<string,number>={one:1,two:2,three:3,four:4,five:5,six:6,seven:7};
 const extMatch=extText.match(/(?:extend(?:ed|ing)?[^.?!]{0,40}?|another|more|extra|thêm)\s*(\d+|one|two|three|four|five|six|seven)\s*(?:more |extra )?(?:days?|nights?|đêm|ngày)/);
 const fullText=s.events.at(-1)?.full_text||'';
 const extension=/extend|another \d+ (?:days?|nights?)|extra nights?|stay longer|gia hạn|ở thêm/.test(extText)&&s.stay.checkOut?{nights:extMatch?(words[extMatch[1]]??Number(extMatch[1])):1,checkOut:s.stay.checkOut,guests:Number(fullText.match(/Total guests:\s*(\d+)/)?.[1]||0),rooms:Number(fullText.match(/Total rooms:\s*(\d+)/)?.[1]||0)}:null;
 // Guest's own WhatsApp/phone (if written in their messages) and the configured hotel terms for the panel.
 const contact=guestContact(s.events.filter(e=>e.kind==='guest').map(e=>e.guest_text||''));
 // Ready-to-send WhatsApp text for tour follow-up: programme and classes first, no price.
 const lastGuest=s.events.filter(e=>e.kind==='guest'&&e.guest_text).at(-1);
 const whatsappMessage=s.tour.status==='interested'||contact?whatsappTourMessage(s.tour,lastGuest?.guest_name||'',/[ăâđêôơư]/i.test(lastGuest?.guest_text||'')):'';
 const preferred=preferredFor(s.catalog,s.tour.destinations.map(d=>d.label.vi));
 return {contact,whatsappMessage,extension,preferred,policy:catalogPolicy(policyFor(s.thread.property_id),s.catalog,s.thread.property_id)||null,tour:s.tour,checks,roomTasks:await roomTasks(db,owner,s.thread.id),history:s.profile.history||[],plan:{situations:plan.situations.map(x=>({code:x,label:situationLabels[x]})),reasons:plan.reasons,template:plan.template?{id:plan.template.id,version:plan.template.version,title:plan.template.title}:null},prepared:latest?{revision:latest.revision,source:draftSource(latest),label:sourceLabels[draftSource(latest)],template:used?{id:used.id,version:used.version,title:used.title,approvedAt:used.approved_at,retired:Boolean(used.retired_at)}:null}:null,next:nextStep(latest,plan,answered)};
}
export async function GET(request:Request){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);
 try{
 const db=env.DB!,q=new URL(request.url).searchParams,id=q.get('id');
 if(id){if(id.startsWith('event:')){const e=await db.prepare('SELECT * FROM ota_events WHERE owner=? AND id=?').bind(u.userId,id.slice(6)).first<OtaEvent>();if(!e)return res({error:'Không tìm thấy email.'},404);const {owner:_,...event}=e;return res({event});}const s=await threadState(db,u.userId,id,(env as unknown as Record<string,string>).OPENAI_API_KEY);if(!s)return res({error:'Không tìm thấy hội thoại.'},404);if(q.get('simulate')==='1')return res({simulation:simulateConversation({catalog:s.catalog,thread:s.thread,events:s.events,stay:s.stay,templates:await activeTemplates(db,u.userId)})});const {catalog:_c,...state}=s;return res({...state,...await guidance(db,u.userId,s)});}
 const account=await db.prepare('SELECT mailbox,created,last_received FROM ota_mailbox WHERE owner=?').bind(u.userId).first();
 const counts=await db.prepare('SELECT status,COUNT(*) AS count FROM ota_events WHERE owner=? GROUP BY status').bind(u.userId).all();
 const queue=q.get('queue')||'review',offset=Math.max(0,Math.min(100000,Number(q.get('offset'))||0)),search=(q.get('search')||'').slice(0,100),property=q.get('property')||'',channel=q.get('channel')||'';
 let items;
 if(['needs_match','missing_content','system'].includes(queue)){
  items=await db.prepare('SELECT id,subject AS title,channel,booking_id,property_id,property_label,guest_name,received,status,reason,guest_text AS preview FROM ota_events WHERE owner=? AND status=? AND (?=\'\' OR property_id=?) AND (?=\'\' OR channel=?) AND (subject LIKE ? OR booking_id LIKE ? OR guest_name LIKE ?) ORDER BY received DESC,id LIMIT 101 OFFSET ?').bind(u.userId,queue,property,property,channel,channel,'%'+search+'%','%'+search+'%','%'+search+'%',offset).all();
  items.results=items.results.map(x=>({...x,id:'event:'+x.id}));
 }else{
  const status=queue==='sent'?'sent':queue==='approved'?'approved':'';
  items=await db.prepare('SELECT t.id,t.channel,t.booking_id,t.property_id,MAX(e.received) AS received,MAX(e.guest_name) AS guest_name,COUNT(e.id) AS message_count,d.status,d.revision,d.source,d.attention,d.body AS preview FROM ota_threads t JOIN ota_events e ON e.owner=t.owner AND e.thread_id=t.id LEFT JOIN ota_drafts d ON d.owner=t.owner AND d.thread_id=t.id AND d.revision=(SELECT MAX(x.revision) FROM ota_drafts x WHERE x.owner=t.owner AND x.thread_id=t.id) WHERE t.owner=? AND (?=\'\' OR t.property_id=?) AND (?=\'\' OR t.channel=?) AND (?=\'\' OR d.status=?) AND (?!=\'review\' OR d.status IS NULL OR d.status=\'needs_writing\' OR (d.status=\'pending\' AND NOT (d.source=\'template\' AND d.attention=\'\'))) AND (?!=\'template\' OR (d.status=\'pending\' AND d.source=\'template\' AND d.attention=\'\')) AND (t.booking_id LIKE ? OR e.guest_name LIKE ?) GROUP BY t.id ORDER BY received DESC,t.id LIMIT 101 OFFSET ?').bind(u.userId,property,property,channel,channel,status,status,queue,queue,'%'+search+'%','%'+search+'%',offset).all();
 }
 // Bounded pages share one source read; do not persist guessed stay dates.
 const ids=items.results.slice(0,100).map(x=>String(x.id)),eventQueue=ids[0]?.startsWith('event:');
 if(ids.length){const records:OtaEvent[]=[];for(let start=0;start<ids.length;start+=90){const batch=ids.slice(start,start+90);const rows=await db.prepare(`SELECT id,thread_id,full_text,guest_text,channel,authenticated,booking_id,received FROM ota_events WHERE owner=? AND ${eventQueue?'id':'thread_id'} IN (${batch.map(()=>'?').join(',')}) ORDER BY received,id`).bind(u.userId,...batch.map(x=>eventQueue?x.slice(6):x)).all<OtaEvent>();records.push(...rows.results);}items.results=items.results.map(x=>({...x,stay:threadStay(records.filter(e=>eventQueue?'event:'+e.id===x.id:e.thread_id===x.id))}));}
 // 'template' = clean suggestion from an approved template; everything else unapproved needs Cua.
 const draftCounts=await db.prepare("SELECT CASE WHEN d.status='pending' AND d.source='template' AND d.attention='' THEN 'template' WHEN d.status IN ('pending','needs_writing') THEN 'review' ELSE d.status END AS status,COUNT(*) AS count FROM ota_drafts d WHERE d.owner=? AND d.revision=(SELECT MAX(x.revision) FROM ota_drafts x WHERE x.owner=d.owner AND x.thread_id=d.thread_id) GROUP BY 1").bind(u.userId).all();
 return res({livePollingConfigured:(env as unknown as Record<string,string>).CRABS_POLLING_ENABLED==='true',account,mailbox:OTA_MAILBOX,properties,counts:counts.results,draftCounts:draftCounts.results,items:items.results.slice(0,100),hasMore:items.results.length>100,offset,configured:Boolean((env as unknown as Record<string,string>).CRABS_INGEST_TOKEN)});
 }catch{console.error('OTA read failed');return res({error:'Chưa đọc được hộp thư OTA.'},500);}
}
export async function POST(request:Request){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);if(!sameOrigin(request))return res({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let v;try{const raw=await request.text();if(raw.length>50000)return res({error:'Nội dung quá dài.'},413);v=mutations.parse(JSON.parse(raw));}catch{return res({error:'Kiểm tra nội dung và các mục xác nhận.'},400);}
 const db=env.DB!,owner=u.userId,now=new Date().toISOString();
 try{
 if(v.action==='connect'){
  const existing=await db.prepare('SELECT owner FROM ota_mailbox WHERE mailbox=?').bind(OTA_MAILBOX).first<{owner:string}>();if(existing&&existing.owner!==owner)return res({error:'Hộp thư đã thuộc không gian khác.'},409);
  await db.prepare('INSERT OR IGNORE INTO ota_mailbox (mailbox,owner,created,last_received) VALUES (?,?,?,?)').bind(OTA_MAILBOX,owner,now,'').run();return res({ok:true});
 }
 if(v.action==='autodraft'){
  // Explicit re-run: only automatic drafts for the current context can be replaced; reruns are no-ops.
  const summary=await refreshDrafts(db,owner,v.id?[v.id]:undefined);return res({ok:true,summary});
 }
 if(v.action==='resolve'){
  const e=await db.prepare('SELECT * FROM ota_events WHERE owner=? AND id=?').bind(owner,v.eventId).first<OtaEvent>();if(!e)return res({error:'Không tìm thấy email.'},404);if(e.thread_id)return res({error:'Thư đã được ghép. Tải lại để tránh ghép hai lần.'},409);
  const tid='ota-'+(await hash([v.propertyId,v.channel,v.bookingId].join('|'))).slice(0,32);
  const results=await db.batch([db.prepare('INSERT OR IGNORE INTO ota_threads (owner,id,property_id,channel,booking_id,created) VALUES (?,?,?,?,?,?)').bind(owner,tid,v.propertyId,v.channel,v.bookingId,now),db.prepare('UPDATE ota_events SET property_id=?,channel=?,booking_id=?,guest_text=?,kind=\'guest\',status=\'ready\',thread_id=?,resolved_by=?,reason=\'Cua đã đối chiếu nguồn và xác nhận ghép.\' WHERE owner=? AND id=? AND thread_id=\'\'').bind(v.propertyId,v.channel,v.bookingId,v.guestText,tid,owner,owner,v.eventId)]);
  if(!results[1].meta.changes)return res({error:'Thư vừa được ghép ở nơi khác. Tải lại.'},409);await prepareDraft(db,owner,tid);return res({ok:true,id:tid});
 }
 if(v.action==='save'||v.action==='sent'){
  const prior=v.action==='save'?await db.prepare('SELECT thread_id,body FROM ota_drafts WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{thread_id:string;body:string}>():await db.prepare('SELECT thread_id,body FROM ota_sent WHERE owner=? AND id=?').bind(owner,v.operationId).first<{thread_id:string;body:string}>();
  if(prior)return prior.thread_id===v.id&&prior.body===v.body?res({ok:true,duplicate:true}):res({error:'Mã thao tác đã dùng cho nội dung khác.'},409);
 }
 const s=await threadState(db,owner,v.id);if(!s)return res({error:'Không tìm thấy hội thoại.'},404);const latest=s.drafts[0];const sourceNotes=(latest?.notes||'').split('\nNguồn và lưu ý trước đó:\n').at(-1)||'';
 if(v.action==='rewrite'||v.action==='suggest'){
  const prior=await db.prepare('SELECT thread_id,notes FROM ota_drafts WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{thread_id:string;notes:string}>();
  if(prior)return prior.thread_id===v.id?res({ok:true,duplicate:true}):res({error:'Mã thao tác đã dùng.'},409);
 }
 if(v.contextKey!==s.contextKey||(latest?.revision||0)!==v.revision)return res({error:'Hội thoại hoặc bản nháp đã đổi. Tải lại và rà lại trước khi tiếp tục.'},409);
 const guard='(SELECT COUNT(*) FROM ota_events WHERE owner=? AND thread_id=?)=? AND (SELECT COUNT(*) FROM ota_sent WHERE owner=? AND thread_id=?)=? AND COALESCE((SELECT MAX(revision) FROM ota_drafts WHERE owner=? AND thread_id=?),0)=?';
 const args=[owner,v.id,s.events.length,owner,v.id,s.sent.length,owner,v.id,v.revision];
 if(v.action==='suggest'){
  const proposal=s.profile.proposedReply;if(!proposal)return res({error:'Chưa có đề xuất AI cho dữ kiện hiện tại. Cua có thể dùng Sửa hoặc tải lại.'},409);
  const evidence=tourEvidenceNote(s.tour),notes='AI · Nháp theo hồ sơ nhu cầu. '+proposal.review.join(' · ')+(evidence?'\n'+evidence:'')+'\nNguồn và lưu ý trước đó:\n'+sourceNotes.slice(0,8000);
  const saved=await db.prepare("INSERT OR IGNORE INTO ota_drafts (owner,thread_id,revision,operation_id,context_key,body,notes,status,created,source,attention) SELECT ?,?,?,?,?,?,?,'pending',?,'ai',? WHERE "+guard+' RETURNING revision').bind(owner,v.id,v.revision+1,v.operationId,s.contextKey,proposal.body,notes,now,attentionOf(draftChecks(s,proposal.body)),...args).first();
  return saved?res({ok:true}):res({error:'Có thay đổi đồng thời. Tải lại trước khi tạo nháp.'},409);
 }

 if(v.action==='rewrite'){
  if(s.events.length>80||JSON.stringify(s.events.map(e=>e.guest_text)).length>60000)return res({error:'Hội thoại quá dài để viết lại trong một lượt. Cua có thể sửa trực tiếp và lưu nháp.'},422);
  const recent=await db.prepare("SELECT COUNT(*) AS n FROM ota_drafts WHERE owner=? AND notes LIKE 'AI · %' AND created>?").bind(owner,new Date(Date.now()-60000).toISOString()).first<{n:number}>();
  if((recent?.n||0)>=5)return res({error:'Đã tạo 5 bản AI trong phút này. Cua đợi một chút rồi thử tiếp nhé.'},429);
  const key=(env as unknown as Record<string,string>).OPENAI_API_KEY;
  const result=await rewriteReply(key,{property:properties.find(p=>p.id===s.thread.property_id)?.name,bookingId:s.thread.booking_id,stay:s.stay,guestProfile:s.profile,conversation:s.events.map(e=>({guest:e.guest_name,text:e.guest_text,received:e.received})),sent:s.sent.map(x=>({body:x.body,created:x.created})),sourceNotes,knowledge:s.thread.property_id==='luxe-75pht'?hotelKnowledge.filter(x=>x.title!=='Cơ sở & nguồn'):[],tourKnowledge:tourKnowledgeForAI(s.tour)},v.intent,v.body);
  const fresh=await threadState(db,owner,v.id);
  if(!fresh||fresh.contextKey!==s.contextKey||(fresh.drafts[0]?.revision||0)!==v.revision)return res({error:'Có tin mới hoặc bản nháp khác vừa được lưu. Đề xuất AI chưa được lưu; hãy tải lại và thử trên dữ kiện mới.'},409);
  const evidence=tourEvidenceNote(s.tour),notes='AI · Ý Cua: '+v.intent+'\nCần kiểm tra: '+(result.review.join(' · ')||'Rà nội dung trước khi duyệt.')+(evidence?'\n'+evidence:'')+'\nNguồn và lưu ý trước đó:\n'+(sourceNotes||'Chỉ dùng hội thoại này.').slice(0,8000);
  const saved=await db.prepare("INSERT OR IGNORE INTO ota_drafts (owner,thread_id,revision,operation_id,context_key,body,notes,status,created,source,attention) SELECT ?,?,?,?,?,?,?,'pending',?,'ai_cua',? WHERE "+guard+' RETURNING revision').bind(owner,v.id,v.revision+1,v.operationId,s.contextKey,result.body,notes,new Date().toISOString(),attentionOf(draftChecks(s,result.body)),...args).first();
  return saved?res({ok:true}):res({error:'Có thay đổi đồng thời. Bản nháp cũ được giữ nguyên.'},409);
 }
 if(v.action==='save'){
  const saved=await db.prepare('INSERT OR IGNORE INTO ota_drafts (owner,thread_id,revision,operation_id,context_key,body,notes,status,created,source,attention) SELECT ?,?,?,?,?,?,?,\'pending\',?,\'cua\',? WHERE '+guard+' RETURNING revision').bind(owner,v.id,v.revision+1,v.operationId,s.contextKey,v.body,cuaAmountsMark(v.cuaAmounts||[])+'Cua đã sửa nội dung; cần duyệt phiên bản này.\nNguồn và lưu ý trước đó:\n'+sourceNotes.slice(0,8000),now,attentionOf(draftChecks(s,v.body,cuaAmountsMark(v.cuaAmounts||[]))),...args).first();return saved?res({ok:true}):res({error:'Có thay đổi đồng thời. Nội dung chưa được lưu.'},409);
 }
 if(!latest?.body.trim()||latest.stale||latest.status==='sent')return res({error:'Bản nháp cần cập nhật nội dung trước khi duyệt hoặc gửi.'},409);
 if(v.action==='approve'){
  // The inbox must not become a way around price approval: amounts and internal data block approval.
  const hard=draftChecks(s,latest.body,latest.notes).filter(p=>p.hard);if(hard.length)return res({error:hard.map(p=>p.text).join(' '),problems:hard},409);
  const saved=await db.prepare('UPDATE ota_drafts SET status=\'approved\',approved_at=? WHERE owner=? AND thread_id=? AND revision=? AND '+guard+' RETURNING revision').bind(now,owner,v.id,v.revision,...args).first();return saved?res({ok:true}):res({error:'Có tin mới trong lúc duyệt. Tải lại.'},409);
 }
 if(latest.status!=='approved')return res({error:'Cần duyệt nội dung trước khi ghi nhận gửi.'},409);
 const result=await db.batch([
  db.prepare('INSERT OR IGNORE INTO ota_sent (owner,id,thread_id,revision,body,created) SELECT ?,?,?,?,?,? WHERE '+guard).bind(owner,v.operationId,v.id,v.revision,v.body,now,...args),
  db.prepare('UPDATE ota_drafts SET status=\'sent\',sent_at=? WHERE owner=? AND thread_id=? AND revision=? AND EXISTS(SELECT 1 FROM ota_sent WHERE owner=? AND id=?)').bind(now,owner,v.id,v.revision,owner,v.operationId)
 ]);return result[0].meta.changes?res({ok:true,delivery:'manually_confirmed_only'}):res({error:'Có thay đổi đồng thời. Chưa ghi nhận gửi.'},409);
 }catch(e){const code=e instanceof Error?e.message:'';const errors:Record<string,string>={AI_NOT_CONFIGURED:'AI chưa được kết nối. Cua vẫn có thể sửa trực tiếp và lưu nháp.',AI_ACCESS:'Khóa AI hết hạn hoặc chưa có quyền sử dụng. Cần cập nhật kết nối OpenAI.',AI_QUOTA:'OpenAI đang giới hạn lượt gọi hoặc tài khoản chưa có hạn mức API. Bản nháp cũ được giữ nguyên.',AI_UNAVAILABLE:'Dịch vụ AI chưa phản hồi. Bản nháp cũ được giữ nguyên; thử lại sau.',AI_INCOMPLETE:'Đề xuất AI chưa hoàn chỉnh nên chưa lưu. Cua có thể thử lại.'};if(errors[code])return res({error:errors[code]},503);if(e instanceof Error&&['TimeoutError','AbortError'].includes(e.name))return res({error:'AI phản hồi quá lâu. Bản nháp cũ được giữ nguyên; thử lại sau.'},504);console.error('OTA action failed');return res({error:'Chưa lưu được. Tải lại và thử tiếp.'},500);}
}
