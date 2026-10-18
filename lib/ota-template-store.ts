import {properties} from './ota';
import {threadStay} from './ota-stay';
import {parseTemplate,templateProblems,generalize,isVietnamese,classifyOpenMessages,type Template,type TemplateRow,type Situation} from './ota-templates';

export async function activeTemplates(db:D1Database,owner:string):Promise<Template[]>{
 const rows=await db.prepare('SELECT t.* FROM ota_templates t WHERE t.owner=? AND t.retired_at IS NULL AND t.version=(SELECT MAX(x.version) FROM ota_templates x WHERE x.owner=t.owner AND x.id=t.id)').bind(owner).all<TemplateRow>();
 return rows.results.map(parseTemplate);
}
export async function templateVersion(db:D1Database,owner:string,id:string,version:number){
 const r=await db.prepare('SELECT * FROM ota_templates WHERE owner=? AND id=? AND version=?').bind(owner,id,version).first<TemplateRow>();
 return r?parseTemplate(r):null;
}
export async function allTemplates(db:D1Database,owner:string){
 const rows=await db.prepare('SELECT * FROM ota_templates WHERE owner=? ORDER BY id,version DESC').bind(owner).all<TemplateRow>();
 return rows.results.map(parseTemplate);
}
type SourceDraft={thread_id:string;revision:number;body:string;notes:string;status:string;approved_at:string;property_id:string;channel:string;booking_id:string};
// Replies Cua approved for a specific booking, with when and in what context. They are candidates, not templates.
export async function approvedReplies(db:D1Database,owner:string){
 const rows=await db.prepare("SELECT d.thread_id,d.revision,d.body,d.notes,d.status,d.approved_at,t.property_id,t.channel,t.booking_id FROM ota_drafts d JOIN ota_threads t ON t.owner=d.owner AND t.id=d.thread_id WHERE d.owner=? AND d.approved_at IS NOT NULL AND d.body<>'' ORDER BY d.approved_at DESC LIMIT 200").bind(owner).all<SourceDraft>();
 const used=await db.prepare("SELECT source_thread,source_revision,id,version FROM ota_templates WHERE owner=? AND source_thread<>''").bind(owner).all<{source_thread:string;source_revision:number;id:string;version:number}>();
 const out=[];
 for(const d of rows.results){
  const events=(await db.prepare('SELECT id,guest_text,received,kind,guest_name,full_text,channel,authenticated,booking_id FROM ota_events WHERE owner=? AND thread_id=? AND received<=? ORDER BY received,id').bind(owner,d.thread_id,d.approved_at).all<{id:string;guest_text:string;received:string;kind:string;guest_name:string;full_text:string;channel:string;authenticated:number;booking_id:string}>()).results;
  const guestName=events.filter(e=>e.guest_name).at(-1)?.guest_name||'';
  const c=classifyOpenMessages({events,sent:[]});
  out.push({threadId:d.thread_id,revision:d.revision,status:d.status,approvedAt:d.approved_at,propertyId:d.property_id,property:properties.find(p=>p.id===d.property_id)?.name||d.property_id,channel:d.channel,bookingId:d.booking_id,guestName,stay:threadStay(events),intent:d.notes.startsWith('AI · Ý Cua: ')?d.notes.slice(12).split('\nCần kiểm tra:')[0].slice(0,600):'',guestMessages:events.filter(e=>e.kind==='guest').map(e=>({received:e.received,text:e.guest_text.slice(0,1500)})),situations:c.situations,body:d.body,suggestedBody:generalize(d.body,{guestName,bookingId:d.booking_id}),language:isVietnamese(d.body)?'vi':'en',templates:used.results.filter(u=>u.source_thread===d.thread_id&&u.source_revision===d.revision).map(u=>({id:u.id,version:u.version}))});
 }
 return out;
}
export type TemplateInput={operationId:string;templateId?:string;title:string;body:string;situations:Situation[];properties:string[];channels:string[];sourceThread?:string;sourceRevision?:number};
export class TemplateError extends Error{constructor(public problems:string[],public status=400){super(problems.join(' '));}}
// Creating a template is Cua's explicit permission to reuse; versions are never edited in place.
export async function saveTemplate(db:D1Database,owner:string,v:TemplateInput){
 const prior=await db.prepare('SELECT id,version,body FROM ota_templates WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{id:string;version:number;body:string}>();
 if(prior){if(prior.body===v.body&&(!v.templateId||v.templateId===prior.id))return {id:prior.id,version:prior.version,duplicate:true};throw new TemplateError(['Mã thao tác đã dùng cho nội dung khác.'],409);}
 let sourceThread='',sourceRevision=0,guestName='',bookingId='',guestText='',stay:{checkIn:string;checkOut:string}|undefined;
 const current=v.templateId?await db.prepare('SELECT * FROM ota_templates WHERE owner=? AND id=? ORDER BY version DESC LIMIT 1').bind(owner,v.templateId).first<TemplateRow>():null;
 if(v.templateId&&!current)throw new TemplateError(['Không tìm thấy mẫu.'],404);
 if(current){sourceThread=current.source_thread;sourceRevision=current.source_revision;}
 if(!current){
  if(!v.sourceThread||!v.sourceRevision)throw new TemplateError(['Mẫu mới phải tạo từ một phản hồi Cua đã duyệt.']);
  const src=await db.prepare('SELECT d.status,d.approved_at,t.booking_id FROM ota_drafts d JOIN ota_threads t ON t.owner=d.owner AND t.id=d.thread_id WHERE d.owner=? AND d.thread_id=? AND d.revision=?').bind(owner,v.sourceThread,v.sourceRevision).first<{status:string;approved_at:string|null;booking_id:string}>();
  if(!src)throw new TemplateError(['Không tìm thấy phản hồi gốc.'],404);
  if(!src.approved_at)throw new TemplateError(['Chỉ phản hồi đã được Cua duyệt mới được dùng làm nguồn cho mẫu.'],409);
  sourceThread=v.sourceThread;sourceRevision=v.sourceRevision;bookingId=src.booking_id;
 }
 if(sourceThread){
  const events=(await db.prepare('SELECT id,guest_text,guest_name,full_text,channel,authenticated,booking_id,received FROM ota_events WHERE owner=? AND thread_id=? ORDER BY received,id').bind(owner,sourceThread).all<{id:string;guest_text:string;guest_name:string;full_text:string;channel:string;authenticated:number;booking_id:string;received:string}>()).results;
  guestName=events.filter(e=>e.guest_name).at(-1)?.guest_name||'';guestText=events.map(e=>e.guest_text).join('\n');
  const s=threadStay(events);if(s.checkIn&&!s.conflict)stay=s;
  if(!bookingId)bookingId=(await db.prepare('SELECT booking_id FROM ota_threads WHERE owner=? AND id=?').bind(owner,sourceThread).first<{booking_id:string}>())?.booking_id||'';
 }
 const problems=templateProblems(v,{guestName,bookingId,guestText,stay});if(v.title.trim().length<3)problems.push('Đặt tên mẫu dễ nhận biết.');
 if(problems.length)throw new TemplateError(problems);
 const id=current?.id||'tpl-'+crypto.randomUUID().slice(0,12),version=(current?.version||0)+1,now=new Date().toISOString();
 const saved=await db.prepare('INSERT OR IGNORE INTO ota_templates (owner,id,version,title,body,situations,properties,channels,language,source_thread,source_revision,operation_id,approved_by,approved_at,retired_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)').bind(owner,id,version,v.title.trim(),v.body.trim(),JSON.stringify([...new Set(v.situations)]),JSON.stringify([...new Set(v.properties)]),JSON.stringify([...new Set(v.channels)]),isVietnamese(v.body)?'vi':'en',sourceThread,sourceRevision,v.operationId,owner,now).run();
 if(!saved.meta.changes)throw new TemplateError(['Mẫu vừa được lưu ở nơi khác. Tải lại.'],409);
 return {id,version,duplicate:false};
}
export async function retireTemplate(db:D1Database,owner:string,id:string){
 const r=await db.prepare('UPDATE ota_templates SET retired_at=? WHERE owner=? AND id=? AND retired_at IS NULL').bind(new Date().toISOString(),owner,id).run();
 return r.meta.changes>0;
}
