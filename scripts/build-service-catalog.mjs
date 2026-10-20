// Merges the three price sources into one service catalog seed (lib/service-catalog-seed.json):
//  · lib/rate-catalog.json        6-tab workbook (tours, airport transfer, 12Go routes, buses, notes)
//  · lib/quote-source-data.json   R75 rows from the 75PHT sheets (+ website checks in tour-research-data)
//  · lib/hotel-policy-config.json airport transfer table, spa menu, room policies
// The seed is loaded into D1 per owner on first use; afterwards prices are edited in the app.
// Usage: node scripts/build-service-catalog.mjs
import {readFileSync,writeFileSync} from 'node:fs';
const read=f=>JSON.parse(readFileSync(new URL('../lib/'+f,import.meta.url),'utf8'));
const rate=read('rate-catalog.json'),r75=read('quote-source-data.json'),hotel=read('hotel-policy-config.json'),research=read('tour-research-data.json');

// Core services the PO approved for quoting on 19/10/2026 (request of Captain Cua, Gemini, Smurf).
const APPROVED_TOURS=['NB01','NB02','NB03','NB04','HL01','HL02','HT03','HN01','HN02','HN04'];
// Wrong or outdated source rows kept for history but hidden from advice and quotes.
const ARCHIVE={HT06:'Nguồn lỗi (phân loại không dùng được).',HT13:'Tên tàu và lịch trình không khớp nhau.',CH05:'Giá năm 2024, không còn dùng.'};
const APPROVAL={approvedBy:'Captain Cua',approvedAt:'2026-10-19'};
const VALID_UNTIL='2026-12-31';
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const PLACE=[[/sa ?pa|fansipan/,'Sa Pa','SAPA_TOUR'],[/ha ?long|halong|lan ha|cat ba|bai tu long|cruise|du thuyen/,'Hạ Long','HALONG_TOUR'],[/ninh binh|hoa lu|trang an|tam coc|hang mua|\bmua\b|bai dinh|thung ui/,'Ninh Bình','NINHBINH_TOUR'],[/ha noi|hanoi|jeep city|lang huong|pho duong tau|city/,'Hà Nội','HANOI_TOUR']];
function placeOf(text,group=''){const n=norm(text);let best=null;for(const [re,place,category] of PLACE){const m=n.search(re);if(m>=0&&(!best||m<best.at))best={at:m,place,category};}
 return best?{place:best.place,category:best.category}:{place:group||'Khác',category:'OTHER_TOUR'};}
const money=a=>a&&(a.currency==='VND'||a.currency==='USD')?a:null;
const entries=[];const add=e=>entries.push({crmCode:null,sourceIds:[],variant:'',duration:'',summary:'',highlights:[],inclusions:'',exclusions:'',supplierName:'',netCost:null,sellingPrice:null,commission:null,currency:'VND',place:'',validUntil:VALID_UNTIL,sourceNote:'',sourceUrl:'',approvedBy:'',approvedAt:'',...e});

