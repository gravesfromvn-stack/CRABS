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
 const first=alerts[0];
 const actions=(a:ManagerAlert)=><span className="manager-banner-actions">{a.prompt&&<button type="button" className="mb-btn primary" onClick={()=>copy(a)} title="Copy Prompt Hạ Nhiệt & Đề Xuất Đổi Phòng">{copied===a.key?<Check size={14}/>:<Copy size={14}/>}{copied===a.key?'Đã copy':'Copy hạ nhiệt'}</button>}<a className="mb-btn" href={a.link}>Mở</a><button type="button" className="mb-btn" onClick={()=>resolve(a)}>Đã xử lý</button></span>;
 // One line: the newest complaint and its three actions; the others open below on demand.
 return <section className="manager-banner" role="alert" aria-live="polite">
  <div className="manager-banner-line"><AlertTriangle size={16}/><strong>[COMPLAIN]{alerts.length>1?` ${alerts.length}`:''}</strong><span className="manager-banner-text" title={first.quote}>{first.name} · {first.stageLabel} · {first.topic} — {first.quote.replace(/\s+/g,' ')}</span>{actions(first)}{alerts.length>1&&<button type="button" className="mb-btn ghost" aria-expanded={open} onClick={()=>setOpen(!open)}>+{alerts.length-1}{open?<ChevronUp size={14}/>:<ChevronDown size={14}/>}</button>}</div>
  {error&&<p className="manager-banner-error">{error}</p>}
  {open&&<div className="manager-banner-list">{alerts.slice(1).map(a=><div className="manager-banner-line sub" key={a.key}><span className="manager-banner-text" title={a.quote}>{a.name} · {a.stageLabel} · {a.topic} — {a.quote.replace(/\s+/g,' ')}</span>{actions(a)}</div>)}</div>}
 </section>;
}
