import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync,readFileSync} from 'node:fs';
import {buildCatalog} from '../scripts/import-rate-sheet.mjs';
mkdirSync('.quote-tests/catalog',{recursive:true});
await build({entryPoints:['lib/rate-catalog.ts'],outdir:'.quote-tests/catalog',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},loader:{'.json':'json'}});
const rc=await import('../.quote-tests/catalog/rate-catalog.mjs');
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};

// Synthetic 6-tab workbook in the reader's shape. Header rows sit below notes at different
// positions per tab, so nothing depends on fixed row numbers.
const cols='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').flatMap((a,i,all)=>i?[a]:[a,...all.map(b=>'A'+b)]).sort((x,y)=>x.length-y.length||x.localeCompare(y));
function tab(name,notes,headers,records){
 const rows=[];let r=1;
 for(const n of notes)rows.push({row:r++,cells:{A:{value:n,type:'s'}}});
 rows.push({row:r++,cells:Object.fromEntries(headers.map((h,i)=>[cols[i],{value:h,type:'s'}]))});
 for(const rec of records)rows.push({row:r++,cells:Object.fromEntries(headers.map((h,i)=>[cols[i],rec[h]===undefined?null:{value:rec[h],type:typeof rec[h]==='number'?'n':'s'}]).filter(([,v])=>v))});
 return {name,rows};
}
const dgH=['Mã duyệt','Nhóm','Dịch vụ / gói','Mức đang có tại nguồn','Đơn vị ở nguồn','Điểm cần chốt riêng','Cua chọn','Giá bán duyệt VND','Giá vốn duyệt VND','Hoa hồng VND','Đơn vị được duyệt','Cơ sở áp dụng','NCC được duyệt','Hiệu lực từ','Hiệu lực đến','Người duyệt','Ngày duyệt','Ghi chú Cua','Hồ sơ duyệt','Điều kiện đã nhập'];
const dkH=['Mã duyệt','Bao gồm ở nguồn','Chưa gồm ở nguồn','Trẻ em ở nguồn','Điều kiện cần xác nhận','Lưu ý nguồn','Bao gồm Cua chốt','Chưa gồm Cua chốt','Trẻ em Cua chốt','Thuế / phụ thu Cua chốt','Đón trả / xe / cabin Cua chốt','Cọc / thanh toán Cua chốt','Đổi / hủy / hoàn Cua chốt'];
const ktH=['Mã duyệt','Miền','Tour / gói','Thời lượng','Lịch trình chính','Chưa đủ để chốt bán','Mã đối chiếu','Đánh giá mức tương đương','Nguồn tour','Nguồn đối chiếu','Ngày đọc nguồn'];
const ngH=['Mã duyệt','Mã CRM','Loại nguồn','Đơn vị / NCC tại nguồn','Gói / dịch vụ tại nguồn','Giá ghi tại nguồn','Tiền tệ','Đơn vị tính ở nguồn','Mốc nguồn','Ý nghĩa mức tiền','Nguồn chính','Ghi chú'];
const vtH=['Mã duyệt','Tuyến một chiều','Nhà vận hành','Hạng phương tiện','Giờ mẫu tại nguồn','Giá nguồn USD','Đơn vị / phạm vi','Cần xác nhận riêng','Nguồn tuyến','Ngày đọc nguồn'];
const xhH=['Mã','Điểm đến từ Hà Nội','Nhà xe','Hạng xe','Giờ khởi hành','Thời gian / giờ đến','Điểm đón tại Hà Nội','Điểm trả','Giá tham khảo · chưa duyệt','Cần xác nhận trước khi bán','Loại lịch / trạng thái','Nguồn tra cứu','Ngày đọc nguồn'];
const full={'Cua chọn':'Cua duyệt','Giá bán duyệt VND':1200000,'Giá vốn duyệt VND':900000,'Hoa hồng VND':100000,'Đơn vị được duyệt':'khách','Cơ sở áp dụng':'Luxe 75PHT','NCC được duyệt':'NCC A','Hiệu lực từ':46300,'Hiệu lực đến':46400,'Người duyệt':'Cua','Ngày duyệt':46310};
const conds={'Bao gồm Cua chốt':'xe, HDV, ăn trưa','Chưa gồm Cua chốt':'đồ uống','Trẻ em Cua chốt':'dưới 4 tuổi miễn phí','Thuế / phụ thu Cua chốt':'đã gồm VAT','Đón trả / xe / cabin Cua chốt':'đón phố cổ','Cọc / thanh toán Cua chốt':'trả trước','Đổi / hủy / hoàn Cua chốt':'hủy trước 48h'};
function workbook(o={}){
 return [
  tab('Duyet gia',['Bảng duyệt giá · đọc 18/10/2026','Ghi chú'],dgH,[
   {'Mã duyệt':'CH01','Nhóm':'Hà Giang','Dịch vụ / gói':'Hà Giang 3N2Đ / Dorm','Mức đang có tại nguồn':o.ch01Price||'3.500.000 đ','Đơn vị ở nguồn':'khách',...full},
   {'Mã duyệt':'CH02','Nhóm':'Hà Giang','Dịch vụ / gói':'Hà Giang 3N2Đ / Jeep','Mức đang có tại nguồn':'from 180 USD','Đơn vị ở nguồn':'khách/ngày'},
   {'Mã duyệt':'HN01','Nhóm':'Hà Nội','Dịch vụ / gói':'Hà Nội city tour','Mức đang có tại nguồn':'750.000 đ','Cua chọn':'Cua duyệt','Giá bán duyệt VND':o.hn01Price},
   {'Mã duyệt':'HT13','Nhóm':'Hạ Long','Dịch vụ / gói':'Celina 2N1Đ','Mức đang có tại nguồn':'2.000.000 đ'},
   ...(o.drop?[]:[{'Mã duyệt':'NB09','Nhóm':'Ninh Bình','Dịch vụ / gói':'Ninh Bình 1 ngày','Mức đang có tại nguồn':'800.000 đ'}]),
  ]),
  tab('Dieu kien',['Điều kiện'],dkH,[{'Mã duyệt':'CH01','Bao gồm ở nguồn':'Xe Hà Nội khứ hồi, dorm','Chưa gồm ở nguồn':'đồ uống',...conds,...(o.ch01Cond||{})},{'Mã duyệt':'CH02','Bao gồm ở nguồn':'Jeep'}]),
  tab('Kho tour',['Kho tour','HT13 lẫn lịch trình Paradise Grand','Cột'],ktH,[
   {'Mã duyệt':'CH01','Miền':'Bắc','Tour / gói':'Hà Giang 3N2Đ / Dorm','Thời lượng':'3 ngày 2 đêm','Lịch trình chính':'Hà Nội – Quản Bạ – Đồng Văn – Mã Pí Lèng','Ngày đọc nguồn':46313},
   {'Mã duyệt':'CH02','Miền':'Bắc','Tour / gói':'Hà Giang 3N2Đ / Jeep','Thời lượng':'3 ngày 2 đêm','Lịch trình chính':'Xem hành trình CH01; khác: đi Jeep','Ngày đọc nguồn':46313},
   {'Mã duyệt':'HT13','Miền':'Bắc','Tour / gói':'Celina 2N1Đ','Thời lượng':'2 ngày 1 đêm','Lịch trình chính':'Tên Celina nhưng nội dung là Paradise Grand','Chưa đủ để chốt bán':'Tên Celina nhưng nội dung là Paradise Grand'},
   ...(o.drop?[]:[{'Mã duyệt':'NB09','Miền':'Bắc','Tour / gói':'Ninh Bình 1 ngày','Thời lượng':'1 ngày','Lịch trình chính':'Hoa Lư – Tràng An – Hang Múa'}]),
  ]),
  tab('Nguon',[],ngH,[{'Mã duyệt':'CH01','Mã CRM':'R75-TST-090','Loại nguồn':'Website','Đơn vị / NCC tại nguồn':'Klook','Giá ghi tại nguồn':3500000,'Tiền tệ':'VND'},{'Mã duyệt':'CH01','Mã CRM':'R75-TST-090','Loại nguồn':'Sheets','Giá ghi tại nguồn':3400000,'Tiền tệ':'VND'}]),
  tab('Tuyen 12Go',['12Go'],vtH,[{'Mã duyệt':'VT01','Tuyến một chiều':'Hà Nội → Hà Giang','Nhà vận hành':'Bằng Phấn','Hạng phương tiện':'Cabin đơn','Giờ mẫu tại nguồn':'21:00 (+1 ngày)','Giá nguồn USD':18}]),
  tab('Xe tu Ha Noi',['Xe từ Hà Nội'],xhH,[{'Mã':'XHN01','Điểm đến từ Hà Nội':'Hà Giang','Nhà xe':'Bằng Phấn','Hạng xe':'Cabin đơn','Giờ khởi hành':'19:00, 00:30','Thời gian / giờ đến':'khoảng 6 giờ','Loại lịch / trạng thái':'Lịch tổng hợp mẫu','Giá tham khảo · chưa duyệt':'400.000 đ'}]),
 ];
}
const opts=n=>({file:'t.xlsx',sha256:'s'+n,now:'2026-10-18T00:00:00Z'});