// 1 · Hotel services from the policy config: transfers and spa per property (ids kept as HS-… so
// existing quotes still resolve), and room policies as rules without a fixed amount.
for(const [pid,p] of Object.entries(hotel.properties)){
 for(const v of p.airportTransfer.vehicles)for(const direction of ['pickup','dropoff']){const price=v[direction];
  add({id:`HS-${pid}-${v.id}-${direction}`,propertyScope:[pid],category:'AIRPORT_TRANSFER',channelFlow:'EXTRANET_DIRECT',title:`${direction==='pickup'?'Đón Nội Bài → khách sạn':'Tiễn khách sạn → Nội Bài'} · xe ${v.seats} chỗ`,unit:'xe / chiều',duration:'Một chiều',summary:`${p.airportTransfer.route.vi}. Tối đa ${v.maxGuests} khách, ${v.maxLuggage} vali.`,inclusions:p.airportTransfer.includes.vi,exclusions:'Phụ thu chờ quá giờ, điểm dừng thêm',supplierName:'Nhà xe khách sạn',sellingPrice:price,netCost:v.cost,commission:v.commission,capacity:v.maxGuests,direction,place:'Nội Bài',validUntil:p.airportTransfer.validUntil,
   status:p.airportTransfer.approved&&price!==null?'APPROVED':'REFERENCE_ONLY',sourceNote:p.airportTransfer.approved?p.airportTransfer.approvedNote:'Chưa có bảng giá xe cho cơ sở này.',...(p.airportTransfer.approved&&price!==null?APPROVAL:{})});}
 for(const i of p.spa.items)add({id:`HS-${pid}-${i.id}`,propertyScope:[pid],category:'SPA',channelFlow:'EXTRANET_DIRECT',title:`Spa · ${i.name.en}`,variant:`${i.minutes} phút`,unit:'khách',duration:`${i.minutes} phút`,summary:i.description?.vi||`${i.name.vi} ${i.minutes} phút tại spa khách sạn.`,highlights:i.description?[i.description.en]:[],inclusions:'Liệu trình theo menu spa',exclusions:'Đồ uống, dịch vụ ngoài menu',supplierName:'Spa khách sạn',sellingPrice:i.price,netCost:i.cost,commission:i.commission,place:'Khách sạn',
  status:p.spa.approved&&i.price!==null?'APPROVED':'REFERENCE_ONLY',sourceNote:'Menu spa trong cấu hình khách sạn.'});
 const room=(id,title,rule,approved,note)=>add({id:`ROOM-${pid}-${id}`,propertyScope:[pid],category:'ROOM_POLICY',channelFlow:'EXTRANET_DIRECT',title,unit:'phòng',supplierName:'Khách sạn',place:'Khách sạn',rule,summary:rule.text,status:approved?'APPROVED':'REFERENCE_ONLY',sourceNote:note,...(approved?APPROVAL:{})});
 room('early-checkin','Nhận phòng sớm',{kind:'percent_of_room',percent:50,window:`${p.earlyCheckIn.from}–${p.earlyCheckIn.until}`,text:`${p.earlyCheckIn.from}–${p.earlyCheckIn.until}: ${p.earlyCheckIn.fee.vi}, ${p.earlyCheckIn.condition.vi}.`},p.earlyCheckIn.approved,'Quy định khách sạn.');
 room('late-checkout','Trả phòng muộn',{kind:'percent_of_room',percent:50,window:`đến ${p.lateCheckOut.until}`,text:`Đến ${p.lateCheckOut.until}: ${p.lateCheckOut.fee.vi}, ${p.lateCheckOut.condition.vi}.`},p.lateCheckOut.approved,'Quy định khách sạn.');
 room('extension-direct','Gia hạn trực tiếp',{kind:'discount_percent',percent:p.extensionDirect.discountPercent,window:'',text:`Phương án 1 giữ giá khách đã đặt; phương án 2 giá Booking hiện tại −${p.extensionDirect.discountPercent}%.`},p.extensionDirect.approved,p.extensionDirect.note);
 // Placeholder tours of the config are superseded by the workbook variants (NB01–NB04, HL01–HL08…).
 for(const t of p.tours.products)add({id:`HS-${pid}-${t.id}`,propertyScope:[pid],...placeOf(t.title.vi),channelFlow:'WHATSAPP_CONSULT',title:t.title.vi,unit:t.unit,duration:t.duration,supplierName:'Nhà cung cấp tour',sellingPrice:t.price,status:'ARCHIVED',sourceNote:`Mục cấu hình cũ, thay bằng các hạng trong kho tour (${t.source}).`});
}

// 2 · Workbook items. Airport transfer rows only add evidence to the hotel transfer entries.
const transferKey=(direction,seats)=>`HS-luxe-75pht-${seats<=5?'car4':seats<=7?'car7':'van16'}-${direction}`;
const evidence=(id,source,note)=>{const e=entries.find(x=>x.id===id);if(e&&!e.sourceIds.includes(source)){e.sourceIds.push(source);if(note)e.sourceNote+=(e.sourceNote?' ':'')+note;}};
const r75ById=Object.fromEntries(r75.items.map(x=>[x.id,x]));const linkedR75=new Set();
for(const i of Object.values(rate.items)){
 if(i.removedInSource)continue;
 if(i.kind==='airport_transfer'){const seats=Number((i.title.match(/xe (\d+) chỗ/)||[])[1]||4),direction=/^Đón/.test(i.title)?'pickup':'dropoff';const key=transferKey(direction,seats);evidence(key,i.id,`${i.id}: ${i.sourcePrice.raw} (${i.evidence[0]?.type||'nguồn'}).`);for(const c of i.crmIds){linkedR75.add(c);const r=r75ById[c];evidence(r?.direction?transferKey(r.direction,Number((r.title.match(/xe (d+) chỗ/)||[])[1]||seats)):key,c,'');}continue;}
 const amounts=i.sourcePrice.amounts.map(money);const sale=amounts[0],contract=/HĐ/.test(i.sourcePrice.raw)?amounts[1]:null;
 const crm=i.crmIds.find(c=>c.startsWith('R75-'))||null;i.crmIds.forEach(c=>linkedR75.add(c));
 const r=crm?r75ById[crm]:null;
 // Contract cost from the same R75 row only when that row is the same price (same product level).
 const netCost=contract?.amount??(r&&r.sourceCost&&sale&&r.sourcePrice===sale.amount?r.sourceCost:null);
 const transport=i.kind==='transport_route'||i.kind==='bus_schedule';
 const where=transport?{place:i.destination||'',category:'INTERCITY_BUS_12GO'}:/^HN\d/.test(i.id)?{place:'Hà Nội',category:'HANOI_TOUR'}:placeOf([i.title,i.route].join(' '),i.group);
 const approved=APPROVED_TOURS.includes(i.id),archived=ARCHIVE[i.id]||(i.classification.unusable?'Nguồn không dùng được.':'');
 const web=crm&&research.observations.find(o=>o.id===crm);
 add({id:i.kind==='note'?'NOTE-HN':i.id,crmCode:crm,sourceIds:[i.id,...i.crmIds.filter(c=>c.startsWith('R75-'))],propertyScope:'ALL',...where,channelFlow:'WHATSAPP_CONSULT',
  title:i.title||(i.kind==='note'?'Lưu ý tư vấn Hà Nội':i.id),variant:i.variant,unit:i.sourcePrice.unit||'khách',duration:i.duration,summary:[i.route&&`Lộ trình: ${i.route}`,i.times&&`Giờ: ${i.times}`,i.vehicleClass&&`Xe: ${i.vehicleClass}`].filter(Boolean).join(' · ')||i.sourceNotes[0]||'',
  highlights:web?.notes?.slice(0,4)||[],inclusions:i.includes,exclusions:i.excludes,supplierName:i.supplier||r?.supplier||'',
  sellingPrice:sale?.amount??null,netCost,currency:sale?.currency||'VND',
  status:archived?'ARCHIVED':approved&&sale?'APPROVED':'REFERENCE_ONLY',...(approved&&sale&&!archived?APPROVAL:{}),
  sourceNote:[archived,`Giá nguồn: ${i.sourcePrice.raw||'chưa có'}${sale?'':' (không phải VND/USD hoặc chưa có số)'}.`,i.evidence[0]?.asOf,i.children&&`Trẻ em: ${i.children}`].filter(Boolean).join(' '),sourceUrl:i.comparison?.tourUrl||i.evidence[0]?.url||''});
}

