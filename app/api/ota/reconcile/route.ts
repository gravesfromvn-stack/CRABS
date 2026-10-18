import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {sameOrigin} from '../../../../lib/validation';
import {hash,properties,channels} from '../../../../lib/ota';
import {threadState,type OtaEvent} from '../../../../lib/ota-store';
export const dynamic='force-dynamic';
const reply=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
const evidence=z.array(z.object({label:z.string().min(1).max(300),url:z.string().url().refine(s=>{const u=new URL(s);return u.protocol==='https:'&&['docs.google.com','mail.google.com','lpp75.luxeparadisehospitality.com','www.expedia.co.uk','www.agoda.com','apps.expediapartnercentral.com'].includes(u.hostname)&&!u.username&&!u.password;})})).min(1).max(12);
const destination=z.object({propertyId:z.string().refine(id=>properties.some(p=>p.id===id)),channel:z.enum(channels),bookingId:z.string().regex(/^[A-Za-z0-9-]{5,40}$/)});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('event'),operationId:z.string().uuid(),eventId:z.string().min(1).max(100),sourceHash:z.string().length(64),decision:z.enum(['match','hold','system']),destination:destination.optional(),verifiedPropertyId:z.string().refine(id=>properties.some(p=>p.id===id)).optional(),guestText:z.string().max(12000),note:z.string().min(10).max(6000),evidence,candidateDraft:z.string().max(6000).default('')}),
 z.object({action:z.literal('draft'),operationId:z.string().uuid(),destination,eventIds:z.array(z.string().min(1).max(100)).min(1).max(100),body:z.string().trim().min(1).max(6000),notes:z.string().min(10).max(6000)})
]);
export async function GET(){
 const u=await getChatGPTUser();if(!u)return reply({error:'Vui lòng đăng nhập.'},401);
 const rows=await env.DB!.prepare(`SELECT r.operation_id,r.event_id,r.thread_id,r.decision,r.note,r.evidence,r.candidate_draft,r.created,e.booking_id,e.guest_name,e.subject,d.body current_draft,d.status draft_status
 FROM ota_reviews r JOIN ota_events e ON e.owner=r.owner AND e.id=r.event_id
 LEFT JOIN ota_drafts d ON d.owner=r.owner AND d.thread_id=r.thread_id AND d.revision=(SELECT MAX(revision) FROM ota_drafts WHERE owner=r.owner AND thread_id=r.thread_id)
 WHERE r.owner=? AND NOT EXISTS(SELECT 1 FROM ota_reviews newer WHERE newer.owner=r.owner AND newer.event_id=r.event_id AND newer.rowid>r.rowid)
 ORDER BY r.created DESC,r.event_id LIMIT 500`).bind(u.userId).all();
 return reply({reviews:rows.results});
}
export async function POST(request:Request){
 const u=await getChatGPTUser();if(!u)return reply({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let v;try{const raw=await request.text();if(raw.length>60000)return reply({error:'Nội dung quá dài.'},413);v=schema.parse(JSON.parse(raw));}catch{return reply({error:'Phiếu đối chiếu không hợp lệ.'},400);}
 const db=env.DB!,owner=u.userId,now=new Date().toISOString(),payloadHash=await hash(JSON.stringify(v));
 try{
 if(v.action==='event'){
  const prior=await db.prepare('SELECT payload_hash,thread_id FROM ota_reviews WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{payload_hash:string;thread_id:string}>();
  if(prior)return prior.payload_hash===payloadHash?reply({ok:true,duplicate:true,id:prior.thread_id}):reply({error:'Mã đối chiếu đã được dùng cho nội dung khác.'},409);
  const e=await db.prepare('SELECT * FROM ota_events WHERE owner=? AND id=?').bind(owner,v.eventId).first<OtaEvent>();
  if(!e)return reply({error:'Không tìm thấy email.'},404);
  if(e.thread_id||!['needs_match','missing_content'].includes(e.status)||await hash(e.full_text)!==v.sourceHash)return reply({error:'Email đã thay đổi hoặc đã được ghép. Cần đọc lại nguồn.'},409);
  const d=v.destination;
  if(v.verifiedPropertyId&&(v.decision!=='hold'||!e.authenticated||e.property_id&&e.property_id!==v.verifiedPropertyId))return reply({error:'Căn cứ cơ sở chưa hợp lệ hoặc mâu thuẫn với email.'},409);
  if(v.decision==='match'&&(!d||!v.guestText.trim()||!e.authenticated||e.channel!==d.channel||e.booking_id&&e.booking_id!==d.bookingId||e.property_id&&e.property_id!==d.propertyId))return reply({error:'Căn cứ ghép mâu thuẫn với email hoặc chưa xác thực người gửi.'},409);
  const tid=v.decision==='match'&&d?'ota-'+(await hash([d.propertyId,d.channel,d.bookingId].join('|'))).slice(0,32):'';
  const actor=owner+':review:'+v.operationId;
  const statements=[];
  if(tid&&d)statements.push(db.prepare('INSERT OR IGNORE INTO ota_threads (owner,id,property_id,channel,booking_id,created) VALUES (?,?,?,?,?,?)').bind(owner,tid,d.propertyId,d.channel,d.bookingId,now));
  const updateIndex=statements.length;
  statements.push(db.prepare('UPDATE ota_events SET property_id=?,channel=?,booking_id=?,guest_text=?,kind=?,status=?,thread_id=?,resolved_by=?,reason=? WHERE owner=? AND id=? AND thread_id=\'\' AND status=? AND resolved_by=?').bind(tid?d!.propertyId:v.verifiedPropertyId||e.property_id,tid?d!.channel:e.channel,tid?d!.bookingId:e.booking_id,v.guestText,v.decision==='system'?'system':e.kind,v.decision==='match'?'ready':v.decision==='system'?'system':e.status,tid,actor,v.note,owner,e.id,e.status,e.resolved_by));
  statements.push(db.prepare('INSERT INTO ota_reviews (owner,operation_id,event_id,payload_hash,thread_id,decision,note,evidence,candidate_draft,previous_state,created) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ota_events WHERE owner=? AND id=? AND resolved_by=?)').bind(owner,v.operationId,e.id,payloadHash,tid,v.decision,v.note,JSON.stringify(v.evidence),v.candidateDraft,JSON.stringify({property_id:e.property_id,channel:e.channel,booking_id:e.booking_id,guest_text:e.guest_text,kind:e.kind,status:e.status,thread_id:e.thread_id,resolved_by:e.resolved_by,reason:e.reason}),now,owner,e.id,actor));
  const result=await db.batch(statements);
  return result[updateIndex].meta.changes?reply({ok:true,id:tid,decision:v.decision}):reply({error:'Email vừa được xử lý ở nơi khác.'},409);
 }
 const d=v.destination,tid='ota-'+(await hash([d.propertyId,d.channel,d.bookingId].join('|'))).slice(0,32);
 const prior=await db.prepare('SELECT body,notes,thread_id FROM ota_drafts WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{body:string;notes:string;thread_id:string}>();
 if(prior)return prior.thread_id===tid&&prior.body===v.body&&prior.notes===v.notes?reply({ok:true,duplicate:true,id:tid}):reply({error:'Mã bản nháp đã dùng cho nội dung khác.'},409);
 const s=await threadState(db,owner,tid);if(!s)return reply({error:'Chưa ghép đủ email của hội thoại.'},409);
 const expected=[...new Set(v.eventIds)].sort(),actual=s.events.map(e=>e.id).sort();
 if(JSON.stringify(expected)!==JSON.stringify(actual))return reply({error:'Hội thoại có email khác với nguồn đã đọc. Cần đối chiếu lại trước khi soạn.'},409);
 const latest=s.drafts[0];if(s.sent.length||latest&&!latest.operation_id.startsWith('auto-'))return reply({error:'Giữ nguyên bản nhân viên đã sửa, duyệt hoặc ghi nhận gửi. Cần rà riêng hội thoại này.'},409);
 const saved=await db.prepare('INSERT OR IGNORE INTO ota_drafts (owner,thread_id,revision,operation_id,context_key,body,notes,status,created,source) SELECT ?,?,?,?,?,?,?,\'pending\',?,\'review\' WHERE (SELECT COUNT(*) FROM ota_events WHERE owner=? AND thread_id=?)=? AND (SELECT COUNT(*) FROM ota_sent WHERE owner=? AND thread_id=?)=0 AND COALESCE((SELECT MAX(revision) FROM ota_drafts WHERE owner=? AND thread_id=?),0)=? RETURNING revision').bind(owner,tid,(latest?.revision||0)+1,v.operationId,s.contextKey,v.body,v.notes,now,owner,tid,s.events.length,owner,tid,owner,tid,latest?.revision||0).first();
 return saved?reply({ok:true,id:tid,revision:saved.revision}):reply({error:'Có dữ kiện mới; bản nháp chưa được thay đổi.'},409);
 }catch{console.error('OTA reconciliation failed');return reply({error:'Chưa lưu được phiếu đối chiếu. Có thể thử lại cùng phiếu để tránh bản trùng.'},500);}
}
