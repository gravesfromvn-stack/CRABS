import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/fdops',{recursive:true});
// Synthetic messages only; ephemeral D1; no live database, no sends.
const boundary={name:'ops-boundary',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'mock'}));b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='env'?'export const env=globalThis.opsEnv;':'export async function getChatGPTUser(){return globalThis.opsUser;}',loader:'js'}));}};
await build({entryPoints:{chips:'app/ops-front-desk.tsx',fd:'lib/front-desk.ts',tags:'lib/smart-tags.ts',replies:'lib/service-replies.ts',model:'lib/operations.ts',profile:'lib/ota-profile.ts',cat:'lib/service-catalog.ts',advice:'lib/tour-advice.ts',letters:'lib/apology-letters.ts',policy:'lib/hotel-policy-config.ts',api:'app/api/operations/route.ts',ota:'lib/ota-store.ts'},outdir:'.quote-tests/fdops',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},plugins:[boundary]});
globalThis.opsEnv={};globalThis.opsUser={userId:'fd-owner'};// read by the bundled route at import time
const m=n=>import(`../.quote-tests/fdops/${n}.mjs`);
const [chips,fd,tags,replies,model,profile,cat,advice,letters,policy,api,ota]=await Promise.all(['chips','fd','tags','replies','model','profile','cat','advice','letters','policy','api','ota'].map(m));
let passed=0;const check=async(name,fn)=>{await fn();console.log('PASS '+name);passed++;};
const msg=(text,at='2026-10-19T01:00:00Z')=>({text,at});
const hard=t=>advice.guestDraftProblems(t,{facts:[],allowedAmounts:cat.catalogApprovedAmounts(cat.seedEntries,'luxe-75pht')}).filter(p=>p.hard);
const p75=cat.catalogPolicy(policy.policyFor('luxe-75pht'),cat.seedEntries,'luxe-75pht');

