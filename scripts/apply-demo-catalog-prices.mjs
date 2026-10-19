// Applies the sample demo prices (lib/demo-catalog-prices.json) to the service catalog of the LOCAL
// dev server through /api/catalog, so each change is validated, versioned and logged in the history.
// The seed already contains them for new databases; this updates a database seeded earlier.
// Re-running is safe: entries that already match are skipped, operation ids are deterministic.
//   node scripts/apply-demo-catalog-prices.mjs
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const base='http://localhost:5173';
const demo=JSON.parse(readFileSync('lib/demo-catalog-prices.json','utf8'));
const uuid=name=>{const h=createHash('sha1').update('crabs-demo-prices:'+name).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};

const signin=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=signin.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
if(!cookie)throw new Error('Local sign-in cookie not received; is the dev server on 5173 running?');
const headers={Cookie:cookie,Origin:base,'Content-Type':'application/json'};

const r=await fetch(base+'/api/catalog',{headers});const d=await r.json();
if(!r.ok)throw new Error('Catalog read failed: '+JSON.stringify(d).slice(0,200));
const fields=['title','variant','unit','duration','summary','inclusions','exclusions','supplierName','category','channelFlow','propertyScope','sellingPrice','netCost','commission','currency','validUntil','status'];
let changed=0,skipped=0;
for(const p of demo.items){
 const e=d.entries.find(x=>x.id===p.id);if(!e)throw new Error('Not in catalog: '+p.id);
 if(e.status==='APPROVED'&&e.sellingPrice===p.sellingPrice&&e.netCost===p.netCost&&e.commission===p.commission){skipped++;continue;}
 const entry=Object.fromEntries(fields.map(f=>[f,e[f]]));Object.assign(entry,{sellingPrice:p.sellingPrice,netCost:p.netCost,commission:p.commission,status:'APPROVED'});
 const w=await fetch(base+'/api/catalog',{method:'POST',headers,body:JSON.stringify({action:'save',operationId:uuid(demo.version+':'+p.id+':'+e.version),id:p.id,version:e.version,entry})});
 const out=await w.json();if(!w.ok)throw new Error(`${p.id} ${w.status}: ${JSON.stringify(out)}`);
 changed++;console.log(`${p.id}: ${p.sellingPrice} / vốn ${p.netCost} / hoa hồng ${p.commission} ${e.currency} · APPROVED`);
}
console.log(JSON.stringify({version:demo.version,changed,skipped}));
