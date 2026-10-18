import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests',{recursive:true});
const plugin={name:'tpl-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'stub'}));b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='env'?'export const env=globalThis.otaEnv;':'export async function getChatGPTUser(){return globalThis.otaUser;}',loader:'js'}));}};
for(const [name,path] of [['store','lib/ota-store.ts'],['api','app/api/ota/route.ts'],['tplapi','app/api/ota/templates/route.ts'],['tpl','lib/ota-templates.ts']])await build({entryPoints:[path],outfile:'.quote-tests/tpl-'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[plugin]});
const {ingestMail,threadState,prepareDraft}=await import('../.quote-tests/tpl-store.mjs');
const {templateProblems}=await import('../.quote-tests/tpl-tpl.mjs');
const at=h=>new Date(Date.now()-h*3600000).toISOString();
const P75='Luxe Paradise Premium Pham Hong Thai Hotel & Spa',PSUITES='Luxe Paradise Suites Hotel & Spa';
let seq=0;
// Synthetic Booking.com notification; every guest and booking is invented.
function mail({guest,property=P75,booking,message,hoursAgo=10}){const id='tplmail'+String(++seq).padStart(4,'0');const text=`Confirmation number: ${booking}\nYou have a new message from a guest\n${guest} said:\n${message}\nReply\nReservation details\nGuest name:\n${guest}\nProperty name:\n${property}\nBooking number:\n${booking}\nCheck-in: 25 Oct 2026\nCheck-out: 28 Oct 2026`;return {id,threadId:'gmail-'+id,internalDate:String(Date.parse(at(hoursAgo))),payload:{mimeType:'text/plain',headers:[{name:'From',value:'Guest <notification@guest.booking.com>'},{name:'Subject',value:'We received this message from '+guest},{name:'Authentication-Results',value:'mx.google.com; dmarc=pass header.from=guest.booking.com'},{name:'Message-ID',value:'<'+id+'@guest.booking.com>'}],body:{data:Buffer.from(text).toString('base64url')}}};}
let count=0;async function check(name,fn){await fn();console.log('PASS '+name);count++;}
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');globalThis.otaEnv={DB:db};globalThis.otaUser={userId:'owner-one'};
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();
 const api=await import('../.quote-tests/tpl-api.mjs'),tplApi=await import('../.quote-tests/tpl-tplapi.mjs');
 const req=(path,payload)=>new Request('https://crabs.example'+path,payload?{method:'POST',headers:{Origin:'https://crabs.example','Content-Type':'application/json'},body:JSON.stringify(payload)}:undefined);
 const post=async p=>{const r=await api.POST(req('/api/ota',p));return {status:r.status,data:await r.json()};};
 const tplPost=async p=>{const r=await tplApi.POST(req('/api/ota/templates',p));return {status:r.status,data:await r.json()};};
 const detail=async id=>(await api.GET(req('/api/ota?id='+id))).json();
 const queue=async q=>(await (await api.GET(req('/api/ota?queue='+q))).json()).items.map(x=>x.id);
 const allDrafts=async()=>(await db.prepare('SELECT thread_id,revision,status,body,approved_at,source,attention FROM ota_drafts ORDER BY thread_id,revision').all()).results;
 assert.equal((await post({action:'connect'})).status,200);
 const ingest=async m=>(await ingestMail(db,m)).threadId;
 const mails=[];const add=o=>{const m=mail(o);mails.push(m);return m;};

 const A=await ingest(add({guest:'Example Guest Alpha',booking:'5910000001',message:'We will arrive at the hotel at 15:00. Could we have a quiet room on a high floor?'}));
 await check('Without an approved template, an automatic rule draft goes to "Cần Cua xử lý" with the reason',async()=>{const d=(await threadState(db,'owner-one',A)).drafts[0];assert.equal(d.source,'rules');assert.equal(d.status,'pending');assert.match(d.attention,/Chưa có mẫu nào được Cua cho phép dùng lại/);assert.ok((await queue('review')).includes(A));assert.deepEqual(await queue('template'),[]);});

 // Cua approves one reply for booking A. That approval alone must not create a reusable template.
 const approvedBody='Dear Example Guest Alpha,\n\nThank you for your message. We have noted your arrival time of 15:00 and your request for a quiet room on a high floor for your stay from 25/10/2026 to 28/10/2026. Our team will check availability; this request is not yet confirmed.\n\nBest regards';
 let s=await threadState(db,'owner-one',A);
 assert.equal((await post({action:'save',id:A,revision:s.drafts[0].revision,contextKey:s.contextKey,body:approvedBody,operationId:crypto.randomUUID()})).status,200);
 s=await threadState(db,'owner-one',A);assert.equal((await post({action:'approve',id:A,revision:s.drafts[0].revision,contextKey:s.contextKey})).status,200);
 const sourceRevision=s.drafts[0].revision;
 await check('Approving one reply is recorded with time and context but does not create a reusable template',async()=>{const g=await (await tplApi.GET()).json();assert.equal(g.templates.length,0);const a=g.approved.find(x=>x.threadId===A&&x.revision===sourceRevision);assert.ok(a);assert.ok(a.approvedAt);assert.equal(a.propertyId,'luxe-75pht');assert.deepEqual(a.situations.sort(),['arrival','room']);assert.match(a.suggestedBody,/\{\{guest_name\}\}/);});

 const tplBody='Dear {{guest_name}},\n\nThank you for your message.[[if:arrival]] We have noted your arrival time of {{arrival_time}}.[[/if]][[if:room]] We have also noted your room request for your stay from {{check_in}} to {{check_out}}; our team will check availability and this request is not yet confirmed.[[/if]][[if:transfer_declined]] We have noted that you will arrange your own transport.[[/if]][[ask:arrival]] May I ask what time you expect to arrive at the hotel?[[/ask]][[offer:pickup]]\n\nIf it helps, we can share private airport pick-up options with the vehicle details first, and you can decide later.[[/offer]]\n\nBest regards';
 const base={action:'save',title:'Giờ đến + yêu cầu phòng (75PHT, EN)',body:tplBody,situations:['arrival','room','transfer_declined'],properties:['luxe-75pht'],channels:[],sourceThread:A,sourceRevision,confirmed:true};
 await check('Template permission must be explicit, from an approved reply, without price, promises or the source guest identity',async()=>{
  assert.equal((await tplPost({...base,operationId:crypto.randomUUID(),confirmed:false})).status,400);
  const unapproved=(await threadState(db,'owner-one',A)).drafts.find(d=>d.status!=='approved');assert.equal((await tplPost({...base,operationId:crypto.randomUUID(),sourceRevision:unapproved.revision})).status,409);
  let r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody+' Airport pick-up is $25.'});assert.equal(r.status,400);assert.match(r.data.error,/giá/);
  r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody+' Early check-in from 9 AM costs 50% of the nightly rate.'});assert.equal(r.status,400);assert.match(r.data.error,/giá/);
  r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody.replace('our team will check availability and this request is not yet confirmed','we have arranged a quiet room for you')});assert.equal(r.status,400);assert.match(r.data.error,/cam kết/);
  r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody.replace('{{guest_name}}','Example Guest Alpha')});assert.equal(r.status,400);assert.match(r.data.error,/guest_name/);
  r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody.replace('{{arrival_time}}','15:00')});assert.equal(r.status,400);assert.match(r.data.error,/giờ của khách gốc.*15:00/);
  r=await tplPost({...base,operationId:crypto.randomUUID(),body:tplBody.replace('{{check_in}}','25/10/2026')});assert.equal(r.status,400);assert.match(r.data.error,/ngày lưu trú/);
  assert.equal((await (await tplApi.GET()).json()).templates.length,0);
  assert.deepEqual(templateProblems({body:'We have noted your request; it is not yet confirmed and we will check availability.',situations:['room'],properties:['luxe-75pht'],channels:[]}),[]);
 });

 const B=await ingest(add({guest:'Example Guest Bravo',booking:'5910000002',message:'We expect to arrive at the hotel around 14:00. A quiet room please.',hoursAgo:9}));
 const Q=await ingest(add({guest:'Example Guest Quebec',property:PSUITES,booking:'5910000031',message:'We will arrive at the hotel at 13:00.',hoursAgo:9}));
 assert.match((await threadState(db,'owner-one',Q)).drafts[0].attention,/Chưa có mẫu nào/);
 const operation=crypto.randomUUID();
 const created=await tplPost({...base,operationId:operation});
 await check('After a template is allowed, non-matching automatic drafts show the current reason; their text is kept',async()=>{const d=(await threadState(db,'owner-one',Q)).drafts;assert.equal(d.length,1);assert.doesNotMatch(d[0].attention,/Chưa có mẫu nào/);assert.match(d[0].attention,/cơ sở\/kênh này/);assert.equal(d[0].source,'rules');});
 const tplId=created.data.id;
 await check('A matching conversation gets a template draft filled from its own booking, labelled as a suggestion, still pending',async()=>{
  assert.equal(created.status,200);assert.equal(created.data.version,1);assert.ok(created.data.refresh.created_template>=1);
  const d=(await threadState(db,'owner-one',B)).drafts[0];assert.equal(d.source,'template');assert.equal(d.status,'pending');assert.equal(d.attention,'');assert.equal(d.template_id,tplId);
  assert.match(d.body,/Dear Example Guest Bravo/);assert.match(d.body,/arrival time of 14:00/);assert.match(d.body,/25\/10\/2026 to 28\/10\/2026/);assert.match(d.body,/not yet confirmed/);assert.doesNotMatch(d.body,/Alpha|5910000001/);
  assert.doesNotMatch(d.body,/what time you expect/);assert.match(d.body,/airport pick-up options/);assert.match(d.notes,/Đề xuất từ mẫu đã duyệt/);
  const g=await detail(B);assert.equal(g.prepared.label,'Đề xuất từ mẫu đã duyệt');assert.equal(g.prepared.template.title,base.title);assert.match(g.next.text,/Duyệt nội dung/);assert.doesNotMatch(JSON.stringify(g.prepared),/Cua đã duyệt/);
  assert.ok((await queue('template')).includes(B));assert.ok(!(await queue('review')).includes(B));
 });
 await check('Booking A keeps its own approved reply; a template does not rewrite or re-request approval',async()=>{const d=(await threadState(db,'owner-one',A)).drafts[0];assert.equal(d.status,'approved');assert.equal(d.revision,sourceRevision);assert.equal(d.body,approvedBody);});

 await check('Same booking number at the other property never uses a 75PHT template',async()=>{const S=await ingest(add({guest:'Example Guest Bravo',property:PSUITES,booking:'5910000002',message:'We expect to arrive at the hotel around 14:00. A quiet room please.',hoursAgo:8}));assert.notEqual(S,B);const d=(await threadState(db,'owner-one',S)).drafts[0];assert.equal(d.source,'rules');assert.match(d.attention,/cơ sở\/kênh này/);assert.ok((await queue('review')).includes(S));});

 const C=await ingest(add({guest:'Example Guest Charlie',booking:'5910000003',message:'We will arrive at the hotel at 16:00. We do not need an airport transfer. A quiet room please.',hoursAgo:7}));
 await check('Guest who declined transport is not offered a vehicle again',async()=>{const d=(await threadState(db,'owner-one',C)).drafts[0];assert.equal(d.source,'template');assert.match(d.body,/arrival time of 16:00/);assert.match(d.body,/arrange your own transport/);assert.doesNotMatch(d.body,/pick-up options/i);});

 const D=await ingest(add({guest:'Example Guest Delta',booking:'5910000004',message:'Could we have a quiet room on a high floor?',hoursAgo:6}));
 await check('Arrival question is asked only while the arrival time is unknown',async()=>{const d=(await threadState(db,'owner-one',D)).drafts[0];assert.equal(d.source,'template');assert.match(d.body,/what time you expect to arrive/);assert.doesNotMatch(d.body,/arrival time of/);});

 await check('Price, out-of-template content and other languages go to Cua with the decision needed',async()=>{
  const E=await ingest(add({guest:'Example Guest Echo',booking:'5910000005',message:'We will arrive at the hotel at 14:00. How much is the airport pick-up?',hoursAgo:5}));let d=(await threadState(db,'owner-one',E)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/giá/);
  const F=await ingest(add({guest:'Example Guest Foxtrot',booking:'5910000006',message:'We will arrive at the hotel at 14:00. Do you have a gym on site?',hoursAgo:5}));d=(await threadState(db,'owner-one',F)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/chưa thuộc tình huống nào có mẫu.*gym/);
  const V=await ingest(add({guest:'Example Guest Viet',booking:'5910000007',message:'Chúng tôi sẽ đến khách sạn lúc 14:00. Cho mình xin phòng yên tĩnh.',hoursAgo:5}));d=(await threadState(db,'owner-one',V)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/tiếng Việt/);
  for(const id of [E,F,V])assert.ok((await queue('review')).includes(id));
 });

 await check('OTA "Is this ok?" needs Cua, other languages go to Cua, sign-offs and contact lines do not block a template',async()=>{
  const K=await ingest(add({guest:'Example Guest Kilo',booking:'5910000011',message:'Requested: Large bed. Is this ok?',hoursAgo:4}));let d=(await threadState(db,'owner-one',K)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/xác nhận khả năng đáp ứng/);
  const L=await ingest(add({guest:'Example Guest Lima',booking:'5910000012',message:'Bonjour, nous arriverons à l\'hôtel vers 15h00. Merci.',hoursAgo:4}));d=(await threadState(db,'owner-one',L)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/ngôn ngữ khác/);
  const X=await ingest(add({guest:'Example Guest Xray',booking:'5910000014',message:"I'd like to request check-in at 08:00 - 09:00. Is this ok?\nAccept for free\n__________\nAccept with charges",hoursAgo:4}));d=(await threadState(db,'owner-one',X)).drafts[0];assert.notEqual(d.source,'template');assert.match(d.attention,/chấp nhận \(miễn phí \/ có phí \/ từ chối\)/);assert.doesNotMatch(d.attention,/hỏi giá/);
  const H=await ingest(add({guest:'Example Guest Hotel',booking:'5910000015',message:'Hi, thank you for your message. We will arrive at the hôtel at 14.30. My direct phone number is [phone P-0001]',hoursAgo:4}));d=(await threadState(db,'owner-one',H)).drafts[0];assert.equal(d.source,'template');assert.equal(d.attention,'');assert.match(d.body,/arrival time of 14:30/);
  for(const [n,text] of [['21','Hello! We will be arriving around 1 to 2 pm'],['22','Hello We will arrive around 10/11 pm'],['23','Hello! We will most likely arrive around 2–3 PM.']]){const W=await ingest(add({guest:'Example Guest Window'+n,booking:'59100000'+n,message:text,hoursAgo:4}));d=(await threadState(db,'owner-one',W)).drafts[0];assert.notEqual(d.source,'template',text);assert.match(d.attention,/giờ đến khách sạn \(một mốc giờ\)/);}
  const M=await ingest(add({guest:'Example Guest Mike',booking:'5910000013',message:'Hello Guest! We will arrive at the hotel at 15:00. My email is contact-1@example.invalid. Kind regards, Guest',hoursAgo:4}));d=(await threadState(db,'owner-one',M)).drafts[0];assert.equal(d.source,'template');assert.equal(d.attention,'');assert.match(d.body,/arrival time of 15:00/);
 });
 await check('An unconditional vehicle offer in a template is held back for a guest who declined transport',async()=>{
  const {renderTemplate,planReply}=await import('../.quote-tests/tpl-tpl.mjs');const s=await threadState(db,'owner-one',C);
  const loose={id:'t-loose',version:1,title:'Loose',body:'Dear {{guest_name}}, we have noted your arrival time of {{arrival_time}}. Please let us know if you would also like us to arrange airport pickup.',situations:['arrival','room','transfer_declined'],properties:['luxe-75pht'],channels:[],language:'en',approved_at:'2026-10-18',approved_by:'owner-one',source_thread:'',source_revision:0,retired_at:null};
  assert.match(renderTemplate(loose,s).problems.join(' '),/mời xe/);const p=planReply(s,[loose]);assert.equal(p.template,undefined);assert.match(p.reasons.join(' '),/mời xe/);
 });
 await check('Arrival-only scope: refusal in the same message goes to Cua; a refusal answered earlier is respected when the template applies',async()=>{
  const {planReply}=await import('../.quote-tests/tpl-tpl.mjs');
  const body='Dear {{guest_name}}, we have noted your expected arrival time of {{arrival_time}} for your stay from {{check_in}} to {{check_out}}.[[offer:pickup]] If it helps, we can share private airport pick-up options for your arrival.[[/offer]][[offer:dropoff]] If you would like, we can also share transfer options to the airport for the end of your stay.[[/offer]]';
  const t={id:'t-arr',version:1,title:'Arrival only',body,situations:['arrival'],properties:['luxe-suites'],channels:[],language:'en',approved_at:'2026-10-18',approved_by:'owner-one',source_thread:'',source_revision:0,retired_at:null};
  const thread={id:'x',property_id:'luxe-suites',channel:'booking',booking_id:'5990000001'},stay={checkIn:'2026-10-25',checkOut:'2026-10-27',sourceId:'e1',conflict:false};
  const ev=(id,text,at)=>({id,guest_text:text,received:at,kind:'guest',guest_name:'Example Guest'});
  const fact=(category,status,quote,eventId)=>({category,status,summary:quote,sources:[{eventId,quote}]});
  const same=[ev('e1','We will arrive at the hotel at 15:00. We do not need an airport transfer.','2026-10-18T01:00:00Z')];
  let p=planReply({thread,stay,events:same,sent:[],profile:{facts:[fact('arrival','provided','We will arrive at the hotel at 15:00.','e1'),fact('pickup','declined','We do not need an airport transfer.','e1'),fact('dropoff','declined','We do not need an airport transfer.','e1')]}},[t]);
  assert.equal(p.template,undefined);assert.match(p.reasons.join(' '),/Không cần xe/);
  const later=[ev('e1','We do not need an airport transfer.','2026-10-17T01:00:00Z'),ev('e2','We will arrive at the hotel at 15:00.','2026-10-18T01:00:00Z')];
  p=planReply({thread,stay,events:later,sent:[{created:'2026-10-17T05:00:00Z'}],profile:{facts:[fact('pickup','declined','We do not need an airport transfer.','e1'),fact('dropoff','declined','We do not need an airport transfer.','e1'),fact('arrival','provided','We will arrive at the hotel at 15:00.','e2')]}},[t]);
  assert.ok(p.template);assert.match(p.body,/arrival time of 15:00/);assert.doesNotMatch(p.body,/pick-up|transfer options/);
  // Declining only the pickup keeps the dropoff offer.
  p=planReply({thread,stay,events:later,sent:[{created:'2026-10-17T05:00:00Z'}],profile:{facts:[fact('pickup','declined','We do not need a pickup.','e1'),fact('arrival','provided','We will arrive at the hotel at 15:00.','e2')]}},[t]);
  assert.ok(p.template);assert.doesNotMatch(p.body,/pick-up options/);assert.match(p.body,/transfer options to the airport/);
 });
 await check('Cua approves a template suggestion; only that action makes it approved',async()=>{const s=await threadState(db,'owner-one',B);assert.equal((await post({action:'approve',id:B,revision:s.drafts[0].revision,contextKey:s.contextKey})).status,200);const d=(await threadState(db,'owner-one',B)).drafts[0];assert.equal(d.status,'approved');assert.equal(d.source,'template');assert.ok((await queue('approved')).includes(B));});

 let approvedB;
 await check('New guest message after approval: old approval kept as history, new suggestion needs Cua with the reason',async()=>{approvedB=(await threadState(db,'owner-one',B)).drafts[0];await ingest(add({guest:'Example Guest Bravo',booking:'5910000002',message:'Our plans changed: we will arrive at the hotel at 22:00 instead.',hoursAgo:2}));const s=await threadState(db,'owner-one',B);const old=s.drafts.find(d=>d.revision===approvedB.revision);assert.equal(old.status,'approved');assert.equal(old.body,approvedB.body);assert.equal(old.approved_at,approvedB.approved_at);assert.equal(old.stale,true);const d=s.drafts[0];assert.equal(d.status,'pending');assert.match(d.attention,new RegExp('Có tin mới sau phiên bản v'+approvedB.revision+' đã duyệt'));assert.match(d.body,/22:00/);assert.ok((await queue('review')).includes(B));assert.ok(!(await queue('template')).includes(B));assert.equal((await post({action:'approve',id:B,revision:approvedB.revision,contextKey:approvedB.context_key})).status,409);});

 await check('A new message never buries the version Cua is editing',async()=>{let s=await threadState(db,'owner-one',D);assert.equal((await post({action:'save',id:D,revision:s.drafts[0].revision,contextKey:s.contextKey,body:'Cua is still writing this reply for Delta.',operationId:crypto.randomUUID()})).status,200);const mine=(await threadState(db,'owner-one',D)).drafts[0];await ingest(add({guest:'Example Guest Delta',booking:'5910000004',message:'We will arrive at the hotel at 12:00.',hoursAgo:1}));s=await threadState(db,'owner-one',D);assert.equal(s.drafts[0].revision,mine.revision);assert.equal(s.drafts[0].body,'Cua is still writing this reply for Delta.');assert.equal(s.drafts[0].stale,true);const g=await detail(D);assert.match(g.next.text,/Có tin mới/);assert.equal(g.prepared.source,'cua');});

 await check('Reprocessing the same emails and re-running preparation creates no duplicate drafts',async()=>{const before=await allDrafts();for(const m of mails)assert.equal((await ingestMail(db,m)).duplicate,true);for(let i=0;i<2;i++)assert.equal((await post({action:'autodraft'})).status,200);for(const id of [A,B,C,D])await prepareDraft(db,'owner-one',id,'',true);assert.deepEqual(await allDrafts(),before);});

 await check('Approved reply still in context stays approved through a re-run',async()=>{const s=await threadState(db,'owner-one',C);assert.equal((await post({action:'approve',id:C,revision:s.drafts[0].revision,contextKey:s.contextKey})).status,200);const before=(await threadState(db,'owner-one',C)).drafts;await post({action:'autodraft',id:C});const after=(await threadState(db,'owner-one',C)).drafts;assert.deepEqual(after,before);});

 await check('Template versions are immutable; a retired template is no longer used',async()=>{const r=await tplPost({...base,operationId:crypto.randomUUID(),templateId:tplId,body:tplBody.replace('Best regards','Warm regards')});assert.equal(r.status,200);assert.equal(r.data.version,2);const g=await (await tplApi.GET()).json();assert.equal(g.templates.filter(t=>t.id===tplId).length,2);assert.match(g.templates.find(t=>t.version===1).body,/Best regards/);assert.equal((await tplPost({action:'retire',templateId:tplId,confirmed:true})).status,200);
  // Open template suggestions from the retired template go back to Cua, text unchanged.
  const pendingTpl=(await queue('template'));assert.ok(pendingTpl.length>0);const before=(await threadState(db,'owner-one',pendingTpl[0])).drafts[0];
  assert.equal((await post({action:'autodraft'})).status,200);const flagged=(await threadState(db,'owner-one',pendingTpl[0])).drafts[0];assert.equal(flagged.revision,before.revision);assert.equal(flagged.body,before.body);assert.match(flagged.attention,/Mẫu không còn phù hợp/);assert.deepEqual(await queue('template'),[]);assert.ok((await queue('review')).includes(pendingTpl[0]));
  const once=await allDrafts();assert.equal((await post({action:'autodraft'})).status,200);assert.deepEqual(await allDrafts(),once);const G=await ingest(add({guest:'Example Guest Golf',booking:'5910000008',message:'We will arrive at the hotel at 13:00.',hoursAgo:1}));const d=(await threadState(db,'owner-one',G)).drafts[0];assert.equal(d.source,'rules');assert.match(d.attention,/Chưa có mẫu nào/);});

 await check('Templates and conversations are isolated per owner',async()=>{globalThis.otaUser={userId:'owner-two'};const g=await (await tplApi.GET()).json();assert.equal(g.templates.length,0);assert.equal(g.approved.length,0);assert.equal((await tplPost({...base,operationId:crypto.randomUUID(),templateId:undefined})).status,404);globalThis.otaUser={userId:'owner-one'};});
 console.log('Template checks passed: '+count);
}finally{await mf.dispose();}