await check('ETA: arrive / land / around 2pm / flight only / nothing → status and time',()=>{
 const e=x=>fd.etaFrom([msg(x)],{checkInTime:'14:00'});
 assert.deepEqual([e('We will arrive at 11:30.').status,e('We will arrive at 11:30.').time],['EARLY_ARRIVAL','11:30']);
 const land=e('We land at 13:15 on VN 211.');assert.deepEqual([land.status,land.time,land.flight,land.basis],['CONFIRMED_ETA','14:15','VN211','landing'],'landing + 60 minutes from Noi Bai');
 assert.deepEqual([e('We should be there around 2pm').status,e('We should be there around 2pm').time],['CONFIRMED_ETA','14:00']);
 assert.equal(e('Our flight is VJ135, see you soon').status,'CONFIRMED_ETA');
 assert.equal(e('Hello, can we have a quiet room?').status,'MISSING_ETA');
 assert.equal(fd.etaFrom([msg('Quiet room please')],{pickupBooked:true}).status,'CONFIRMED_ETA','a booked pick-up gives the time');
 assert.equal(fd.etaFrom([msg('We arrive at 10:00',"2026-10-18T01:00:00Z"),msg('Change: we arrive at 18:00 now','2026-10-19T01:00:00Z')]).time,'18:00','latest message wins');
 assert.equal(fd.defaultReadiness(e('We will arrive at 11:30.')),'CLEANING_PRIORITY');assert.equal(fd.defaultReadiness(e('hello')),'WAITING_ETA');
});
await check('ETA prompt: asks arrival time for housekeeping, offers the pick-up at the approved 350k / 450k, no hard problems',()=>{
 const t=fd.etaPrompt(p75,'Anna');
 assert.match(t,/^Dear Anna, warm greetings from the .* Front Desk!/);assert.match(t,/Housekeeping team prioritise preparing your room/);assert.match(t,/350,000 VND for a 4-seat car \/ 450,000 VND for a 7-seat SUV/);
 assert.doesNotMatch(t,/right away|guarantee/i);assert.deepEqual(hard(t),[]);
 assert.match(fd.etaPrompt(p75,'',true),/350\.000đ xe 4 chỗ \/ 450\.000đ xe 7 chỗ/);
});
await check('Routing: room/transfer/spa → reception; tours → Saler unless the switch is on',()=>{
 assert.deepEqual(fd.routeRequest('Can you arrange an airport pick-up and a massage?').roles,['RECEPTIONIST']);
 assert.deepEqual(fd.routeRequest('Can you recommend a Ha Long Bay day cruise?').roles,['SALE']);
 assert.deepEqual(fd.routeRequest('Can you recommend a Ha Long Bay day cruise?',true).roles,['RECEPTIONIST']);
 assert.deepEqual(fd.routeRequest('We are coming from Ha Long Bay, arriving at 15:00.').roles,['RECEPTIONIST'],'a place they come from is not a tour');
 const tg=tags.smartTags([msg('We would love a Ninh Binh tour and an airport pick-up.')],{});const codes=tg.tags.map(t=>t.code);
 assert.ok(codes.includes('TAG_SALE_TOUR'));assert.ok(codes.includes('TAG_RECEPTION_CONFIRM'));assert.equal(tg.tags.find(t=>t.code==='TAG_SALE_TOUR').label,'[CHUYỂN SALER TOUR]');
 assert.ok(!tags.smartTags([msg('We would love a Ninh Binh tour.')],{},{allowReceptionistTourSales:true}).tags.some(t=>t.code==='TAG_SALE_TOUR'));
});
await check('Tour drafts: Saler hand-off (no price, no promised minutes) vs reception quick offer at approved catalog prices',()=>{
 const text='Could you recommend some tours?',facts=profile.ruleProfile([{id:'e1',guest_text:text,received:'2026-10-14T03:00:00Z',kind:'guest'}]);
 const base={catalog:cat.seedEntries,propertyId:'luxe-75pht',text,facts,vi:false,tourInterested:true,hasContact:false};
 const sale=replies.serviceReply({...base,tourSales:'sale'});
 assert.ok(sale.needs.includes('tour_handoff'));const st=sale.paragraphs.join('\n');assert.match(st,/passed your request to our Tour Specialist/);assert.doesNotMatch(st,/VND|minutes|\bHe\b/);assert.match(sale.internal.join(' '),/\[CHUYỂN SALER TOUR\]/);
 const rec=replies.serviceReply({...base,tourSales:'reception'});const rt=rec.paragraphs.join('\n');
 assert.ok(rec.needs.includes('tour_offer'));assert.match(rt,/1\. .*1,050,000 VND\/guest/);assert.match(rt,/950,000 VND\/guest/);assert.match(rt,/Jeep City.*1,150,000 VND\/guest/);
 assert.match(rt,/check availability and confirm your seats/);assert.doesNotMatch(rt,/reserve your seats immediately/);assert.deepEqual(hard(rt),[]);
 assert.ok(replies.serviceReply(base).needs.includes('tour_whatsapp'),'no mode given: previous WhatsApp flow unchanged');
});
await check('[COMPLAIN] at every stage: pre-stay billing, in-stay room, post-stay; manager attention; not for other hotels',()=>{
 const stay={checkIn:'2026-10-19',checkOut:'2026-10-21'};
 const pre=tags.smartTags([msg('You charged my card twice for the booking!','2026-10-15T03:00:00Z')],stay);
 assert.equal(pre.complaints[0].stage,'PRE_STAY');assert.equal(pre.complaints[0].topic,'tranh chấp giá / thu tiền');assert.ok(pre.requiresManagerAttention);assert.equal(pre.tags.find(t=>t.code==='TAG_COMPLAINT').label,'[COMPLAIN]');
 const inn=tags.smartTags([msg('The water pressure in the shower is very weak and there is a bad smell in our room.','2026-10-20T13:00:00Z')],stay);
 assert.equal(inn.complaints[0].stage,'IN_STAY');assert.ok(inn.requiresManagerAttention);
 assert.equal(tags.smartTags([msg('The reception staff were rude to us.','2026-10-23T03:00:00Z')],stay).complaints[0].stage,'POST_STAY');
 for(const ok of ["We had a terrible noisy night in Cat Ba. Please make sure our room is quiet.",'Is there a cancel option in case of very bad weather?','Can I get a refund if I cancel next month?','Next to me was a very unhappy child on the bus.'])
  assert.equal(tags.smartTags([msg(ok)],stay).requiresManagerAttention,false,ok);
});
await check('Pre-stay apology does not talk about "your stay"; no compensation',()=>{
 const p=policy.policyFor('luxe-75pht'),a=letters.detectApology(profile.normalize('You charged my card twice!'));
 assert.equal(a.kind,'stay');const l=letters.apologyLetter(p,a,false,'Anna','PRE_STAY').body;
 assert.match(l,/sincere apologies for the inconvenience regarding the charge/);assert.doesNotMatch(l,/stay did not meet/);assert.match(l,/WhatsApp \+84 896 867 575/);assert.doesNotMatch(l,/refund|discount|upgrade|compensat/i);
});
await check('Shifts and checklists by time and account view; cost visibility',()=>{
 assert.deepEqual(['06:29','06:30','13:59','14:00','21:59','22:00','03:00'].map(fd.shiftAt),['night','morning','morning','afternoon','afternoon','night','night']);
 assert.equal(fd.checklistFor('morning','RECEPTIONIST').length,5);assert.match(fd.checklistFor('morning','RECEPTIONIST')[1].text,/MISSING_ETA.*trước 09:00/);
 assert.ok(fd.checklistFor('afternoon','SALE').every(i=>i.roles.includes('SALE')));assert.ok(fd.checklistFor('morning','MANAGER').some(i=>i.metric==='complaints'));
 assert.equal(fd.checklistFor('night','RECEPTIONIST').length,5);
 assert.deepEqual(['RECEPTIONIST','SALE','MANAGER','ADMIN'].map(fd.canSeeCost),[false,false,true,true]);
});

