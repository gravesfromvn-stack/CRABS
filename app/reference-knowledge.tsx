'use client';
import { useState } from 'react';
import { Copy, Search } from 'lucide-react';
import knowledge from '../lib/knowledge-data.json';
import audit from '../lib/source-audit.json';

const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const groups = ['Tất cả', 'Quy tắc tư vấn', 'Mẫu tin nhắn', 'SOP mẫu', 'Brochure'];

export function KnowledgeLibrary() {
  const [query, setQuery] = useState(''), [group, setGroup] = useState('Tất cả'), [notice, setNotice] = useState('');
  const entries = [
    ...knowledge.rules.map(r => ({ id: r.id, title: r.title, group: 'Quy tắc tư vấn', content: r.content, note: r.condition, status: r.status, urls: r.urls, copy: false })),
    ...knowledge.templates.map(r => ({ id: r.id, title: r.title, group: 'Mẫu tin nhắn', content: r.body, note: r.note, status: r.status, urls: [] as string[], copy: true })),
    ...knowledge.sops.map(r => ({ id: r.id, title: r.title, group: 'SOP mẫu', content: r.content, note: '', status: r.status, urls: [] as string[], copy: false })),
    ...knowledge.brochures.map(r => ({ id: r.id, title: r.title, group: 'Brochure', content: r.summary, note: r.conditions, status: r.checkedAt, urls: [r.url], copy: false })),
  ];
  const filtered = entries.filter(e => (group === 'Tất cả' || e.group === group) && normalize([e.id, e.title, e.content, e.note].join(' ')).includes(normalize(query)));
  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); setNotice('Đã sao chép mẫu. Thay các ô [ngoặc] và duyệt nội dung trước khi dùng.'); }
    catch { setNotice('Trình duyệt chưa cho sao chép. Bạn có thể chọn và sao chép nội dung mẫu bên dưới.'); }
  }
  return <>
    <p className="reference-context">22 quy tắc từ bảng tour · 6 mẫu tin nhắn biên tập lại · 3 SOP thử · 2 brochure. Nội dung có ngày, giờ hoặc chính sách là bản lịch sử, cần kiểm tra lại trước khi tư vấn thật.</p>
    <div className="toolbar"><div className="search-field"><Search size={17}/><input aria-label="Tìm kiến thức tư vấn" placeholder="Tìm quy tắc, xe, gia đình, mẫu tin…" value={query} onChange={e => setQuery(e.target.value)}/></div><select aria-label="Loại kiến thức" value={group} onChange={e => setGroup(e.target.value)}>{groups.map(g => <option key={g}>{g}</option>)}</select><span className="muted">{filtered.length} mục</span></div>
    {notice && <p className="knowledge-notice" role="status">{notice}</p>}
    <div className="knowledge-grid">{filtered.map(e => <article className="panel knowledge-card" key={e.id}><span className="eyebrow">{e.id} · {e.group}</span><h2>{e.title}</h2><p className={e.copy ? 'message-template' : ''}>{e.content}</p>{e.note && <p className="knowledge-note">{e.note}</p>}<small>{e.status}</small><div className="knowledge-actions">{e.copy && <button className="button secondary" onClick={() => copy(e.content)}><Copy size={14}/>Sao chép mẫu</button>}{e.urls.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer">Nguồn {i + 1} ↗</a>)}</div></article>)}</div>
    {!filtered.length && <div className="empty">Không có nội dung phù hợp.</div>}
  </>;
}

export function RouteLibrary() {
  const [days, setDays] = useState(7);
  const route = knowledge.durations.find(d => d.days === days)!;
  const daily = knowledge.itineraryDays.filter(d => d.program === `PKG${days}`);
  return <div className="route-library">
    <p className="reference-context">28 khung ghép tour từ 1–28 ngày. Nguồn có lịch sáng/chiều/tối cho gói 14, 21 và 28 ngày, tổng cộng 63 dòng lịch ngày. Đây là gợi ý hành trình, chưa có giá và chỗ được xác nhận.</p>
    <div className="route-day-picker" role="group" aria-label="Chọn số ngày hành trình">{knowledge.durations.map(d => <button key={d.id} aria-pressed={days === d.days} onClick={() => setDays(d.days)}>{d.days}<small>ngày</small></button>)}</div>
    <article className="panel route-overview"><span className="eyebrow">{route.id} · DRAFT · NGUỒN 01/10/2026</span><h2>{route.days} ngày / {route.nights} đêm</h2><p>{route.route}</p><div className="reference-facts"><span>Kết thúc: <strong>{route.ends}</strong></span><span>{route.note}</span></div><small>Lịch 1–10 ngày giả định khách đã ở khách sạn đầu ngày 1. Với gói dài ngày, kiểm tra ngày đến, ngày rời và số đêm theo lịch cụ thể.</small></article>
    {daily.length ? <div className="route-timeline">{daily.map(d => <article className="panel route-day" key={d.id}><div className="route-day-number">{d.day}<small>NGÀY</small></div><div><h3>{d.title}</h3><dl><dt>Sáng</dt><dd>{d.morning || 'Theo lịch xác nhận'}</dd><dt>Chiều</dt><dd>{d.afternoon || 'Theo lịch xác nhận'}</dd><dt>Tối</dt><dd>{d.evening || 'Theo lịch xác nhận'}</dd><dt>Nghỉ đêm / kết thúc</dt><dd>{d.overnight}</dd></dl></div></article>)}</div> : <p className="knowledge-notice">Khung {days} ngày chưa có lịch sáng/chiều/tối riêng trong nguồn. Dùng khung này cùng mục Thư viện tour để soạn phương án cụ thể.</p>}
  </div>;
}

export function SourceAudit() {
  return <div className="reference-provenance">
    <div className="panel reference-source-intro"><span className="eyebrow">KIỂM KÊ BÀN GIAO 0.3 · {audit.readAt}</span><h2>Kiểm kê gốc · 8 bảng chính / 57 tab</h2><p><strong>Bản cập nhật:</strong> mở Phân tích 75PHT → Kiểm kê & giới hạn để xem 26 bảng / 212 tab đã đọc và 3 tab cấu hình không đọc. Nội dung bên dưới là ảnh chụp bàn giao 0.3, không phải phạm vi mới nhất.</p><p>{audit.scope} Đã đọc giá trị trong toàn bộ phạm vi 57 tab, gồm các tab ẩn. Dòng có nội dung có thể là tiêu đề, công thức, bản thử hoặc dữ liệu lặp; không dùng tổng dòng để tính số khách/doanh thu.</p><p><strong>Bộ demo:</strong> 151 hồ sơ được dựng mới theo cơ cấu kênh và trạng thái; 189 mục tour tham khảo; lịch ghép tour, quy tắc và mẫu tư vấn. Không giữ ánh xạ khách, điện thoại, email, mã booking thật, tin nhắn gốc hoặc số tiền giao dịch nội bộ.</p></div>
    <div className="audit-facts"><div><strong>362</strong><span>sự kiện OTA</span></div><div><strong>43 + 22</strong><span>dòng booking / cần kiểm tra ở FO</span></div><div><strong>450</strong><span>bản ghi kho nhập nhiều cơ sở</span></div><div><strong>18</strong><span>tệp backup / QA đã tìm thấy</span></div></div>
    <p className="reference-context">Các con số trên thuộc các tập dữ liệu khác nhau, có thể giao nhau. Không cộng thành tổng khách hoặc số đơn.</p>
    <div className="knowledge-grid">{audit.findings.map(f => <article className="panel reference-source" key={f.title}><h3>{f.title}</h3><p>{f.detail}</p></article>)}</div>
    <h2>Danh mục bảng nguồn</h2>
    {audit.sourceBooks.map(b => <details className="panel audit-details" key={b.id}><summary><span>{b.title}</span><small>{b.tabs.length} tab đã đọc</small></summary><div className="audit-detail-body"><a href={b.url} target="_blank" rel="noreferrer">Mở bảng nguồn theo quyền tài khoản ↗</a><div className="table-wrap"><table><thead><tr><th>Tab</th><th>Dòng có nội dung</th><th>Phạm vi đã đọc</th></tr></thead><tbody>{b.tabs.map(t => <tr key={t.title}><td>{t.title}{t.hidden && <small className="reference-code">Tab ẩn</small>}</td><td>{t.nonEmptyRows}</td><td>{t.gridRows.toLocaleString('vi-VN')} dòng × {t.gridColumns} cột</td></tr>)}</tbody></table></div><p>Đọc giá trị ô; chưa trích xuất ảnh, bình luận hoặc Apps Script.</p></div></details>)}
    <details className="panel audit-details"><summary><span>Backup và tệp kiểm thử</span><small>18 tệp · chưa nhập</small></summary><div className="audit-detail-body audit-link-list">{audit.backupFiles.map(b => <a href={b.url} target="_blank" rel="noreferrer" key={b.url}>{b.title} ↗</a>)}</div></details>
    <details className="panel audit-details"><summary><span>Luồng Make đã đọc cấu trúc</span><small>9 / 29 scenario đã liệt kê</small></summary><div className="audit-detail-body">{audit.make.map(m => <article className="audit-flow" key={m.id}><h3>{m.title}</h3><p>{m.status} · {m.trigger} · {m.moduleCount} module</p><small>{m.note}</small></article>)}</div></details>
    <details className="panel audit-details"><summary><span>Nguồn nghiên cứu tour</span><small>48 liên kết từ bảng</small></summary><div className="audit-detail-body audit-link-list"><p>Liên kết đã ghi trong bảng ngày 01/10/2026; chưa kiểm tra lại nội dung website.</p>{knowledge.sourceRegister.map(s => <a href={s.url} target="_blank" rel="noreferrer" key={s.id}>{s.id} · {s.title} ↗</a>)}</div></details>
    <article className="panel reference-source"><h3>Nguồn mẫu chăm sóc khách</h3><p>{knowledge.templateSource.note}</p><a className="text-button" href={knowledge.templateSource.url} target="_blank" rel="noreferrer">Mở tài liệu mẫu gốc ↗</a></article>
    <h2>Phần chưa đưa vào bản trích xuất</h2><ul className="audit-limits">{audit.limits.map(l => <li key={l}>{l}</li>)}</ul>
  </div>;
}