check('All 6 tabs read by header label; "Xem hành trình" variant links to its base route but stays separate',()=>{
 const {catalog,summary}=buildCatalog(workbook(),null,opts(1));
 assert.deepEqual(summary.rows,{'Duyet gia':5,'Dieu kien':2,'Kho tour':4,'Nguon':2,'Tuyen 12Go':1,'Xe tu Ha Noi':1});
 const ch2=catalog.items.CH02;
 assert.equal(ch2.baseRouteId,'CH01');assert.equal(ch2.route,catalog.items.CH01.route);
 assert.equal(ch2.variant,'Jeep');assert.equal(catalog.items.CH01.variant,'Dorm');
 assert.deepEqual(ch2.refs.map(r=>r.tab),['Duyet gia','Dieu kien','Kho tour']);
 assert.equal(catalog.items.CH01.evidence.length,2);
 assert.equal(catalog.items.CH01.readAt,'2026-10-18');
 assert.deepEqual(catalog.items.CH02.sourcePrice.amounts,[{amount:180,currency:'USD'}]);
});
check('Classification: quotable only with full approval; tick alone is not enough; conflicts are unusable',()=>{
 const c=buildCatalog(workbook(),null,opts(1)).catalog.items;
 assert.equal(c.CH01.classification.category,'quotable');
 assert.equal(c.HN01.classification.canQuote,false);
 assert.match(c.HN01.classification.issues.join(' '),/hồ sơ duyệt còn thiếu/);
 assert.equal(c.HT13.classification.category,'unusable');assert.equal(c.HT13.classification.canAdvise,false);
 assert.equal(c.CH02.classification.category,'advise');
 assert.equal(c.VT01.classification.category,'reference');assert.equal(c.XHN01.classification.category,'reference');
});
check('Re-import of the same content: no duplicates, no changes',()=>{
 const a=buildCatalog(workbook(),null,opts(1)).catalog,b=buildCatalog(workbook(),a,opts(2));
 assert.equal(Object.keys(b.catalog.items).length,Object.keys(a.items).length);
 assert.equal(b.summary.changes,0);assert.equal(b.catalog.version,2);assert.equal(b.catalog.items.CH01.firstImported,a.items.CH01.firstImported);
});
check('Source change on an approved item is flagged for review and never overwrites the approved record',()=>{
 const a=buildCatalog(workbook(),null,opts(1)).catalog;
 const b=buildCatalog(workbook({ch01Price:'3.900.000 đ',ch01Cond:{'Đổi / hủy / hoàn Cua chốt':''}}),a,opts(2)).catalog;
 const ch=b.items.CH01;
 assert.equal(ch.approval.conditions.cancellation,'hủy trước 48h');
 assert.equal(ch.pendingApproval.conditions.cancellation,'');
 assert.equal(ch.classification.canQuote,true);
 assert.match(ch.classification.issues.join(' '),/giữ bản đã duyệt/);
 assert.ok(b.changes.some(x=>x.id==='CH01'&&x.field==='sourcePrice'&&x.needsReview));
 assert.ok(b.changes.some(x=>x.id==='CH01'&&x.field==='approval'&&x.needsReview));
});
check('Rows removed from the source are marked, not deleted; runtime list hides them',()=>{
 const a=buildCatalog(workbook(),null,opts(1)).catalog,b=buildCatalog(workbook({drop:true}),a,opts(2)).catalog;
 assert.equal(b.items.NB09.removedInSource,2);
 assert.ok(b.changes.some(x=>x.id==='NB09'&&x.after==='removed'&&x.needsReview));
});
check('Price status: approval must match property and service date',()=>{
 const it=buildCatalog(workbook(),null,opts(1)).catalog.items.CH01;
 assert.equal(rc.priceStatus(it,{propertyId:'luxe-75pht',serviceDate:'2026-10-25'}).quotable,true);
 assert.equal(rc.priceStatus(it,{propertyId:'luxe-75pht',serviceDate:'2026-10-25'}).approved.price,1200000);
 assert.match(rc.priceStatus(it,{propertyId:'luxe-75pht'}).reasons.join(),/Chưa biết ngày/);
 assert.match(rc.priceStatus(it,{propertyId:'luxe-75pht',serviceDate:'2027-03-01'}).reasons.join(),/ngoài hiệu lực/);
 assert.match(rc.priceStatus(it,{propertyId:'luxe-suites',serviceDate:'2026-10-25'}).reasons.join(),/không phải cơ sở/);
 assert.equal(rc.priceStatus(it,{propertyId:'luxe-suites',serviceDate:'2026-10-25'}).label,'Tham khảo · Cần Cua chốt giá');
});
check('Committed catalog from the real workbook: 6 tabs, 102 items, nothing quotable, HN01 ticked but incomplete',()=>{
 const c=JSON.parse(readFileSync('lib/rate-catalog.json','utf8'));
 assert.deepEqual(c.imports[0].rows,{'Duyet gia':81,'Dieu kien':81,'Kho tour':40,'Nguon':99,'Tuyen 12Go':12,'Xe tu Ha Noi':19});
 assert.equal(Object.keys(c.items).length,102);
 assert.equal(Object.values(c.items).filter(i=>i.classification.canQuote).length,0);
 assert.equal(c.items.HN01.approval.choice,'Cua duyệt');assert.equal(c.items.HN01.classification.canQuote,false);
 for(const id of ['HT06','HT13'])assert.equal(c.items[id].classification.category,'unusable');
 assert.equal(rc.priceStatus(rc.findCatalogItem('HN01'),{propertyId:'luxe-75pht',serviceDate:'2026-10-25'}).approved,null);
 // Cabin/dorm/Jeep classes stay separate items, never merged by destination.
 const hg=rc.catalogItems.filter(i=>i.kind==='tour'&&rc.placesIn(i.title).includes('Hà Giang'));
 assert.ok(hg.length>=2);assert.equal(new Set(hg.map(i=>i.id)).size,hg.length);
});
check('Transport rows keep cautions: next-day, after midnight, aggregated schedule, city ≠ Loop',()=>{
 const rows=rc.transportFor('Hà Giang');assert.ok(rows.length);
 const all=rows.flatMap(r=>r.cautions).join(' ');
 assert.match(all,/không gồm Hà Giang Loop/);assert.match(all,/ước tính/);
 const cb=rc.transportFor('Cao Bằng').flatMap(r=>r.cautions).join(' ');
 if(rc.transportFor('Cao Bằng').length)assert.match(cb,/Bản Giốc/);
});
console.log(JSON.stringify({passed,scope:'6-tab import, dedupe, approval record, re-import review, price validity, transport cautions'}));
