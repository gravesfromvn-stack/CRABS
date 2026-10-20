'use client';
import {useEffect,useState} from 'react';
import {ExternalLink,Copy,MessagesSquare,FlaskConical} from 'lucide-react';
import {maskText} from '../lib/hotel-policy-config';
import type {ChatTurn} from '../lib/conversation-sim';
import {TranslateText} from './translate-text';

// Chat-style view of one OTA conversation. "Hội thoại": guest messages, replies Cua recorded as
// sent, and the current draft (not sent). "Mô phỏng trả lời": what the system would reply after
// each guest message, using only what was known then; nothing is saved or sent.
type Ev={id:string;guest_text:string;full_text:string;received:string;kind:string;reason?:string};
type Sent={id:string;body:string;created:string};
type Draft={revision:number;status:string;body:string;created:string;stale?:boolean};
const time=(s:string)=>s?new Date(s).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
const sourceLabel:Record<string,string>={template:'Từ mẫu đã duyệt',rules:'Theo quy tắc + cấu hình khách sạn',fallback:'Cần Cua soạn'};

export function OtaChat({threadId,events,sent,draft,present,source}:{threadId:string;events:Ev[];sent:Sent[];draft?:Draft;present:boolean;source:(id:string)=>string}){
 const [auto,setAuto]=useState<'vi'|'en'|null>(null),[tab,setTab]=useState<'live'|'sim'>('live'),[sim,setSim]=useState<ChatTurn[]|null>(null),[error,setError]=useState(''),[copied,setCopied]=useState(-1);
 useEffect(()=>{setSim(null);setTab('live');setError('');},[threadId]);
 useEffect(()=>{if(tab!=='sim'||sim)return;let stop=false;fetch('/api/ota?simulate=1&id='+encodeURIComponent(threadId)).then(r=>r.json() as Promise<{simulation?:ChatTurn[];error?:string}>).then(d=>{if(stop)return;if(d.simulation)setSim(d.simulation);else setError(d.error||'Chưa mô phỏng được.');}).catch(()=>{if(!stop)setError('Chưa mô phỏng được.');});return()=>{stop=true;};},[tab,sim,threadId]);
 const show=(s:string)=>maskText(s,present);
 const guest=events.filter(e=>e.kind==='guest'&&e.guest_text);
 const live=[...guest.map(e=>({at:e.received,role:'guest' as const,e})),...sent.map(s=>({at:s.created,role:'hotel' as const,s}))].sort((a,b)=>a.at.localeCompare(b.at));
 async function copy(text:string,i:number){try{await navigator.clipboard.writeText(text);setCopied(i);setTimeout(()=>setCopied(-1),1500);}catch{setError('Trình duyệt chưa cho sao chép.');}}
 return <section className="ota-chat" aria-label="Hộp hội thoại">
  <div className="ota-chat-tabs" role="tablist"><button role="tab" aria-selected={tab==='live'} onClick={()=>setTab('live')}><MessagesSquare size={14}/>Hội thoại ({guest.length} tin khách · {sent.length} đã gửi)</button><button role="tab" aria-selected={tab==='sim'} onClick={()=>setTab('sim')}><FlaskConical size={14}/>Mô phỏng trả lời từng lượt</button></div>
  <div className="translate-all"><span>Dịch cả hội thoại:</span>{(['vi','en'] as const).map(t=><button key={t} type="button" aria-pressed={auto===t} onClick={()=>setAuto(a=>a===t?null:t)}>{t==='vi'?'Tiếng Việt':'English'}</button>)}{auto&&<small>Tin nào chưa tự dịch được thì bấm "Dịch" ngay dưới tin đó.</small>}</div>
  {error&&<p className="ota-chat-note error">{error}</p>}
  {tab==='live'&&<div className="ota-chat-box">
   {live.map((x,i)=>x.role==='guest'?<div key={'g'+i} className="bubble guest"><div className="meta"><strong>Khách</strong><time>{time(x.at)}</time><a href={source(x.e.id)} target="_blank" rel="noopener noreferrer" aria-label="Mở email nguồn"><ExternalLink size={12}/></a></div><p>{show(x.e.guest_text)}</p><TranslateText text={show(x.e.guest_text)} auto={auto} compact/>{x.e.reason&&<small>{x.e.reason}</small>}<details><summary>Email gốc</summary><pre className="ota-source">{show(x.e.full_text)}</pre></details></div>
    :<div key={'s'+i} className="bubble hotel sent"><div className="meta"><strong>Khách sạn · đã gửi (Cua ghi nhận)</strong><time>{time(x.at)}</time></div><p>{show(x.s.body)}</p><TranslateText text={show(x.s.body)} auto={auto} compact/></div>)}
   {draft&&draft.body&&draft.status!=='sent'&&<div className="bubble hotel draft"><div className="meta"><strong>Nháp v{draft.revision} · {draft.status==='approved'?'đã duyệt, chưa gửi':'chờ duyệt'}{draft.stale?' · có tin mới sau nháp này':''}</strong><time>{time(draft.created)}</time></div><p>{show(draft.body)}</p><TranslateText text={show(draft.body)} auto={auto} compact/><small>Sửa và duyệt ở khung "Nháp để Cua duyệt" bên dưới.</small></div>}
   {!sent.length&&<p className="ota-chat-note">Chưa có câu trả lời nào được ghi nhận đã gửi cho hội thoại này. Xem tab "Mô phỏng trả lời từng lượt" để thấy hệ thống sẽ trả lời thế nào.</p>}
  </div>}
  {tab==='sim'&&<div className="ota-chat-box">
   <p className="ota-chat-note">Mô phỏng: sau mỗi tin khách, hệ thống soạn trả lời chỉ với thông tin có tại thời điểm đó (quy định, giá đã duyệt, mẫu đã duyệt). Không lưu, không gửi khách.</p>
   {!sim&&!error&&<p className="ota-chat-note">Đang mô phỏng…</p>}
   {sim?.map((t,i)=>t.role==='guest'?<div key={i} className="bubble guest"><div className="meta"><strong>Khách</strong><time>{time(t.at)}</time></div><p>{show(t.text)}</p><TranslateText text={show(t.text)} auto={auto} compact/></div>
    :<div key={i} className={'bubble hotel sim '+(t.source||'')}><div className="meta"><strong>Khách sạn · mô phỏng</strong><span className="tag">{t.template?`Mẫu "${t.template}"`:sourceLabel[t.source||'rules']}</span><button className="icon-button" aria-label="Sao chép câu trả lời" onClick={()=>copy(t.text,i)}><Copy size={13}/>{copied===i?' Đã chép':''}</button></div><p>{show(t.text)}</p><TranslateText text={show(t.text)} auto={auto} compact/>{t.notes.length>0&&<details><summary>Ghi chú nội bộ ({t.notes.length})</summary><ul>{t.notes.map((n,j)=><li key={j}>{n}</li>)}</ul></details>}</div>)}
  </div>}
 </section>;
}
