'use client';
import {useState} from 'react';
import {Copy,Check,Clock3,ShieldCheck} from 'lucide-react';
import {managerAlerts,type OperationsData,type OperationSource,type Handoff} from '../lib/operations';
import {etaLabels,readinessLabels,defaultReadiness,checklistFor,shifts,shiftAt,vietnamClock,roleViewLabels,stageLabels,handoffCategories,type RoomReadiness,type ShiftKey,type CheckMetric,type StayStage,type HandoffCategory} from '../lib/front-desk';
import {useRoleView,RoleSwitch} from './role-view';

type Flag=(key:string,value:string,message:string)=>Promise<boolean>;
const flagValue=(data:OperationsData,key:string)=>data.flags.find(f=>f.key===key)?.value||'';
export const readinessOf=(data:OperationsData,s:OperationSource):RoomReadiness=>(flagValue(data,'room:'+s.key) as RoomReadiness)||(s.eta?defaultReadiness(s.eta):'WAITING_ETA');

// Check-in day board: arrival time status, room readiness at the desk, one-tap ETA question.
export function EtaBoard({data,arrivals,busy,onFlag}:{data:OperationsData;arrivals:OperationSource[];busy:boolean;onFlag:Flag}){
 const [copied,setCopied]=useState('');
 const order={MISSING_ETA:0,EARLY_ARRIVAL:1,CONFIRMED_ETA:2};
 const list=[...arrivals].sort((a,b)=>order[a.eta?.status||'MISSING_ETA']-order[b.eta?.status||'MISSING_ETA']||(a.eta?.time||'99').localeCompare(b.eta?.time||'99'));
 const missing=list.filter(s=>s.eta?.status==='MISSING_ETA').length;
 async function copy(s:OperationSource){try{await navigator.clipboard.writeText(s.etaPrompt||'');setCopied(s.key);setTimeout(()=>setCopied(''),2500);}catch{alert('Trình duyệt chặn sao chép.');}}
 return <section className="ops-section"><div className="ops-section-head"><h2>Giờ khách về (ETA) · check-in hôm nay</h2>{missing>0&&<span className="ops-pill warning">{missing} khách chưa có giờ về</span>}</div>
  <p className="ops-help">Giờ về đọc từ tin khách (giờ đến khách sạn; giờ hạ cánh cộng ~60 phút đường từ Nội Bài). Đến trước giờ nhận phòng = ưu tiên dọn phòng #1. Trạng thái phòng do lễ tân bấm cập nhật.</p>
  {list.length?list.map(s=>{const st=s.eta?.status||'MISSING_ETA',ready=readinessOf(data,s);return <article key={s.key} className={'ops-eta '+st.toLowerCase()}>
   <div className="ops-eta-main"><strong>{s.name}</strong><small>{s.bookingId||s.id} · {s.channel}</small><span className={'eta-pill '+st.toLowerCase()}>{etaLabels[st]}{s.eta?.time?` · ${s.eta.time}`:''}{s.eta?.flight?` · ${s.eta.flight}`:''}{s.eta?.basis==='landing'?' (từ giờ hạ cánh)':s.eta?.basis==='pickup'?' (đã đặt xe đón)':''}</span>{s.eta?.quote&&<small className="ops-eta-quote">“{s.eta.quote}”</small>}</div>
   <div className="ops-eta-actions"><label>Phòng<select disabled={busy} value={ready} onChange={e=>onFlag('room:'+s.key,e.target.value,`Đã cập nhật phòng của ${s.name}: ${readinessLabels[e.target.value as RoomReadiness]}.`)}>{(Object.keys(readinessLabels) as RoomReadiness[]).map(k=><option key={k} value={k}>{readinessLabels[k]}</option>)}</select></label>
    {st==='MISSING_ETA'&&s.etaPrompt&&<button type="button" className="button primary" onClick={()=>copy(s)}>{copied===s.key?<Check size={15}/>:<Copy size={15}/>}{copied===s.key?'Đã copy':'Copy Prompt Hỏi Giờ Về (ETA)'}</button>}</div>
  </article>;}):<p className="ops-empty">Không có khách check-in ngày này trong phạm vi đã chọn.</p>}
 </section>;
}

