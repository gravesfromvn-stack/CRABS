import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/frontdesk',{recursive:true});
await build({entryPoints:{profile:'lib/ota-profile.ts',replies:'lib/service-replies.ts',tags:'lib/smart-tags.ts',timing:'lib/arrival-timing.ts',lang:'lib/reply-language.ts',translate:'lib/translate.ts',requests:'lib/service-requests.ts',advice:'lib/tour-advice.ts',cat:'lib/service-catalog.ts'},outdir:'.quote-tests/frontdesk',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const m=n=>import(`../.quote-tests/frontdesk/${n}.mjs`);
const [profile,replies,tags,timing,lang,translate,requests,advice,cat]=await Promise.all(['profile','replies','tags','timing','lang','translate','requests','advice','cat'].map(m));
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};

// Synthetic messages modelled on the eight cases (no guest data).
const reply=(text,o)=>{const facts=profile.ruleProfile([{id:'e1',guest_text:text,received:o.sentAt,kind:'guest'}]);
 const r=replies.serviceReply({catalog:cat.seedEntries,propertyId:o.property||'luxe-75pht',text,facts,vi:o.vi||false,tourInterested:false,hasContact:!!o.hasContact,guestName:o.guestName,stay:o.stay,sentAt:o.sentAt,history:o.history});
 return {...r,text:r.paragraphs.join('\n\n')};};
const tagsOf=(msgs,stay)=>tags.smartTags(msgs.map(([text,at])=>({text,at})),stay);
const codes=t=>t.tags.map(x=>x.code);

check('#079 · coming overland from Sapa at 3 am inside the booked night: 24/7 reception, room held, no airport pick-up, onward offer',()=>{
 const t='Hi, I am in Sapa now and I will take a bus to hanoi very late and I may reach to hanoi 3 am or after. So can I still check in at this time?';
 const o={sentAt:'2026-10-14T07:17:58Z',stay:{checkIn:'2026-10-14',checkOut:'2026-10-15'}};
 assert.equal(timing.arrivalTiming({text:t,sentAt:o.sentAt,checkIn:o.stay.checkIn}).kind,'night');
 const r=reply(t,o);assert.match(r.text,/open 24\/7/);assert.match(r.text,/room is held for your booking/);assert.match(r.text,/interested in visiting Ha Long Bay, Ninh Binh, or Ha Giang during your stay\? .*as well as airport drop-off and car transfers to other provinces/);
 assert.doesNotMatch(r.text,/pick-up|Airport pick/i);assert.doesNotMatch(r.text,/early check-in/i);
 const tg=tagsOf([[t,o.sentAt]],o.stay);assert.ok(codes(tg).includes('TAG_URGENT'));assert.match(tg.notes.join(' '),/\[ĐẾN KHUYA\].*03:00.*Sapa/);
 assert.equal(advice.tourAdvice({propertyId:'luxe-75pht',facts:[],text:t}).status,'none','Sapa is the origin, not a tour');
});
check('#196 · landing at 5 in the morning on the check-in day: two options, free luggage, plans question',()=>{
 const t='because my airplane arrives at 5 in the\nmorning , is there any chance that I might get in the room a little earlier? Or if you can keep my luggages for this hours so I don’t carry them around?';
 const r=reply(t,{property:'luxe-suites',sentAt:'2026-10-13T05:50:30Z',stay:{checkIn:'2026-10-15',checkOut:'2026-10-16'}});
 assert.ok(r.needs.includes('early_options'));assert.match(r.text,/1\. Room ready on arrival: book the previous night/);assert.match(r.text,/2\. Flexible and economical: early check-in from 09:00 .*50% .*complimentary buffet breakfast/);
 assert.match(r.text,/store your luggage free of charge at reception 24\/7, use the lobby restroom/);assert.match(r.text,/interested in visiting Ha Long Bay, Ninh Binh, Sapa, or Ha Giang/);
 assert.equal((r.text.match(/store your luggage/g)||[]).length,1,'luggage once');
});
check('#001 · booked on behalf, wants to pay in advance: no card in chat, secure link via WhatsApp, billing tag and hand-off',()=>{
 const first='Hello, I have made this booking on behalf of my client. Can I please provide credit card [identifier removed], to avoid him paying when he is there?';
 const r1=reply(first,{sentAt:'2026-10-12T22:12:29Z',stay:{checkIn:'2026-11-16',checkOut:'2026-11-24'}});
 assert.ok(r1.needs.includes('billing'));assert.match(r1.text,/please do not send card details in this chat/);assert.match(r1.text,/share your WhatsApp number/);
 const r2=reply('Thank you, please message me on [phone P-0000]',{sentAt:'2026-10-14T02:54:16Z',stay:{checkIn:'2026-11-16',checkOut:'2026-11-24'},history:first});
 assert.match(r2.text,/contact you shortly on the WhatsApp number you shared/);
 const tg=tagsOf([[first,'2026-10-12T22:12:29Z']],{checkIn:'2026-11-16'});assert.ok(codes(tg).includes('TAG_BILLING'));assert.match(tg.notes.join(' '),/\[THANH TOÁN HỘ\]/);
 const asks=requests.detectAsks({sourceKey:'k',checkIn:'2026-11-16',checkOut:'2026-11-24',messages:[{id:'1',body:first,at:'1'}]});assert.ok(asks.some(a=>/^\[THANH TOÁN HỘ\]/.test(a.title)&&a.guestDecision==='interested'));
});
check('#057 · arrival 17:00 today and an e-invoice request: details asked, accounting hand-off',()=>{
 const r1=reply('Hello.\nWe expect to arrive about 5pm today.',{property:'luxe-suites',sentAt:'2026-10-12T00:19:08Z',stay:{checkIn:'2026-10-12',checkOut:'2026-10-13'}});assert.match(r1.text,/arrival around 17:00/);
 const t='Hello, I’d like to request an invoice be sent to my email when I check out. Thank you!';
 const r2=reply(t,{property:'luxe-suites',sentAt:'2026-10-14T01:31:10Z',stay:{checkIn:'2026-10-12',checkOut:'2026-10-13'}});
 assert.match(r2.text,/issue an electronic invoice and send it by email.*company name, tax code, address and the email address/);
 const tg=tagsOf([[t,'2026-10-14T01:31:10Z']],{});assert.ok(codes(tg).includes('TAG_BILLING'));assert.match(tg.notes.join(' '),/\[HÓA ĐƠN VAT\].*Kế toán/);
 assert.ok(requests.detectAsks({sourceKey:'k',checkIn:'',checkOut:'2026-10-13',messages:[{id:'1',body:t,at:'1'}]}).some(a=>/^\[HÓA ĐƠN VAT\]/.test(a.title)));
});
check('#030 · reply in the guest’s language (Hebrew, Russian, French, Japanese…)',()=>{
 assert.equal(translate.detectLanguage('סביב שעה 14:00'),'he');
 const he=lang.localizedFromNeeds('he',['arrival'],{time:'14:00',checkIn:'14:00',night:false});assert.match(he,/^שלום/);assert.match(he,/14:00/);assert.doesNotMatch(he,/[A-Za-z]{4,}/,'no English words');
 const ru=lang.localizedArrivalReply('ru',{time:'13:00',checkIn:'14:00',kind:'arrival'});assert.match(ru,/около 13:00/);assert.match(ru,/багаж/,'early arrival courtesy');
 for(const l of ['fr','es','de','zh','ja','ko'])assert.ok(lang.localizedArrivalReply(l,{time:'03:00',checkIn:'14:00',kind:'night'}),l);
 assert.equal(lang.localizedFromNeeds('fr',['arrival','transfer'],{time:'14:00',checkIn:'14:00',night:false}),null,'other requests stay in English');
 const f=profile.ruleProfile([{id:'1',guest_text:'סביב שעה 14:00',received:'2026-10-13T22:53:00Z',kind:'guest'}]);assert.ok(f.some(x=>x.category==='arrival'));
});
check('#014 · same-day check-in arriving after dinner: urgent tag and front-desk note, Vietnamese reply',()=>{
 const t='Chào bạn, 2 khách bên mình từ Thanh Hóa ra Hà Nội muộn hơn dự kiến, hiện đang ăn tối gần khách sạn. Sau khi ăn xong họ sẽ qua nhận phòng ngay.';
 const o={property:'luxe-suites',vi:true,sentAt:'2026-10-13T13:06:09Z',stay:{checkIn:'2026-10-13',checkOut:'2026-10-14'}};
 const r=reply(t,o);assert.match(r.text,/mở cửa 24\/7/);assert.match(r.text,/Phòng của bạn được giữ/);assert.doesNotMatch(r.text,/xe đón/);
 const tg=tagsOf([[t,o.sentAt]],o.stay);assert.ok(codes(tg).includes('TAG_URGENT'));assert.match(tg.notes.join(' '),/\[ĐẾN MUỘN CÙNG NGÀY\].*thẻ phòng/);
});
check('#078 · twin booked by mistake → double bed, anniversary today: special-request tag and hand-off',()=>{
 const t='Hello we will arrive approx at 16 or 17h. When i booked the hotel i think i made a mistake and took 2 separate beds, but im with my boyfriend and id like one double bed please. Also, its our anniversary today, is there anything you can do in the room like a flower or something please ?';
 const o={property:'luxe-suites',sentAt:'2026-10-13T06:12:11Z',stay:{checkIn:'2026-10-13',checkOut:'2026-10-14'}};
 const r=reply(t,o);assert.ok(r.needs.includes('bed_change'));assert.match(r.text,/one double bed instead of two separate beds/);assert.match(r.text,/Happy anniversary!/);assert.doesNotMatch(r.text,/early anniversary/);
 const tg=tagsOf([[t,o.sentAt]],o.stay);assert.ok(codes(tg).includes('TAG_SPECIAL_REQUEST'));assert.match(tg.notes.join(' '),/\[KỶ NIỆM & ĐỔI GIƯỜNG\].*Double.*không xếp Twin/);
 const ping=reply('Hello did you receive my message ?',o);assert.match(ping.text,/we have received your messages/);
});
check('#210 · tired guest from Cat Ba asking for a quiet non-smoking room: VIP care, no tour, no complaint',()=>{
 const t1='am currently in cat ba and should be with you by 7pm';
 const t2='could I please have a quiet non smoking room as I am a very light sleeper and have just spent two on Cat Ba in not the best of hotels that had no sound proofing between rooms. Next to me was a Very unhappy child who cried nearly all night so I haven\'t slept much. I\'m very tired.';
 const o={sentAt:'2026-10-14T03:45:49Z',stay:{checkIn:'2026-10-14',checkOut:'2026-10-15'}};
 assert.match(reply(t1,{...o,sentAt:'2026-10-14T03:18:01Z'}).text,/arrival around 19:00/);
 const r=reply(t2,o);assert.ok(r.needs.includes('care'));assert.match(r.text,/tiring, sleepless journey from Cat Ba\. Please rest assured that we will prioritise a quiet, fresh and tranquil room for you \(non-smoking\)/);assert.ok(r.needs.includes('spa_recovery'));assert.doesNotMatch(r.text,/\btours?\b|children|interested in visiting/i);
 const tg=tagsOf([[t1,'2026-10-14T03:18:01Z'],[t2,o.sentAt]],o.stay);assert.ok(codes(tg).includes('TAG_VIP_CARE'));assert.ok(!codes(tg).includes('TAG_COMPLAINT'),'another hotel is not a complaint about us');
 assert.equal(advice.tourAdvice({propertyId:'luxe-75pht',facts:[],text:t1+'\n'+t2}).status,'none');
});
check('Car confirmation has no blanks: meeting pillar by terminal and the hotline; quoted 400k kept with the difference noted',()=>{
 const t='I would like to book the 4-seater airport pick-up for 400,000 VND tomorrow, Friday 2 October.\nFlight: Vietnam Airlines VN166\nRoute: Da Nang → Hanoi\nArrival time: 1:00 pm at Noi Bai International Airport';
 const r=reply(t,{sentAt:'2026-10-01T10:21:31Z',stay:{checkIn:'2026-10-02',checkOut:'2026-10-09'},guestName:'Guest 0161'});
 assert.doesNotMatch(r.text,/Cua điền/);assert.match(r.text,/Terminal 1 \(domestic\), pillar no\. 9/);assert.match(r.text,/WhatsApp \+84 90 224 8388/);
 assert.match(r.internal.join(' '),/Giữ giá 400\.000đ đã báo.*chênh lệch 50\.000đ/);
 const intl=reply(t.replace('Da Nang → Hanoi','Singapore → Hanoi'),{sentAt:'2026-10-01T10:21:31Z',stay:{checkIn:'2026-10-02'}});assert.match(intl.text,/Terminal 2 \(international\), pillar no\. 10 or 11/);
 assert.deepEqual(advice.guestDraftProblems(r.text,{facts:[],allowedAmounts:cat.catalogApprovedAmounts(cat.seedEntries,'luxe-75pht')}).filter(p=>p.hard),[]);
});
check('Service requests in two phases: expected (asked) vs confirmed',()=>{
 assert.deepEqual(['new','quoted','accepted','dispatched','done','closed'].map(requests.phaseOf),['expected','expected','confirmed','confirmed','confirmed','closed']);
 const asks=requests.detectAsks({sourceKey:'k',checkIn:'2026-10-15',checkOut:'2026-10-16',messages:[{id:'1',body:'Can you arrange an airport pick up and a Ninh Binh tour? Also a massage.',at:'1'}]});
 assert.deepEqual(asks.map(a=>a.kind).sort(),['pickup','spa','tour']);for(const a of asks)assert.equal(a.guestDecision,'interested');
 assert.ok(requests.isServiceTask({kind:'other',title:'[HÓA ĐƠN VAT] Xuất hóa đơn'}));assert.ok(!requests.isServiceTask({kind:'room',title:'Phòng yên tĩnh'}));
});
console.log(JSON.stringify({passed,scope:'front-desk cases #079 #196 #001 #057 #030 #014 #078 #210, smart tags, airport meeting points, service phases'}));
