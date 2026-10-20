'use client';
import {useEffect,useMemo,useState} from 'react';
import {Plus,RefreshCw,Check,Archive,BookOpen} from 'lucide-react';
import {EntryMedia} from './catalog-media';
import {categoryLabels,statusLabels,flowLabels,formatEntryPrice,quoteReady,inScope,unitMargin,type StoredEntry,type EntryEdit,type CatalogCategory,type CatalogStatus,type CatalogFlow} from '../lib/service-catalog';
import {hotelPolicy} from '../lib/hotel-policy-config';
import {usePresentation} from './use-presentation';
import {useRoleView,RoleSwitch} from './role-view';
import {canSeeCost,roleViewLabels} from '../lib/front-desk';

type History={operation_id:string;item_id:string;actor:string;detail:string;created:string};
const norm=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase();
const num=(s:string)=>{const t=s.trim().replace(/[.,\s](?=\d{3}\b)/g,'');if(!t)return null;const n=Number(t.replace(',','.'));return Number.isFinite(n)&&n>=0?n:NaN;};
const blank=():EntryEdit=>({title:'',variant:'',unit:'khách',duration:'',summary:'',inclusions:'',exclusions:'',supplierName:'',category:'NINHBINH_TOUR',channelFlow:'WHATSAPP_CONSULT',propertyScope:'ALL',sellingPrice:null,netCost:null,commission:null,currency:'VND',validUntil:'2026-12-31',status:'REFERENCE_ONLY'});
const editOf=(e:StoredEntry):EntryEdit=>({title:e.title,variant:e.variant,unit:e.unit,duration:e.duration,summary:e.summary,inclusions:e.inclusions,exclusions:e.exclusions,supplierName:e.supplierName,category:e.category,channelFlow:e.channelFlow,propertyScope:e.propertyScope,sellingPrice:e.sellingPrice,netCost:e.netCost,commission:e.commission,currency:e.currency,validUntil:e.validUntil,status:e.status});