await check('Shift-log quick chips: five one-tap notes with matching categories; one hotline everywhere',()=>{
 assert.deepEqual(chips.handoffChips.map(c=>c.label),['[+ Khách xin thêm gối/chăn]','[+ Dặn giờ dọn phòng]','[+ Đặt xe tiễn sân bay mai]','[+ Khách hỏi Tour -> Chuyển Saler]','[🚨 Phàn nàn điều hòa/nước yếu/ồn]']);
 assert.deepEqual(chips.handoffChips.map(c=>c.category),['ROOM_REQUEST','ROOM_REQUEST','TRANSFER_SPA','TOUR_LEAD','COMPLAIN']);
 for(const id of ['luxe-75pht','luxe-suites']){const p=policy.policyFor(id);assert.equal(p.frontDesk.hotline.whatsapp,'+84 896 867 575');assert.equal(p.frontDesk.letters.hotline,'+84 896 867 575');}
});
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');globalThis.opsEnv.DB=db;
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean))await db.prepare(sql).run();
 await db.prepare('INSERT INTO ota_mailbox(mailbox,owner,created,last_received) VALUES(?,?,?,?)').bind('paradisesuitespht@gmail.com','fd-owner','2026-10-18','').run();
 const mail=(id,message,at,booking='5100000001')=>{const body='Confirmation number: '+booking+'\nYou have a new message from a guest\nSynthetic Guest said:\n'+message+'\nReply\nReservation details\nGuest name:\nSynthetic Guest\nProperty name:\nLuxe Paradise Premium Pham Hong Thai Hotel & Spa\nBooking number:\n'+booking+'\nCheck-in: 19 October 2026\nCheck-out: 21 October 2026';return {id,threadId:'gmail-'+id,internalDate:String(Date.parse(at)),payload:{mimeType:'text/plain',headers:[{name:'From',value:'notification@guest.booking.com'},{name:'Subject',value:'We received this message from Synthetic Guest'},{name:'Authentication-Results',value:'mx.google.com; dmarc=pass header.from=guest.booking.com'},{name:'Message-ID',value:'<'+id+'@booking.com>'}],body:{data:Buffer.from(body).toString('base64url')}}};};
 const recent=new Date(Date.now()-2*86400000).toISOString();
 await ota.ingestMail(db,mail('fd-1','The air conditioning in our room is not working.',recent));
 await ota.ingestMail(db,mail('fd-2','Could you recommend a Ninh Binh day tour for us?','2026-10-18T02:00:00Z','5100000002'));
 const get=async(q='')=>{const r=await api.GET(new Request('https://test.invalid/api/operations'+q));assert.equal(r.status,200);return r.json();};
 const post=async(p,status=200)=>{const r=await api.POST(new Request('https://test.invalid/api/operations',{method:'POST',headers:{Origin:'https://test.invalid'},body:JSON.stringify(p)}));const d=await r.json();assert.equal(r.status,status,JSON.stringify(d));return d;};
 await check('API: complaint shows in the manager alerts with a calming message; resolving removes it',async()=>{
  let d=await get('?view=alerts');assert.equal(d.alerts.length,1);const a=d.alerts[0];assert.equal(a.topic,'điều hòa');assert.match(a.prompt,/within 15 minutes/);assert.match(a.prompt,/Front Office Manager/);
  await post({action:'flag',operationId:crypto.randomUUID(),key:'complaint:'+a.key,value:'resolved'});d=await get('?view=alerts');assert.equal(d.alerts.length,0);
 });
 await check('API: structured shift log (room, booking, stage, category, author); COMPLAIN entry alerts the manager; sign-off',async()=>{
  const h={action:'handoff',id:crypto.randomUUID(),operationId:crypto.randomUUID(),propertyId:'luxe-75pht',day:'2026-10-20',shift:'Ca Chiều',recipient:'Ca Đêm',body:'Synthetic: guest says the TV remote is missing.',room:'P.302',bookingRef:'#8800000150',stage:'IN_STAY',category:'COMPLAIN',author:'Ca chiều test'};
  await post(h);let d=await get();const saved=d.handoffs.find(x=>x.id===h.id);assert.deepEqual([saved.room,saved.booking_ref,saved.stage,saved.category,saved.author],['P.302','#8800000150','IN_STAY','COMPLAIN','Ca chiều test']);
  assert.equal((await get('?view=alerts')).alerts[0].key,'handoff:'+h.id);
  await post({action:'receive',id:h.id,operationId:crypto.randomUUID()});d=await get();assert.ok(d.handoffs.find(x=>x.id===h.id).received_at);
  await post({action:'flag',operationId:crypto.randomUUID(),key:'drop table',value:'x'},400);
 });
 await check('API: ETA on the source, room readiness and checklist ticks saved as flags',async()=>{
  let d=await get();const s=d.sources.find(x=>x.bookingId==='5100000002');assert.equal(s.eta.status,'MISSING_ETA');assert.match(s.etaPrompt,/estimated arrival time/);assert.deepEqual(s.roles,['SALE']);
  await post({action:'flag',operationId:crypto.randomUUID(),key:'room:'+s.key,value:'READY_FOR_GUEST'});await post({action:'flag',operationId:crypto.randomUUID(),key:'check:2026-10-20:morning:m2',value:'2026-10-20T01:00:00Z'});
  d=await get();assert.equal(d.flags.find(f=>f.key==='room:'+s.key).value,'READY_FOR_GUEST');assert.ok(d.flags.some(f=>f.key==='check:2026-10-20:morning:m2'));
 });
 await check('API + drafts: tour-sales switch defaults to OFF (Saler hand-off); ON lets reception offer tours',async()=>{
  let d=await get();assert.equal(d.settings.allowReceptionistTourSales,false);
  const thread=(await db.prepare("SELECT id FROM ota_threads WHERE booking_id='5100000002'").first()).id;
  await ota.prepareDraft(db,'fd-owner',thread,'',true);let draft=await db.prepare('SELECT body FROM ota_drafts WHERE thread_id=? ORDER BY revision DESC').bind(thread).first();
  assert.match(draft.body,/Tour Specialist/);
  await post({action:'flag',operationId:crypto.randomUUID(),key:'setting:allowReceptionistTourSales',value:'true'});d=await get();assert.equal(d.settings.allowReceptionistTourSales,true);
  assert.ok(d.sources.find(x=>x.bookingId==='5100000002').roles.includes('RECEPTIONIST'));
 });
}finally{await mf.dispose();}
console.log(JSON.stringify({passed,scope:'front desk: ETA, reception vs Saler routing and switch, [COMPLAIN] by stage with manager alerts, shift log and checklists, cost visibility'}));
