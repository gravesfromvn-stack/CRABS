import {z} from 'zod';
import type {SmartTag} from './smart-tags';
import {stageLabels,type Eta,type Complaint,type AssignedRole,type StayStage} from './front-desk';
export const operationKinds={pickup:'Xe đón sân bay',dropoff:'Xe tiễn sân bay',tour:'Tour',spa:'Spa',room:'Yêu cầu phòng',stay:'Chăm sóc lưu trú',other:'Việc khác'} as const;
export const operationStates={open:'Chưa nhận việc',working:'Đang xử lý',done:'Đã thực hiện',cancelled:'Đã hủy'} as const;
export const decisionLabels={unknown:'Chưa xác định',interested:'Đang tìm hiểu',accepted:'Khách đã đồng ý',declined:'Khách từ chối'} as const;
export const supplierLabels={unchecked:'Chưa kiểm tra',waiting:'Chờ xác nhận',confirmed:'Đã xác nhận',unavailable:'Không đáp ứng được'} as const;
const date=z.string().refine(v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Ngày không hợp lệ');
const clock=z.string().refine(v=>v===''||/^([01]\d|2[0-3]):[0-5]\d$/.test(v),'Giờ không hợp lệ');
const localTime=z.string().refine(v=>v===''||/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(v)&&date.safeParse(v.slice(0,10)).success,'Hạn xử lý không hợp lệ');
export const operationInput=z.object({title:z.string().trim().min(2).max(240),kind:z.enum(['pickup','dropoff','tour','spa','room','stay','other']),assignee:z.string().trim().max(80),due:localTime,serviceDate:date,serviceTime:clock,details:z.string().trim().max(3000),state:z.enum(['open','working','done','cancelled']),guestDecision:z.enum(['unknown','interested','accepted','declined']),guestEvidence:z.string().trim().max(1200),supplierStatus:z.enum(['unchecked','waiting','confirmed','unavailable']),supplierEvidence:z.string().trim().max(1200),note:z.string().trim().max(2000),reviewedSourceKey:z.string().max(100),
 // Service request details (airport car / tour / spa): flight, vehicle and the quoted price.
 flightCode:z.string().trim().max(20).default(''),carType:z.string().trim().max(60).default(''),priceVnd:z.number().int().min(0).max(1000000000).nullable().default(null)}).superRefine((v,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:z.ZodIssueCode.custom,message});
 if(v.serviceTime&&!v.serviceDate)issue('Cần ngày dịch vụ khi đã ghi giờ.');
 if(v.guestDecision==='accepted'&&!v.guestEvidence)issue('Ghi căn cứ khách đồng ý; duyệt nháp chưa phải khách đồng ý.');
 if(v.supplierStatus==='confirmed'&&!v.supplierEvidence)issue('Ghi đơn vị/người xác nhận và căn cứ trước khi đánh dấu đã xác nhận.');
 if(v.state==='done'){
  if(!v.assignee||!v.note)issue('Ghi người thực hiện và kết quả trước khi hoàn tất.');
  if(['pickup','dropoff','tour','spa'].includes(v.kind)&&(v.guestDecision!=='accepted'||v.supplierStatus!=='confirmed'))issue('Dịch vụ cần khách đồng ý và nhà cung cấp xác nhận trước khi hoàn tất.');
  if(v.kind==='room'&&v.supplierStatus!=='confirmed')issue('Yêu cầu phòng cần bộ phận phòng xác nhận.');
 }
 if(v.state==='cancelled'&&!v.note)issue('Ghi lý do hủy; kiểm tra nghĩa vụ thu/hoàn tiền riêng.');
});
export type OperationInput=z.infer<typeof operationInput>;
export type OperationSource={key:string;kind:'ota'|'contact';id:string;name:string;propertyId:string;propertyLabel:string;channel:string;bookingId:string;checkIn:string;checkOut:string;dateConflict:boolean;sourceKey:string;facts:{label:string;text:string}[];messages:{id:string;body:string;at:string}[];tags?:SmartTag[];arrivalNotes?:string[];eta?:Eta;etaPrompt?:string;complaints?:Complaint[];complaintPrompt?:string;roles?:AssignedRole[];legacyRequests:number;updated:string};
export type OperationTask=OperationInput&{id:string;sourceKind:'ota'|'contact';sourceId:string;version:number;updated:string;stale:boolean};
export type OperationLog={operation_id:string;task_id:string;actor:string;detail:string;created:string};
export type Handoff={id:string;property_id:string;day:string;shift:string;recipient:string;body:string;actor:string;created:string;received_at:string;received_by:string;room?:string;booking_ref?:string;stage?:string;category?:string;author?:string};
export type Flag={key:string;value:string;actor:string;updated:string};
export type OperationsData={sources:OperationSource[];tasks:OperationTask[];logs:OperationLog[];handoffs:Handoff[];unmatched:number;loadedAt:string;flags:Flag[];settings:{allowReceptionistTourSales:boolean}};
// Manager escalation: the latest complaint of each guest (OTA / Sheets) and every COMPLAIN shift-log entry,
// until a manager marks it resolved. Only the last `days` days, so old mail does not flood the banner.
export type ManagerAlert={key:string;sourceKey:string;name:string;stage:StayStage|'';stageLabel:string;topic:string;at:string;quote:string;prompt:string;link:string};
export function managerAlerts(sources:OperationSource[],handoffs:Handoff[],flags:Flag[],now=new Date(),days=30):ManagerAlert[]{
 const since=new Date(now.getTime()-days*86400000).toISOString(),resolved=new Set(flags.filter(f=>f.key.startsWith('complaint:')&&f.value==='resolved').map(f=>f.key.slice(10)));
 const out:ManagerAlert[]=[];
 for(const s of sources){const c=s.complaints?.at(-1);if(!c||c.at<since)continue;const key=`${s.key}:${c.at}`;if(resolved.has(key))continue;
  out.push({key,sourceKey:s.key,name:s.name,stage:c.stage,stageLabel:c.stage?stageLabels[c.stage]:'Chưa rõ giai đoạn',topic:c.topic,at:c.at,quote:c.quote,prompt:s.complaintPrompt||'',link:s.kind==='ota'?'/?otaThread='+encodeURIComponent(s.id)+'#ota':'/#sales/'+encodeURIComponent(s.id)});}
 for(const h of handoffs){if(h.category!=='COMPLAIN'||h.created<since)continue;const key='handoff:'+h.id;if(resolved.has(key))continue;
  const stage=(['PRE_STAY','IN_STAY','POST_STAY'].includes(h.stage||'')?h.stage:'') as StayStage|'';
  out.push({key,sourceKey:'',name:[h.room,h.booking_ref].filter(Boolean).join(' · ')||'Ghi chú tại quầy',stage,stageLabel:stage?stageLabels[stage]:'Chưa rõ giai đoạn',topic:'Ghi chú bàn giao ca',at:h.created,quote:h.body.slice(0,200),prompt:'',link:'/#operations'});}
 return out.sort((a,b)=>b.at.localeCompare(a.at));
}
export function blankOperation(sourceKey=''):OperationInput{return {title:'',kind:'other',assignee:'',due:'',serviceDate:'',serviceTime:'',details:'',state:'open',guestDecision:'unknown',guestEvidence:'',supplierStatus:'unchecked',supplierEvidence:'',note:'',reviewedSourceKey:sourceKey,flightCode:'',carType:'',priceVnd:null};}
export function vietnamDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function activeTask(t:OperationTask){return t.state!=='done'&&t.state!=='cancelled';}
export function taskOnDay(t:OperationTask,day:string){return t.serviceDate===day||t.due.slice(0,10)===day;}
export function overdueTask(t:OperationTask,day:string,now=new Date()){
 if(!activeTask(t)||!t.due)return false;
 return day===vietnamDay(now)?Date.parse(t.due+'+07:00')<now.getTime():t.due.slice(0,10)<day;
}
export function nextOperation(t:OperationTask){
 if(t.stale)return 'Có tin mới — rà lại yêu cầu và xác nhận';
 if(t.state==='cancelled')return 'Đã hủy — đối chiếu cam kết / khoản thu riêng';
 if(t.state==='done')return 'Đã thực hiện — đối chiếu khoản thu riêng';
 if(t.guestDecision==='declined')return 'Khách từ chối — kiểm tra hủy việc / cam kết';
 if(!t.assignee)return 'Phân công người xử lý';
 if(t.supplierStatus==='unavailable')return 'Tìm phương án khác, xác nhận lại với khách';
 if(['pickup','dropoff','tour','spa'].includes(t.kind)&&t.guestDecision!=='accepted')return 'Tư vấn và ghi nhận lựa chọn của khách';
 if(t.supplierStatus!=='confirmed')return t.kind==='room'?'Kiểm tra bố trí với bộ phận phòng':'Liên hệ đơn vị thực hiện để xác nhận';
 if(!t.serviceDate&&!['room','stay','other'].includes(t.kind))return 'Bổ sung ngày thực hiện đã thống nhất';
 return 'Chuẩn bị thông tin cho khách và theo dõi thực hiện';
}
const identity={id:z.string().uuid(),operationId:z.string().uuid()};
export const FLAG_KEY=/^(?:setting:allowReceptionistTourSales|room:(?:ota|contact):\S{1,200}|complaint:(?:(?:ota|contact):\S{1,240}|handoff:[0-9a-f-]{36})|check:\d{4}-\d{2}-\d{2}:(?:morning|afternoon|night):[a-z]\d)$/;
export const operationsCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),...identity,sourceKind:z.enum(['ota','contact']),sourceId:z.string().min(1).max(120),version:z.number().int().nonnegative(),task:operationInput}),
 z.object({action:z.literal('handoff'),...identity,propertyId:z.enum(['luxe-75pht','luxe-suites','unverified','demo']),day:date.refine(Boolean),shift:z.string().trim().min(2).max(60),recipient:z.string().trim().min(2).max(80),body:z.string().trim().min(3).max(4000),
  room:z.string().trim().max(40).default(''),bookingRef:z.string().trim().max(40).default(''),stage:z.enum(['','PRE_STAY','IN_STAY','POST_STAY']).default(''),category:z.enum(['','ROOM_REQUEST','TRANSFER_SPA','TOUR_LEAD','COMPLAIN']).default(''),author:z.string().trim().max(80).default('')}),
 // Front-desk flags: tour-sales switch, room readiness, resolved complaints, checklist ticks.
 z.object({action:z.literal('flag'),operationId:z.string().uuid(),key:z.string().regex(FLAG_KEY,'Khóa không hợp lệ'),value:z.string().trim().max(300)}),
 z.object({action:z.literal('receive'),...identity}),
]);
