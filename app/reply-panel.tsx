'use client';
import {useEffect,useState} from 'react';
import type {Suggestion} from '../lib/replies';
type Draft={revision:number;body:string;status:string;created:string;approved_at:string|null;stale:boolean};
type State={contextKey:string;suggestion:Suggestion;drafts:Draft[]};
export default function ReplyPanel({contactId,refreshKey,onChanged,historicalDraft}:{contactId:string;refreshKey:string;onChanged:()=>Promise<void>;historicalDraft?:string}){
 const [data,setData]=useState<State|null>(null),[body,setBody]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function load(){const r=await fetch('/api/replies?contactId='+encodeURIComponent(contactId));const d=await r.json() as State & {error?:string};if(!r.ok)throw Error(d.error||'Chưa đọc/lưu được bản nháp.');setData(d);return d as State;}
 useEffect(()=>{let alive=true;setError('');fetch('/api/replies?contactId='+encodeURIComponent(contactId)).then(async r=>{const d=await r.json() as State & {error?:string};if(!r.ok)throw Error(d.error||'Chưa đọc/lưu được bản nháp.');if(alive){setData(d);setBody(previous=>previous||d.drafts[0]?.body||d.suggestion.body);}}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[contactId,refreshKey]);
 async function action(approve=false){if(!data)return;setBusy(true);setError('');try{const r=await fetch('/api/replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(approve?{action:'approve',contactId,revision:data.drafts[0].revision,contextKey:data.contextKey}:{action:'save',contactId,expectedRevision:data.drafts[0]?.revision||0,operationId:crypto.randomUUID(),contextKey:data.contextKey,body})});const d=await r.json() as State & {error?:string};if(!r.ok)throw Error(d.error||'Chưa đọc/lưu được bản nháp.');await load();await onChanged();setNotice(approve?'Đã duyệt nội dung · chưa gửi khách.':'Đã lưu bản nháp để Cua duyệt.');}catch(e){setError(e instanceof Error?e.message:'Chưa lưu được.')}finally{setBusy(false)}}
 async function copyApproved(){
  if(!data)return;
  setBusy(true);setError('');setNotice('');
  try{
   const fresh=await load(),approved=fresh.drafts[0];
   if(!approved||approved.status!=='approved'||approved.stale||approved.body!==body||approved.revision!==data.drafts[0]?.revision)throw Error('Bản nháp hoặc dữ kiện đã đổi. Hãy rà lại, lưu và duyệt bản mới trước khi sao chép.');
   await navigator.clipboard.writeText(approved.body);
   setNotice('Đã sao chép bản đã duyệt. Mở đúng hội thoại trên OTA để dán và gửi; Crabs chưa gửi tin cho khách.');
  }catch(e){setError(e instanceof Error?e.message:'Chưa sao chép được. Bạn có thể chọn nội dung trong ô nháp để sao chép thủ công.');}
  finally{setBusy(false)}
 }
 const latest=data?.drafts[0],dirty=!!latest&&body!==latest.body;
 return <section className="reply-panel"><div className="reply-heading"><h3>Travis · nháp chờ Cua duyệt</h3><span className="label-soft">Nội dung → quyền lợi → chọn phương án → giá</span></div>{error&&<p className="error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}{!data?<p>Đang đối chiếu hồ sơ và hội thoại…</p>:<>
 <details><summary>Thông tin đã biết · không hỏi lại</summary>{data.suggestion.known.map(x=><p key={x}>✓ {x}</p>)}<p>Mẫu áp dụng: {data.suggestion.sources.join(', ')} · {data.suggestion.kind}</p>{data.suggestion.review.map(x=><small key={x}>{x}<br/></small>)}</details>
 <p className="muted">{latest?`Bản v${latest.revision} · ${latest.stale?'Dữ kiện đã đổi, cần bản mới':latest.status==='approved'?'Đã duyệt, chưa gửi':'Chờ duyệt'}`:data.suggestion.body?'Đề xuất chưa lưu':'Chưa có nháp mới cho tình huống hiện tại'} · nhân viên kiểm tra trước khi sử dụng.</p>
 {historicalDraft&&<button className="text-button" disabled={busy} onClick={()=>{setBody(historicalDraft.slice(0,4000));setNotice('Đã điền bản nháp lịch sử để sửa. Hãy đối chiếu cảnh báo và lời khách; chưa lưu hay duyệt.')}}>Dùng nháp nguồn để chỉnh · cần rà lại</button>}
 <label className="sr-only" htmlFor={'reply-'+contactId}>Bản nháp phản hồi</label><textarea dir="auto" id={'reply-'+contactId} value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} rows={12}/>
 <div className="reply-actions"><button className="button secondary" disabled={busy||!data.suggestion.body} onClick={()=>{setBody(data.suggestion.body);setNotice('Đã điền đề xuất theo dữ kiện mới; hãy lưu để tạo phiên bản.')}}>Điền đề xuất mới</button><button className="button primary" disabled={busy||!body.trim()||!!latest&&!dirty&&!latest.stale} onClick={()=>action()}>Lưu nháp{latest?' phiên bản mới':''}</button><button className="button secondary" disabled={busy||!latest||dirty||latest.stale||latest.status==='approved'} onClick={()=>action(true)}>Duyệt nội dung</button></div>
 <div className="reply-actions"><button className="button secondary" disabled={busy||!latest||dirty||latest.stale||latest.status!=='approved'} onClick={copyApproved}>Sao chép bản đã duyệt</button></div>
   <small>Lưu nháp → duyệt nội dung → sao chép → mở đúng hội thoại trên OTA để gửi. Sao chép không có nghĩa là đã gửi. Đây là nháp từ dữ liệu demo/Sheets; email mới nằm ở Hộp thư OTA. Hotel Link chưa kết nối.</small>
 {contactId.startsWith('src75-')&&<p><a className="text-button" href="#review">← Quay về danh sách Cần Cua duyệt</a></p>}
 {data.drafts.length>0&&<details><summary>Lịch sử {data.drafts.length} phiên bản</summary>{data.drafts.map(d=><div className="draft-history" key={d.revision}><strong>v{d.revision} · {d.status==='approved'?'Đã duyệt':'Chờ duyệt'}{d.stale?' · dữ kiện đã đổi':''}</strong><p>{d.body}</p></div>)}</details>}
 </>}</section>
}
