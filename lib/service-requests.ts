import type {OperationTask,OperationSource,OperationInput} from './operations';
import {transferConfirmation,flightUpdate,monthIndex} from './transfer-confirm';

// Service requests (airport car, tour, spa) are reception tasks; their stage is read from the
// task's own fields, so the operations rules (guest decision ≠ supplier confirmation) still apply.
export const SERVICE_KINDS=['pickup','dropoff','tour','spa'] as const;
export const stageLabels={new:'Mới yêu cầu',quoted:'Đã báo giá',accepted:'Khách đã chốt',dispatched:'Đã điều xe/NCC',done:'Hoàn thành',closed:'Đã hủy / khách từ chối'} as const;
export type Stage=keyof typeof stageLabels;
export const kindLabels:Record<string,string>={pickup:'Xe đón sân bay',dropoff:'Xe tiễn sân bay',tour:'Tour',spa:'Spa'};

export function serviceStage(t:Pick<OperationTask,'state'|'guestDecision'|'supplierStatus'|'priceVnd'>):Stage{
 if(t.state==='cancelled'||t.guestDecision==='declined')return 'closed';
 if(t.state==='done')return 'done';
 if(t.supplierStatus==='confirmed')return 'dispatched';
 if(t.guestDecision==='accepted')return 'accepted';
 if(t.priceVnd!==null&&t.priceVnd!==undefined)return 'quoted';
 return 'new';
}

// A ready-to-save request from the guest's own messages: the latest car confirmation, updated by a
// later flight change. The guest's words are kept as evidence of acceptance.
export function suggestServiceRequest(source:Pick<OperationSource,'sourceKey'|'checkIn'|'checkOut'>,messages:{body:string;at:string}[]):OperationInput|null{
 let found:{c:NonNullable<ReturnType<typeof transferConfirmation>>;quote:string}|null=null,time='';
 for(const m of messages){const c=transferConfirmation(m.body);if(c){found={c,quote:m.body};time=c.time;continue;}const u=found&&flightUpdate(m.body);if(u)time=u.time;}
 if(!found)return null;
 const {c,quote}=found,year=(source.checkIn||source.checkOut||new Date().toISOString()).slice(0,4);
 const [d,mon]=c.date.split(' '),mi=mon?monthIndex(mon):-1;
 const serviceDate=d&&mi>=0?`${year}-${String(mi+1).padStart(2,'0')}-${d.padStart(2,'0')}`:(c.direction==='pickup'?source.checkIn:source.checkOut)||'';
 return {title:`${kindLabels[c.direction]}${c.flight?' · '+c.flight:''}${c.seats?` · xe ${c.seats} chỗ`:''}`,kind:c.direction,assignee:'',due:'',serviceDate,serviceTime:time,
  details:[c.route&&`Chặng bay: ${c.route}`,c.terminal&&`Nội Bài ga ${c.terminal}`,time!==c.time&&c.time?`Giờ hạ cánh ban đầu ${c.time}, khách báo đổi sang ${time}`:''].filter(Boolean).join('\n'),
  state:'open',guestDecision:'accepted',guestEvidence:('Khách nhắn: '+quote.replace(/\s+/g,' ')).slice(0,1200),supplierStatus:'unchecked',supplierEvidence:'',note:'',reviewedSourceKey:source.sourceKey,
  flightCode:c.flight,carType:c.seats?`Xe ${c.seats} chỗ`:'',priceVnd:c.price};
}

// CSV for the airport-car sheet (Data Luxe Paradise 75PHT · Xe sân bay); columns can be pasted into the tab.
export function airportCsv(tasks:OperationTask[],sources:OperationSource[]){
 const head=['Ngày','Giờ','Chiều','Khách','Mã booking','Cơ sở','Chuyến bay','Loại xe','Giá bán (VND)','Trạng thái','Khách đồng ý','Nhà xe','Ghi chú'];
 const esc=(v:unknown)=>{const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;};
 const rows=tasks.filter(t=>t.kind==='pickup'||t.kind==='dropoff').sort((a,b)=>(a.serviceDate+a.serviceTime).localeCompare(b.serviceDate+b.serviceTime)).map(t=>{const s=sources.find(x=>x.kind===t.sourceKind&&x.id===t.sourceId);
  return [t.serviceDate,t.serviceTime,t.kind==='pickup'?'Đón':'Tiễn',s?.name||'',s?.bookingId||'',s?.propertyLabel||'',t.flightCode,t.carType,t.priceVnd??'',stageLabels[serviceStage(t)],t.guestDecision==='accepted'?'Có':'Chưa',t.supplierStatus==='confirmed'?'Đã xác nhận':'Chưa',t.details.replace(/\n/g,' · ')];});
 return '﻿'+[head,...rows].map(r=>r.map(esc).join(',')).join('\n');
}

