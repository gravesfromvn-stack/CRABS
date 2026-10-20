'use client';
import {useEffect,useState} from 'react';
import {EntryMedia} from './catalog-media';
import {categoryLabels,statusLabels,flowLabels,formatEntryPrice,type StoredEntry,type CatalogCategory} from '../lib/service-catalog';
import {tourResearch} from '../lib/tour-research';

import {RouteLibrary,KnowledgeLibrary} from './reference-knowledge';
import './tour-knowledge.css';
import {useRoleView} from './role-view';
import {canSeeCost} from '../lib/front-desk';

const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const TOUR_GROUPS:CatalogCategory[]=['NINHBINH_TOUR','HALONG_TOUR','SAPA_TOUR','HANOI_TOUR','OTHER_TOUR','INTERCITY_BUS_12GO'];
const tabs=[['catalog','Chương trình & giá'],['routes','Ghép lịch 1–28 ngày'],['knowledge','Lưu ý tư vấn'],['confirm','Cần Cua xác nhận']] as const;

export default function TourKnowledge({onQuote}:{onQuote:()=>void}){
 const fullCost=canSeeCost(useRoleView());
 const [tab,setTab]=useState<string>('catalog'),[query,setQuery]=useState(''),[group,setGroup]=useState<''|CatalogCategory>(''),[limit,setLimit]=useState(8),[entries,setEntries]=useState<StoredEntry[]>([]),[error,setError]=useState('');
 // Same service catalog as OTA advice and quotes: status and price decided in Kho dịch vụ & giá.
 useEffect(()=>{fetch('/api/catalog').then(r=>r.json() as Promise<{entries?:StoredEntry[];error?:string}>).then(d=>d.entries?setEntries(d.entries):setError(d.error||'Không đọc được kho dịch vụ.')).catch(()=>setError('Không đọc được kho dịch vụ.'));},[]);
 const tours=entries.filter(e=>TOUR_GROUPS.includes(e.category)&&e.status!=='ARCHIVED');
 const results=tours.filter(p=>(!group||p.category===group)&&normalize([p.id,p.crmCode||'',p.title,p.variant,p.duration,p.supplierName,p.summary].join(' ')).includes(normalize(query))).sort((a,b)=>Number(!!b.preferred)-Number(!!a.preferred)||Number(b.status==='APPROVED')-Number(a.status==='APPROVED')||a.category.localeCompare(b.category)||a.id.localeCompare(b.id));
 return <section className="tk-workspace" aria-label="Thư viện tour 75PHT">
  <header className="tk-header"><div><span className="eyebrow">75PHT · KIẾN THỨC TƯ VẤN · ĐỐI CHIẾU {tourResearch.readAt}</span><h1>Tour & dịch vụ</h1><p>Hiểu hành trình và quyền lợi trước. Chọn phương án phù hợp, rồi xác nhận giá và chỗ với nhà cung cấp.</p></div><button className="button secondary" onClick={onQuote}>Mở Báo giá →</button></header>
  <div className="tk-stats"><div><b>{tours.length}</b><span>tour & tuyến xe trong kho</span></div><div><b>{tours.filter(t=>t.status==='APPROVED').length}</b><span>đã duyệt giá</span></div><div><b>{tours.filter(t=>t.status==='REFERENCE_ONLY').length}</b><span>chỉ tham khảo</span></div><div><b>{tours.filter(t=>t.channelFlow==='WHATSAPP_CONSULT').length}</b><span>tư vấn qua WhatsApp</span></div></div>
  <p className="tk-boundary">Giá "Đã duyệt giá" do Cua duyệt trong Kho dịch vụ & giá và được dùng trong nháp OTA và báo giá. Giá "Chỉ tham khảo" lấy từ website hoặc Sheets, chưa dùng để báo khách. Chỗ trống luôn cần nhà cung cấp xác nhận.</p>
  <nav className="tk-tabs" aria-label="Tra cứu tour">{tabs.map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {tab==='catalog'&&<>
   <div className="tk-toolbar"><label>Tìm chương trình<input value={query} placeholder="Hà Nội, Hoa Lư, Dragon King, mã tour…" onChange={e=>{setQuery(e.target.value);setLimit(8)}}/></label><label>Nhóm<select value={group} onChange={e=>{setGroup(e.target.value as ''|CatalogCategory);setLimit(8)}}><option value="">Tất cả</option>{TOUR_GROUPS.map(g=><option key={g} value={g}>{categoryLabels[g]} ({tours.filter(t=>t.category===g).length})</option>)}</select></label></div>
   {error&&<p className="error" role="alert">{error}</p>}<p className="tk-count">{results.length} kết quả · Mục đã duyệt giá hiển thị trước. Sửa giá và trạng thái ở Kho dịch vụ & giá.</p>
   <div className="tk-grid">{results.slice(0,limit).map(p=><article className="panel tk-card" key={p.id}>{p.images?.[0]&&<img className="tk-photo" src={p.images[0].src} alt={p.images[0].caption} loading="lazy" referrerPolicy="no-referrer"/>}{p.preferred&&<span className="cat-pref">NCC ưu tiên · {p.supplierName}</span>}<span className="eyebrow">{p.id}{p.crmCode&&p.crmCode!==p.id?' · '+p.crmCode.replace('R75-',''):''} · {p.duration||'thời lượng chưa rõ'}</span><h2>{p.title}</h2>{p.variant&&!p.title.includes(p.variant)&&<p className="tk-caption">{p.variant}</p>}<p className="tk-caption">{p.supplierName||'Chưa có nhà cung cấp'} · {categoryLabels[p.category]} · {flowLabels[p.channelFlow]}</p><div className="tk-price"><strong>{formatEntryPrice(p)}{p.sellingPrice!==null?' / '+p.unit:''}</strong><span>{p.sellingPrice===null&&p.netCost!==null?(fullCost?`Giá thu gốc ${formatEntryPrice({sellingPrice:p.netCost,currency:p.currency})} · chưa đặt giá bán`:'Chưa đặt giá bán'):statusLabels[p.status]+(p.approvedAt?' · '+p.approvedAt:'')}</span></div>
    <details><summary>{p.itinerary?.length?'Xem lịch trình theo giờ, quyền lợi & nguồn':'Xem lộ trình, quyền lợi & nguồn'}</summary><EntryMedia entry={p}/>
     {p.summary&&<p className="tk-copy">{p.summary}</p>}{p.highlights.length>0&&<ul>{p.highlights.map(h=><li key={h}>{h}</li>)}</ul>}{p.inclusions&&<p><b>Bao gồm:</b> {p.inclusions}</p>}{p.exclusions&&<p><b>Chưa gồm:</b> {p.exclusions}</p>}
     <p className="muted">{p.sourceNote}{p.sourceUrl&&<> · <a href={p.sourceUrl} target="_blank" rel="noreferrer">nguồn ↗</a></>}</p>
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
