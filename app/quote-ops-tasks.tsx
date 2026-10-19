'use client';
import {useState} from 'react';
import {ClipboardList} from 'lucide-react';
import {blankOperation,type OperationInput,type OperationsData} from '../lib/operations';
import type {QuoteVersion} from '../lib/quotes';

// From an approved quote, creates reception tasks for the chosen services. The task starts open:
// guest decision and supplier confirmation are recorded later in Lễ tân & vận hành.
const kindOf=(l:QuoteVersion['payload']['lines'][number]):OperationInput['kind']=>l.kind==='transfer'?(/tiễn|dropoff|→ nội bài/i.test(l.title)?'dropoff':'pickup'):l.kind==='spa'?'spa':l.kind==='tour'?'tour':'other';
export function QuoteOpsTasks({version:v}:{version:QuoteVersion}){
 const [busy,setBusy]=useState(false),[done,setDone]=useState<number[]>([]),[error,setError]=useState('');
 async function create(i:number){
  setBusy(true);setError('');
  try{
   const ops=await fetch('/api/operations').then(r=>r.json()) as OperationsData&{error?:string};if(!ops.sources)throw Error(ops.error||'Không đọc được vận hành.');
   const source=ops.sources.find(s=>s.kind==='contact'&&s.id===v.contact_id);if(!source)throw Error('Hồ sơ khách chưa có trong Lễ tân & vận hành.');
   const l=v.payload.lines[i];
   const task:OperationInput={...blankOperation(source.sourceKey),title:`${l.title} · báo giá ${v.quote_id.slice(0,8)} v${v.revision}`.slice(0,240),kind:kindOf(l),serviceDate:l.date,details:[`Số lượng: ${l.quantity} ${l.unit}${l.kind==='transfer'?` · ${l.passengers} khách`:''}`,l.details].filter(Boolean).join('\n').slice(0,3000),guestDecision:'interested'};
   const r=await fetch('/api/operations',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',id:crypto.randomUUID(),operationId:crypto.randomUUID(),sourceKind:'contact',sourceId:v.contact_id,version:0,task})});
   const d=await r.json() as {error?:string};if(!r.ok)throw Error(d.error||'Không tạo được việc.');setDone(x=>[...x,i]);
  }catch(e){setError(e instanceof Error?e.message:'Không tạo được việc.');}finally{setBusy(false);}
 }
 return <section className="q-ops" aria-label="Tạo việc lễ tân"><h3><ClipboardList size={15}/> Tạo việc cho lễ tân từ dịch vụ khách chọn</h3>
  <p className="q-field-note">Việc mới ở trạng thái "Chưa nhận việc", khách "Đang tìm hiểu", nhà cung cấp "Chưa kiểm tra". Ghi khách đồng ý và xác nhận nhà cung cấp trong Lễ tân & vận hành.</p>
  <ul>{v.payload.lines.map((l,i)=><li key={i}>{l.title} · {l.date}{done.includes(i)?<strong> · Đã tạo việc</strong>:<button type="button" className="text-button" disabled={busy} onClick={()=>create(i)}>Tạo việc lễ tân →</button>}</li>)}</ul>
  {error&&<p className="error" role="alert">{error}</p>}{done.length>0&&<a className="text-button" href="#reception">Mở Lễ tân & vận hành →</a>}
 </section>;
}
