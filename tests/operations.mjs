import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests',{recursive:true});
const boundary={name:'ops-boundary',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'mock'}));b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='env'?'export const env=globalThis.opsEnv;':'export async function getChatGPTUser(){return globalThis.opsUser;}',loader:'js'}));}};
for(const[name,path]of [['api','app/api/operations/route.ts'],['model','lib/operations.ts'],['ota','lib/ota-store.ts']])await build({entryPoints:[path],outfile:'.quote-tests/ops-'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[boundary]});

const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
let passed=0;const check=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
try{
 const db=await mf.getD1Database('DB');globalThis.opsEnv={DB:db};globalThis.opsUser={userId:'ops-owner'};
const api=await import('../.quote-tests/ops-api.mjs'),model=await import('../.quote-tests/ops-model.mjs'),ota=await import('../.quote-tests/ops-ota.mjs');

 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 await db.prepare('INSERT INTO ota_mailbox(mailbox,owner,created,last_received) VALUES(?,?,?,?)').bind('paradisesuitespht@gmail.com','ops-owner','2026-10-18','').run();
 function mail(id,property,message,at='2026-10-18T02:00:00Z'){const body='Confirmation number: 5100000001\nYou have a new message from a guest\nSynthetic Guest said:\n'+message+'\nReply\nReservation details\nGuest name:\nSynthetic Guest\nProperty name:\n'+property+'\nBooking number:\n5100000001\nCheck-in: 19 October 2026\nCheck-out: 21 October 2026';return {id,threadId:'gmail-'+id,internalDate:String(Date.parse(at)),payload:{mimeType:'text/plain',headers:[{name:'From',value:'notification@guest.booking.com'},{name:'Subject',value:'We received this message from Synthetic Guest'},{name:'Authentication-Results',value:'mx.google.com; dmarc=pass header.from=guest.booking.com'},{name:'Message-ID',value:'<'+id+'@booking.com>'}],body:{data:Buffer.from(body).toString('base64url')}}};}
 const property='Luxe Paradise Premium Pham Hong Thai Hotel & Spa';
 await ota.ingestMail(db,mail('ops-source-1',property,"I'd like to request check-in at 10:00 - 11:00. Could you arrange twin beds?"));
 await ota.ingestMail(db,mail('ops-source-2','Luxe Paradise Suites Hotel & Spa','Please arrange a quiet room.'));
 const get=async()=>{const r=await api.GET();assert.equal(r.status,200);return r.json();};
 const post=async(p,status=200)=>{const r=await api.POST(new Request('https://test.invalid/api/operations',{method:'POST',headers:{Origin:'https://test.invalid'},body:JSON.stringify(p)}));const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;};
 const count=async table=>(await db.prepare('SELECT count(*) AS n FROM '+table).first()).n;
 let data=await get(),s=data.sources.find(s=>s.propertyId==='luxe-75pht'),other=data.sources.find(s=>s.propertyId==='luxe-suites');
 await check('Vietnam day and overdue boundaries; service date differs from due date',()=>{assert.equal(model.vietnamDay(new Date('2026-10-17T17:01:00Z')),'2026-10-18');const t={...model.blankOperation(),state:'working',due:'2026-10-18T10:00',serviceDate:'2026-10-20'};assert.equal(model.overdueTask(t,'2026-10-18',new Date('2026-10-18T04:00:00Z')),true);assert.equal(model.taskOnDay(t,'2026-10-20'),true);assert.equal(model.overdueTask({...t,state:'done'},'2026-10-18'),false);});
 await check('Exact booking + property remain separate; GET creates no operations or OTA writes',async()=>{assert.equal(data.sources.length,2);assert.notEqual(s.id,other.id);assert.equal(s.checkIn,'2026-10-19');const before=await count('ota_drafts');await get();assert.equal(await count('ota_drafts'),before);assert.equal(await count('ops_tasks'),0);});
 await check('Reception display separates a check-in request from confirmed arrival',()=>{assert.ok(s.facts.some(f=>f.label==='Yêu cầu nhận phòng'&&f.text.includes('Chưa xác nhận')));assert.ok(!s.facts.some(f=>f.label==='Dự kiến đến'&&f.text.includes('request check-in')));});
 await check('Authentication and origin checks',async()=>{globalThis.opsUser=null;assert.equal((await api.GET()).status,401);globalThis.opsUser={userId:'ops-owner'};
assert.equal((await api.POST(new Request('https://test.invalid/api/operations',{method:'POST',headers:{Origin:'https://other.invalid'},body:'{}'}))).status,403);});
 const id=crypto.randomUUID();let t={...model.blankOperation(s.sourceKey),title:'Airport pickup',kind:'pickup',assignee:'Front desk test',due:'2026-10-18T10:00',serviceDate:'2026-10-19',serviceTime:'14:15',details:'Synthetic test only',state:'working'};
 const first={action:'save',id,operationId:crypto.randomUUID(),sourceKind:'ota',sourceId:s.id,version:0,task:t};
 await check('Create, repeat identical operation and reject operation-ID reuse with other content',async()=>{await post(first);await post(first);assert.equal(await count('ops_tasks'),1);assert.equal(await count('ops_history'),1);await post({...first,task:{...t,title:'Different'}},409);});
 await check('Wrong property/source cannot rebind an existing task; stale versions rejected',async()=>{await post({...first,operationId:crypto.randomUUID(),sourceId:other.id,version:1},409);await post({...first,operationId:crypto.randomUUID()},409);});
 const save=(task,version,status=200)=>post({...first,operationId:crypto.randomUUID(),version,task},status);
 await check('Completion and confirmation require evidence; impossible dates rejected',async()=>{await save({...t,state:'done',note:'Done'},1,400);await save({...t,guestDecision:'accepted'},1,400);await save({...t,supplierStatus:'confirmed'},1,400);await save({...t,serviceDate:'2026-02-30'},1,400);await save({...t,serviceDate:'',serviceTime:'14:00'},1,400);});
 t={...t,guestDecision:'accepted',guestEvidence:'Synthetic guest accepted quote X in message 1',supplierStatus:'confirmed',supplierEvidence:'Supplier test confirmed on 18/10 at 10:00'};
 await check('Guest acceptance and supplier confirmation persist separately from payment or send',async()=>{await save(t,1);const current=(await get()).tasks[0];assert.equal(current.guestDecision,'accepted');assert.equal(current.supplierStatus,'confirmed');assert.equal(await count('ota_sent'),0);});
 await check('Changing schedule invalidates old supplier evidence',async()=>{await save({...t,serviceTime:'16:15'},2,409);});
 await ota.ingestMail(db,mail('ops-source-3',property,'Actually we will reach the hotel at 18:00 instead.','2026-10-18T03:00:00Z'));
 await check('New guest message marks task stale without overwriting work or making a duplicate',async()=>{data=await get();assert.equal(data.tasks.length,1);assert.equal(data.tasks[0].stale,true);assert.equal(data.tasks[0].serviceTime,'14:15');assert.match(model.nextOperation(data.tasks[0]),/tin mới/);await save(t,2,409);});
 s=(await get()).sources.find(x=>x.id===s.id);
 await check('Acknowledging new message alone cannot reuse unchanged supplier confirmation',async()=>{await save({...t,reviewedSourceKey:s.sourceKey},2,409);});
 t={...t,reviewedSourceKey:s.sourceKey,supplierStatus:'waiting',note:'Reconfirm changed request'};await save(t,2);
 await check('Concurrent edits retain only the winning version and matching history',async()=>{const a={...first,version:3,task:{...t,note:'A'},operationId:crypto.randomUUID()},b={...first,version:3,task:{...t,note:'B'},operationId:crypto.randomUUID()};const send=p=>api.POST(new Request('https://test.invalid/api/operations',{method:'POST',headers:{Origin:'https://test.invalid'},body:JSON.stringify(p)}));const results=await Promise.all([send(a),send(b)]);assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);const fresh=await get();assert.equal(fresh.tasks[0].version,4);assert.equal(fresh.logs.filter(l=>l.task_id===id).length,4);});
 await check('Completion with fresh evidence stores history and does not invent payment',async()=>{t={...t,state:'done',note:'Driver confirms completed, synthetic test',supplierStatus:'confirmed',supplierEvidence:'Supplier reconfirmed after change, 18/10 at 11:00'};await save(t,4);data=await get();assert.equal(data.tasks[0].state,'done');assert.equal(data.tasks[0].stale,false);assert.equal(await count('ota_sent'),0);});
 const handoff={action:'handoff',id:crypto.randomUUID(),operationId:crypto.randomUUID(),propertyId:'luxe-75pht',day:'2026-10-18',shift:'Afternoon test',recipient:'Reception test',body:'Review outstanding tasks; synthetic only.'};
 await check('Shift handoff persists, retries once, and receipt has actor/time',async()=>{await post(handoff);await post(handoff);assert.equal(await count('ops_handoffs'),1);const receive={action:'receive',id:handoff.id,operationId:crypto.randomUUID()};await post(receive);await post(receive);const h=(await get()).handoffs[0];assert.ok(h.received_at);assert.equal(h.received_by,'Chủ tài khoản');});
 await check('Owner isolation covers tasks, sources, history and handoff receipts',async()=>{globalThis.opsUser={userId:'another-owner'};const d=await get();assert.equal(d.tasks.length,0);assert.equal(d.sources.length,0);assert.equal(d.logs.length,0);await post({...first,operationId:crypto.randomUUID()},404);await post({action:'receive',id:handoff.id,operationId:crypto.randomUUID()},409);});
 console.log(JSON.stringify({passed,scope:'Ephemeral local D1, mocked auth, synthetic messages; no running CRM database or external sends'}));
}finally{await mf.dispose();}
