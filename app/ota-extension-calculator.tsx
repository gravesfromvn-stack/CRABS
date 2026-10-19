'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarPlus} from 'lucide-react';
import {formatMoney} from '../lib/hotel-policy-config';
import {extensionQuote,extensionMessage,dmy,type ExtensionOption} from '../lib/extension-quote';

// Direct extension calculator: Cua reads the booked rate and the current OTA rates in the extranet,
// enters them here, picks an option and inserts the guest reply into the draft. Nothing is sent.
export type ExtensionAsk={nights:number;checkOut:string;guests:number;rooms:number};
const num=(s:string)=>{const n=Number(s.replace(/[^\d]/g,''));return s.trim()&&Number.isFinite(n)&&n>0?n:null;};
export function ExtensionCalculator({ask,discountPercent,vi,onInsert}:{ask:ExtensionAsk;discountPercent:number;vi:boolean;onInsert:(text:string,amounts:number[])=>void}){
 const [nights,setNights]=useState(ask.nights),[room,setRoom]=useState(''),[booked,setBooked]=useState(''),[same,setSame]=useState(''),[rates,setRates]=useState<string[]>([]),[option,setOption]=useState<ExtensionOption>('ota_minus'),[lang,setLang]=useState(vi);
 useEffect(()=>{setNights(ask.nights);},[ask.nights,ask.checkOut]);
 const current=Array.from({length:nights},(_,i)=>num(rates[i]??'')??num(same));
 const input={checkOut:ask.checkOut,nights,roomType:room,bookedRate:num(booked),currentRates:current,discountPercent,guests:ask.guests};
 const r=useMemo(()=>extensionQuote(input),[JSON.stringify(input)]);
 const msg=extensionMessage(input,r,option,lang);
 const money=(n:number|null)=>n===null?'—':formatMoney(n,true);
 return <section className="ota-extension" aria-label="Báo giá gia hạn trực tiếp">
  <h4><CalendarPlus size={15}/> Khách hỏi gia hạn · báo giá trực tiếp (không qua OTA)</h4>
  <p className="muted">Trả phòng hiện tại {dmy(ask.checkOut)} · {ask.guests?`${ask.guests} khách`:'chưa rõ số khách'}{ask.rooms?` · ${ask.rooms} phòng`:''}. Xem loại phòng, giá khách đã đặt và giá đang bán trên admin Booking cho các đêm thêm rồi nhập vào đây.</p>
  <div className="ext-grid">
   <label>Số đêm thêm<input type="number" min={1} max={30} value={nights} onChange={e=>setNights(Math.max(1,Math.min(30,Number(e.target.value)||1)))}/></label>
   <label>Loại phòng khách đã đặt<input value={room} onChange={e=>setRoom(e.target.value)} placeholder="VD: Deluxe Double Room"/></label>
   <label>Giá khách đã đặt / đêm (VND)<input inputMode="numeric" value={booked} onChange={e=>setBooked(e.target.value)} placeholder="VD: 1200000"/></label>
   <label>Giá đang bán trên Booking / đêm (áp mọi đêm)<input inputMode="numeric" value={same} onChange={e=>setSame(e.target.value)} placeholder="VD: 1350000"/></label>
  </div>
  <details><summary>Nhập giá Booking riêng từng đêm (nếu khác nhau)</summary><div className="ext-grid">{r.dates.map((d,i)=><label key={d}>Đêm {dmy(d)}<input inputMode="numeric" value={rates[i]??''} onChange={e=>{const next=[...rates];next[i]=e.target.value;setRates(next);}} placeholder={same||'giá Booking'}/></label>)}</div></details>
  <table><thead><tr><th>Đêm</th><th>Giá đã đặt</th><th>Giá Booking hiện tại</th><th>Booking −{discountPercent}%</th></tr></thead><tbody>{r.perNight.map(p=><tr key={p.date}><td>{dmy(p.date)}</td><td>{money(p.keep)}</td><td>{money(p.ota)}</td><td>{money(p.otaMinus)}</td></tr>)}<tr className="total"><td>Tổng {nights} đêm</td><td>{money(r.keepTotal)}</td><td>{money(r.otaTotal)}</td><td>{money(r.otaMinusTotal)}</td></tr></tbody></table>
  <small>Khách trả phòng mới: {dmy(r.newCheckOut)}{r.saving!==null?` · khách tiết kiệm ${money(r.saving)} so với giá online`:''}. Gia hạn trực tiếp không mất commission OTA.</small>
  <div className="ext-options">
   <label><input type="radio" checked={option==='keep'} onChange={()=>setOption('keep')}/> Phương án 1 · giữ nguyên giá đã đặt {r.keepTotal!==null&&`(${money(r.keepTotal)})`}</label>
   <label><input type="radio" checked={option==='ota_minus'} onChange={()=>setOption('ota_minus')}/> Phương án 2 · giá Booking −{discountPercent}% {r.otaMinusTotal!==null&&`(${money(r.otaMinusTotal)})`}</label>
   <label><input type="checkbox" checked={lang} onChange={e=>setLang(e.target.checked)}/> Trả lời tiếng Việt</label>
  </div>
  {msg.text?<><pre className="ota-source">{msg.text}</pre><button className="button primary" type="button" onClick={()=>onInsert(msg.text,msg.amounts)}>Chèn vào nháp</button><small>Sau khi chèn: đọc lại, bấm Lưu nháp rồi Duyệt. Giá này được ghi là "Giá Cua tính" nên qua được bước kiểm tra.</small></>:<p className="muted">Nhập giá để tạo câu trả lời cho phương án đã chọn.</p>}
 </section>;
}