// Shift checklist by time of day and account view; ticks are saved per day and shift.
export function ShiftChecklist({data,day,arrivals,busy,onFlag}:{data:OperationsData;day:string;arrivals:OperationSource[];busy:boolean;onFlag:Flag}){
 const role=useRoleView(),[shift,setShift]=useState<ShiftKey>(()=>shiftAt(vietnamClock()));
 const alerts=managerAlerts(data.sources,data.handoffs,data.flags);
 const metric:Record<CheckMetric,{n:number;label:string}>={complaints:{n:alerts.length,label:'phàn nàn chưa giải quyết'},missingEta:{n:arrivals.filter(s=>s.eta?.status==='MISSING_ETA').length,label:'khách thiếu ETA'},handoffs:{n:data.handoffs.filter(h=>!h.received_at&&h.day<=day).length,label:'bàn giao chưa ký nhận'},arrivals:{n:arrivals.length,label:'khách check-in'},lateArrivals:{n:arrivals.filter(s=>(s.eta?.time||'')>='19:00').length,label:'khách đến sau 19:00'}};
 const items=checklistFor(shift,role),done=items.filter(i=>flagValue(data,`check:${day}:${shift}:${i.id}`)).length;
 return <section className="ops-section"><div className="ops-section-head"><h2>Checklist đầu ca</h2><span className="ops-count">{done}/{items.length}</span></div>
  <div className="ops-shift-picker" role="group" aria-label="Chọn ca">{(Object.keys(shifts) as ShiftKey[]).map(k=><button type="button" key={k} className={shift===k?'active':''} aria-pressed={shift===k} onClick={()=>setShift(k)}><Clock3 size={14}/>{shifts[k].label} {shifts[k].from}–{shifts[k].to}</button>)}<RoleSwitch/></div>
  <p className="ops-help">Ca mặc định theo giờ hiện tại ({vietnamClock()}); bấm để chuyển khi demo. Góc nhìn {roleViewLabels[role]} chỉ hiện việc của vai trò này.</p>
  <ol className="ops-checklist">{items.map(i=>{const key=`check:${day}:${shift}:${i.id}`,ticked=Boolean(flagValue(data,key)),m=i.metric&&metric[i.metric];
   return <li key={i.id} className={ticked?'done':''}><label><input type="checkbox" disabled={busy} checked={ticked} onChange={e=>onFlag(key,e.target.checked?new Date().toISOString():'',e.target.checked?'Đã đánh dấu việc đầu ca.':'Đã bỏ đánh dấu.')}/><span>{i.text}{m&&<em className={m.n?'warn':''}>{m.n} {m.label}</em>}</span></label></li>;})}</ol>
 </section>;
}

