import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/advice',{recursive:true});
await build({entryPoints:['lib/tour-advice.ts','lib/ota-profile.ts','lib/guest-intent.ts'],outdir:'.quote-tests/advice',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},loader:{'.json':'json'},external:['ai','@ai-sdk/*']});
const ta=await import('../.quote-tests/advice/tour-advice.mjs');
const {ruleProfileWithHistory}=await import('../.quote-tests/advice/ota-profile.mjs');
const {readIntent}=await import('../.quote-tests/advice/guest-intent.mjs');
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
const P='luxe-75pht';
// Conversation -> advice + guest paragraph, as threadState/prepareDraft compute them.
function run(messages,{property=P,lastOutgoing='',vi=false,stayStart='2026-10-24'}={}){
 const events=messages.map((t,i)=>({id:'e'+i,guest_text:t,received:`2026-10-18T0${i}:00:00Z`,kind:'guest'}));
 const rules=ruleProfileWithHistory(events);
 const advice=ta.tourAdvice({propertyId:property,facts:rules.facts,text:messages.join('\n'),latestText:messages.at(-1),lastOutgoing,stayStart});
 const paragraph=ta.tourParagraph(advice,vi);
 return {advice,paragraph,rules,problems:ta.guestDraftProblems(paragraph,{facts:rules.facts,advice,known:{date:!!advice.constraints.date,party:!!advice.constraints.party}})};
}
const money=/\d{1,3}(?:[.,]\d{3})+|\d+\s?(?:usd|vnd|đ|k)\b|\$\s?\d/i;
const hard=r=>r.problems.filter(p=>p.hard);