// 3 · R75 rows not linked to a workbook item: transfers become evidence, tours stay as reference.
for(const r of r75.items){
 if(linkedR75.has(r.id))continue;
 if(r.kind==='transfer'){if(r.direction){const seats=Number((r.title.match(/xe (\d+) chỗ/)||[])[1]||4);evidence(transferKey(r.direction,seats),r.id,`${r.id}: ${r.priceText}.`);}continue;}
 add({id:r.id,crmCode:r.id,sourceIds:[r.id],propertyScope:['luxe-75pht'],...placeOf(r.title),channelFlow:'WHATSAPP_CONSULT',title:r.title,unit:r.unit,duration:r.duration,summary:r.summary,inclusions:r.includes,exclusions:r.excludes,supplierName:r.supplier,
  sellingPrice:r.sourcePrice,netCost:r.sourceCost,currency:r.currency==='USD'?'USD':'VND',status:'REFERENCE_ONLY',sourceNote:`${r.category}: ${r.priceMeaning}`,sourceUrl:r.sources?.[0]?.url||''});
}

// 4 · Sample prices for the 22/10 demo (lib/demo-catalog-prices.json): approved, cost and commission marked as samples.
const demo=read('demo-catalog-prices.json');
for(const p of demo.items){const e=entries.find(x=>x.id===p.id);if(!e)throw Error('Demo price for unknown id '+p.id);
 Object.assign(e,{sellingPrice:p.sellingPrice,netCost:p.netCost,commission:p.commission,status:'APPROVED',approvedBy:demo.approvedBy,approvedAt:demo.approvedAt},p.currency?{currency:p.currency}:{});
 e.sourceNote=`${e.sourceNote.replace(/ ?[demo-prices[^]]*].*$/,'')} [${demo.version}] ${p.note||demo.note}`.trim();}
const ids=new Set();for(const e of entries){if(ids.has(e.id))throw Error('Duplicate id '+e.id);ids.add(e.id);}
const count=(k)=>entries.reduce((m,e)=>(m[e[k]]=(m[e[k]]||0)+1,m),{});
const seed={version:`seed-2026-10-19/${rate.version}/${r75.readAt}/${demo.version}`,builtFrom:{rateCatalog:Object.keys(rate.items).length,r75:r75.items.length,research:research.observations.length,hotelProperties:Object.keys(hotel.properties).length},byCategory:count('category'),byStatus:count('status'),entries};
writeFileSync(new URL('../lib/service-catalog-seed.json',import.meta.url),JSON.stringify(seed,null,1)+'\n');
console.log(JSON.stringify({entries:entries.length,byCategory:seed.byCategory,byStatus:seed.byStatus,approved:entries.filter(e=>e.status==='APPROVED').map(e=>`${e.id}=${e.sellingPrice}${e.currency==='USD'?' USD':''}${e.netCost?'/net '+e.netCost:''}`)},null,1));
