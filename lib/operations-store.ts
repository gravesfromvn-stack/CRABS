import {smartTags} from './smart-tags';
import {hash,properties,norm} from './ota';
import {threadStay} from './ota-stay';
import {ruleProfile,profileLabels,profileStatuses,type GuestFact} from './ota-profile';
import {readReception} from './reception';
import {sourceCase} from './source-cases';
import type {OperationSource,OperationTask,OperationLog,Handoff,OperationInput} from './operations';
type Event={id:string;thread_id:string;full_text:string;guest_text:string;channel:string;authenticated:number;booking_id:string;received:string;kind:string;guest_name:string;property_id:string};
type Thread={id:string;property_id:string;channel:string;booking_id:string;created:string};
export type TaskRow={id:string;source_kind:'ota'|'contact';source_id:string;version:number;payload:string;updated:string;last_operation:string};
export function operationFact(f:GuestFact){
 const words=norm(f.summary);
 // Check-in requests are shown as unconfirmed requests. The OTA rules now classify them as stay
 // requests; the arrival branch still covers older summaries.
 if(f.category==='arrival'&&/check.?in|nhan phong/.test(words)&&/request|would like|can we|could we|yeu cau|xin/.test(words))return {label:'Yêu cầu nhận phòng',text:f.summary+' · Chưa xác nhận đáp ứng'};
 if(f.category==='stay'&&f.status==='requested'&&/check.?in|nhan phong/.test(words))return {label:'Yêu cầu nhận phòng',text:f.summary+' · Chưa xác nhận đáp ứng'};
 return {label:profileLabels[f.category],text:f.summary+' · '+profileStatuses[f.status]};
}
export async function operationsSources(db:D1Database,owner:string):Promise<OperationSource[]>{
 const [threads,events,contacts,messages]=await Promise.all([
 db.prepare('SELECT * FROM ota_threads WHERE owner=? ORDER BY created DESC').bind(owner).all<Thread>(),
 db.prepare('SELECT id,thread_id,full_text,guest_text,channel,authenticated,booking_id,received,kind,guest_name,property_id FROM ota_events WHERE owner=? AND thread_id<>? ORDER BY received,id').bind(owner,'').all<Event>(),
 db.prepare('SELECT id,name,version,updated,reception,interest,stay FROM contacts WHERE owner=? ORDER BY updated DESC').bind(owner).all<{id:string;name:string;version:number;updated:string;reception:string;interest:string;stay:string}>(),
 db.prepare('SELECT id,contact_id,body,created FROM messages WHERE owner=? ORDER BY created,id').bind(owner).all<{id:string;contact_id:string;body:string;created:string}>()]);
 const grouped=new Map<string,Event[]>();for(const e of events.results){const list=grouped.get(e.thread_id)||[];list.push(e);grouped.set(e.thread_id,list);}
 const ota=await Promise.all(threads.results.map(async t=>{
 const es=(grouped.get(t.id)||[]).filter(e=>e.property_id===t.property_id&&e.channel===t.channel&&e.booking_id===t.booking_id);
 const stay=threadStay(es),guest=es.filter(e=>e.kind==='guest'&&e.guest_text);
 return {key:'ota:'+t.id,kind:'ota' as const,id:t.id,name:es.filter(e=>e.guest_name).at(-1)?.guest_name||'Chưa có tên khách',propertyId:t.property_id,propertyLabel:properties.find(p=>p.id===t.property_id)?.name||'Cần đối chiếu cơ sở',channel:t.channel,bookingId:t.booking_id,checkIn:stay.checkIn,checkOut:stay.checkOut,dateConflict:stay.conflict,sourceKey:await hash(JSON.stringify(es.map(e=>[e.id,e.guest_text,e.full_text,e.received]))),facts:ruleProfile(guest).map(operationFact),messages:guest.map(e=>({id:e.id,body:e.guest_text,at:e.received})),...(()=>{const r=smartTags(guest.map(e=>({text:e.guest_text,at:e.received})),stay);return {tags:r.tags,arrivalNotes:r.notes};})(),legacyRequests:0,updated:es.at(-1)?.received||t.created};
 }));
 const existing=await Promise.all(contacts.results.map(async c=>{
 const r=readReception(c.reception),src=sourceCase(c.id),p=norm(src?.property||'');
 // A Sheets label is not proof of verified property matching; retain its scope warning.
 const propertyId=c.id.startsWith('demo-')?'demo':src?.scope.includes('Cần đối chiếu')?'unverified':p.includes('suites')?'luxe-suites':p.includes('75')||p.includes('pham hong thai')?'luxe-75pht':'unverified';
 const ms=messages.results.filter(m=>m.contact_id===c.id);
 return {key:'contact:'+c.id,kind:'contact' as const,id:c.id,name:c.name,propertyId,propertyLabel:propertyId==='demo'?'Tình huống dựng mẫu':propertyId==='unverified'?'Sheets · cần đối chiếu cơ sở':properties.find(p=>p.id===propertyId)!.name,channel:src?.channel||'Mẫu',bookingId:'',checkIn:r.arrival,checkOut:r.departure,dateConflict:false,sourceKey:await hash(JSON.stringify([c.version,c.reception,ms.map(m=>[m.id,m.body])])),facts:[{label:'Nhu cầu',text:c.interest},{label:'Yêu cầu / sở thích',text:r.preferences},{label:'Chuyến bay',text:r.flight},{label:'Điểm đón / trả',text:[r.pickup,r.dropoff].filter(Boolean).join(' → ')}].filter(x=>x.text),messages:ms.map(m=>({id:m.id,body:m.body,at:m.created})),legacyRequests:r.requests.length,updated:c.updated};
 }));return [...ota,...existing];
}
export async function operationsState(db:D1Database,owner:string){
 const [sources,taskRows,logs,handoffs,unmatched]=await Promise.all([operationsSources(db,owner),db.prepare('SELECT * FROM ops_tasks WHERE owner=? ORDER BY updated DESC').bind(owner).all<TaskRow>(),db.prepare('SELECT operation_id,task_id,actor,detail,created FROM ops_history WHERE owner=? ORDER BY created DESC').bind(owner).all<OperationLog>(),db.prepare('SELECT * FROM ops_handoffs WHERE owner=? ORDER BY created DESC').bind(owner).all<Handoff>(),db.prepare('SELECT count(*) AS n FROM ota_events WHERE owner=? AND status=?').bind(owner,'needs_match').first<{n:number}>()]);
 const tasks:OperationTask[]=taskRows.results.map(r=>{const payload=JSON.parse(r.payload) as OperationInput;return {...payload,id:r.id,sourceKind:r.source_kind,sourceId:r.source_id,version:r.version,updated:r.updated,stale:payload.reviewedSourceKey!==sources.find(s=>s.kind===r.source_kind&&s.id===r.source_id)?.sourceKey};});
 return {sources,tasks,logs:logs.results,handoffs:handoffs.results,unmatched:unmatched?.n||0,loadedAt:new Date().toISOString()};
}
