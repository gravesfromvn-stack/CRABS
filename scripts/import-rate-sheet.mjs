// Imports the 6-tab rate/condition workbook (Duyet gia, Dieu kien, Kho tour, Nguon, Tuyen 12Go,
// Xe tu Ha Noi) into lib/rate-catalog.json. Header rows are found by their labels, not fixed
// numbers. Re-importing the same file is a no-op; changed values are recorded as reviewable
// changes and never silently replace what Cua approved.
// Usage: node scripts/import-rate-sheet.mjs <file.xlsx> [--sheet-url URL] [--out lib/rate-catalog.json]
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import {readXlsx} from './xlsx-read.mjs';

// Pure builder: sheets (readXlsx format) + previous catalog -> next catalog and a summary.
export function buildCatalog(sheets,previous,{file,sha256,sheetUrl='',now=new Date().toISOString()}){
const need=['Duyet gia','Dieu kien','Kho tour','Nguon','Tuyen 12Go','Xe tu Ha Noi'];
for(const n of need)if(!sheets.some(s=>s.name===n))throw Error(`Missing tab "${n}". Export all 6 tabs as XLSX.`);
const serialDate=n=>typeof n==='number'&&n>30000&&n<60000?new Date(Date.UTC(1899,11,30)+n*86400000).toISOString().slice(0,10):'';
const text=c=>{if(!c)return '';const v=c.value;return v===null||v===undefined?'':typeof v==='number'?String(v):String(v).trim();};
// Rows below the header row identified by its first label; columns mapped by header text.
function table(name,firstLabel){
 const s=sheets.find(x=>x.name===name),hi=s.rows.findIndex(r=>text(r.cells.A)===firstLabel);
 if(hi<0)throw Error(`Header "${firstLabel}" not found in ${name}`);
 const header=s.rows[hi],cols=Object.fromEntries(Object.entries(header.cells).map(([col,c])=>[text(c),col]));
 const notes=s.rows.slice(0,hi).map(r=>Object.values(r.cells).map(text).filter(Boolean).join(' · ')).filter(Boolean);
 const rows=s.rows.slice(hi+1).filter(r=>text(r.cells.A)).map(r=>({row:r.row,get:label=>{const col=cols[label];return col?r.cells[col]:undefined;},cell:col=>r.cells[col]}));
 return {rows,cols,notes,headerRow:header.row};
}
const dg=table('Duyet gia','Mã duyệt'),dk=table('Dieu kien','Mã duyệt'),kt=table('Kho tour','Mã duyệt'),ng=table('Nguon','Mã duyệt'),vt=table('Tuyen 12Go','Mã duyệt'),xh=table('Xe tu Ha Noi','Mã');
const gid={"Duyet gia":"1396994013","Dieu kien":"1906650976","Kho tour":"1810182601","Nguon":"155644744","Tuyen 12Go":"1810182602","Xe tu Ha Noi":"1810182603"};
const ref=(tab,row,range)=>({tab,row,range:`${tab}!${range||'A'+row}`,url:sheetUrl?`${sheetUrl.replace(/\/edit.*$/,'')}/edit#gid=${gid[tab]}&range=A${row}`:''});
const t=(r,label)=>text(r.get(label)),link=(r,label)=>r.get(label)?.link||(/^https?:/.test(t(r,label))?t(r,label):'');

// Money as written in the source: keeps every amount, currency and unit; never converted.
function amounts(raw){
 const list=[];for(const m of raw.matchAll(/(\d{1,3}(?:[.]\d{3})+|\d+(?:,\d+)?)\s*(đ|₫|VNĐ|VND|USD|EUR|CNY|TWD)?/gi)){const n=m[1].includes('.')&&!m[1].includes(',')?Number(m[1].replace(/\./g,'')):Number(m[1].replace(/\./g,'').replace(',','.'));if(!Number.isFinite(n)||n===0)continue;const cur=(m[2]||'').toUpperCase().replace('Đ','VND').replace('₫','VND').replace('VNĐ','VND');list.push({amount:n,currency:cur||null});}
 return list;
}
const conflictRe=/mâu thuẫn|lẫn |không có trong lịch trình|tên .* nhưng nội dung|chưa thống nhất|khác nhau giữa|ghi năm 20\d\d|ghi ?20\d\d/i;
const items={};
const base=id=>items[id]??=({id,crmIds:[],title:'',group:'',kind:'tour',supplier:'',variant:'',duration:'',route:'',baseRouteId:'',origin:'',destination:'',vehicleClass:'',times:'',includes:'',excludes:'',children:'',toConfirm:[],sourceNotes:[],sourcePrice:{raw:'',unit:'',amounts:[]},evidence:[],approval:null,comparison:null,transport:null,refs:[],readAt:'',issues:[]});

for(const r of dg.rows){const id=t(r,'Mã duyệt'),it=base(id);
 Object.assign(it,{group:t(r,'Nhóm'),title:t(r,'Dịch vụ / gói')});
 it.variant=it.title.includes('/')?it.title.split('/').slice(1).join('/').trim():it.title.includes('·')?it.title.split('·').slice(1).join('·').trim():'';
 it.kind=/^XE\d/.test(id)?'airport_transfer':/^VT\d/.test(id)?'transport_route':/^KL0[1-4]$/.test(id)?'comparison':'tour';
 it.sourcePrice={raw:t(r,'Mức đang có tại nguồn'),unit:t(r,'Đơn vị ở nguồn'),amounts:amounts(t(r,'Mức đang có tại nguồn'))};
 if(t(r,'Điểm cần chốt riêng'))it.toConfirm.push(t(r,'Điểm cần chốt riêng'));
 const num=label=>{const c=r.get(label);return c&&typeof c.value==='number'?c.value:c&&text(c)?Number(text(c).replace(/[^\d]/g,''))||null:null;};
 const date=label=>{const c=r.get(label);return c?serialDate(c.value)||text(c):'';};
 it.approval={choice:t(r,'Cua chọn'),price:num('Giá bán duyệt VND'),cost:num('Giá vốn duyệt VND'),commission:num('Hoa hồng VND'),unit:t(r,'Đơn vị được duyệt'),property:t(r,'Cơ sở áp dụng'),supplier:t(r,'NCC được duyệt'),from:date('Hiệu lực từ'),until:date('Hiệu lực đến'),approver:t(r,'Người duyệt'),approvedAt:date('Ngày duyệt'),note:t(r,'Ghi chú Cua'),sheetStatus:t(r,'Hồ sơ duyệt'),conditionsProgress:t(r,'Điều kiện đã nhập'),conditions:null};
 it.refs.push(ref('Duyet gia',r.row));
}
const condMap={'Bao gồm Cua chốt':'includes','Chưa gồm Cua chốt':'excludes','Trẻ em Cua chốt':'children','Thuế / phụ thu Cua chốt':'tax','Đón trả / xe / cabin Cua chốt':'pickup','Cọc / thanh toán Cua chốt':'deposit','Đổi / hủy / hoàn Cua chốt':'cancellation'};
for(const r of dk.rows){const id=t(r,'Mã duyệt'),it=base(id);
 Object.assign(it,{includes:t(r,'Bao gồm ở nguồn'),excludes:t(r,'Chưa gồm ở nguồn'),children:t(r,'Trẻ em ở nguồn')});
 if(t(r,'Điều kiện cần xác nhận'))it.toConfirm.push(t(r,'Điều kiện cần xác nhận'));
 if(t(r,'Lưu ý nguồn'))it.sourceNotes.push(t(r,'Lưu ý nguồn'));
 it.approval??={};it.approval.conditions=Object.fromEntries(Object.entries(condMap).map(([label,key])=>[key,t(r,label)]));
 it.refs.push(ref('Dieu kien',r.row));
}
for(const r of kt.rows){const id=t(r,'Mã duyệt'),it=base(id),route=t(r,'Lịch trình chính');
 Object.assign(it,{group:it.group||t(r,'Miền'),title:it.title||t(r,'Tour / gói'),duration:t(r,'Thời lượng'),readAt:serialDate(r.get('Ngày đọc nguồn')?.value)||t(r,'Ngày đọc nguồn')});
 const see=route.match(/^Xem hành trình\s+([A-Z]+\d+)/i);if(see)it.baseRouteId=see[1].toUpperCase();else it.route=route;
 if(t(r,'Chưa đủ để chốt bán'))it.toConfirm.push(t(r,'Chưa đủ để chốt bán'));
 it.comparison={with:t(r,'Mã đối chiếu'),assessment:t(r,'Đánh giá mức tương đương'),tourUrl:link(r,'Nguồn tour'),compareUrl:link(r,'Nguồn đối chiếu')};
 it.supplier=it.supplier||(link(r,'Nguồn tour').replace(/^https?:\/\/(www\.)?/,'').split('/')[0]);
 it.refs.push(ref('Kho tour',r.row));
}
for(const r of ng.rows){const id=t(r,'Mã duyệt');if(!id)continue;const it=base(id);
 const crm=t(r,'Mã CRM');if(crm&&!it.crmIds.includes(crm))it.crmIds.push(crm);
 const num=label=>{const c=r.get(label);return c&&typeof c.value==='number'?c.value:null;};
 it.evidence.push({type:t(r,'Loại nguồn'),crmId:crm,supplier:t(r,'Đơn vị / NCC tại nguồn'),package:t(r,'Gói / dịch vụ tại nguồn'),price:num('Giá ghi tại nguồn'),priceText:num('Giá ghi tại nguồn')===null?t(r,'Giá ghi tại nguồn'):'',contractPrice:num('Giá HĐ ghi tại nguồn'),currency:t(r,'Tiền tệ'),unit:t(r,'Đơn vị tính ở nguồn'),asOf:t(r,'Mốc nguồn'),meaning:t(r,'Ý nghĩa mức tiền'),url:link(r,'Nguồn chính'),sheetUrl:link(r,'Nguồn Sheets'),note:t(r,'Ghi chú'),sameLevel:t(r,'Các dòng cùng mức khác'),ref:ref('Nguon',r.row)});
 if(!it.supplier&&t(r,'Đơn vị / NCC tại nguồn'))it.supplier=t(r,'Đơn vị / NCC tại nguồn');
}
for(const r of vt.rows){const id=t(r,'Mã duyệt'),it=base(id),[from,to]=t(r,'Tuyến một chiều').split('→').map(s=>s.trim());
 Object.assign(it,{kind:'transport_route',origin:from||'',destination:to||'',supplier:t(r,'Nhà vận hành'),vehicleClass:t(r,'Hạng phương tiện'),times:t(r,'Giờ mẫu tại nguồn'),readAt:serialDate(r.get('Ngày đọc nguồn')?.value)});
 it.transport={sampleTimes:t(r,'Giờ mẫu tại nguồn'),priceUsd:r.get('Giá nguồn USD')?.value??null,unit:t(r,'Đơn vị / phạm vi'),check:t(r,'Cần xác nhận riêng'),url:link(r,'Nguồn tuyến')};
 if(t(r,'Cần xác nhận riêng'))it.toConfirm.push(t(r,'Cần xác nhận riêng'));
 it.refs.push(ref('Tuyen 12Go',r.row));
}
for(const r of xh.rows){const id=t(r,'Mã'),it=base(id);
 Object.assign(it,{kind:'bus_schedule',title:`${t(r,'Điểm đến từ Hà Nội')} · ${t(r,'Nhà xe')}`,origin:'Hà Nội',destination:t(r,'Điểm đến từ Hà Nội'),supplier:t(r,'Nhà xe'),vehicleClass:t(r,'Hạng xe'),times:t(r,'Giờ khởi hành'),readAt:serialDate(r.get('Ngày đọc nguồn')?.value)});
 it.transport={departures:t(r,'Giờ khởi hành'),duration:t(r,'Thời gian / giờ đến'),pickup:t(r,'Điểm đón tại Hà Nội'),dropoff:t(r,'Điểm trả'),priceText:t(r,'Giá tham khảo · chưa duyệt'),check:t(r,'Cần xác nhận trước khi bán'),scheduleType:t(r,'Loại lịch / trạng thái'),url:link(r,'Nguồn tra cứu'),rateLink:t(r,'Đối chiếu bảng giá'),cuaNote:t(r,'Cua xác nhận / bổ sung')};
 it.sourcePrice={raw:t(r,'Giá tham khảo · chưa duyệt'),unit:'',amounts:amounts(t(r,'Giá tham khảo · chưa duyệt'))};
 if(t(r,'Cần xác nhận trước khi bán'))it.toConfirm.push(t(r,'Cần xác nhận trước khi bán'));
 it.refs.push(ref('Xe tu Ha Noi',r.row));
}
// Variants that point to another itinerary inherit its route but keep their own title/class/conditions.
for(const it of Object.values(items))if(it.baseRouteId&&items[it.baseRouteId])it.route=items[it.baseRouteId].route;
// Rows in Nguon that are supplier-wide terms or advisory notes, not products.
for(const it of Object.values(items))if(!/^(?:[A-Z]{2}\d{2}|XHN\d{2})$/.test(it.id))it.kind=/^HCT/.test(it.id)?'policy':'note';
for(const it of Object.values(items)){it.toConfirm=[...new Set(it.toConfirm)];it.sourceNotes=[...new Set(it.sourceNotes)];}
// Workbook-level notes naming problem items (e.g. "HT06/HT13 lẫn lịch trình").
const flagged=new Set([...kt.notes.join(' ').matchAll(/\b([A-Z]{2}\d{2})\b/g)].map(m=>m[1]));

function classify(it){
 const a=it.approval||{},c=a.conditions||{},missing=[];
 const req={price:'giá bán',unit:'đơn vị',property:'cơ sở',supplier:'nhà cung cấp',from:'hiệu lực từ',until:'hiệu lực đến',approver:'người duyệt',approvedAt:'ngày duyệt'};
 for(const [k,label] of Object.entries(req))if(!a[k])missing.push(label);
 for(const [k,label] of Object.entries({includes:'bao gồm',excludes:'chưa gồm',children:'trẻ em',tax:'thuế/phụ thu',pickup:'đón trả',deposit:'cọc/thanh toán',cancellation:'đổi/hủy'}))if(!c[k])missing.push('điều kiện '+label);
 const approvedChoice=/cua duyệt|đã duyệt/i.test(a.choice||'');
 const texts=[...it.toConfirm,...it.sourceNotes,it.comparison?.assessment||'',it.route];
 const conflicts=texts.filter(x=>conflictRe.test(x));
 const issues=[...conflicts.map(x=>'Mâu thuẫn nguồn: '+x),...(flagged.has(it.id)&&!conflicts.length?['Tab Kho tour ghi mục này cần xác nhận ưu tiên.']:[])];
 if(approvedChoice&&missing.length)issues.push(`Đã chọn "${a.choice}" nhưng hồ sơ duyệt còn thiếu: ${missing.join(', ')}. Chưa dùng giá này để báo khách.`);
 const blocksAdvice=conflicts.some(x=>/lẫn|không có trong lịch trình|nhưng nội dung|chặn tư vấn/i.test(x));
 const content=Boolean(it.route||it.includes);
 const referenceOnly=it.kind==='policy'||it.kind==='note'||it.kind==='comparison'||it.kind==='transport_route'||it.kind==='bus_schedule'||it.kind==='airport_transfer'||/^KL/.test(it.id);
 return {issues:[...new Set(issues)],approvalComplete:approvedChoice&&!missing.length,approvalMissing:missing,canQuote:approvedChoice&&!missing.length,canAdvise:content&&!blocksAdvice&&!referenceOnly,referenceOnly,unusable:blocksAdvice||(!content&&!referenceOnly),
  category:approvedChoice&&!missing.length?'quotable':blocksAdvice||(!content&&!referenceOnly)?'unusable':referenceOnly?'reference':'advise'};
}

const version=(previous?.version||0)+1;
const changes=[];
const tracked=['title','route','duration','includes','excludes','children','sourcePrice','supplier','vehicleClass','times','transport','toConfirm','sourceNotes','approval'];
const approvedFields=['approval'];
const finalItems={};
for(const it of Object.values(items)){
 it.classification=classify(it);
 const old=previous?.items?.[it.id];
 if(old){
  for(const f of tracked){const a=JSON.stringify(old[f]??null),b=JSON.stringify(it[f]??null);if(a!==b)changes.push({version,id:it.id,field:f,before:old[f]??null,after:it[f]??null,needsReview:approvedFields.includes(f)||old.classification?.approvalComplete===true});}
  // Never replace values Cua approved: keep them and flag the incoming difference for review.
  if(old.classification?.approvalComplete&&JSON.stringify(old.approval)!==JSON.stringify(it.approval)){it.pendingApproval=it.approval;it.approval=old.approval;it.classification=classify(it);it.classification.issues.push('Nguồn có thay đổi so với hồ sơ đã duyệt; giữ bản đã duyệt cho tới khi Cua xem lại.');}
  it.firstImported=old.firstImported||old.importedAt||now;
 }else{it.firstImported=now;if(previous)changes.push({version,id:it.id,field:'*',before:null,after:'new',needsReview:false});}
 it.importVersion=version;finalItems[it.id]=it;
}
for(const id of Object.keys(previous?.items||{}))if(!finalItems[id]){finalItems[id]={...previous.items[id],removedInSource:version};changes.push({version,id,field:'*',before:'present',after:'removed',needsReview:true});}

const counts=Object.fromEntries(['Duyet gia','Dieu kien','Kho tour','Nguon','Tuyen 12Go','Xe tu Ha Noi'].map((n,i)=>[n,[dg,dk,kt,ng,vt,xh][i].rows.length]));
const byCategory={};for(const it of Object.values(finalItems))byCategory[it.classification.category]=(byCategory[it.classification.category]||0)+1;
const catalog={schema:1,version,sheetUrl,sourceReadAt:(dg.notes.join(' ').match(/đọc (\d{2}\/\d{2}\/\d{4})/i)||[])[1]||'',
 workbookNotes:Object.fromEntries([['Duyet gia',dg],['Dieu kien',dk],['Kho tour',kt],['Nguon',ng],['Tuyen 12Go',vt],['Xe tu Ha Noi',xh]].map(([n,x])=>[n,x.notes])),
 imports:[...(previous?.imports||[]),{version,at:now,file:basename(file),sha256,rows:counts,items:Object.keys(finalItems).length,changes:changes.length,byCategory}],
 items:Object.fromEntries(Object.entries(finalItems).sort(([a],[b])=>a.localeCompare(b))),
 changes:[...(previous?.changes||[]),...changes]};
return {catalog,summary:{result:previous?'updated':'created',version,rows:counts,items:Object.keys(finalItems).length,changes:changes.length,byCategory}};
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--'));
 const opt=k=>{const i=args.indexOf(k);return i>=0?args[i+1]:'';};
 if(!file)throw Error('Usage: node scripts/import-rate-sheet.mjs <file.xlsx> [--sheet-url URL]');
 const out=opt('--out')||'lib/rate-catalog.json',sheetUrl=opt('--sheet-url');
 const sha256=createHash('sha256').update(readFileSync(file)).digest('hex');
 const previous=existsSync(out)?JSON.parse(readFileSync(out,'utf8')):null;
 // The same file twice is a no-op; no duplicate items or versions.
 if(previous?.imports?.some(i=>i.sha256===sha256)){console.log(JSON.stringify({result:'unchanged',sha256,version:previous.version}));process.exit(0);}
 const {catalog,summary}=buildCatalog(readXlsx(file),previous,{file:basename(file),sha256,sheetUrl});
 writeFileSync(out,JSON.stringify(catalog,null,1)+'\n');
 console.log(JSON.stringify(summary));
}