// Structured shift log: room / booking, stage, category, detail and who wrote it.
export type HandoffExtra={room:string;bookingRef:string;stage:''|StayStage;category:''|HandoffCategory;author:string};
export const blankHandoffExtra=():HandoffExtra=>({room:'',bookingRef:'',stage:'IN_STAY',category:'ROOM_REQUEST',author:''});
export function HandoffExtraFields({value,onChange}:{value:HandoffExtra;onChange:(v:HandoffExtra)=>void}){
 const set=<K extends keyof HandoffExtra>(k:K,v:HandoffExtra[K])=>onChange({...value,[k]:v});
 return <div className="ops-handoff-grid">
  <label>Số phòng<input value={value.room} maxLength={40} placeholder="P.302" onChange={e=>set('room',e.target.value)}/></label>
  <label>Mã booking<input value={value.bookingRef} maxLength={40} placeholder="#8800000150" onChange={e=>set('bookingRef',e.target.value)}/></label>
  <label>Giai đoạn<select value={value.stage} onChange={e=>set('stage',e.target.value as HandoffExtra['stage'])}>{(Object.keys(stageLabels) as StayStage[]).map(k=><option key={k} value={k}>{stageLabels[k]}</option>)}</select></label>
  <label>Phân loại<select value={value.category} onChange={e=>set('category',e.target.value as HandoffExtra['category'])}>{(Object.keys(handoffCategories) as HandoffCategory[]).map(k=><option key={k} value={k}>{handoffCategories[k]}</option>)}</select></label>
  <label>Ca trực / người ghi<input value={value.author} maxLength={80} placeholder="Ca sáng · Lan" onChange={e=>set('author',e.target.value)}/></label>
 </div>;
}
export function HandoffMeta({h}:{h:Handoff}){
 const cat=h.category as HandoffCategory|'';
 if(!h.room&&!h.booking_ref&&!h.category&&!h.stage&&!h.author)return null;
 return <div className="ops-handoff-meta">{cat&&<span className={'smart-tag '+(cat==='COMPLAIN'?'red':cat==='TOUR_LEAD'?'purple':'blue')}>{cat==='COMPLAIN'?'[COMPLAIN]':handoffCategories[cat]}</span>}{h.room&&<span>{h.room}</span>}{h.booking_ref&&<span>{h.booking_ref}</span>}{h.stage&&<span>{stageLabels[h.stage as StayStage]}</span>}{h.author&&<span>Ghi bởi {h.author}</span>}</div>;
}

// Reception tour-sales switch (default off: tour questions go to the sales team).
export function TourSalesSwitch({on,busy,onFlag}:{on:boolean;busy:boolean;onFlag:Flag}){
 return <label className="ops-switch" title="Bật cho khách sạn nhỏ không có Saler OTA riêng"><input type="checkbox" role="switch" checked={on} disabled={busy} onChange={e=>onFlag('setting:allowReceptionistTourSales',e.target.checked?'true':'false',e.target.checked?'Đã BẬT: lễ tân tự tư vấn tour. Nháp mới dùng báo giá nhanh 3 tour.':'Đã TẮT: câu hỏi tour chuyển cho Saler.')}/><span><ShieldCheck size={14}/>Lễ tân tự bán tour: <strong>{on?'BẬT':'TẮT'}</strong></span></label>;
}

// One-tap notes for the shift log: fills the detail text and the matching category.
export const handoffChips:{label:string;text:string;category:HandoffCategory}[]=[
 {label:'[+ Khách xin thêm gối/chăn]',text:'Khách xin thêm gối/chăn: báo Buồng phòng mang lên phòng.',category:'ROOM_REQUEST'},
 {label:'[+ Dặn giờ dọn phòng]',text:'Khách dặn giờ dọn phòng: … (ghi giờ khách muốn).',category:'ROOM_REQUEST'},
 {label:'[+ Đặt xe tiễn sân bay mai]',text:'Khách đặt xe tiễn sân bay ngày mai: giờ đón … , số khách … , số vali … ; xác nhận với nhà xe.',category:'TRANSFER_SPA'},
 {label:'[+ Khách hỏi Tour -> Chuyển Saler]',text:'Khách hỏi tour: đã chuyển Saler gửi lịch trình và báo giá.',category:'TOUR_LEAD'},
 {label:'[🚨 Phàn nàn điều hòa/nước yếu/ồn]',text:'Khách phàn nàn (điều hòa / nước yếu / tiếng ồn): đã báo kỹ thuật xử lý trong 15 phút; Quản lý Lễ tân gọi lại khách.',category:'COMPLAIN'},
];
export function HandoffChips({onPick}:{onPick:(text:string,category:HandoffCategory)=>void}){
 return <div className="ops-chips" aria-label="Gợi ý ghi nhanh">{handoffChips.map(c=><button type="button" key={c.label} className={'ops-chip'+(c.category==='COMPLAIN'?' red':'')} onClick={()=>onPick(c.text,c.category)}>{c.label}</button>)}</div>;
}
