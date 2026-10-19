'use client';
import {ShieldCheck,MessageCircle} from 'lucide-react';
import {formatMoney,type PropertyPolicy} from '../lib/hotel-policy-config';
import {whatsappLink,type GuestContact} from '../lib/guest-contact';
import {usePresentation} from './use-presentation';
import type {TourAdvice,DraftProblem} from '../lib/tour-advice';
import type {FactChange} from '../lib/ota-profile';
import {intentLabels,type Intent} from '../lib/guest-intent';

// Internal advice view for Cua: what the guest gave, what is still open, sourced options with
// price status, transport cautions and draft checks. Nothing here is copied into the guest draft.
export type AdviceView={tour?:TourAdvice;checks?:DraftProblem[];roomTasks?:{title:string;status:string;evidence:string}[];history?:FactChange[];contact?:GuestContact;policy?:PropertyPolicy|null;guestName?:string;whatsappMessage?:string};
const vnd=(n:number|null)=>n===null?'—':formatMoney(n,true);
const margin=(price:number|null,cost:number|null,commission:number|null)=>price===null||cost===null?'—':formatMoney(price-cost-(commission||0),true)+(commission===null?' (chưa trừ hoa hồng)':'');
const statusLabel:Record<TourAdvice['status'],string>={none:'Chưa nhắc tour',interested:'Đang quan tâm',deferred:'Để sau',declined:'Không cần'};
export function OtaAdvicePanel({view}:{view:AdviceView}){
 const a=view.tour,checks=view.checks||[],rooms=view.roomTasks||[],history=view.history||[];
 const contact=view.contact,policy=view.policy,present=usePresentation();
 if(!a&&!checks.length&&!rooms.length&&!policy)return null;
 const tourTalk=a?.status==='interested';
 const greeting=`Hello${view.guestName?' '+view.guestName:''}, this is the reception team. As promised on your booking messages, here is the detailed itinerary and photos for the tour you asked about. Which date suits you best?`;
 const c=a?.constraints;
 const given=c?([['Ngày',c.date],['Số người',c.party],['Trẻ em',c.children?(c.childAges.length?c.childAges.join(', ')+' tuổi':'Có · chưa rõ tuổi'):''],['Đi lại',c.mobility],['Thời gian rảnh',c.halfDay],['Ngân sách',c.budget],['Ưu tiên',c.preference],['Hành lý',c.luggage],['Đi nhiều ngày',c.multiDay?'Có':'']] as [string,string][]).filter(([,v])=>v):[];
 const decisions=(a?.internal||[]).filter(x=>/Cua|Cần|không|KHÔNG|chưa/.test(x));
 return <details className="ota-advice" aria-label="Tư vấn nội bộ" open={Boolean(tourTalk||contact)}>
  <summary className="ota-advice-head"><ShieldCheck size={15}/><strong>Tư vấn nội bộ · dịch vụ & tour</strong><span>Chỉ Cua xem · không gửi khách · bấm để mở/thu gọn</span></summary>
  <div className="ota-advice-grid">
   {a&&<div><h4>Khách đã cho</h4>{given.length?<dl>{given.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>:<p className="muted">Chưa có ngày, số người hay ràng buộc.</p>}
    {a.destinations.length>0&&<p>Điểm đến: {a.destinations.map(d=>d.label.vi).join(', ')} · {statusLabel[a.status]}</p>}
    {a.intent&&a.intent.intents.length>0&&<div className="ota-chips">{a.intent.intents.map(i=><span key={i} className="ota-chip">{intentLabels[i as Intent]}</span>)}</div>}
    {a.intent?.confirms&&<p className="warn">“Yes” xác nhận: {a.intent.confirms.known?a.intent.confirms.target:'không rõ câu nào — Cua kiểm tra'}</p>}
    {history.length>0&&<details><summary>Khách đã sửa {history.length} thông tin</summary><ul>{history.map((h,i)=><li key={i}>{h.summary} <em>(đã thay)</em></li>)}</ul></details>}
   </div>}
   {a&&<div><h4>Cần hỏi / chưa xác nhận</h4>{a.questions.length?<ul>{a.questions.map((q,i)=><li key={i}>{q.vi}</li>)}</ul>:<p className="muted">Không cần hỏi thêm để tư vấn.</p>}
    {decisions.length>0&&<><h4>Việc Cua quyết định</h4><ul>{decisions.map((x,i)=><li key={i}>{x}</li>)}</ul></>}
   </div>}
   {rooms.length>0&&<div><h4>Yêu cầu phòng</h4><ul>{rooms.map((r,i)=><li key={i}><strong>{r.title}</strong> · {r.status}{r.evidence?' · '+r.evidence:''}</li>)}</ul></div>}
   {checks.length>0&&<div><h4>Kiểm tra nháp hiện tại</h4><ul>{checks.map((p,i)=><li key={i} className={p.hard?'block':'warn'}>{p.hard?'Chặn duyệt: ':'Lưu ý: '}{p.text}</li>)}</ul></div>}
  </div>
  {(tourTalk||contact)&&<div className="ota-advice-whatsapp"><h4><MessageCircle size={14}/> Tư vấn tour qua WhatsApp</h4>{contact?<><p>Số khách để lại: <strong>{contact.display}</strong> <a className="button secondary" href={whatsappLink(contact,view.whatsappMessage||greeting)} target="_blank" rel="noopener noreferrer">Mở WhatsApp Web</a><small>Tin nhắn điền sẵn: thông tin tour trước, chưa có giá; Cua đọc lại và gửi thủ công.</small></p>{view.whatsappMessage&&<details><summary>Xem tin nhắn WhatsApp sẽ điền sẵn</summary><pre className="ota-source">{view.whatsappMessage}</pre></details>}</>:<p className="muted">Khách chưa để số WhatsApp. Nháp trên Extranet đã xin số để gửi lịch trình chi tiết.</p>}</div>}
  {policy&&<div className="ota-advice-options"><h4>Dịch vụ chốt trên Extranet · {present?policy.demoName:policy.displayName}</h4>
   <p>Nhận phòng {policy.checkIn} · trả phòng {policy.checkOut}. Nhận sớm {policy.earlyCheckIn.from}–{policy.earlyCheckIn.until}: {policy.earlyCheckIn.fee.vi}. Trả muộn đến {policy.lateCheckOut.until}: {policy.lateCheckOut.fee.vi}.</p>
   <table><thead><tr><th>Xe sân bay</th><th>Đón</th><th>Tiễn</th><th>Lãi/chiều (đón)</th></tr></thead><tbody>{policy.airportTransfer.vehicles.map(v=><tr key={v.id}><td>{v.seats} chỗ · tối đa {v.maxGuests} khách</td><td>{vnd(v.pickup)}</td><td>{vnd(v.dropoff)}</td><td>{margin(v.pickup,v.cost,v.commission)}</td></tr>)}</tbody></table>
   <small className={policy.airportTransfer.approved?'ok':'ref'}>{policy.airportTransfer.approved?'Giá xe đã duyệt · nháp được điền giá':'Giá xe chưa duyệt · nháp không nêu giá'} · {policy.airportTransfer.approvedNote}</small>
   <p>Spa: {policy.spa.approved&&policy.spa.items.some(i=>i.price!==null)?policy.spa.items.filter(i=>i.price!==null).map(i=>`${i.name.vi} ${i.minutes}′ ${vnd(i.price)}`).join(' · '):<span className="ref">{policy.spa.note}</span>}</p>
   {policy.tours.products.length>0&&<table><thead><tr><th>Tour chủ lực</th><th>Giá từ</th><th>Giá bán / vốn</th><th>Lãi dự kiến</th><th>Trạng thái</th></tr></thead><tbody>{policy.tours.products.map(t=><tr key={t.id}><td>{t.title.vi}</td><td>{vnd(t.fromPrice)}</td><td>{vnd(t.price)} / {vnd(t.cost)}</td><td>{margin(t.price,t.cost,t.commission)}</td><td className={t.approved?'ok':'ref'}>{t.approved?'Đã duyệt':'Chờ Cua duyệt'}</td></tr>)}</tbody></table>}
  </div>}
  {a&&a.options.length>0&&<div className="ota-advice-options"><h4>Phương án đề xuất ({a.options.length})</h4>{a.options.map(o=><article key={o.id}>
   <div className="ota-heading-line"><strong>{o.title}</strong><span className={o.approvedPrice?'ok':'ref'}>{o.approvedPrice?'Giá đã duyệt':'Tham khảo · Cần Cua chốt giá'}</span></div>
   <p>Vì sao: {o.why}</p><small>{o.id} · {o.verification}{o.internal.sheetRange?' · '+o.internal.sheetRange:''}{o.transportIncluded?' · đã gồm xe từ Hà Nội':''}</small>
   <p className="muted">{o.internal.priceStatus}</p>
   {o.variants&&o.variants.length>0&&<table><thead><tr><th>Biến thể</th><th>Mức tại nguồn</th><th>Trạng thái giá</th></tr></thead><tbody>{o.variants.map(v=><tr key={v.id}><td>{v.id} · {v.title}</td><td>{v.price}</td><td>{v.status}</td></tr>)}</tbody></table>}
   {o.internal.gaps.length>0&&<details><summary>Còn thiếu / cần xác nhận ({o.internal.gaps.length})</summary><ul>{o.internal.gaps.map((g,i)=><li key={i}>{g}</li>)}</ul></details>}
   {o.internal.sourceUrl&&<a href={o.internal.sourceUrl} target="_blank" rel="noopener noreferrer">Nguồn</a>}
  </article>)}</div>}
  {a?.transport?.some(t=>t.rows.length)&&<div className="ota-advice-options"><h4>Xe tham khảo (lịch mẫu, chưa phải chỗ trống)</h4>{a.transport.filter(t=>t.rows.length).map(t=><details key={t.place}><summary>{t.place} · {t.rows.length} dòng</summary><table><thead><tr><th>Nhà xe / hạng</th><th>Giờ chạy (mẫu)</th><th>Thời lượng · đón</th><th>Mức nguồn</th></tr></thead><tbody>{t.rows.map(r=><tr key={r.id}><td>{r.id} · {r.supplier} · {r.vehicleClass}</td><td>{r.departures}</td><td>{r.duration}{r.pickup?' · '+r.pickup:''}</td><td>{r.price||'—'}</td></tr>)}</tbody></table><ul>{[...new Set(t.rows.flatMap(r=>r.cautions))].map(x=><li key={x}>{x}</li>)}</ul></details>)}</div>}
 </details>;
}
