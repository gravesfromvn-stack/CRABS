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
