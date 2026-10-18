import {OTA_MAILBOX,properties,hash,parseMail,suggestedDraft,type GmailMail} from './ota';
import {threadStay} from './ota-stay';
import {guestProfile} from './ota-profile-store';
import {followupDraft} from './ota-profile';
import {hotelKnowledge} from './luxe-knowledge';
import {planReply,isAutoDraft,draftSource} from './ota-templates';
import {activeTemplates} from './ota-template-store';
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
 const profile=await guestProfile(db,owner,id,contextKey,events.results,profileKey,fetch,{guestName:events.results.at(-1)?.guest_name,property:properties.find(p=>p.id===thread.property_id)?.name,stay:threadStay(events.results),sent:sent.results,sourceNotes:(drafts.results[0]?.notes||'').split('\nNguồn và lưu ý trước đó:\n').at(-1),knowledge:thread.property_id==='luxe-75pht'?hotelKnowledge.filter(x=>x.title!=='Cơ sở & nguồn'):[]});
 return {thread,stay:threadStay(events.results),profile,events:events.results.map(({owner:_,...e})=>e),drafts:drafts.results.map(d=>({...d,stale:d.context_key!==contextKey&&d.status!=='sent'})),sent:sent.results,contextKey};
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
 const plan=planReply(s,await activeTemplates(db,owner));
 // No template fits: keep the automatic draft's text but refresh why it needs Cua (e.g. a template now
 // exists but does not cover this case). A template suggestion that no longer fits goes back to Cua.
 if(replaceable&&!plan.template){
  const why=[...(draftSource(latest)==='template'?['Mẫu không còn phù hợp với hội thoại này: Cua rà lại trước khi duyệt.']:[]),...plan.reasons,...(latest.body?[]:['Chưa soạn được nội dung tự động: Cua soạn câu trả lời.'])].join('\n');
  if(!why||why===latest.attention)return {result:'kept'};
  const r=await db.prepare("UPDATE ota_drafts SET attention=? WHERE owner=? AND thread_id=? AND revision=? AND status IN ('pending','needs_writing') AND attention<>?").bind(why,owner,id,latest.revision,why).run();
  return {result:r.meta.changes?'flagged':'kept'};
 }
 if(replaceable&&(!plan.template||latest.template_id===plan.template.id&&latest.template_version===plan.template.version))return {result:'kept'};
 const reasons=[...plan.reasons];
 if(latest?.stale&&latest.status==='approved')reasons.unshift(`Có tin mới sau phiên bản v${latest.revision} đã duyệt: Cua kiểm tra nội dung đã duyệt còn đúng không.`);
 let draft:{body:string;notes:string;source:string;templateId:string;templateVersion:number};
 if(plan.template&&plan.body)draft={body:plan.body,notes:`Đề xuất từ mẫu đã duyệt "${plan.template.title}" (v${plan.template.version}, Cua cho phép dùng lại ${plan.template.approved_at.slice(0,10)}). Chưa phải phản hồi Cua đã duyệt cho booking này.`,source:'template',templateId:plan.template.id,templateVersion:plan.template.version};
 else if(s.profile.proposedReply)draft={body:s.profile.proposedReply.body,notes:'AI · Nháp từ toàn bộ hội thoại và hồ sơ nhu cầu. '+s.profile.proposedReply.review.join(' · '),source:'ai',templateId:'',templateVersion:0};
 else{const r=followupDraft(suggestedDraft(guest.guest_text),s.profile,guest.guest_text,s.sent);draft={body:r.body,notes:r.notes,source:'rules',templateId:'',templateVersion:0};}
 if(!draft.body)reasons.push('Chưa soạn được nội dung tự động: Cua soạn câu trả lời.');
 // One operation id per context and source makes reprocessing the same facts a no-op.
 const operation=draft.source==='template'?`tpl-${id}-${s.contextKey}-${draft.templateId}-v${draft.templateVersion}`:'auto-'+id+'-'+s.contextKey;
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
