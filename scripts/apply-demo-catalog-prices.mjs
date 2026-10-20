// Applies the sample demo prices (lib/demo-catalog-prices.json) to the service catalog of the LOCAL
// dev server through /api/catalog, so each change is validated, versioned and logged in the history.
// The seed already contains them for new databases; this updates a database seeded earlier.
// Re-running is safe: entries that already match are skipped, operation ids are deterministic.
//   node scripts/apply-demo-catalog-prices.mjs
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const base='http://localhost:5173';
const demo=JSON.parse(readFileSync('lib/demo-catalog-prices.json','utf8'));
// Target values come from the built seed (prices from demo-catalog-prices.json, names and spa
// descriptions from hotel-policy-config.json), so the seed and an existing database stay identical.
const seed=JSON.parse(readFileSync('lib/service-catalog-seed.json','utf8'));
const SYNC=['title','variant','unit','duration','summary','sellingPrice','netCost','commission','currency','status'];
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
 const target=seed.entries.find(x=>x.id===p.id);if(!target)throw new Error('Not in seed (rebuild it): '+p.id);
 if(SYNC.every(f=>e[f]===target[f])){skipped++;continue;}
 const entry=Object.fromEntries(fields.map(f=>[f,e[f]]));for(const f of SYNC)entry[f]=target[f];
 const w=await fetch(base+'/api/catalog',{method:'POST',headers,body:JSON.stringify({action:'save',operationId:uuid(demo.version+':'+p.id+':'+e.version),id:p.id,version:e.version,entry})});
 const out=await w.json();if(!w.ok)throw new Error(`${p.id} ${w.status}: ${JSON.stringify(out)}`);
 changed++;console.log(`${p.id}: ${target.sellingPrice} / vốn ${target.netCost} / hoa hồng ${target.commission} ${target.currency} · ${target.status}`);
}
console.log(JSON.stringify({version:demo.version,changed,skipped}));