// One place to read and edit every service and price used by OTA advice, quotes and the tour library.
export default function ServiceCatalogManager(){
 // Lễ tân / Saler view: selling price and commission only; cost and hotel margin stay with Quản lý / Admin.
 const role=useRoleView(),full=canSeeCost(role);
 const present=usePresentation();
 const [entries,setEntries]=useState<StoredEntry[]>([]),[history,setHistory]=useState<History[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [property,setProperty]=useState(''),[category,setCategory]=useState<''|CatalogCategory>(''),[status,setStatus]=useState<''|CatalogStatus>(''),[flow,setFlow]=useState<''|CatalogFlow>(''),[q,setQ]=useState(''),[supplier,setSupplier]=useState(''),[limit,setLimit]=useState(40);
 const [editing,setEditing]=useState<{id:string|null;version:number;form:EntryEdit}|null>(null);
 const properties=Object.entries(hotelPolicy.properties).map(([id,p])=>({id,name:present?p.demoName:p.displayName}));
 async function load(){const r=await fetch('/api/catalog');const d=await r.json() as {entries?:StoredEntry[];history?:History[];error?:string};if(!r.ok||!d.entries)throw Error(d.error||'Không đọc được kho dịch vụ.');setEntries(d.entries);setHistory(d.history||[]);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 const list=useMemo(()=>entries.filter(e=>(!property||inScope(e,property))&&(!category||e.category===category)&&(!status||e.status===status)&&(!flow||e.channelFlow===flow)&&(!supplier||(supplier==='preferred'?e.preferred:e.supplierId===supplier))&&(!q||norm([e.id,e.crmCode||'',e.title,e.variant,e.supplierName,e.place,...e.sourceIds].join(' ')).includes(norm(q))))
  .sort((a,b)=>Number(b.status==='APPROVED')-Number(a.status==='APPROVED')||Number(!!b.preferred)-Number(!!a.preferred)||Number(a.status==='ARCHIVED')-Number(b.status==='ARCHIVED')||a.category.localeCompare(b.category)||a.id.localeCompare(b.id)),[entries,property,category,status,flow,q,supplier]);
 const count=(s:CatalogStatus)=>entries.filter(e=>e.status===s).length;
 const scopeLabel=(e:Pick<StoredEntry,'propertyScope'>)=>e.propertyScope==='ALL'?'Tất cả cơ sở':e.propertyScope.map(id=>properties.find(p=>p.id===id)?.name||id).join(', ');
 async function save(form:EntryEdit,nextStatus?:CatalogStatus){
  if(!editing)return;setBusy(true);setError('');setNotice('');
  try{const entry={...form,status:nextStatus??form.status};
   const body=editing.id?{action:'save',operationId:crypto.randomUUID(),id:editing.id,version:editing.version,entry}:{action:'create',operationId:crypto.randomUUID(),entry};
   const r=await fetch('/api/catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json() as {ok?:boolean;id?:string;error?:string};
   if(!r.ok)throw Error(d.error||'Không lưu được.');await load();setEditing(null);setNotice(`Đã lưu ${d.id} · ${statusLabels[entry.status]}. Hộp thư OTA và Báo giá dùng giá mới ngay.`);}
  catch(e){setError(e instanceof Error?e.message:'Không lưu được.');}finally{setBusy(false);}
 }
 return <section className="page catalog-manager">
  <div className="page-heading compact"><div><span className="eyebrow">MỘT NGUỒN GIÁ · OTA · BÁO GIÁ · KHO TOUR</span><h1>Kho dịch vụ & bảng giá</h1><p>Sửa giá bán, giá vốn, nhà cung cấp và phạm vi khách sạn ngay tại đây. Chỉ mục "Đã duyệt giá" được điền số tiền vào nháp gửi khách và báo giá.</p></div>
   <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={()=>load().catch(e=>setError(e.message))}><RefreshCw size={16}/>Tải lại</button><button className="button primary" disabled={busy} onClick={()=>setEditing({id:null,version:0,form:blank()})}><Plus size={16}/>Thêm dịch vụ</button></div></div>
  {error&&<p className="error" role="alert">{error}</p>}{notice&&<p className="knowledge-notice" role="status">{notice}</p>}
  <div className="tk-stats"><div><b>{entries.length}</b><span>mục trong kho</span></div><div><b>{count('APPROVED')}</b><span>đã duyệt giá</span></div><div><b>{entries.filter(quoteReady).length}</b><span>đủ để duyệt báo giá (có vốn, hoa hồng)</span></div><div><b>{count('REFERENCE_ONLY')}</b><span>chỉ tham khảo</span></div><div><b>{count('ARCHIVED')}</b><span>lưu trữ</span></div></div>
  <div className="toolbar catalog-filters">
   <label>Cơ sở<select value={property} onChange={e=>{setProperty(e.target.value);setLimit(40);}}><option value="">Tất cả</option>{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
   <label>Nhóm<select value={category} onChange={e=>{setCategory(e.target.value as ''|CatalogCategory);setLimit(40);}}><option value="">Tất cả</option>{Object.entries(categoryLabels).map(([k,v])=><option key={k} value={k}>{v} ({entries.filter(e=>e.category===k).length})</option>)}</select></label>
   <label>Trạng thái<select value={status} onChange={e=>{setStatus(e.target.value as ''|CatalogStatus);setLimit(40);}}><option value="">Tất cả</option>{Object.entries(statusLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Luồng bán<select value={flow} onChange={e=>{setFlow(e.target.value as ''|CatalogFlow);setLimit(40);}}><option value="">Tất cả</option>{Object.entries(flowLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Nhà cung cấp<select value={supplier} onChange={e=>{setSupplier(e.target.value);setLimit(40);}}><option value="">Tất cả</option><option value="preferred">NCC ưu tiên ({entries.filter(e=>e.preferred).length})</option>{[...new Map(entries.filter(e=>e.supplierId).map(e=>[e.supplierId!,e.supplierName])).entries()].map(([id,n])=><option key={id} value={id}>{n}</option>)}</select></label>
   <label>Tìm<input value={q} onChange={e=>{setQ(e.target.value);setLimit(40);}} placeholder="Mã, tên, nhà cung cấp, mã R75"/></label>
  </div>
  <div className="role-note"><RoleSwitch/><small>{full?`Góc nhìn ${roleViewLabels[role]}: hiện đủ giá vốn và lãi khách sạn.`:`Góc nhìn ${roleViewLabels[role]}: chỉ hiện giá bán và hoa hồng; giá vốn, lãi khách sạn và nút Sửa được ẩn. Đây là chế độ xem, chưa phải phân quyền tài khoản.`}</small></div>
  {editing&&full&&<EntryForm key={editing.id||'new'} id={editing.id} initial={editing.form} properties={properties} busy={busy} onCancel={()=>setEditing(null)} onSave={save} entry={entries.find(e=>e.id===editing.id)}/>}
  <div className="panel table-wrap"><table className="catalog-table"><thead><tr><th>Mã</th><th>Dịch vụ</th><th>Nhóm · luồng</th><th>Phạm vi</th><th>Giá bán</th>{full&&<th>Giá vốn</th>}<th>Hoa hồng</th>{full&&<th>Lãi KS</th>}<th>Trạng thái</th><th/></tr></thead>
   <tbody>{list.slice(0,limit).map(e=><tr key={e.id} className={'st-'+e.status.toLowerCase()}><td><code>{e.id}</code>{e.crmCode&&e.crmCode!==e.id&&<small>{e.crmCode}</small>}</td><td>{e.preferred&&<span className="cat-pref">NCC ưu tiên</span>}<strong>{e.title}</strong>{e.variant&&!e.title.includes(e.variant)&&<small>{e.variant}</small>}<small>{e.supplierName||'Chưa có nhà cung cấp'} · {e.unit}</small></td><td>{categoryLabels[e.category]}<small>{flowLabels[e.channelFlow]}</small></td><td>{scopeLabel(e)}</td>
    <td>{e.category==='ROOM_POLICY'?<small>{e.rule?.text}</small>:formatEntryPrice(e)}</td>{full&&<td>{e.netCost===null?'—':formatEntryPrice({sellingPrice:e.netCost,currency:e.currency})}{(unitMargin(e)??0)<0&&<small className="cat-loss">Lỗ {formatEntryPrice({sellingPrice:-unitMargin(e)!,currency:e.currency})}/{e.unit}</small>}</td>}<td>{e.commission===null?'—':formatEntryPrice({sellingPrice:e.commission,currency:e.currency})}</td>{full&&<td>{unitMargin(e)===null?'—':formatEntryPrice({sellingPrice:unitMargin(e)!,currency:e.currency})}</td>}
    <td><span className={'cat-status '+e.status.toLowerCase()}>{statusLabels[e.status]}</span>{e.approvedAt&&<small>{e.approvedAt}</small>}</td>
    <td>{full&&<button className="text-button" onClick={()=>{setEditing({id:e.id,version:e.version,form:editOf(e)});window.scrollTo({top:0,behavior:'smooth'});}}>Sửa</button>}</td></tr>)}</tbody></table>
   {list.length>limit&&<button className="button secondary" onClick={()=>setLimit(n=>n+40)}>Xem thêm ({list.length-limit} mục)</button>}{!list.length&&<p className="empty">Không có mục phù hợp bộ lọc.</p>}</div>
  <details className="panel"><summary><BookOpen size={15}/> Lịch sử thay đổi ({history.length})</summary><ul className="catalog-history">{history.map(h=><li key={h.operation_id}><small>{new Date(h.created).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}</small> {h.detail}</li>)}</ul>{!history.length&&<p className="muted">Chưa có thay đổi. Dữ liệu ban đầu gộp từ workbook 6 tab, nguồn R75 và cấu hình khách sạn.</p>}</details>
 </section>;
}

function EntryForm({id,initial,properties,busy,onCancel,onSave,entry}:{id:string|null;initial:EntryEdit;properties:{id:string;name:string}[];busy:boolean;onCancel:()=>void;onSave:(f:EntryEdit,s?:CatalogStatus)=>void;entry?:StoredEntry}){
 const [f,setF]=useState(initial),[raw,setRaw]=useState({sellingPrice:initial.sellingPrice?.toString()??'',netCost:initial.netCost?.toString()??'',commission:initial.commission?.toString()??''});
 const set=<K extends keyof EntryEdit>(k:K,v:EntryEdit[K])=>setF(x=>({...x,[k]:v}));
 const money=(k:'sellingPrice'|'netCost'|'commission')=><input inputMode="decimal" value={raw[k]} onChange={e=>{setRaw(r=>({...r,[k]:e.target.value}));const n=num(e.target.value);set(k,Number.isNaN(n)?f[k]:n);}} placeholder={f.currency==='VND'?'VD: 950000':'VD: 255'}/>;
 const scopeAll=f.propertyScope==='ALL';const scopeList=scopeAll?[]:f.propertyScope as string[];
 const toggle=(pid:string)=>{const next=scopeList.includes(pid)?scopeList.filter(x=>x!==pid):[...scopeList,pid];set('propertyScope',next.length?next:'ALL');};
 const canApprove=f.category==='ROOM_POLICY'||!!f.sellingPrice;
 return <form className="panel edit-form catalog-form" onSubmit={e=>{e.preventDefault();onSave(f);}}>
  <h2>{id?`Sửa ${id}`:'Thêm dịch vụ mới'}</h2>
  {entry&&<EntryMedia entry={entry}/>}
  {entry&&<p className="muted">Nguồn: {entry.sourceIds.join(', ')||'thêm trên ứng dụng'} · {entry.sourceNote}{entry.sourceUrl&&<> · <a href={entry.sourceUrl} target="_blank" rel="noreferrer">mở nguồn ↗</a></>}</p>}
  <div className="form-grid">
   <label>Tên dịch vụ *<input required minLength={2} value={f.title} onChange={e=>set('title',e.target.value)}/></label>
   <label>Hạng / biến thể<input value={f.variant} onChange={e=>set('variant',e.target.value)}/></label>
   <label>Nhóm<select value={f.category} onChange={e=>set('category',e.target.value as CatalogCategory)}>{Object.entries(categoryLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Luồng bán<select value={f.channelFlow} onChange={e=>set('channelFlow',e.target.value as CatalogFlow)}>{Object.entries(flowLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   <label>Đơn vị tính<input required value={f.unit} onChange={e=>set('unit',e.target.value)} placeholder="khách / xe / cabin"/></label>
   <label>Thời lượng<input value={f.duration} onChange={e=>set('duration',e.target.value)}/></label>
   <label>Nhà cung cấp<input value={f.supplierName} onChange={e=>set('supplierName',e.target.value)}/></label>
   <label>Tiền tệ<select value={f.currency} onChange={e=>set('currency',e.target.value as 'VND'|'USD')}><option>VND</option><option>USD</option></select></label>
   <label>Giá bán cho khách{money('sellingPrice')}</label>
   <label>Giá vốn (nội bộ){money('netCost')}</label>
   <label>Hoa hồng (nội bộ){money('commission')}</label>
   <label>Hiệu lực giá đến<input type="date" value={f.validUntil} onChange={e=>set('validUntil',e.target.value)}/></label>
   <fieldset className="span-2 catalog-scope"><legend>Khách sạn áp dụng</legend><label><input type="checkbox" checked={scopeAll} onChange={()=>set('propertyScope',scopeAll?[properties[0].id]:'ALL')}/> Tất cả cơ sở</label>{!scopeAll&&properties.map(p=><label key={p.id}><input type="checkbox" checked={scopeList.includes(p.id)} onChange={()=>toggle(p.id)}/> {p.name}</label>)}</fieldset>
   <label className="span-2">Mô tả / lộ trình<textarea rows={2} value={f.summary} onChange={e=>set('summary',e.target.value)}/></label>
   <label>Bao gồm<textarea rows={2} value={f.inclusions} onChange={e=>set('inclusions',e.target.value)}/></label>
   <label>Chưa gồm<textarea rows={2} value={f.exclusions} onChange={e=>set('exclusions',e.target.value)}/></label>
  </div>
  <p className="q-field-note">Trạng thái hiện tại: <strong>{statusLabels[f.status]}</strong>. Duyệt giá ghi người duyệt và ngày duyệt. Sau khi duyệt, hệ thống cho phép đúng số tiền này trong nháp gửi khách.</p>
  <div className="modal-actions">
   <button type="button" className="button secondary" onClick={onCancel}>Hủy</button>
   <button type="submit" className="button secondary" disabled={busy}>Lưu</button>
   {f.status!=='REFERENCE_ONLY'&&<button type="button" className="button secondary" disabled={busy} onClick={()=>onSave(f,'REFERENCE_ONLY')}>Chuyển sang tham khảo</button>}
   {f.status!=='ARCHIVED'&&id&&<button type="button" className="button secondary" disabled={busy} onClick={()=>onSave(f,'ARCHIVED')}><Archive size={15}/>Lưu trữ</button>}
   <button type="button" className="button primary" disabled={busy||!canApprove} title={canApprove?'':'Nhập giá bán trước'} onClick={()=>onSave(f,'APPROVED')}><Check size={15}/>{f.status==='APPROVED'?'Lưu & giữ duyệt':'Duyệt giá'}</button>
  </div>
 </form>;
}