check('Date and party given: advice does not re-ask them',()=>{
 const r=run(['Hi, we would like a Ninh Binh day trip on 26 October for 2 adults.']);
 assert.equal(r.advice.constraints.date,'26 October');assert.equal(r.advice.constraints.party,'2 adults');
 assert.equal(r.advice.questions.length,0);
 assert.ok(r.advice.options.some(o=>o.id==='R75-TST-021'));
 assert.match(r.paragraph,/Mua Cave|Hoa Lu|Trang An/i);
 assert.doesNotMatch(r.paragraph,/preferred date|how many people/i);
 assert.deepEqual(r.problems,[]);
 assert.equal(r.advice.serviceDate,'2026-10-26');
});
check('Only half a day free: no full-day tour proposed',()=>{
 const r=run(['We only have the afternoon free on 25 October. Could we see Ninh Binh?']);
 assert.equal(r.advice.options.length,0);
 assert.match(r.advice.internal.join(' '),/một phần ngày/);
 assert.equal(r.paragraph,'');
});
check('Children without ages: one question, about ages only',()=>{
 const r=run(['We are 2 adults with 2 kids and would like to visit Ha Long on 27 October.']);
 assert.equal(r.advice.questions.length,1);
 assert.match(r.advice.questions[0].en,/ages/);
 assert.equal((r.paragraph.match(/\?/g)||[]).length,1);
 const aged=run(['We are 2 adults with kids aged 5 and 9, Ha Long on 27 October.']);
 assert.deepEqual(aged.advice.constraints.childAges,[5,9]);assert.equal(aged.advice.questions.length,0);
});
check('Price asked while only reference prices exist: content first, no amount, internal "Cần Cua chốt giá"',()=>{
 const r=run(['How much is the Ninh Binh tour for 2 people on 26 October?']);
 assert.equal(r.advice.priceAsked,true);
 assert.match(r.advice.internal.join(' '),/Cần Cua chốt giá/);
 assert.doesNotMatch(r.paragraph,money);
 assert.match(r.paragraph,/final price/);
 assert.deepEqual(hard(r),[]);
 assert.doesNotMatch(JSON.stringify(ta.tourKnowledgeForAI(r.advice)),/\d{1,3}\.\d{3}|\d{3},\d{3}/);
 // All four NB classes stay separate variants with reference status.
 const nb=r.advice.options.find(o=>o.id==='R75-TST-021');
 assert.deepEqual(nb.variants.map(v=>v.id),['NB01','NB02','NB03','NB04']);
 assert.ok(nb.variants.every(v=>v.status.startsWith('Tham khảo')));
});
check('"Cua duyệt" ticked but incomplete record (HN01): still reference, draft with 750.000 is blocked',()=>{
 const r=run(['How much is the Hanoi city tour on 26 October for 2 adults?']);
 const city=r.advice.options.find(o=>o.id==='R75-TST-003');
 const hn01=city.variants.find(v=>v.id==='HN01');
 assert.match(hn01.status,/^Tham khảo · Cần Cua chốt giá · Hồ sơ duyệt còn thiếu/);
 const p=ta.guestDraftProblems('The Hanoi city tour is 750.000 VND per person.',{facts:[],advice:r.advice});
 assert.ok(p.some(x=>x.hard&&/750.000/.test(x.text)));
});
check('Approved price passes the check only when it is the approved amount',()=>{
 const advice={...run(['Ninh Binh on 26 October for 2 adults']).advice};
 advice.options=[{...advice.options[0],approvedPrice:{price:1200000,unit:'khách',from:'2026-10-01',until:'2026-12-31'}}];
 assert.deepEqual(ta.guestDraftProblems('The price is 1,200,000 VND per person.',{facts:[],advice}).filter(p=>p.hard),[]);
 assert.ok(ta.guestDraftProblems('The price is 1,500,000 VND per person.',{facts:[],advice}).some(p=>p.hard));
});
check('Transport declined, tour deferred, then asked again: topic reopens, transfer not re-offered',()=>{
 const msgs=['We do not need an airport pickup, thanks.','About tours, we will decide later when we arrive.'];
 const deferred=run(msgs);
 assert.equal(deferred.advice.status,'deferred');assert.equal(deferred.paragraph,'');
 const again=run([...msgs,'Actually, could you tell us about the Ninh Binh tour on 26 October for 2 adults?']);
 assert.equal(again.advice.status,'interested');
 assert.ok(again.advice.options.length>0);
 assert.doesNotMatch(again.paragraph,/airport|pick.?up from the airport/i);
 assert.ok(again.rules.facts.some(f=>f.category==='pickup'&&f.status==='declined'));
});
check('Date changed: the latest date is used and the old one kept in nothing guest-facing',()=>{
 const r=run(['Ninh Binh on 26 October for 2 adults please.','Sorry, can we change to 28 October?']);
 assert.equal(r.advice.constraints.date,'28 October');assert.equal(r.advice.serviceDate,'2026-10-28');
 assert.doesNotMatch(r.paragraph,/26 october/i);
 assert.ok(readIntent('Sorry, can we change to 28 October?').intents.includes('change'));
});
check('Time correction keeps history in the profile',()=>{
 const {rules}=run(['We will arrive at the hotel at 14:00.','Correction: we arrive at the hotel at 16:30.']);
 assert.match(rules.facts.find(f=>f.category==='arrival').summary,/16:30/);
 assert.ok(rules.history.some(h=>h.category==='arrival'&&/14:00/.test(h.summary)));
});
check('Overnight bus: transport cautions internal; guest line has no departure list',()=>{
 const r=run(['How can we get to Ha Giang by bus?']);
 const t=r.advice.transport.find(t=>t.place==='Hà Giang');
 assert.ok(t.rows.length>0);
 const cautions=t.rows.flatMap(x=>x.cautions).join(' ');
 assert.match(cautions,/Hà Giang Loop/);assert.match(cautions,/ước tính/);
 assert.doesNotMatch(r.paragraph,/\b\d{1,2}:\d{2}\b/);
});
check('Tour already includes transport from Hanoi: no extra bus offered',()=>{
 const r=run(['We are thinking about a 3 days Ha Giang tour. How can we get to Ha Giang by bus?']);
 const inc=r.advice.options.filter(o=>o.transportIncluded);
 assert.ok(inc.length>0);
 assert.match(r.advice.internal.join(' '),/không bán thêm vé xe/);
 assert.doesNotMatch(r.paragraph,/several departures from Hanoi/);
});
check('Two packages for the same destination stay separate (Dragon King pier vs from Hanoi; dorm vs Jeep)',()=>{
 const hl=run(['Ha Long day trip on 27 October for 2 adults.']);
 const dk=hl.advice.options.find(o=>o.id==='R75-TST-046');
 assert.deepEqual(dk.variants.map(v=>v.id),['HL01','HL02']);
 assert.match(hl.advice.internal.join(' '),/giá tại bến KHÔNG áp dụng/);
 const hg=run(['We would like a 3 days Ha Giang tour.']);
 const ids=hg.advice.options.map(o=>o.id);
 assert.equal(new Set(ids).size,ids.length);assert.ok(ids.length>=2);
 assert.ok(hg.advice.options.every(o=>o.kind==='catalog'&&!o.approvedPrice));
});
check('Conflicting source rows (HT06, HT13) are never proposed',()=>{
 for(const t of ['Ha Long 2 days overnight cruise','Sapa and Ha Long 6 days','Cat Ba 2 days','Ha Giang 4 days'])
  for(const o of run([t]).advice.options)assert.ok(!['HT06','HT13'].includes(o.id),t);
});
check('"Yes" confirms only the asked option; "maybe Ha Long" is interest, not a booking',()=>{
 const asked='We can check the Ninh Binh tour for you. Would you like us to check the limousine class for 26 October?';
 const r=run(['Ninh Binh 26 October, 2 adults.','Yes please'],{lastOutgoing:asked});
 assert.ok(r.advice.intent.intents.includes('confirm'));
 assert.match(r.advice.intent.confirms.target,/limousine class/);
 assert.match(r.advice.internal.join(' '),/Chỉ xác nhận đúng nội dung câu đó/);
 assert.ok(!r.advice.intent.intents.includes('book'));
 const m=run(['Maybe we can go to Ha Long.']);
 assert.equal(m.advice.status,'interested');
 assert.ok(m.advice.intent.intents.includes('interest'));assert.ok(!m.advice.intent.intents.includes('book'));
 assert.match(m.advice.internal.join(' '),/chưa phải quyết định/);
 const b=readIntent('We want to book the Ninh Binh tour.');
 assert.match(b.notes.join(' '),/CRABS chưa đặt/);
});
check('Suites booking: catalog stays internal; nothing guest-facing',()=>{
 const r=run(['Ninh Binh day tour on 26 October for 2 adults?'],{property:'luxe-suites'});
 assert.equal(r.paragraph,'');assert.match(r.advice.internal.join(' '),/nguồn 75PHT/);
});
check('Vietnamese guest gets Vietnamese text, no amounts or internal codes',()=>{
 const r=run(['Mình muốn đi Ninh Bình ngày 26/10, 2 người lớn, giá bao nhiêu?'],{vi:true});
 assert.match(r.paragraph,/Ninh Bình|Hang Múa|Tràng An/);
 assert.doesNotMatch(r.paragraph,money);assert.doesNotMatch(r.paragraph,/R75-|NB0\d|docs\.google/);
 assert.equal(r.advice.priceAsked,true);
});
console.log(JSON.stringify({passed,scope:'advice scenarios: re-ask, half-day, kids, price status, intent, transport, variants, conflicts, property, language'}));
