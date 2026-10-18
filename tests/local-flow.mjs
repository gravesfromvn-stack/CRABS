import assert from 'node:assert/strict';
const base='http://127.0.0.1:5174';
const results=[];
async function check(name,fn){await fn();results.push(name);console.log('PASS '+name)}
const anon=await fetch(base+'/api/workspace');
await check('API rejects anonymous reads',async()=>assert.equal(anon.status,401));
const login=await fetch(base+'/signin-with-chatgpt?return_to=/',{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');
assert.ok(cookie,'Local preview sign-in cookie required');
const headers={Cookie:cookie,'Content-Type':'application/json',Origin:base};
async function get(){const r=await fetch(base+'/api/workspace',{headers});assert.equal(r.status,200);return r.json()}
async function post(p,expected=200,extra={}){const r=await fetch(base+'/api/workspace',{method:'POST',headers:{...headers,...extra},body:JSON.stringify(p)});const raw=await r.text();let d;try{d=JSON.parse(raw)}catch{d={message:raw}}assert.equal(r.status,expected,JSON.stringify(d));return d}
await check('Local application page serves successfully',async()=>{const r=await fetch(base,{headers});assert.equal(r.status,200);assert.match(await r.text(),/Crabs CRM/)});
await post({action:'reset',confirmation:'RESET DEMO'});
let d=await get();
await check('Seed: 20 customers, 20 messages, 5 tours, 2 transfers, 3 suppliers',async()=>{assert.equal(d.contacts.length,20);assert.equal(d.messages.length,20);assert.equal(d.products.filter(p=>p.kind==='tour').length,5);assert.equal(d.products.filter(p=>p.kind==='transfer').length,2);assert.equal(d.suppliers.length,3);assert.equal(d.contacts.find(c=>c.id==='demo-02').stay,'');});
await check('Cross-origin writes rejected',()=>post({action:'reset',confirmation:'RESET DEMO'},403,{Origin:'https://example.invalid'}));
await check('Reset requires explicit confirmation string',()=>post({action:'reset',confirmation:'no'},400));
const seed=d.contacts.find(c=>c.id==='demo-02');
const contact={...seed,name:'Khách kiểm thử · mẫu',source:'Trực tiếp',interest:'Xe đón + tour Ninh Bình',stay:'',note:'Hỏi số kiện hành lý',due:'2026-10-20T09:30'};
delete contact.id;delete contact.version;delete contact.updated;
const id=crypto.randomUUID();
await check('Create customer without a hotel booking',async()=>{await post({action:'create',id,contact});await post({action:'create',id,contact});d=await get();assert.equal(d.contacts.length,21);assert.equal(d.contacts.find(c=>c.id===id).stay,'')});
await check('Input validation rejects zero adults and invalid dates',async()=>{await post({action:'create',id:crypto.randomUUID(),contact:{...contact,adults:0}},400);await post({action:'create',id:crypto.randomUUID(),contact:{...contact,service_date:'2026-02-30'}},400)});
const updated={...contact,assignee:'An · điều phối mẫu',status:'waiting',note:'Đã hỏi hành lý; chờ khách trả lời'};
await check('Assignment, due date and notes survive fresh requests',async()=>{await post({action:'update',id,version:1,contact:updated});d=await get();const c=d.contacts.find(v=>v.id===id);assert.equal(c.version,2);assert.equal(c.assignee,updated.assignee);assert.equal(c.note,updated.note);assert.equal(c.due,'2026-10-20T09:30')});
await check('Stale contact updates rejected with conflict',()=>post({action:'update',id,version:1,contact},409));
const mid=crypto.randomUUID();
await check('Repeated message ID creates one message and one audit event',async()=>{const p={action:'message',id:mid,contactId:id,direction:'in',body:'Khách mẫu: chúng tôi có 2 vali lớn.'};await post(p);await post(p);d=await get();assert.equal(d.messages.filter(m=>m.id===mid).length,1);assert.equal(d.activity.filter(a=>a.id==='message-'+mid).length,1)});
await check('Staff response is persisted as simulation',async()=>{await post({action:'message',id:crypto.randomUUID(),contactId:id,direction:'out',body:'Mình đã ghi nhận 2 vali, sẽ kiểm tra xe phù hợp.'});d=await get();assert.equal(d.messages.filter(m=>m.contact_id===id&&m.direction==='out').length,1)});
await check('Message cannot reference missing customer',()=>post({action:'message',id:crypto.randomUUID(),contactId:'not-found',direction:'in',body:'Test'},404));
await check('Three scenario customers exist with coherent needs',async()=>{assert.match(d.contacts.find(c=>c.id==='demo-01').interest,/Ninh Bình/);assert.match(d.contacts.find(c=>c.id==='demo-02').children,/6, 10/);assert.equal(d.contacts.find(c=>c.id==='demo-03').service_date,'2026-10-25')});
await check('Catalog margin examples computed independently',async()=>{assert.equal(d.products.find(p=>p.id==='T02').price-d.products.find(p=>p.id==='T02').cost-d.products.find(p=>p.id==='T02').commission,220000);assert.equal(d.products.find(p=>p.id==='X01').price-d.products.find(p=>p.id==='X01').cost-d.products.find(p=>p.id==='X01').commission,70000)});
await check('Reset restores original demo and removes test records',async()=>{await post({action:'reset',confirmation:'RESET DEMO'});d=await get();assert.equal(d.contacts.length,20);assert.equal(d.messages.length,20);assert.ok(!d.contacts.some(c=>c.id===id));assert.equal(d.activity.length,1)});
console.log(JSON.stringify({passed:results.length,scope:'local preview only; synthetic data; no external messages',results},null,2));

