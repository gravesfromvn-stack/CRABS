import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/requests',{recursive:true});
await build({entryPoints:{origin:'lib/guest-origin.ts',profile:'lib/ota-profile.ts',advice:'lib/tour-advice.ts',replies:'lib/service-replies.ts',confirm:'lib/transfer-confirm.ts',requests:'lib/service-requests.ts',ops:'lib/operations.ts',cat:'lib/service-catalog.ts'},outdir:'.quote-tests/requests',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const m=n=>import(`../.quote-tests/requests/${n}.mjs`);
const [origin,profile,advice,replies,confirm,requests,ops,cat]=await Promise.all(['origin','profile','advice','replies','confirm','requests','ops','cat'].map(m));
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};

// Synthetic messages modelled on the real cases (no guest data).
const c129='Hello, we will be arriving at the Hotel from Halong Bay directly on Oct 15th. Please confirm that we will have twin beds in our room with a nice large window as shown in the photographs. I understand breakfast is included in the costs. Also we will leave for the airport at 430pm on 16th, so I hope you can give us a late check out at 2pm and then we can store our luggage in the hotel before we leave for airport. Can you arrange an airport transfer for us?';
const ev=(text,i=0)=>({id:'e'+i,guest_text:text,received:`2026-10-13T0${i}:00:00Z`,kind:'guest'});
const facts=t=>profile.ruleProfile([ev(t)]);
const reply=(text,o={})=>replies.serviceReply({propertyId:'luxe-75pht',text,facts:facts(text),vi:false,tourInterested:false,hasContact:false,...o});

check('A place the guest comes FROM is not a tour request; a place to visit still is',()=>{
 const n=profile.normalize(c129);assert.deepEqual(origin.travelOrigins(n),['halong bay']);assert.doesNotMatch(origin.withoutOrigins(n),/halong/);
 assert.ok(origin.travelOrigins(profile.normalize('Route: Da Nang → Hanoi')).includes('da nang'));
 for(const t of ['We would like to visit Ha Long Bay on the 16th','Can you recommend a day trip from Hanoi to Ha Long?'])assert.equal(advice.tourAdvice({propertyId:'luxe-75pht',facts:facts(t),text:t}).status,'interested',t);
 const a=advice.tourAdvice({propertyId:'luxe-75pht',facts:facts(c129),text:c129});
 assert.equal(a.status,'none');assert.deepEqual(a.destinations,[]);assert.ok(a.origins.includes('halong bay'));
 assert.ok(!facts(c129).some(f=>f.category==='itinerary'),'no itinerary fact');
});
check('"Airport transfer" after "leave for the airport" is a drop-off only, at the time the guest gave',()=>{
 const f=facts(c129);assert.ok(f.some(x=>x.category==='dropoff'));assert.ok(!f.some(x=>x.category==='pickup'),'no pickup');
 assert.deepEqual(profile.clockTimes('at 430pm on 16th'),['16:30']);
});
check('#129 reply answers every point in order and never offers a Ha Long tour',()=>{
 const r=reply(c129);for(const need of ['room_pref','breakfast','late_checkout','luggage','transfer'])assert.ok(r.needs.includes(need),need);
 const text=r.paragraphs.join('\n\n');assert.doesNotMatch(text,/ha ?long|cruise|tour/i);
 assert.match(text,/twin beds and a room with a large window/);assert.match(text,/check out at 14:00/);assert.match(text,/store your luggage free of charge/);
 assert.match(text,/car to the airport at 16:30/);assert.match(text,/Airport drop-off:/);assert.doesNotMatch(text,/Airport pick-up:/);assert.match(text,/how many guests and pieces of luggage/);
 const at=re=>text.search(re);assert.ok(at(/twin beds/)<at(/Breakfast/)&&at(/Breakfast/)<at(/check out at 14:00/)&&at(/check out at 14:00/)<at(/store your luggage/)&&at(/store your luggage/)<at(/car to the airport/),'stay order');
 const pay=reply('Also we would like to pay in vnd at our checkout from hotel. Pl do not charge my card.');assert.ok(pay.needs.includes('payment'));assert.match(pay.paragraphs.join(' '),/pay in VND at check-out/);
 assert.ok(reply('I would like to request an invoice be sent to my email when I check out.').needs.includes('invoice'));
});
check('Arrival time in another language: thanks, check-in 14:00, early only if the room is ready',()=>{
 const t='Здравствуйте ✨\nВремя прибытия 13:00';const f=facts(t);assert.equal(f.find(x=>x.category==='arrival')?.category,'arrival');
 const r=replies.serviceReply({propertyId:'luxe-suites',text:t,facts:f,vi:false,tourInterested:false,hasContact:false});const text=r.paragraphs.join(' ');
 assert.match(text,/arrival around 13:00; standard check-in is from 14:00/);assert.match(text,/If your room is ready when you arrive/);assert.match(text,/lobby restroom/);
 assert.match(r.internal.join(' '),/50%/,'guaranteed early check-in fee stays internal');
});
const c172='Hi Guest,\nThank you! I would like to book the 4-seater airport pick-up for\n400,000 VND tomorrow, Friday 2 October.\nMy flight details are:\nPassenger: Guest 0161 & Sample Holland\nFlight: Vietnam Airlines VN166\nRoute: Da Nang → Hanoi\nArrival time: 1:00 pm at Noi Bai International Airport';
check('Car confirmation is read back in full with meeting point and hotline; blanks would block approval',()=>{
 const c=confirm.transferConfirmation(c172);
 assert.deepEqual({...c},{direction:'pickup',flight:'VN166',route:'Da Nang → Hanoi',date:'2 Oct',time:'13:00',seats:4,price:400000,terminal:'T1'});
 assert.deepEqual(confirm.flightUpdate('Hello, just to let you know our flight has been delayed and is now set to arrive at 3:25'),{time:'15:25'});
 const r=replies.serviceReply({catalog:cat.seedEntries,propertyId:'luxe-75pht',text:c172,facts:[],vi:false,tourInterested:false,hasContact:false,guestName:'Guest 0161'});
 assert.ok(r.needs.includes('confirm_transfer'));assert.ok(!r.needs.includes('transfer'),'no price list again');
 const text=r.paragraphs.join('\n');assert.match(text,/Guest 0161/);assert.doesNotMatch(text,/Holland/);assert.match(text,/VN166 \(Da Nang → Hanoi\), landing around 13:00 on 2 Oct/);assert.match(text,/Terminal 1 \(domestic\)/);
 assert.deepEqual(advice.guestDraftProblems(text,{facts:[],allowedAmounts:[400000]}).filter(p=>p.hard),[],'no blanks left');assert.ok(advice.guestDraftProblems('Meet at [Cua điền: số cột]',{facts:[]}).some(p=>p.hard&&/cần điền/.test(p.text)),'blanks still block approval');
 assert.match(r.internal.join(' '),/Giữ giá 400\.000đ đã báo cho khách \(quy tắc PO 20\/10\); chênh lệch 50\.000đ so với giá xe 4 chỗ đang duyệt 350\.000đ/,'quoted price kept, difference noted');assert.match(r.internal.join(' '),/Tạo yêu cầu dịch vụ/);
});
check('Service request from the conversation: accepted with evidence, latest flight time, stages and CSV',()=>{
 const src={sourceKey:'k1',checkIn:'2026-10-02',checkOut:'2026-10-09'};
 const t=requests.suggestServiceRequest(src,[{body:c172,at:'1'},{body:'Our flight has been delayed and is now set to arrive at 3:25',at:'2'}]);
 assert.equal(t.kind,'pickup');assert.equal(t.serviceDate,'2026-10-02');assert.equal(t.serviceTime,'15:25');assert.equal(t.flightCode,'VN166');assert.equal(t.priceVnd,400000);
 assert.equal(t.guestDecision,'accepted');assert.match(t.guestEvidence,/^Khách nhắn: /);assert.equal(t.supplierStatus,'unchecked');
 assert.ok(ops.operationInput.safeParse(t).success,'valid operations task');
 const st=x=>requests.serviceStage({state:'open',guestDecision:'unknown',supplierStatus:'unchecked',priceVnd:null,...x});
 assert.deepEqual([st({}),st({priceVnd:300000}),st({guestDecision:'accepted'}),st({guestDecision:'accepted',supplierStatus:'confirmed'}),st({state:'done'}),st({guestDecision:'declined'})],['new','quoted','accepted','dispatched','done','closed']);
 const csv=requests.airportCsv([{...t,id:'t1',sourceKind:'ota',sourceId:'th1',version:1,updated:'',stale:false}],[{kind:'ota',id:'th1',name:'Guest 0161',bookingId:'8800000172',propertyLabel:'Demo'}]);
 assert.match(csv,/^﻿Ngày,Giờ,Chiều,Khách/);assert.match(csv,/2026-10-02,15:25,Đón,Guest 0161,8800000172,Demo,VN166,Xe 4 chỗ,400000,Khách đã chốt,Có,Chưa/);
 const {flightCode:_f,carType:_c,priceVnd:_p,...older}=t;const parsed=ops.operationInput.safeParse(older);
 assert.ok(parsed.success,'tasks saved before the new fields still validate');assert.deepEqual([parsed.data.flightCode,parsed.data.carType,parsed.data.priceVnd],['','',null]);
});
console.log(JSON.stringify({passed,scope:'guest messages: origin vs tour, multi-intent replies, arrival time, car confirmation, service requests'}));