// Two phases for the dashboard: still expected (asked / quoted) or confirmed by the guest onwards.
export const phaseOf=(s:Stage)=>s==='new'||s==='quoted'?'expected':s==='closed'?'closed':'confirmed';
export const phaseLabels={expected:'Dự kiến / Chờ xác nhận',confirmed:'Đã xác nhận (khách chốt)',closed:'Đã hủy'} as const;
// Reception tasks for billing are "other" tasks whose title starts with the tag.
export const isServiceTask=(t:Pick<OperationTask,'kind'|'title'>)=>(SERVICE_KINDS as readonly string[]).includes(t.kind)||t.kind==='other'&&/^\[(?:HÓA ĐƠN|THANH TOÁN)/.test(t.title);

// Requests the guest is only asking about (not confirmed): car, tour, spa, invoice, paying for someone.
export function detectAsks(source:Pick<OperationSource,'sourceKey'|'checkIn'|'checkOut'|'messages'>):OperationInput[]{
 const text=source.messages.map(m=>m.body).join('\n'),n=text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d');
 const base=(kind:OperationInput['kind'],title:string,serviceDate:string,quote:string):OperationInput=>({title,kind,assignee:'',due:'',serviceDate,serviceTime:'',details:'',state:'open',guestDecision:'interested',guestEvidence:('Khách nhắn: '+quote.replace(/\s+/g,' ')).slice(0,1200),supplierStatus:'unchecked',supplierEvidence:'',note:'',reviewedSourceKey:source.sourceKey,flightCode:'',carType:'',priceVnd:null});
 const quote=(re:RegExp)=>source.messages.find(m=>re.test(m.body.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')))?.body||'';
 const out:OperationInput[]=[];
 const leave=/(?:leave|leaving|head|go(?:ing)?) for (?:the )?airport|to (?:the )?airport|drop.?off|xe tien/;
 if(/pick.?up|from (?:the )?airport|xe don/.test(n)&&!/(?:no|not|don.t) need.{0,20}pick/.test(n))out.push(base('pickup','Xe đón sân bay · khách hỏi',source.checkIn,quote(/pick.?up|from (?:the )?airport|xe don/)));
 if(leave.test(n)||/airport transfer/.test(n)&&!/pick.?up/.test(n))out.push(base('dropoff','Xe tiễn sân bay · khách hỏi',source.checkOut,quote(/airport|drop.?off|xe tien/)));
 if(/\b(?:tour|day trip|excursion|cruise)\b/.test(n))out.push(base('tour','Tour · khách hỏi','',quote(/tour|day trip|excursion|cruise/)));
 if(/\bspa\b|massage/.test(n))out.push(base('spa','Spa · khách hỏi','',quote(/spa|massage/)));
 if(/invoice|\bvat\b|hoa don/.test(n))out.push({...base('other','[HÓA ĐƠN VAT] Xuất hóa đơn điện tử gửi email',source.checkOut,quote(/invoice|vat|hoa don/)),details:'Lấy tên công ty, mã số thuế, địa chỉ, email nhận hóa đơn. Chuyển Lễ tân & Kế toán.'});
 if(/on behalf of|for my client|dat ho/.test(n)&&/credit card|pay|thanh toan|message me|whats ?app/.test(n))out.push({...base('other','[THANH TOÁN HỘ] Thu tiền trước qua WhatsApp',source.checkIn,quote(/on behalf|client|dat ho/)),details:'Khách đặt hộ, cần thu tiền trước qua link thanh toán bảo mật. Theo dõi trạng thái thanh toán trước khi khách ở nhận phòng. Không nhận số thẻ qua tin nhắn OTA.'});
 return out;
}
