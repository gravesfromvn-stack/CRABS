import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/catalog',{recursive:true});
const stub={name:'catalog-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'stub'}));b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='env'?'export const env=globalThis.catalogEnv;':'export async function getChatGPTUser(){return globalThis.catalogUser;}',loader:'js'}));}};
await build({entryPoints:{lib:'lib/service-catalog.ts',advice:'lib/tour-advice.ts',replies:'lib/service-replies.ts',policy:'lib/hotel-policy-config.ts',catalogApi:'app/api/catalog/route.ts',quotesApi:'app/api/quotes/route.ts'},outdir:'.quote-tests/catalog',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},plugins:[stub]});
const lib=await import('../.quote-tests/catalog/lib.mjs'),advice=await import('../.quote-tests/catalog/advice.mjs'),replies=await import('../.quote-tests/catalog/replies.mjs'),policy=await import('../.quote-tests/catalog/policy.mjs');
const rate=JSON.parse(readFileSync('lib/rate-catalog.json','utf8')),r75=JSON.parse(readFileSync('lib/quote-source-data.json','utf8'));
let passed=0;const check=async(name,fn)=>{await fn();console.log('PASS '+name);passed++;};
const seed=lib.seedEntries,byId=id=>seed.find(e=>e.id===id);

await check('Seed merges all three sources into one catalog without losing or duplicating ids',()=>{
 assert.equal(new Set(seed.map(e=>e.id)).size,seed.length);
 const covered=id=>!!lib.findEntry(seed,id);
 for(const i of Object.values(rate.items))assert.ok(covered(i.id==='Lưu ý tư vấn Hà Nội'?'NOTE-HN':i.id),'rate item '+i.id);
 for(const r of r75.items.filter(r=>r.kind==='tour'))assert.ok(covered(r.id),'R75 '+r.id);
 for(const r of r75.items.filter(r=>r.kind==='transfer'&&r.direction))assert.ok(covered(r.id),'R75 transfer '+r.id);
 assert.equal(lib.findEntry(seed,'XE01').id,'HS-luxe-75pht-car4-pickup');assert.equal(lib.findEntry(seed,'R75-TOUR-OCT-5').id,'NB05');
 assert.equal(byId('NB01').crmCode,'R75-TST-021');
 for(const e of seed)assert.ok(lib.entryEdit.safeParse({...e}).success||e.status!=='APPROVED','approved seed entry valid: '+e.id);
});
await check('Core services approved, broken sources archived, demo prices make spa and tours quote-ready',()=>{
 for(const id of ['NB01','NB02','NB03','NB04','HL01','HL02','HT03','HN01','HN02','HN04','HS-luxe-75pht-car4-pickup','HS-luxe-75pht-van16-dropoff'])assert.equal(byId(id).status,'APPROVED',id);
 assert.deepEqual([byId('NB01').sellingPrice,byId('HL02').sellingPrice,byId('HT03').sellingPrice,byId('HT03').currency],[950000,1050000,255,'USD']);
 assert.equal(byId('HN04').netCost,1188000);
 for(const id of ['HT06','HT13','CH05'])assert.equal(byId(id).status,'ARCHIVED',id);
 const demo=JSON.parse(readFileSync('lib/demo-catalog-prices.json','utf8'));
 for(const p of demo.items){const e=byId(p.id);assert.equal(e.status,'APPROVED',p.id);assert.deepEqual([e.sellingPrice,e.netCost,e.commission],[p.sellingPrice,p.netCost,p.commission],p.id);assert.match(e.sourceNote,/MẪU/,'sample cost is labelled');}
 for(const id of ['NB01','NB02','NB03','NB04','HL01','HL02','HN01','HN02','HS-luxe-75pht-spa-trad-60','HS-luxe-75pht-spa-aroma-60','HS-luxe-75pht-spa-foot-60'])assert.ok(lib.quoteReady(byId(id)),id+' quote-ready');
 assert.equal(lib.quoteReady(byId('HT03')),false,'USD price is not quote-ready (quotes are VND)');
 assert.deepEqual([byId('HS-luxe-75pht-spa-trad-90').status,byId('HS-luxe-75pht-spa-trad-90').sellingPrice],['REFERENCE_ONLY',null],'90-minute spa still waits for a price');
 assert.equal(byId('HS-luxe-75pht-tour-nb-day').status,'ARCHIVED','config placeholder tours superseded');
 assert.equal(byId('NB01').channelFlow,'WHATSAPP_CONSULT');assert.equal(byId('HS-luxe-75pht-car4-pickup').channelFlow,'EXTRANET_DIRECT');
});
await check('Approved amounts follow status and property scope',()=>{
 const a75=lib.catalogApprovedAmounts(seed,'luxe-75pht'),suites=lib.catalogApprovedAmounts(seed,'luxe-suites');
 assert.ok(a75.includes(400000)&&a75.includes(950000));assert.ok(!suites.includes(650000),'75PHT transfer price not at Suites');assert.ok(suites.includes(950000),'ALL-scope tour at Suites');
 const edited=seed.map(e=>e.id==='NB01'?{...e,status:'REFERENCE_ONLY'}:e);assert.ok(!lib.catalogApprovedAmounts(edited,'luxe-75pht').includes(950000));
});
await check('Hotel policy reads transfer and spa prices from the catalog',()=>{
 const base=policy.policyFor('luxe-75pht');
 const withSpa=seed.map(e=>e.id==='HS-luxe-75pht-spa-trad-60'?{...e,status:'APPROVED',sellingPrice:450000}:e.id==='HS-luxe-75pht-car4-pickup'?{...e,sellingPrice:420000}:e);
 const p=lib.catalogPolicy(base,withSpa,'luxe-75pht');
 assert.equal(p.airportTransfer.vehicles[0].pickup,420000);assert.equal(p.spa.approved,true);assert.equal(p.spa.items[0].price,450000);
 const r=replies.serviceReply({catalog:withSpa,propertyId:'luxe-75pht',text:'Can we book a massage and an airport pickup for 2 people?',facts:[],vi:false,tourInterested:false,hasContact:false});
 assert.match(r.paragraphs.join('\n'),/450,000 VND/);assert.match(r.paragraphs.join('\n'),/420,000 VND/);
 const off=lib.catalogPolicy(base,seed.map(e=>e.category==='AIRPORT_TRANSFER'?{...e,status:'ARCHIVED'}:e),'luxe-75pht');assert.equal(off.airportTransfer.approved,false);assert.equal(off.airportTransfer.vehicles[0].pickup,null);
});
await check('Tour advice quotes catalog-approved prices and hides archived items',()=>{
 const a=advice.tourAdvice({catalog:seed,propertyId:'luxe-75pht',facts:[],text:'We would like a Ninh Binh day tour, Hoa Lu and Trang An, on 25 October for 2 adults. How much is it?'});
 const nb=a.options.find(o=>o.id==='R75-TST-021');assert.deepEqual(nb.variants.map(v=>[v.id,v.status]),[['NB01','Giá đã duyệt'],['NB02','Giá đã duyệt'],['NB03','Giá đã duyệt'],['NB04','Giá đã duyệt']]);
 assert.match(nb.internal.priceStatus,/NB01 950\.000đ \/ khách/);
 assert.doesNotMatch(advice.tourParagraph(a,false),/950,000|950\.000/,'tour prices stay out of the OTA draft (WhatsApp branch)');
 const blocked=advice.tourAdvice({catalog:seed.map(e=>e.id==='NB01'?{...e,status:'REFERENCE_ONLY'}:e),propertyId:'luxe-75pht',facts:[],text:'Ninh Binh day tour Hoa Lu Trang An on 25 October for 2 adults'});
 assert.equal(blocked.options[0].variants.find(v=>v.id==='NB01').status.startsWith('Giá đã duyệt'),false,'reference item not shown as approved');
 const hn=advice.tourAdvice({catalog:seed,propertyId:'luxe-75pht',facts:[],text:'Do you have a Hanoi jeep city tour for 2 adults on 25 October?'});
 for(const o of hn.options.filter(o=>o.approvedPrice))assert.ok(lib.catalogApprovedAmounts(seed,'luxe-75pht').includes(o.approvedPrice.price));
 assert.doesNotMatch(advice.tourParagraph(hn,false),/per khách/);
 const sapa=advice.tourAdvice({catalog:seed,propertyId:'luxe-75pht',facts:[],text:'Any multi-day tour to Ha Long and Ninh Binh?'});assert.ok(!sapa.options.some(o=>['HT06','HT13'].includes(o.id)),'archived not advised');
});

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("x")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');globalThis.catalogEnv={DB:db};globalThis.catalogUser={userId:'owner-catalog'};
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();
 const api=await import('../.quote-tests/catalog/catalogApi.mjs'),quotes=await import('../.quote-tests/catalog/quotesApi.mjs');
 const req=(url,p,origin='https://crabs.example')=>new Request('https://crabs.example'+url,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(p)});
 const list=async()=>(await (await api.GET()).json()).entries;
 const edit=e=>({title:e.title,variant:e.variant,unit:e.unit,duration:e.duration,summary:e.summary,inclusions:e.inclusions,exclusions:e.exclusions,supplierName:e.supplierName,category:e.category,channelFlow:e.channelFlow,propertyScope:e.propertyScope,sellingPrice:e.sellingPrice,netCost:e.netCost,commission:e.commission,currency:e.currency,validUntil:e.validUntil,status:e.status});
 await check('First read seeds the owner once; reseeding never overwrites edits',async()=>{
  const a=await list();assert.equal(a.length,seed.length);
  const spa=a.find(e=>e.id==='HS-luxe-75pht-spa-trad-90');
  assert.equal((await api.POST(req('/api/catalog',{action:'save',operationId:crypto.randomUUID(),id:spa.id,version:spa.version,entry:{...edit(spa),sellingPrice:450000,status:'APPROVED'}}))).status,200);
  await db.prepare("UPDATE service_catalog_meta SET seed_version='old' WHERE owner='owner-catalog'").run();
  const b=await list();const s2=b.find(e=>e.id===spa.id);assert.equal(s2.sellingPrice,450000);assert.equal(s2.status,'APPROVED');assert.equal(s2.approvedBy,'owner-catalog');assert.equal(b.length,seed.length);
  globalThis.catalogUser={userId:'owner-two'};assert.equal((await list()).find(e=>e.id===spa.id).sellingPrice,null,'owners isolated');globalThis.catalogUser={userId:'owner-catalog'};
 });
 await check('Edits are validated, versioned, idempotent and logged',async()=>{
  const e=(await list()).find(x=>x.id==='NB07');
  assert.equal((await api.POST(req('/api/catalog',{action:'save',operationId:crypto.randomUUID(),id:e.id,version:e.version,entry:{...edit(e),sellingPrice:null,status:'APPROVED'}}))).status,400,'approve without price');
  assert.equal((await api.POST(req('/api/catalog',{action:'save',operationId:crypto.randomUUID(),id:e.id,version:e.version,entry:{...edit(e),sellingPrice:900000,netCost:1000000}}))).status,400,'cost above price');
  assert.equal((await api.POST(req('/api/catalog',{action:'save',operationId:crypto.randomUUID(),id:e.id,version:e.version,entry:edit(e)},'https://evil.example'))).status,403);
  const op=crypto.randomUUID(),body={action:'save',operationId:op,id:e.id,version:e.version,entry:{...edit(e),sellingPrice:1100000,supplierName:'NCC kiểm thử'}};
  assert.equal((await api.POST(req('/api/catalog',body))).status,200);assert.equal((await api.POST(req('/api/catalog',body))).status,200,'retry is idempotent');
  assert.equal((await api.POST(req('/api/catalog',{...body,operationId:crypto.randomUUID()}))).status,409,'stale version');
  const after=(await list()).find(x=>x.id==='NB07');assert.equal(after.version,e.version+1);assert.equal(after.status,'REFERENCE_ONLY');
  const h=(await (await api.GET()).json()).history;assert.ok(h.some(x=>x.item_id==='NB07'&&/sellingPrice/.test(x.detail)));
  const c=await api.POST(req('/api/catalog',{action:'create',operationId:crypto.randomUUID(),entry:{...edit(e),title:'Xe đạp phố cổ',category:'HANOI_TOUR',sellingPrice:300000,netCost:200000,commission:20000,status:'APPROVED',propertyScope:['luxe-suites']}}));
  const id=(await c.json()).id;assert.match(id,/^SV-/);const n=(await list()).find(x=>x.id===id);assert.equal(n.status,'APPROVED');assert.deepEqual(n.propertyScope,['luxe-suites']);
 });
 await check('Quotes use the catalog: approve only quote-ready entries at the approved price',async()=>{
  globalThis.__quoteEnv={DB:db};globalThis.__quoteUser={userId:'owner-catalog'};globalThis.quoteEnv={DB:db};
  await db.prepare(`INSERT INTO contacts (owner,id,name,segment,source,status,assignee,due,service_date,adults,children,budget,interest,note,stay,version,updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind('owner-catalog','test-cat','Khách kiểm thử','Khách lưu trú','Trực tiếp','new','Chưa phân công','','2026-10-25',2,'',0,'Tour','','',1,'2026-10-19').run();
  const qpost=async p=>{const r=await quotes.POST(req('/api/quotes',p));return {status:r.status,body:await r.json()};};
  const line={productId:'HN04',date:'2026-10-25',quantity:2,passengers:2,price:1485000,cost:1188000,commission:0,extraCost:0,discount:0,details:'Jeep City, 2 người lớn'};
  const save=(lines)=>({action:'save',operationId:crypto.randomUUID(),id:crypto.randomUUID(),contactId:'test-cat',expectedRevision:0,contactVersion:1,quote:{lines,validUntil:'2026-10-24',conditions:'Giá theo kho dịch vụ đã duyệt; chỗ chưa xác nhận.',missing:'',childrenPolicy:'',demoPriceConfirmed:true}});
  const approve=id=>({action:'approve',operationId:crypto.randomUUID(),id,revision:1});
  let s=save([line]);assert.equal((await qpost(s)).status,200);let a=await qpost(approve(s.id));assert.equal(a.status,400);assert.match(a.body.error,/thiếu hoa hồng/,'commission missing in catalog');
  const hn04=(await list()).find(x=>x.id==='HN04');assert.equal((await api.POST(req('/api/catalog',{action:'save',operationId:crypto.randomUUID(),id:'HN04',version:hn04.version,entry:{...edit(hn04),commission:50000}}))).status,200);
  s=save([{...line,commission:50000}]);assert.equal((await qpost(s)).status,200);assert.equal((await qpost(approve(s.id))).status,200,JSON.stringify(s));
  s=save([{...line,price:1600000,commission:50000}]);await qpost(s);a=await qpost(approve(s.id));assert.equal(a.status,400);assert.match(a.body.error,/khác giá đã duyệt/);
  s=save([{...line,productId:'R75-TOUR-OCT-4',commission:50000}]);assert.equal((await qpost(s)).status,200,'merged R75 id resolves');
  assert.equal((await qpost(save([{...line,productId:'NO-SUCH'}]))).status,400);
  s=save([{...line,productId:'NB01',price:950000,cost:710000,commission:50000},{...line,productId:'HS-luxe-75pht-spa-trad-60',quantity:2,price:450000,cost:250000,commission:0}]);
  assert.equal((await qpost(s)).status,200);a=await qpost(approve(s.id));assert.equal(a.status,200,'demo-priced tour + spa approve: '+JSON.stringify(a.body));
 });
}finally{await mf.dispose();}
console.log(JSON.stringify({passed,scope:'service catalog: merged seed, approvals, scope, OTA policy/advice, D1 store, catalog and quote routes'}));
