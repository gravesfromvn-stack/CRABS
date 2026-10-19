import {seedEntries,seedVersion,type CatalogEntry,type StoredEntry,type EntryEdit} from './service-catalog';

// D1 storage of the catalog. Seeding only inserts ids the owner does not have yet, so a newer seed
// never overwrites prices Cua edited in the app.
export async function ensureCatalogSeed(db:D1Database,owner:string){
 const meta=await db.prepare('SELECT seed_version FROM service_catalog_meta WHERE owner=?').bind(owner).first<{seed_version:string}>();
 if(meta?.seed_version===seedVersion)return false;
 const now=new Date().toISOString(),ins=db.prepare('INSERT OR IGNORE INTO service_catalog (owner,id,version,status,category,payload,updated,last_operation) VALUES (?,?,?,?,?,?,?,?)');
 const rows=seedEntries.map(e=>ins.bind(owner,e.id,1,e.status,e.category,JSON.stringify(e),now,'seed:'+seedVersion));
 for(let i=0;i<rows.length;i+=100)await db.batch(rows.slice(i,i+100));
 await db.prepare('INSERT INTO service_catalog_meta (owner,seed_version,seeded) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET seed_version=excluded.seed_version,seeded=excluded.seeded').bind(owner,seedVersion,now).run();
 return true;
}

export async function loadCatalog(db:D1Database,owner:string):Promise<StoredEntry[]>{
 await ensureCatalogSeed(db,owner);
 const rows=await db.prepare('SELECT payload,version,updated FROM service_catalog WHERE owner=? ORDER BY category,id').bind(owner).all<{payload:string;version:number;updated:string}>();
 return rows.results.map(r=>({...JSON.parse(r.payload) as CatalogEntry,version:r.version,updated:r.updated}));
}

// Applies an edit; approval stamps follow status and price changes.
export function applyEdit(prev:CatalogEntry,edit:EntryEdit,actor:string,today:string):CatalogEntry{
 const next:CatalogEntry={...prev,...edit};
 const priceChanged=prev.sellingPrice!==edit.sellingPrice||prev.currency!==edit.currency;
 if(edit.status==='APPROVED'&&(prev.status!=='APPROVED'||priceChanged)){next.approvedBy=actor;next.approvedAt=today;}
 if(edit.status!=='APPROVED'){next.approvedBy='';next.approvedAt='';}
 return next;
}
export function describeChange(prev:CatalogEntry|null,next:CatalogEntry){
 if(!prev)return `Thêm dịch vụ ${next.id} · ${next.title} (${next.status}).`;
 const fields:(keyof CatalogEntry)[]=['status','sellingPrice','netCost','commission','currency','supplierName','propertyScope','title','variant','unit','category','channelFlow','validUntil','summary','inclusions','exclusions','duration'];
 const changed=fields.filter(f=>JSON.stringify(prev[f])!==JSON.stringify(next[f])).map(f=>`${f}: ${JSON.stringify(prev[f])} → ${JSON.stringify(next[f])}`);
 return `${next.id}: ${changed.join('; ')||'không đổi'}`.slice(0,1500);
}

export async function saveEntry(db:D1Database,owner:string,input:{operationId:string;id:string;version:number;entry:CatalogEntry;detail:string;actor:string}){
 const done=await db.prepare('SELECT item_id FROM service_catalog_history WHERE owner=? AND operation_id=?').bind(owner,input.operationId).first();
 if(done)return {ok:true as const,duplicate:true};
 const now=new Date().toISOString(),e=input.entry,payload=JSON.stringify(e);
 const write=input.version===0
  ?db.prepare('INSERT OR IGNORE INTO service_catalog (owner,id,version,status,category,payload,updated,last_operation) VALUES (?,?,?,?,?,?,?,?)').bind(owner,input.id,1,e.status,e.category,payload,now,input.operationId)
  :db.prepare('UPDATE service_catalog SET version=version+1,status=?,category=?,payload=?,updated=?,last_operation=? WHERE owner=? AND id=? AND version=?').bind(e.status,e.category,payload,now,input.operationId,owner,input.id,input.version);
 const log=db.prepare('INSERT INTO service_catalog_history (owner,operation_id,item_id,actor,detail,payload,created) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM service_catalog WHERE owner=? AND id=? AND last_operation=?)').bind(owner,input.operationId,input.id,input.actor,input.detail,payload,now,owner,input.id,input.operationId);
 const r=await db.batch([write,log]);
 return r[0].meta.changes?{ok:true as const,duplicate:false}:{ok:false as const};
}

export async function catalogHistory(db:D1Database,owner:string,limit=30){
 return (await db.prepare('SELECT operation_id,item_id,actor,detail,created FROM service_catalog_history WHERE owner=? ORDER BY created DESC LIMIT ?').bind(owner,limit).all<{operation_id:string;item_id:string;actor:string;detail:string;created:string}>()).results;
}
