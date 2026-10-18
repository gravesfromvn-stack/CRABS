'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Download, Search, X } from 'lucide-react';
import reference from '../lib/reference-data.json';
import knowledge from '../lib/knowledge-data.json';
import audit from '../lib/source-audit.json';
import analysis from '../lib/analysis-data.json';
import { KnowledgeLibrary, RouteLibrary, SourceAudit } from './reference-knowledge';

export type ReferenceGuest = (typeof reference.guests)[number];
type Product = (typeof reference.catalog)[number];
const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const money = (n: number) => new Intl.NumberFormat('vi-VN').format(n) + ' ₫';
const displayDate = (s: string) => s.split('-').reverse().join('/');

function ProductDetail({ product, onClose }: { product: Product; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="modal reference-modal" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-head"><h2>{product.title}</h2><button className="icon-button" aria-label="Đóng chi tiết tour" onClick={onClose}><X size={20}/></button></div>
    <div className="product-detail">
      <div className="reference-tags"><span>{product.id}</span><span>{product.duration}</span><span>{product.status} · {product.availability}</span></div>
      <p>{product.summary}</p>
      <div className="reference-price"><small>{product.type === 'program' ? 'Tình trạng giá trong bảng nguồn' : 'Giá website được ghi trong bảng nguồn'} · {product.checkedAt || 'chưa rõ ngày'}</small><strong>{product.price == null ? 'Chưa có giá được xác nhận' : money(product.price)}</strong><p>Giá tham khảo lịch sử. Chưa xác minh lại website, đơn vị giá, chỗ và hiệu lực; chưa dùng để chốt bán.</p></div>
      {product.audience && <p><strong>Phù hợp:</strong> {product.audience}</p>}
      {product.itinerary && <section className="reference-itinerary"><h3>Lịch trình từ nguồn tham khảo</h3><p>{product.itinerary}</p></section>}
      {product.family && <p><strong>Gia đình:</strong> {product.family}</p>}
      {product.premium && <p><strong>Dịch vụ riêng:</strong> {product.premium}</p>}
      <section className="reference-itinerary"><h3>Trước khi tư vấn</h3><p>{product.conditions}</p></section>
      <p className="muted">Nguồn ghi trong bảng: {product.source}. Nội dung lịch trình và lịch mở cửa là bản ghi lịch sử, cần kiểm tra theo ngày đi.</p>
      <div className="reference-links">{product.urls.map((url, i) => <a href={url} key={url} target="_blank" rel="noreferrer">Mở nguồn tham khảo {i + 1} ↗</a>)}</div>
    </div>
  </dialog>;
}

export default function ReferenceLibrary({ busy, existingNames, onUse }: { busy: boolean; existingNames: string[]; onUse: (guest: ReferenceGuest) => Promise<void> }) {
  const [tab, setTab] = useState<'guests' | 'catalog' | 'knowledge' | 'routes' | 'sources'>('guests');
  const [query, setQuery] = useState(''), [category, setCategory] = useState('all'), [page, setPage] = useState(1);
  const [product, setProduct] = useState<Product | null>(null), [guest, setGuest] = useState<ReferenceGuest | null>(null);
  const search = normalize(query);
  const guests = reference.guests.filter(g => (category === 'all' || category === g.channel || category === g.bookingStatus) && normalize([g.id, g.name, g.channel, g.interest].join(' ')).includes(search));
  const products = reference.catalog.filter(p => (category === 'all' || p.category === category || p.type === category) && normalize([p.id, p.title, p.category, p.duration, p.audience].join(' ')).includes(search));
  const count = tab === 'guests' ? guests.length : products.length;
  const perPage = tab === 'guests' ? 12 : 9;
  const pages = Math.max(1, Math.ceil(count / perPage));
  const currentPage = Math.min(page, pages);
  const options = tab === 'guests' ? ['Đã đặt phòng', 'Đã hủy', ...new Set(reference.guests.map(g => g.channel))] : [...new Set(reference.catalog.map(p => p.category))];
  function selectTab(value: typeof tab) { setTab(value); setPage(1); setQuery(''); setCategory('all'); setGuest(null); }
  function exportReference() {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ ...reference, knowledge, audit, analysis }, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'crabs-tham-chieu-luxe-2026-10-14.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="page reference-page">
    <div className="page-heading compact"><div><span className="eyebrow">TỪ KINH NGHIỆM VẬN HÀNH ĐẾN DEMO BÁN HÀNG</span><h1>Dữ liệu tham chiếu</h1><p>Cấu trúc từ dự án Luxe Paradise, chuyển thành bộ thực hành cá nhân.</p></div><button className="button secondary" onClick={exportReference}><Download size={17}/>Tải bộ dữ liệu</button></div>
    <div className="reference-summary"><div><strong>{reference.guests.length}</strong><span>hồ sơ dựng mới</span></div><div><strong>{reference.coverage.programs}</strong><span>chương trình có lịch trình</span></div><div><strong>{reference.coverage.listings}</strong><span>sản phẩm tham khảo</span></div><div><strong>{audit.sourceBooks.length}</strong><span>bảng nguồn đã đối chiếu</span></div></div>
    <div className="catalog-note"><BookOpen size={18}/><span>Tên khách, mã, ngày ở, hạng phòng và nhu cầu bên dưới là giả lập. Chỉ cơ cấu kênh và trạng thái được giữ từ nguồn. Tour giữ nhãn tham khảo lịch sử; đây là dự án cá nhân, không phải hệ thống vận hành chính thức của Luxe Paradise.</span></div>
    <div className="reference-tabs" role="tablist" aria-label="Nhóm dữ liệu tham chiếu">{([['guests', 'Hồ sơ mẫu · 151'], ['catalog', 'Thư viện tour · 189'], ['knowledge', 'Kiến thức tư vấn'], ['routes', 'Lịch ghép tour'], ['sources', 'Nguồn & phạm vi']] as const).map(([value, label]) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => selectTab(value)}>{label}</button>)}</div>
    {(tab === 'guests' || tab === 'catalog') && <div className="toolbar"><div className="search-field"><Search size={17}/><input aria-label="Tìm dữ liệu tham chiếu" placeholder={tab === 'guests' ? 'Tìm mã mẫu, kênh đặt hoặc nhu cầu…' : 'Tìm mã tour, điểm đến, chương trình…'} value={query} onChange={e => { setQuery(e.target.value); setPage(1); }}/></div><select aria-label="Lọc dữ liệu tham chiếu" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}><option value="all">Tất cả nhóm</option>{tab === 'catalog' && <><option value="program">28 chương trình lịch trình</option><option value="listing">161 sản phẩm website</option></>}{options.map(value => <option key={value}>{value}</option>)}</select><span className="muted">{count} kết quả</span></div>}
    {tab === 'guests' && <>
      <p className="reference-context">Bộ luyện tập giả lập theo cơ cấu 141 booking đã đặt và 10 booking hủy từ nguồn đa cơ sở; không phải 151 khách chắc chắn của 75PHT. Xem Phân tích 75PHT để đọc số liệu đã lọc cơ sở. Đây chưa phải cơ hội bán tour, đơn hàng hay doanh thu. Chỉ hồ sơ bạn chọn đưa vào CRM mới xuất hiện trong công việc tư vấn.</p>
      {guest && <div className="panel reference-guest"><button className="icon-button reference-close" aria-label="Đóng hồ sơ tham chiếu" onClick={() => setGuest(null)}><X size={18}/></button><span className="eyebrow">{guest.id} · TÌNH HUỐNG GIẢ LẬP</span><h2>{guest.name}</h2><p>{guest.need}</p><div className="reference-facts"><span>Kênh: <strong>{guest.channel}</strong></span><span>Lưu trú mẫu: <strong>{displayDate(guest.checkIn)} → {displayDate(guest.checkOut)}</strong></span><span>Phòng mẫu: <strong>{guest.room}</strong></span><span>Số người mẫu: <strong>2 người lớn{guest.children ? `; trẻ ${guest.children} tuổi` : ''}</strong></span></div><p><strong>Việc tiếp theo:</strong> {guest.next}</p><button className="button primary" disabled={busy} onClick={() => onUse(guest)}>{existingNames.includes(guest.name) ? 'Mở hồ sơ trong CRM' : 'Tạo hồ sơ CRM mẫu'}<ArrowRight size={16}/></button></div>}
      <div className="panel table-wrap"><table><thead><tr><th>Hồ sơ giả lập</th><th>Kênh tham chiếu</th><th>Booking mẫu</th><th>Tình huống luyện tập</th><th>Thao tác</th></tr></thead><tbody>{guests.slice((currentPage - 1) * perPage, currentPage * perPage).map(g => <tr key={g.id}><td><strong>{g.name}</strong><small className="reference-code">{g.id} · {g.room}</small></td><td>{g.channel}</td><td><span className={`badge ${g.cancelled ? 'closed' : 'advising'}`}>{g.bookingStatus}</span></td><td>{g.interest}</td><td><button className="text-button" onClick={() => setGuest(g)}>Xem hồ sơ <ArrowRight size={14}/></button></td></tr>)}</tbody></table>{!count && <div className="empty">Không có hồ sơ phù hợp.</div>}</div>
    </>}
    {tab === 'catalog' && <><p className="reference-context">189 mục = 28 chương trình đề xuất + 161 sản phẩm website. Chúng có thể trùng điểm đến hoặc trải nghiệm; không phải 189 tour độc quyền. Giá vốn, hoa hồng và giá bán được duyệt chưa có trong bộ này.</p><div className="reference-catalog">{products.slice((currentPage - 1) * perPage, currentPage * perPage).map(p => <button className="panel reference-product" key={p.id} onClick={() => setProduct(p)}><span className="eyebrow">{p.id} · {p.type === 'program' ? 'LỊCH TRÌNH' : 'SẢN PHẨM WEBSITE'}</span><h2>{p.title}</h2><p>{p.category} · {p.duration}</p><strong>{p.price == null ? 'Cần xác nhận giá' : money(p.price)}</strong><small>{p.price == null ? 'Chưa có giá bán được duyệt' : `Giá lịch sử theo bảng · ${p.checkedAt}`}</small><span className="reference-product-bottom">Draft · Chỗ chưa xác nhận <ArrowRight size={16}/></span></button>)}</div>{!count && <div className="empty">Không có tour phù hợp.</div>}</>}
    {(tab === 'guests' || tab === 'catalog') && <div className="reference-pagination"><button className="button secondary" disabled={currentPage === 1} onClick={() => { setPage(currentPage - 1); setGuest(null); }}>Trang trước</button><span>Trang {currentPage} / {pages}</span><button className="button secondary" disabled={currentPage === pages} onClick={() => { setPage(currentPage + 1); setGuest(null); }}>Trang sau</button></div>}
    {tab === 'knowledge' && <KnowledgeLibrary/>}
    {tab === 'routes' && <RouteLibrary/>}
    {tab === 'sources' && <SourceAudit/>}
    {product && <ProductDetail product={product} onClose={() => setProduct(null)}/>}
  </section>;
}
