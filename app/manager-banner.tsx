'use client';
import {useEffect,useState} from 'react';
import {AlertTriangle,Copy,Check,ChevronDown,ChevronUp} from 'lucide-react';
import type {ManagerAlert} from '../lib/operations';
import {useRoleView} from './role-view';

// Red manager escalation banner: unresolved [COMPLAIN] guests and shift-log entries (last 30 days).
// Shown to the Quản lý / Admin view on every screen. Copying the calming message does not send it.
export function ManagerBanner(){
 const role=useRoleView(),[alerts,setAlerts]=useState<ManagerAlert[]>([]),[open,setOpen]=useState(false),[copied,setCopied]=useState(''),[error,setError]=useState('');
 const manager=role==='MANAGER'||role==='ADMIN';
 async function load(){try{const r=await fetch('/api/operations?view=alerts');if(!r.ok)return;const d=await r.json() as {alerts?:ManagerAlert[]};setAlerts(d.alerts||[]);}catch{}}
 useEffect(()=>{if(!manager)return;load();const t=setInterval(load,60000);const on=()=>load();window.addEventListener('crabs-ops-changed',on);return()=>{clearInterval(t);window.removeEventListener('crabs-ops-changed',on);};},[manager]);
 if(!manager||!alerts.length)return null;
 async function copy(a:ManagerAlert){try{await navigator.clipboard.writeText(a.prompt);setCopied(a.key);setTimeout(()=>setCopied(''),2500);}catch{setError('Trình duyệt chặn sao chép; mở hội thoại để copy.');}}
 async function resolve(a:ManagerAlert){if(!confirm(`Đánh dấu đã giải quyết phàn nàn của ${a.name}?`))return;setError('');
  const r=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'flag',operationId:crypto.randomUUID(),key:'complaint:'+a.key,value:'resolved'})});
  if(!r.ok){setError(((await r.json().catch(()=>({}))) as {error?:string}).error||'Chưa lưu được.');return;}await load();window.dispatchEvent(new Event('crabs-ops-changed'));}
 return <section className="manager-banner" role="alert" aria-live="polite">
  <button type="button" className="manager-banner-head" aria-expanded={open} onClick={()=>setOpen(!open)}><AlertTriangle size={18}/><strong>[COMPLAIN] {alerts.length} phàn nàn chưa giải quyết · cần Quản lý</strong><span>{alerts[0].name} · {alerts[0].stageLabel} · {alerts[0].topic}</span>{open?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>
  {open&&<div className="manager-banner-list">{error&&<p className="manager-banner-error">{error}</p>}{alerts.map(a=><article key={a.key}><div><strong>{a.name}</strong><small>{a.stageLabel} · {a.topic} · {new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(a.at))}</small><p>{a.quote}</p></div><div className="manager-banner-actions">{a.prompt&&<button type="button" className="button primary" onClick={()=>copy(a)}>{copied===a.key?<Check size={15}/>:<Copy size={15}/>}{copied===a.key?'Đã copy':'Copy Prompt Hạ Nhiệt & Đề Xuất Đổi Phòng'}</button>}<a className="button secondary" href={a.link}>Mở hội thoại</a><button type="button" className="text-button" onClick={()=>resolve(a)}>Đã giải quyết</button></div></article>)}<small className="manager-banner-note">Thư hạ nhiệt theo PO 20/10: xử lý trong 15 phút, Quản lý Lễ tân liên hệ, đổi phòng chỉ khi còn phòng trống, chưa có bồi thường. Copy rồi dán vào OTA/WhatsApp; Crabs không tự gửi.</small></div>}
 </section>;
}
