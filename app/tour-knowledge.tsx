'use client';
import {useState} from 'react';
import {sourceCatalog} from '../lib/quote-sources';
import {tourResearch} from '../lib/tour-research';
import {SourceEvidence} from './quote-source-library';
import {RouteLibrary,KnowledgeLibrary} from './reference-knowledge';
import './tour-knowledge.css';

const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const catalog=sourceCatalog.filter(p=>p.category==='Lịch trình đề xuất'||p.id.startsWith('R75-TST-'));
const tabs=[['catalog','Chương trình & giá'],['routes','Ghép lịch 1–28 ngày'],['knowledge','Lưu ý tư vấn'],['confirm','Cần Cua xác nhận']] as const;

export default function TourKnowledge({onQuote}:{onQuote:()=>void}){
 const [tab,setTab]=useState<string>('catalog'),[query,setQuery]=useState(''),[group,setGroup]=useState('all'),[limit,setLimit]=useState(8);
 const results=catalog.filter(p=>(group==='all'||(group==='reviewed'?!!p.websiteReview:group==='program'?p.category==='Lịch trình đề xuất':p.id.startsWith('R75-TST-')))&&normalize([p.id,p.title,p.duration,p.supplier,p.summary,p.websiteReview?.route??''].join(' ')).includes(normalize(query))).sort((a,b)=>Number(!!b.websiteReview)-Number(!!a.websiteReview));
 return <section className="tk-workspace" aria-label="Thư viện tour 75PHT">
  <header className="tk-header"><div><span className="eyebrow">75PHT · KIẾN THỨC TƯ VẤN · ĐỐI CHIẾU {tourResearch.readAt}</span><h1>Tour & dịch vụ</h1><p>Hiểu hành trình và quyền lợi trước. Chọn phương án phù hợp, rồi xác nhận giá và chỗ với nhà cung cấp.</p></div><button className="button secondary" onClick={onQuote}>Mở Báo giá →</button></header>
  <div className="tk-stats"><div><b>28</b><span>lịch trình đề xuất</span></div><div><b>161</b><span>sản phẩm từ Sheets</span></div><div><b>5 / 161</b><span>đã đối chiếu website</span></div><div><b>63</b><span>dòng lịch sáng / chiều / tối</span></div></div>
  <p className="tk-boundary">Giá trên website và giá trong Sheets là tham khảo, chưa phải giá bán đã duyệt của khách sạn. Chưa xác nhận hiệu lực, giá vốn và chỗ trống.</p>
  <nav className="tk-tabs" aria-label="Tra cứu tour">{tabs.map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {tab==='catalog'&&<>
   <div className="tk-toolbar"><label>Tìm chương trình<input value={query} placeholder="Hà Nội, Hoa Lư, Dragon King, mã tour…" onChange={e=>{setQuery(e.target.value);setLimit(8)}}/></label><label>Phạm vi<select value={group} onChange={e=>{setGroup(e.target.value);setLimit(8)}}><option value="all">Tất cả 189 chương trình</option><option value="reviewed">5 sản phẩm vừa đối chiếu website</option><option value="program">28 lịch trình đề xuất</option><option value="listing">161 sản phẩm trong Sheets</option></select></label></div>
   <p className="tk-count">{results.length} kết quả · Các sản phẩm vừa đối chiếu hiển thị trước. Xe sân bay và giá giao dịch nằm trong Báo giá → Kho giá & điều kiện 75PHT.</p>
   <div className="tk-grid">{results.slice(0,limit).map(p=><article className="panel tk-card" key={p.id}><span className="eyebrow">{p.id.replace('R75-','')} · {p.duration}</span><h2>{p.title}</h2><p className="tk-caption">{p.supplier}</p><div className="tk-price"><strong>{p.priceText}</strong><span>Mức lưu trong Sheets · chưa duyệt</span></div>{p.websiteReview&&<p className="tk-change">{p.websiteReview.outcome}</p>}
    <details><summary>Xem lịch trình, quyền lợi & giá theo gói</summary>
     <p className="tk-copy">{p.summary}</p><p>{p.conditions}</p>
     <SourceEvidence item={p}/>
    </details>
   </article>)}</div>
   {!results.length&&<p className="empty">Chưa thấy kết quả. Thử tên điểm đến hoặc mã tour khác.</p>}
   {results.length>limit&&<button className="button secondary" onClick={()=>setLimit(n=>n+8)}>Xem thêm 8 chương trình</button>}
  </>}
  {tab==='routes'&&<RouteLibrary/>}
  {tab==='knowledge'&&<><article className="panel tk-alert"><h2>{tourResearch.policy.title}</h2><p>{tourResearch.policy.text}</p><a href={tourResearch.policy.url} target="_blank" rel="noreferrer">Báo điện tử Chính phủ · kiểm tra {tourResearch.policy.checkedAt} ↗</a></article><p className="tk-boundary">Trước khi hỏi thêm, đọc ngày đi, số khách, tuổi trẻ, điểm đến, yêu cầu và dịch vụ khách đã từ chối trong hồ sơ. Chỉ xác nhận phần còn thiếu; không tự hứa chỗ, miễn phí hoặc bố trí.</p><KnowledgeLibrary/></>}
  {tab==='confirm'&&<div className="tk-confirm"><article className="panel"><h2>Những thông tin Cua cần chốt để bán được</h2><ol>{tourResearch.confirmation.map(s=><li key={s}>{s}</li>)}</ol><p>Không tự áp dụng các cột cộng 15% / 20% cũ. Có thể lưu nháp nguồn ở Báo giá; giá chưa đủ vẫn để trống, chưa duyệt/copy gửi khách.</p></article><article className="panel"><h2>Ba trường hợp cần lưu ý trước</h2><ul><li><b>Dragon King:</b> 850.000đ tại bến khác gói 1.050.000đ có xe từ Hà Nội. Sheets đang ghi 900.000đ.</li><li><b>Thung Ui:</b> chưa có giá số; mốc tuổi trẻ bị bỏ sót/chồng lấn.</li><li><b>Ninh Bình – Hạ Long 3N2Đ:</b> 2–3 triệu chỉ là phần Ninh Bình; chưa gồm giá du thuyền.</li></ul><p>Xem nguồn và điều kiện đầy đủ trong thẻ chương trình tương ứng.</p></article><article className="panel"><h2>Phạm vi cập nhật</h2><p>{tourResearch.scope}</p><p>Tab “Tour information” ở đường dẫn Cua gửi lưu nhu cầu khách. Đợt này chỉ đọc tiêu đề tab đó; dữ liệu chương trình được đọc từ các tab dưới đây. Sheets gốc không bị chỉnh sửa, chưa có đồng bộ liên tục.</p><ul>{tourResearch.coverage.map(s=><li key={s.sheet}><a href={s.url} target="_blank" rel="noreferrer">{s.sheet} · {s.range} ↗</a> · {s.records} dòng nội dung</li>)}</ul></article></div>}
 </section>;
}
