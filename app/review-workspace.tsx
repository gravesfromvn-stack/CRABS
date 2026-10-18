'use client';
import {useEffect,useState} from 'react';
type Item={id:string;name:string;code:string;title:string;known:string[];review:string[];careful:boolean;status:string;revision:number};
type Queue={items:Item[];counts:{total:number;pending:number;approved:number;missing:number;needsReview:number}};
const labels:Record<string,string>={pending:'Chờ Cua duyệt',approved:'Đã duyệt nội dung',stale:'Dữ kiện đã đổi · cần rà lại',missing:'Chưa lưu nháp',needs_review:'Có thông tin mới · cần soạn lại',not_imported:'Chưa nhập hồ sơ'};
const searchText=(s:string)=>s.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f\s-]/g,'').replace(/đ/g,'d');
export default function ReviewWorkspace({openContact,onChanged}:{openContact:(id:string)=>void;onChanged:()=>Promise<void>}){
 const [queue,setQueue]=useState<Queue|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState(''),[filter,setFilter]=useState('todo');
 async function load(){const r=await fetch('/api/replies?queue=source');const d=await r.json() as Queue&{error?:string};if(!r.ok)throw Error(d.error||'Chưa đọc được danh sách.');setQueue(d);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function prepare(){
  if(!queue||busy)return;setBusy(true);setError('');let made=0,preserved=0,review=0;
  const ids=queue.items.filter(x=>x.status==='missing').map(x=>x.id);
  try{for(let i=0;i<ids.length;i+=8){
   setNotice(`Đang lưu nháp ${i+1}–${Math.min(i+8,ids.length)} / ${ids.length}…`);
   const r=await fetch('/api/replies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'prepareSources',contactIds:ids.slice(i,i+8)})});
   const d=await r.json() as {error?:string;results:{status:string}[]};if(!r.ok)throw Error(d.error||'Chưa lưu xong. Các nháp đã lưu được giữ lại; tải lại để tiếp tục.');
   for(const item of d.results){if(item.status==='created')made++;else if(item.status==='preserved')preserved++;else review++;}
  }
  setNotice(`Đã lưu ${made} nháp mới, giữ ${preserved} nháp có sẵn${review?`; ${review} hồ sơ cần đối chiếu lại`:''}. Tất cả nháp mới đang chờ bạn duyệt, chưa gửi khách.`);
  }catch(e){setError(e instanceof Error?e.message:'Chưa lưu xong.');setNotice(`Đã lưu ${made} nháp trong lượt này. Bạn có thể tiếp tục phần còn thiếu.`);}
  finally{try{await load();await onChanged();}catch{setError('Chưa cập nhật được danh sách; bấm Tải lại.');}setBusy(false);}
 }
 const items=queue?.items.filter(x=>(filter==='all'||filter==='todo'&&x.status!=='approved'||filter==='careful'&&x.careful&&x.status!=='approved'||filter==='approved'&&x.status==='approved')&&searchText([x.code,x.title,x.name].join(' ')).includes(searchText(query)))||[];
 return <section className="page review-page"><div className="page-heading compact"><div><span className="eyebrow">BẮT ĐẦU TẠI ĐÂY</span><h1>Cần Cua duyệt</h1><p>Mỗi hội thoại có một nháp và việc cần kiểm tra. Chọn một hồ sơ bên dưới để bắt đầu.</p></div><button disabled={busy} className="button secondary" onClick={()=>{setError('');load().catch(e=>setError(e.message));}}>Tải lại danh sách</button></div>
 <div className="panel review-start"><h2>Ba bước cho một phản hồi</h2><ol><li><strong>Đọc lời khách và dữ kiện đã biết.</strong> Ưu tiên tin mới nhất, không hỏi lại thông tin đã có.</li><li><strong>Kiểm tra nháp và ghi chú nội bộ.</strong> Sửa lời hứa, giá, giờ hoặc quyền lợi chưa có căn cứ; bấm <b>Lưu nháp phiên bản mới</b> nếu đã sửa.</li><li><strong>Bấm Duyệt nội dung khi câu chữ đã phù hợp.</strong> Đây là duyệt phản hồi; chưa gửi khách, đặt dịch vụ, xác nhận nhà xe hay thu tiền.</li></ol><p>Thông tin tour và quyền lợi được trình bày trước. Chỉ hỏi để chọn phương án hoặc bổ sung phần còn thiếu; giá chốt ở bước cuối. Với tin báo giờ đến, chỉ xác nhận đã ghi nhận nếu không còn gì cần hỏi.</p></div>
 {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="review-notice" role="status">{notice}</p>}
 {!queue?<p>Đang đọc trạng thái nháp…</p>:<><div className="review-counts"><div><strong>{queue.counts.pending}</strong><span>Chờ Cua duyệt</span></div><div><strong>{queue.counts.needsReview}</strong><span>Cần đối chiếu dữ kiện mới</span></div><div><strong>{queue.counts.approved}</strong><span>Đã duyệt nội dung</span></div><div><strong>{queue.counts.missing}</strong><span>Chưa lưu nháp</span></div></div>
 {queue.counts.missing>0&&<div className="panel review-prepare"><div><strong>{queue.counts.missing} hội thoại còn đề xuất chưa lưu</strong><p>Chuẩn bị nháp từ bản đọc Sheets đã rà soát. Giữ nguyên mọi nháp có sẵn; hồ sơ có tin mới sẽ cần đối chiếu riêng.</p></div><button className="button primary" disabled={busy} onClick={prepare}>{busy?'Đang lưu từng nhóm…':'Chuẩn bị nháp còn thiếu'}</button></div>}
 <div className="toolbar"><label className="search-field"><span className="sr-only">Tìm hồ sơ cần duyệt</span><input aria-label="Tìm hồ sơ cần duyệt" placeholder="Tìm mã LP, Hà Giang, hủy, giờ đến…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Lọc danh sách duyệt" value={filter} onChange={e=>setFilter(e.target.value)}><option value="todo">Chưa duyệt</option><option value="careful">Cần kiểm tra kỹ</option><option value="approved">Đã duyệt</option><option value="all">Tất cả 58 hội thoại</option></select></div>
 <p className="muted">Hiện {items.length}/{queue.counts.total} hội thoại có lời khách. Ngày và yêu cầu trong nguồn là dữ liệu lịch sử để luyện demo. 93 hồ sơ còn lại chưa có lời khách, nên chưa tạo phản hồi.</p>
 <div className="review-list">{items.map(item=><article className="panel review-item" key={item.id}><div className="review-item-top"><span className="eyebrow">{item.code}{item.careful?' · CẦN KIỂM TRA KỸ':''}</span><span className="label-soft">{labels[item.status]}{item.revision?` · v${item.revision}`:''}</span></div><h2>{item.title}</h2><p><strong>Cua kiểm tra:</strong> {item.review[0]||'Đối chiếu nội dung với lời khách mới nhất.'}</p><details><summary>Dữ kiện đã biết và việc cần kiểm tra</summary><ul>{item.known.map(x=><li key={x}>{x}</li>)}</ul><h3>Đối chiếu nội bộ trước khi dùng</h3><ul>{item.review.map(x=><li key={x}>{x}</li>)}</ul></details><button className="button secondary" disabled={busy} onClick={()=>openContact(item.id)}>{item.revision?'Mở nháp để duyệt':'Mở hội thoại để rà lại'} · {item.code}</button></article>)}</div>{!items.length&&<p className="empty">Không có hồ sơ trong bộ lọc này. Chọn Tất cả để xem lại.</p>}
 <p className="footnote">Danh sách này dành cho 58 hội thoại từ Sheets. Nháp Linh Nguyễn và các tình huống tự dựng vẫn ở Hộp thư → 20 khách mẫu. Duyệt nội dung và duyệt báo giá là hai bước riêng.</p></>}
 </section>;
}
