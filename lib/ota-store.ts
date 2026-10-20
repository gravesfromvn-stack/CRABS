import {OTA_MAILBOX,properties,hash,parseMail,suggestedDraft,type GmailMail} from './ota';
import {threadStay} from './ota-stay';
import {guestProfile} from './ota-profile-store';
import {followupDraft,ruleProfileWithHistory} from './ota-profile';
import {tourAdvice,tourKnowledgeForAI,usesStaleTourData,applyTourAdvice,tourEvidenceNote,tourParagraph,guestDraftProblems,constraintsOf} from './tour-advice';
import {hotelKnowledge} from './luxe-knowledge';
import {planReply,isAutoDraft,draftSource} from './ota-templates';
import {activeTemplates} from './ota-template-store';
import {serviceReply,applyServiceReply,templateMisses} from './service-replies';
import {loadCatalog} from './service-catalog-store';
import {catalogApprovedAmounts} from './service-catalog';
import {guestContact} from './guest-contact';
import {detectLanguage,langLabels} from './translate';
import {localizedFromNeeds} from './reply-language';
import {arrivalTiming} from './arrival-timing';
import {clockTimes} from './ota-profile';
import {policyFor} from './hotel-policy-config';
export type OtaEvent={owner:string;id:string;mailbox:string;gmail_thread:string;internet_id:string;subject:string;sender:string;received:string;imported:string;full_text:string;guest_text:string;channel:string;booking_id:string;property_id:string;property_label:string;guest_name:string;kind:string;reason:string;authenticated:number;status:string;thread_id:string;resolved_by:string};
export type OtaDraft={thread_id:string;revision:number;operation_id:string;context_key:string;body:string;notes:string;status:string;created:string;approved_at:string|null;sent_at:string|null;source:string;template_id:string;template_version:number;attention:string};
export async function threadState(db:D1Database,owner:string,id:string,profileKey=''){
 const thread=await db.prepare('SELECT id,property_id,channel,booking_id FROM ota_threads WHERE owner=? AND id=?').bind(owner,id).first<{id:string;property_id:string;channel:string;booking_id:string}>();if(!thread)return null;
 const [events,drafts,sent]=await Promise.all([
  db.prepare('SELECT * FROM ota_events WHERE owner=? AND thread_id=? ORDER BY received,id').bind(owner,id).all<OtaEvent>(),
  db.prepare('SELECT thread_id,revision,operation_id,context_key,body,notes,status,created,approved_at,sent_at,source,template_id,template_version,attention FROM ota_drafts WHERE owner=? AND thread_id=? ORDER BY revision DESC').bind(owner,id).all<OtaDraft>(),
  db.prepare('SELECT id,body,created,revision FROM ota_sent WHERE owner=? AND thread_id=? ORDER BY created,id').bind(owner,id).all<{id:string;body:string;created:string;revision:number}>()
 ]);
 const contextKey=await hash(JSON.stringify({thread,events:events.results.map(e=>[e.id,e.guest_text,e.received,e.kind,e.resolved_by]),sent:sent.results.map(s=>[s.id,s.body,s.created])}));
 // Tour knowledge is selected per conversation from rule facts, so the AI only sees the relevant options.
 const guestEvents=events.results.filter(e=>e.kind==='guest'&&e.guest_text),rules=ruleProfileWithHistory(guestEvents);
 // What the hotel last said (sent, else the latest approved draft) tells what a short "Yes" confirms.
 const lastOutgoing=sent.results.at(-1)?.body||drafts.results.find(d=>d.status==='approved'||d.status==='sent')?.body||'';
 // Prices and approvals come from the service catalog (one source for OTA, quotes and tour library).
 const catalog=await loadCatalog(db,owner);
 const tour=tourAdvice({catalog,propertyId:thread.property_id,facts:rules.facts,text:guestEvents.map(e=>e.guest_text).join('\n'),latestText:guestEvents.at(-1)?.guest_text||'',lastOutgoing,stayStart:threadStay(events.results).checkIn});
 const profile=await guestProfile(db,owner,id,contextKey,events.results,profileKey,fetch,{guestName:events.results.at(-1)?.guest_name,property:properties.find(p=>p.id===thread.property_id)?.name,stay:threadStay(events.results),sent:sent.results,sourceNotes:(drafts.results[0]?.notes||'').split('\nNguồn và lưu ý trước đó:\n').at(-1),knowledge:thread.property_id==='luxe-75pht'?hotelKnowledge.filter(x=>x.title!=='Cơ sở & nguồn'):[],tourKnowledge:tourKnowledgeForAI(tour)});
 // A draft built on tour sources that have since changed needs review like a draft with a new guest message.
 return {catalog,thread,stay:threadStay(events.results),profile:{...profile,history:rules.history},tour,events:events.results.map(({owner:_,...e})=>e),drafts:drafts.results.map(d=>({...d,stale:(d.context_key!==contextKey||usesStaleTourData(d.notes))&&d.status!=='sent'})),sent:sent.results,contextKey};
}
export type PrepareResult={result:'missing'|'no_guest_text'|'answered'|'kept'|'kept_cua_edit'|'flagged'|'created'|'duplicate';source?:string;template?:string};
// Prepares the next draft for a conversation. With refresh, an automatic draft for the
// current context may be replaced by a newer one from an approved template; approved,
// sent and Cua-written versions are never superseded for the same context.
export async function prepareDraft(db:D1Database,owner:string,id:string,profileKey='',refresh=false):Promise<PrepareResult>{
 const s=await threadState(db,owner,id,profileKey);if(!s)return {result:'missing'};
 const guest=s.events.filter(e=>e.kind==='guest'&&e.guest_text).at(-1);if(!guest)return {result:'no_guest_text'};
 if(s.sent.some(x=>x.created>=guest.received))return {result:'answered'};
 const latest=s.drafts[0],now=new Date().toISOString();
 const replaceable=Boolean(latest&&!latest.stale&&refresh&&isAutoDraft(latest)&&['pending','needs_writing'].includes(latest.status));
 if(latest&&!latest.stale&&!replaceable)return {result:'kept'};
 // Cua is working on an unapproved version: never bury it under an automatic one.
 if(latest&&latest.stale&&latest.status==='pending'&&!isAutoDraft(latest))return {result:'kept_cua_edit'};
 const vi=/[ăâđêôơư]|\b(toi|minh|ban|khach san|san bay)\b/i.test(guest.guest_text);
 // Branch 1 (services closed on the extranet with configured terms) and branch 2 (tours: ask for WhatsApp).
 const lastSent=s.sent.map(x=>x.created).sort().at(-1)||'';
 const openText=s.events.filter(e=>e.kind==='guest'&&e.guest_text&&e.received>lastSent).map(e=>e.guest_text).join('\n');
 const contact=guestContact(s.events.filter(e=>e.kind==='guest').map(e=>e.guest_text||''));
 const service=serviceReply({offeredTour:s.sent.some(x=>/interested in visiting|có muốn tham quan|באם יש עניין לבקר|хотели бы вы во время пребывания|aimeriez-vous visiter|le gustaría visitar|Interesse, während Ihres Aufenthalts|是否有兴趣游览|を訪れてみませんか|가 보실 생각/.test(x.body)),stay:s.stay,sentAt:guest.received,guestName:s.events.filter(e=>e.kind==='guest'&&e.guest_name).at(-1)?.guest_name||'',catalog:s.catalog,propertyId:s.thread.property_id,text:openText,facts:s.profile.facts,vi,tourInterested:s.tour.status==='interested',hasContact:Boolean(contact),tourPlaces:s.tour.destinations.map(d=>d.label.vi),history:s.events.filter(e=>e.kind==='guest'&&e.guest_text&&e.received<=lastSent).map(e=>e.guest_text).join('\n')});
 const plan=planReply({...s,tourParagraph:tourParagraph(s.tour,vi),serviceInfo:service.paragraphs.join('\n\n')},await activeTemplates(db,owner));
 // No template fits: keep the automatic draft's text but refresh why it needs Cua (e.g. a template now
 // exists but does not cover this case). A template suggestion that no longer fits goes back to Cua.
 // An empty automatic draft ("Cua soạn") is rebuilt below when the rules can now write it.
 if(replaceable&&!plan.template&&latest.body){
  const why=[...(draftSource(latest)==='template'?['Mẫu không còn phù hợp với hội thoại này: Cua rà lại trước khi duyệt.']:[]),...plan.reasons,...service.internal,...(latest.body?[]:['Chưa soạn được nội dung tự động: Cua soạn câu trả lời.'])].join('\n');
  if(!why||why===latest.attention)return {result:'kept'};
  const r=await db.prepare("UPDATE ota_drafts SET attention=? WHERE owner=? AND thread_id=? AND revision=? AND status IN ('pending','needs_writing') AND attention<>?").bind(why,owner,id,latest.revision,why).run();
  return {result:r.meta.changes?'flagged':'kept'};
 }
 if(replaceable&&latest.body&&(!plan.template||latest.template_id===plan.template.id&&latest.template_version===plan.template.version))return {result:'kept'};
 const reasons=[...plan.reasons];
 if(latest?.stale&&latest.status==='approved')reasons.unshift(`Có tin mới sau phiên bản v${latest.revision} đã duyệt: Cua kiểm tra nội dung đã duyệt còn đúng không.`);
 let draft:{body:string;notes:string;source:string;templateId:string;templateVersion:number};
 // Guest writes another language and only gives an arrival time: reply in that language.
 const lang=detectLanguage(openText),tm=arrivalTiming({text:openText,sentAt:guest.received,checkIn:s.stay?.checkIn});
 const localized=lang!=='en'&&lang!=='vi'?localizedFromNeeds(lang,service.needs,{time:tm?.time||clockTimes(openText)[0]||'',checkIn:policyFor(s.thread.property_id)?.checkIn||'14:00',night:tm?.kind==='night',meta:service.meta}):null;
 if(localized)draft={body:localized,notes:`Nháp ${langLabels[lang]} theo mẫu câu cố định (giờ đến). Cua kiểm tra trước khi gửi; dùng nút Dịch để đọc.`,source:'rules',templateId:'',templateVersion:0};
 else if(plan.template&&plan.body&&!templateMisses(service,plan.template.body))draft={body:plan.body,notes:`Đề xuất từ mẫu đã duyệt "${plan.template.title}" (v${plan.template.version}, Cua cho phép dùng lại ${plan.template.approved_at.slice(0,10)}). Chưa phải phản hồi Cua đã duyệt cho booking này.`,source:'template',templateId:plan.template.id,templateVersion:plan.template.version};
 else if(s.profile.proposedReply)draft={body:applyServiceReply(s.profile.proposedReply.body,service),notes:'AI · Nháp từ toàn bộ hội thoại và hồ sơ nhu cầu. '+s.profile.proposedReply.review.join(' · '),source:'ai',templateId:'',templateVersion:0};
 else{const r=followupDraft(suggestedDraft(guest.guest_text),s.profile,guest.guest_text,s.sent);draft={body:applyServiceReply(applyTourAdvice(r.body,s.tour,vi),service),notes:r.notes,source:'rules',templateId:'',templateVersion:0};}
 if(service.needs.length)draft.notes+=`\nDịch vụ theo cấu hình khách sạn (${service.needs.join(', ')}): giá chỉ hiện khi đã duyệt trong lib/hotel-policy-config.json.`;
 if(draft.source!=='template')reasons.push(...service.internal);
 if(!draft.body)reasons.push('Chưa soạn được nội dung tự động: Cua soạn câu trả lời.');
 // Tour sources: keep evidence with this version; unapproved prices/conditions stay Cua's decision.
 const evidence=tourEvidenceNote(s.tour);if(evidence)draft.notes+='\n'+evidence;
 if(draft.source!=='template'&&s.tour.options.length&&!s.tour.options.every(o=>o.approvedPrice))reasons.push('Tour: giá và điều kiện chỉ là tham khảo, chưa duyệt. Cua chốt gói, hạng xe, điểm đón và giá trước khi báo giá.',...s.tour.internal);
 else if(draft.source!=='template')reasons.push(...s.tour.internal);
 // Intent notes ("Yes" confirms only the asked sentence, "book" is not a booking) apply to template drafts too.
 else reasons.push(...(s.tour.intent?.notes||[]));
 // Check the guest-facing text before saving: repeated questions, prices, promises, merged packages.
 const c=constraintsOf(s.events.filter(e=>e.kind==='guest').map(e=>e.guest_text).join('\n'));
 for(const p of guestDraftProblems(draft.body,{facts:s.profile.facts,advice:s.tour,known:{date:!!c.date,party:!!c.party},allowedAmounts:catalogApprovedAmounts(s.catalog,s.thread.property_id)}))reasons.push('Kiểm tra nháp: '+p.text);
 if(replaceable&&!latest.body&&!draft.body)return {result:'kept'};
 // One operation id per context and source makes reprocessing the same facts a no-op.
 const operation=(replaceable&&!latest.body?'rebuild-'+latest.revision+'-':'')+(draft.source==='template'?`tpl-${id}-${s.contextKey}-${draft.templateId}-v${draft.templateVersion}`:'auto-'+id+'-'+s.contextKey);
 const r=await db.prepare('INSERT OR IGNORE INTO ota_drafts (owner,thread_id,revision,operation_id,context_key,body,notes,status,created,source,template_id,template_version,attention) SELECT ?,?,COALESCE((SELECT MAX(revision) FROM ota_drafts WHERE owner=? AND thread_id=?),0)+1,?,?,?,?,?,?,?,?,?,?').bind(owner,id,owner,id,operation,s.contextKey,draft.body,draft.notes,draft.body?'pending':'needs_writing',now,draft.source,draft.templateId,draft.templateVersion,reasons.join('\n')).run();
 return {result:r.meta.changes?'created':'duplicate',source:draft.source,template:draft.templateId};
}
export async function refreshDrafts(db:D1Database,owner:string,ids?:string[]){
 const list=ids?.length?ids:(await db.prepare('SELECT id FROM ota_threads WHERE owner=? ORDER BY id').bind(owner).all<{id:string}>()).results.map(x=>x.id);
 const summary:Record<string,number>={};
 for(const id of list){const r=await prepareDraft(db,owner,id,'',true);const k=r.result==='created'?'created_'+r.source:r.result;summary[k]=(summary[k]||0)+1;}
 return summary;
}
export async function ingestMail(db:D1Database,mail:GmailMail,profileKey=''){
 const account=await db.prepare('SELECT owner FROM ota_mailbox WHERE mailbox=?').bind(OTA_MAILBOX).first<{owner:string}>();if(!account)throw Error('MAILBOX_NOT_CONNECTED');
 const owner=account.owner,p=parseMail(mail),now=new Date().toISOString();
 if(!p.received)throw Error('INVALID_MAIL_DATE');
 const prior=await db.prepare('SELECT thread_id,status FROM ota_events WHERE owner=? AND id=?').bind(owner,p.id).first<{thread_id:string;status:string}>();
 if(prior){if(prior.thread_id)await prepareDraft(db,owner,prior.thread_id,profileKey);return {duplicate:true,status:prior.status,id:p.id};}
 let status=p.kind==='system'?'system':!p.authenticated||!p.propertyId||!p.bookingId?'needs_match':!p.guestText?'missing_content':'ready';
 if(p.channel==='unknown')status='system';
 const threadId=status==='ready'?'ota-'+(await hash([p.propertyId,p.channel,p.bookingId].join('|'))).slice(0,32):'';
 const statements=[];
 if(threadId)statements.push(db.prepare('INSERT OR IGNORE INTO ota_threads (owner,id,property_id,channel,booking_id,created) VALUES (?,?,?,?,?,?)').bind(owner,threadId,p.propertyId,p.channel,p.bookingId,now));
 statements.push(db.prepare('INSERT OR IGNORE INTO ota_events (owner,id,mailbox,gmail_thread,internet_id,subject,sender,received,imported,full_text,guest_text,channel,booking_id,property_id,property_label,guest_name,kind,reason,authenticated,status,thread_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(owner,p.id,OTA_MAILBOX,p.gmailThread,p.internetId,p.subject,p.sender,p.received,now,p.fullText,p.guestText,p.channel,p.bookingId,p.propertyId,p.propertyLabel,p.guestName,p.kind,p.reason,p.authenticated?1:0,status,threadId));
 statements.push(db.prepare('UPDATE ota_mailbox SET last_received=? WHERE mailbox=? AND owner=?').bind(now,OTA_MAILBOX,owner));
 await db.batch(statements);if(threadId)await prepareDraft(db,owner,threadId,profileKey);
 return {duplicate:false,status,id:p.id,threadId};
}
