'use client';
import {useMemo,useState} from 'react';
import {categoryLabels,statusLabels,formatEntryPrice,quoteReady,inScope,type StoredEntry,type CatalogCategory} from '../lib/service-catalog';
import {hotelPolicy} from '../lib/hotel-policy-config';

const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase();
// Picks quote lines from the service catalog: approved prices first, reference items stay drafts.
export function CatalogPicker({entries,onAdd,present}:{entries:StoredEntry[];onAdd:(id:string)=>void;present:boolean}){
 const [property,setProperty]=useState('luxe-75pht'),[category,setCategory]=useState<''|CatalogCategory>(''),[q,setQ]=useState(''),[approvedOnly,setApprovedOnly]=useState(true);
 const list=useMemo(()=>entries.filter(e=>e.status!=='ARCHIVED'&&e.category!=='ROOM_POLICY'&&inScope(e,property)&&(!category||e.category===category)&&(!approvedOnly||e.status==='APPROVED')&&(!q||norm([e.id,e.title,e.variant,e.supplierName,e.place].join(' ')).includes(norm(q))))
  .sort((a,b)=>Number(b.status==='APPROVED')-Number(a.status==='APPROVED')||a.category.localeCompare(b.category)||a.id.localeCompare(b.id)),[entries,property,category,q,approvedOnly]);
 return <section className="panel catalog-picker" aria-label="Chọn dịch vụ từ kho">
  <h3>Kho dịch vụ & bảng giá · chọn dịch vụ</h3>
  <p className="q-field-note">Mục "Đủ để duyệt" có giá bán, giá vốn và hoa hồng đã duyệt. Mục khác vẫn lập nháp được, giá để trống cho Cua nhập; sửa giá tại màn hình Kho dịch vụ.</p>
  <div className="toolbar">
   <label>Cơ sở<select value={property} onChange={e=>setProperty(e.target.value)}>{Object.entries(hotelPolicy.properties).map(([id,p])=><option key={id} value={id}>{present?p.demoName:p.displayName}</option>)}</select></label>
   <label>Nhóm<select value={category} onChange={e=>setCategory(e.target.value as ''|CatalogCategory)}><option value="">Tất cả</option>{Object.entries(categoryLabels).filter(([k])=>k!=='ROOM_POLICY').map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Tìm<input value={q} onChange={e=>setQ(e.target.value)} placeholder="Mã, tên, nhà cung cấp"/></label>
   <label className="quote-check"><input type="checkbox" checked={approvedOnly} onChange={e=>setApprovedOnly(e.target.checked)}/> Chỉ mục đã duyệt giá</label>
  </div>
  <div className="q-products">{list.slice(0,60).map(e=><button type="button" className="q-product" key={e.id} onClick={()=>onAdd(e.id)}><strong>+ {e.title}{e.variant&&!e.title.includes(e.variant)?` · ${e.variant}`:''}</strong><small>{e.id} · {categoryLabels[e.category]} · {formatEntryPrice(e)} / {e.unit} · {quoteReady(e)?'Đủ để duyệt':statusLabels[e.status]+(e.status==='APPROVED'?' · thiếu vốn/hoa hồng':'')}</small></button>)}</div>
  {list.length>60&&<p className="muted">Đang hiện 60/{list.length} mục. Lọc theo nhóm hoặc tìm để thu hẹp.</p>}
  {!list.length&&<p className="empty">Không có mục phù hợp bộ lọc.</p>}
 </section>;
}
