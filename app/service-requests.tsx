'use client';
import {useEffect,useMemo,useState} from 'react';
import {RefreshCw,MessageSquare,Truck,Send,Download,Plus} from 'lucide-react';
import type {OperationsData,OperationTask,OperationInput,OperationSource} from '../lib/operations';
import {vietnamDay} from '../lib/operations';
import {SERVICE_KINDS,stageLabels,kindLabels,serviceStage,suggestServiceRequest,airportCsv,type Stage} from '../lib/service-requests';
import {formatMoney} from '../lib/hotel-policy-config';
import {usePresentation} from './use-presentation';
import {maskText} from '../lib/hotel-policy-config';

type Save={id:string;sourceKind:'ota'|'contact';sourceId:string;version:number;task:OperationInput};
async function post(body:unknown){const r=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Không lưu được.');return d;}
const saveTask=(s:Save)=>post({action:'save',operationId:crypto.randomUUID(),...s});
const taskInput=(t:OperationTask):OperationInput=>{const {id:_i,sourceKind:_k,sourceId:_s,version:_v,updated:_u,stale:_st,...input}=t;return input as OperationInput;};
const shift=()=>{const h=new Date().getHours();return h<14?'Ca sáng':h<22?'Ca chiều':'Ca đêm';};

// Creates the service request for an OTA conversation from the guest's own confirmation.
export async function createRequestFromThread(threadId:string){
 const d=await fetch('/api/operations').then(r=>r.json()) as OperationsData&{error?:string};if(!d.sources)throw Error(d.error||'Không đọc được vận hành.');
 const source=d.sources.find(s=>s.kind==='ota'&&s.id===threadId);if(!source)throw Error('Hội thoại chưa có trong vận hành.');
 const task=suggestServiceRequest(source,source.messages);if(!task)throw Error('Chưa thấy khách chốt dịch vụ trong hội thoại này.');
 if(d.tasks.some(t=>t.sourceId===threadId&&t.kind===task.kind&&t.state!=='cancelled'))throw Error('Hội thoại này đã có yêu cầu cùng loại. Mở Yêu cầu dịch vụ để cập nhật.');
 await saveTask({id:crypto.randomUUID(),sourceKind:'ota',sourceId:threadId,version:0,task});return task;
}

// Requests pipeline: Mới yêu cầu → Đã báo giá → Khách đã chốt → Đã điều xe/NCC → Hoàn thành.
export default function ServiceRequests(){
 const present=usePresentation();
 const [data,setData]=useState<OperationsData|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[stage,setStage]=useState<''|Stage>(''),[evidence,setEvidence]=useState<Record<string,string>>({});
 async function load(){const r=await fetch('/api/operations');const d=await r.json() as OperationsData&{error?:string};if(!r.ok)throw Error(d.error||'Không đọc được vận hành.');setData(d);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 const sourceOf=(t:OperationTask)=>data?.sources.find(s=>s.kind===t.sourceKind&&s.id===t.sourceId);
 const requests=useMemo(()=>(data?.tasks||[]).filter(t=>(SERVICE_KINDS as readonly string[]).includes(t.kind)).sort((a,b)=>(a.serviceDate||'9').localeCompare(b.serviceDate||'9')||a.serviceTime.localeCompare(b.serviceTime)),[data]);
 const shown=requests.filter(t=>!stage||serviceStage(t)===stage);
 // Conversations where the guest confirmed a car but no request exists yet.
 const suggestions=useMemo(()=>(data?.sources||[]).filter(s=>s.kind==='ota').map(s=>({s,task:suggestServiceRequest(s,s.messages)})).filter((x):x is {s:OperationSource;task:OperationInput}=>!!x.task&&!(data?.tasks||[]).some(t=>t.sourceId===x.s.id&&t.kind===x.task!.kind&&t.state!=='cancelled')),[data]);
 async function run(fn:()=>Promise<unknown>,ok:string){setBusy(true);setError('');setNotice('');try{await fn();await load();setNotice(ok);}catch(e){setError(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}}
 const dispatched=(t:OperationTask)=>run(async()=>{const ev=(evidence[t.id]||'').trim();if(!ev)throw Error('Ghi nhà xe/NCC và người xác nhận (VD: "HH Limousine, anh Nam xác nhận 14:05, biển 30A-123.45") trước khi đánh dấu đã điều xe.');
  await saveTask({id:t.id,sourceKind:t.sourceKind,sourceId:t.sourceId,version:t.version,task:{...taskInput(t),supplierStatus:'confirmed',supplierEvidence:ev,state:t.state==='open'?'working':t.state,reviewedSourceKey:sourceOf(t)?.sourceKey||t.reviewedSourceKey}});},'Đã ghi nhận nhà xe/NCC xác nhận.');
 const handoff=(t:OperationTask)=>run(()=>{const s=sourceOf(t);const body=[`${kindLabels[t.kind]} · ${s?.name||''} · booking ${s?.bookingId||''}`,`${t.serviceDate||'chưa có ngày'} ${t.serviceTime}${t.flightCode?' · chuyến '+t.flightCode:''}${t.carType?' · '+t.carType:''}${t.priceVnd?' · '+formatMoney(t.priceVnd,true):''}`,`Trạng thái: ${stageLabels[serviceStage(t)]}`,t.details].filter(Boolean).join('\n');
  return post({action:'handoff',id:crypto.randomUUID(),operationId:crypto.randomUUID(),propertyId:(s?.propertyId==='luxe-75pht'||s?.propertyId==='luxe-suites')?s.propertyId:'unverified',day:t.serviceDate||vietnamDay(),shift:shift(),recipient:'Ca trực tiếp theo',body:body.slice(0,4000)});},'Đã chuyển sang bàn giao ca. Ca sau bấm "Ghi nhận đã tiếp nhận" ở Lễ tân & vận hành.');
 const download=()=>{if(!data)return;const u=URL.createObjectURL(new Blob([airportCsv(data.tasks,data.sources)],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`xe-san-bay-${vietnamDay()}.csv`;a.click();URL.revokeObjectURL(u);};
 const count=(s:Stage)=>requests.filter(t=>serviceStage(t)===s).length;
 return <section className="page service-requests">
  <div className="page-heading compact"><div><span className="eyebrow">KHÁCH HỎI → BÁO GIÁ → KHÁCH CHỐT → ĐIỀU XE/NCC → HOÀN THÀNH</span><h1>Yêu cầu dịch vụ</h1><p>Xe sân bay, tour, spa khách đang hỏi hoặc đã chốt. Khách đồng ý chưa phải nhà xe/NCC xác nhận; chỉ đánh dấu khi có căn cứ.</p></div>
   <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>Tải lại</button><button className="button secondary" disabled={!data} onClick={download}><Download size={16}/>CSV tab Xe sân bay</button></div></div>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="knowledge-notice" role="status">{notice}</p>}
  <div className="sr-stages">{(Object.keys(stageLabels) as Stage[]).map(s=><button key={s} aria-pressed={stage===s} onClick={()=>setStage(x=>x===s?'':s)}><b>{count(s)}</b><span>{stageLabels[s]}</span></button>)}</div>
  {suggestions.length>0&&<div className="panel sr-suggest"><h2>Khách đã chốt trong hội thoại · chưa có yêu cầu</h2>{suggestions.map(({s,task})=><div key={s.id} className="sr-row"><div><strong>{maskText(s.name,present)} · #{s.bookingId}</strong><small>{task.title} · {task.serviceDate} {task.serviceTime}{task.priceVnd?' · '+formatMoney(task.priceVnd,true):''}</small><small className="muted">{task.guestEvidence.slice(0,160)}…</small></div><a className="text-button" href={`/?otaThread=${encodeURIComponent(s.id)}#ota`}><MessageSquare size={14}/>Xem hội thoại</a><button className="button primary" disabled={busy} onClick={()=>run(()=>saveTask({id:crypto.randomUUID(),sourceKind:'ota',sourceId:s.id,version:0,task}),'Đã tạo yêu cầu dịch vụ ở trạng thái Khách đã chốt.')}><Plus size={14}/>Tạo yêu cầu</button></div>)}</div>}
  <div className="panel table-wrap"><table className="sr-table"><thead><tr><th>Khách / booking</th><th>Dịch vụ</th><th>Chi tiết & thời gian</th><th>Giá</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
   <tbody>{shown.map(t=>{const s=sourceOf(t),st=serviceStage(t);return <tr key={t.id} className={'st-'+st}>
    <td><strong>{maskText(s?.name||'Chưa rõ',present)}</strong><small>#{s?.bookingId||'—'} · {maskText(s?.propertyLabel||'',present)}</small></td>
    <td>{kindLabels[t.kind]}<small>{t.title}</small></td>
    <td>{t.serviceDate||'Chưa có ngày'} {t.serviceTime}<small>{[t.flightCode&&'Chuyến '+t.flightCode,t.carType].filter(Boolean).join(' · ')}</small>{t.details&&<small>{t.details}</small>}</td>
    <td>{t.priceVnd?formatMoney(t.priceVnd,true):'—'}</td>
    <td><span className={'sr-stage '+st}>{stageLabels[st]}</span>{t.stale&&<small className="cat-loss">Có tin mới, rà lại</small>}{t.supplierEvidence&&<small>{t.supplierEvidence}</small>}</td>
    <td className="sr-actions">{t.sourceKind==='ota'&&<a className="text-button" href={`/?otaThread=${encodeURIComponent(t.sourceId)}#ota`}><MessageSquare size={14}/>Xem hội thoại</a>}
     {st==='accepted'&&<><input aria-label="Căn cứ nhà xe/NCC xác nhận" placeholder="Nhà xe/NCC, người xác nhận, biển số" value={evidence[t.id]||''} onChange={e=>setEvidence(v=>({...v,[t.id]:e.target.value}))}/><button className="button secondary" disabled={busy} onClick={()=>dispatched(t)}><Truck size={14}/>Đánh dấu đã điều xe</button></>}
     <button className="button secondary" disabled={busy} onClick={()=>handoff(t)}><Send size={14}/>Đồng bộ sang ca trực</button></td></tr>;})}</tbody></table>
   {!shown.length&&<p className="empty">Chưa có yêu cầu dịch vụ{stage?' ở trạng thái này':''}.</p>}</div>
  <p className="tk-boundary">Hoàn thành và hủy làm ở Lễ tân & vận hành (cần người thực hiện, kết quả, khách đồng ý và nhà xe/NCC xác nhận). File CSV theo cột của tab Xe sân bay để dán vào Google Sheets; CRABS không tự ghi vào Sheets.</p>
 </section>;
}
