import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
// Synthetic messages only. Checks the two reply branches, WhatsApp extraction, presentation masking
// and quote products driven by lib/hotel-policy-config.json.
mkdirSync('.quote-tests/services',{recursive:true});
await build({entryPoints:['lib/service-replies.ts','lib/hotel-policy-config.ts','lib/guest-contact.ts','lib/tour-advice.ts','lib/ota-templates.ts','lib/quote-sources.ts','lib/quotes.ts'],outdir:'.quote-tests/services',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},loader:{'.json':'json'}});
const sr=await import('../.quote-tests/services/service-replies.mjs');
const cfg=await import('../.quote-tests/services/hotel-policy-config.mjs');
const gc=await import('../.quote-tests/services/guest-contact.mjs');
const ta=await import('../.quote-tests/services/tour-advice.mjs');
const tpl=await import('../.quote-tests/services/ota-templates.mjs');
const qs=await import('../.quote-tests/services/quote-sources.mjs');
const q=await import('../.quote-tests/services/quotes.mjs');
let passed=0;const check=(name,fn)=>{fn();passed++;console.log('PASS '+name);};
const P='luxe-75pht',S='luxe-suites';
const reply=(text,o={})=>sr.serviceReply({propertyId:P,text,facts:[],vi:false,tourInterested:false,hasContact:false,...o});

check('Branch 1 · airport pick-up states approved prices and picks the car for the party',()=>{
 const r=reply('We are 2 adults with 2 suitcases. Could you arrange an airport pickup from Noi Bai?');
 assert.ok(r.needs.includes('transfer'));
 const t=r.transferParagraph;assert.match(t,/400,000 VND/);assert.match(t,/500,000 VND/);assert.match(t,/800,000 VND/);
 assert.doesNotMatch(t,/300,000 VND/,'drop-off prices only when asked');
 assert.match(t,/4-seat car fits/);assert.match(t,/reply here to confirm/);
 assert.deepEqual(ta.guestDraftProblems(t,{facts:[],allowedAmounts:cfg.approvedAmounts(P)}).filter(p=>p.hard),[]);
});
check('Branch 1 · unapproved property gets no prices and an internal note',()=>{
 const r=sr.serviceReply({propertyId:S,text:'Do you offer an airport transfer?',facts:[],vi:false,tourInterested:false,hasContact:false});
 assert.doesNotMatch(r.paragraphs.join(' '),/\d{3},\d{3}/);assert.match(r.internal.join(' '),/chưa được duyệt/);
 assert.deepEqual(cfg.approvedAmounts(S),[]);
});
check('Branch 1 · declined transfer is never offered again',()=>{
 const facts=[{category:'pickup',status:'declined',summary:'x',sources:[{eventId:'1',quote:'no'}]},{category:'dropoff',status:'declined',summary:'x',sources:[{eventId:'1',quote:'no'}]}];
 assert.ok(!reply('Is there an airport transfer?',{facts}).needs.includes('transfer'));
});
check('Branch 1 · early check-in and late check-out follow the policy, without amounts',()=>{
 const r=reply('Can we have an early check-in? And a late check-out on the last day?');
 const text=r.paragraphs.join(' ');
 assert.match(text,/from 14:00/);assert.match(text,/09:00 and 14:00/);assert.match(text,/until 16:00/);assert.match(text,/50% of the nightly room rate plus tax/);
 assert.deepEqual(ta.guestDraftProblems(text,{facts:[]}).filter(p=>p.hard),[]);
 const vi=sr.serviceReply({propertyId:P,text:'Cho mình nhận phòng sớm được không?',facts:[],vi:true,tourInterested:false,hasContact:false});
 assert.match(vi.paragraphs.join(' '),/Nhận phòng sớm từ 09:00 đến 14:00/);
});
check('Branch 1 · spa without approved prices promises a price list, not numbers',()=>{
 const r=reply('Do you have a massage or spa?');assert.ok(r.needs.includes('spa'));
 assert.doesNotMatch(r.paragraphs.join(' '),/VND|đ\b/);assert.match(r.internal.join(' '),/Spa/);
});
check('No service offers in a complaint',()=>{assert.deepEqual(reply('I want to complain about the noise; also is there an airport car?').paragraphs,[]);});
check('Branch 2 · tour interest asks for WhatsApp, or uses the number already given',()=>{
 const ask=reply('Any Ha Long tours?',{tourInterested:true,tourPlaces:['vịnh Hạ Long']});
 assert.match(ask.paragraphs.join(' '),/share your WhatsApp number\?/);assert.doesNotMatch(ask.paragraphs.join(' '),/VND/,'unapproved tour prices stay out');
 assert.match(ask.internal.join(' '),/Chưa có khoảng giá tour được duyệt/);
 const known=reply('Any Ha Long tours?',{tourInterested:true,hasContact:true});assert.match(known.paragraphs.join(' '),/WhatsApp number you shared/);assert.doesNotMatch(known.paragraphs.join(' '),/\?/);
});
check('WhatsApp number is read from guest text only, in international form',()=>{
 const c=gc.guestContact(['Hello','Please message me on WhatsApp: +1 202 555 0143 for the tour details.']);
 assert.equal(c.whatsapp,'12025550143');assert.match(gc.whatsappLink(c,'Hi there'),/^https:\/\/wa\.me\/12025550143\?text=Hi%20there$/);
 assert.equal(gc.guestContact(['Booking number 5900000001, arriving 14:00.']),null);
 assert.equal(gc.guestContact(['My phone is 0912 345 678']).whatsapp,'84912345678');
});
check('Presentation mode masks property names only when switched on',()=>{
 const text='Property name: Luxe Paradise Premium Pham Hong Thai Hotel & Spa';
 assert.equal(cfg.maskText(text,false),text);
 const masked=cfg.maskText(text,true);assert.doesNotMatch(masked,/Luxe|Pham Hong Thai/);assert.match(masked,/Demo Riverside Hotel/);
 assert.equal(cfg.propertyName(S,'',true),'Demo Garden Suites');
});
check('Template with {{service_info}} renders approved prices without tripping the price guard',()=>{
 const service=reply('Can you arrange an airport pickup for 2 adults?').paragraphs.join('\n\n');
 const t={id:'t',version:1,title:'Airport',body:'Dear {{guest_name}}, thank you for your message.\n\n{{service_info}}\n\nBest regards',situations:['transfer_interest'],properties:[P],channels:[],language:'en',approved_at:'2026-10-19',approved_by:'o',source_thread:'',source_revision:0,retired_at:null};
 const f={thread:{id:'x',property_id:P,channel:'booking',booking_id:'5990000001'},events:[{id:'e1',guest_text:'Can you arrange an airport pickup for 2 adults?',received:'2026-10-19T01:00:00Z',kind:'guest',guest_name:'Synthetic Guest'}],sent:[],serviceInfo:service};
 const r=tpl.renderTemplate(t,f);assert.deepEqual(r.problems,[]);assert.match(r.body,/400,000 VND/);
 assert.ok(tpl.templateProblems({body:t.body,situations:['spa','transfer_interest'],properties:[P],channels:[]}).length===0);
});
check('Quote catalog: hotel services listed; incomplete ones stay reference-only',()=>{
 const car=qs.quoteProducts.find(p=>p.id==='HS-luxe-75pht-car4-pickup');assert.equal(car.price,400000);
 assert.equal(qs.isSourceProduct(car.id),true,'cost/commission missing → cannot be approved yet');
 const spa=qs.quoteProducts.find(p=>p.id==='HS-luxe-75pht-spa-trad-60');assert.ok(spa);assert.equal(spa.price,null);
 assert.ok(qs.quoteProducts.some(p=>p.id==='HS-luxe-75pht-tour-hl-day'));
 const payload={lines:[{productId:car.id,title:car.title,unit:car.unit,supplier:car.supplier,kind:'transfer',date:'2026-12-01',quantity:1,passengers:2,price:400000,cost:300000,commission:20000,extraCost:0,discount:0,details:'Synthetic flight, 2 bags'}],validUntil:'2026-11-30',conditions:'Synthetic test terms only.',missing:'',childrenPolicy:'',demoPriceConfirmed:true,contactVersion:1,contactName:'Synthetic',contactDate:'',children:''};
 assert.match(q.approvalIssues(payload,'2026-10-19').join(' '),/chưa đủ cấu hình/);
 assert.equal(q.totals(payload.lines).profit,80000);
});
check('WhatsApp tour message: programme and classes first, no price, no re-asked date, one question',()=>{
 const text='We are interested in a Ninh Binh day trip on 24 October for 2 adults. Please message me on WhatsApp: +1 202 555 0143.';
 const a=ta.tourAdvice({propertyId:P,facts:[],text,latestText:text,stayStart:'2026-10-23'});
 const m=sr.whatsappTourMessage(a,'Synthetic Guest',false);
 assert.match(m,/Hoa Lu/);assert.match(m,/24 October, 2 adults/);
 assert.match(m,/1\. Standard – 29\/35-seat coach, buffet lunch/);assert.match(m,/4\. Luxury/);
 assert.doesNotMatch(m,/\d{1,3}[.,]\d{3}|VND|đ\b|USD/);assert.doesNotMatch(m,/which date|what date|how many/i);
 assert.equal((m.match(/\?/g)||[]).length,1);
 assert.deepEqual(ta.guestDraftProblems(m,{facts:[],advice:a}).filter(p=>p.hard),[]);
 const vi=sr.whatsappTourMessage(a,'Khách',true);assert.match(vi,/Tiêu chuẩn · xe 29\/35 ghế/);assert.match(vi,/phương án nào\?/);
});
await build({entryPoints:['lib/conversation-sim.ts','lib/guest-keypoints.ts','lib/ota-profile.ts'],outdir:'.quote-tests/services',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},loader:{'.json':'json'}});
const sim=await import('../.quote-tests/services/conversation-sim.mjs');
const kp=await import('../.quote-tests/services/guest-keypoints.mjs');
const prof=await import('../.quote-tests/services/ota-profile.mjs');
// Synthetic in-stay conversation (anniversary surprise, bathtub, pay at hotel, extension, thanks).
const at=(d,h,m)=>`2026-10-${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00.000Z`;
const conv=[['m1',at(10,2,0),'Hi, do you arrange anniversary surprises? Also is there a room with a bathtub?'],['m2',at(11,3,0),'We will arrive at the hotel around 4pm. Our anniversary is on the 21st. Could you put flowers and a small cake in the room on the 21st morning while we are out? How much would it be? I can pay when I get there.'],['m3',at(11,3,4),'Please keep it a secret, my partner reads WhatsApp.'],['m4',at(11,9,0),'On Saturday after 10am please.'],['m5',at(20,8,0),'Thank you for our room, the flowers are beautiful. Can I confirm it will be the cake tomorrow?'],['m6',at(21,4,0),'We are out now, thank you'],['m7',at(21,9,0),'Could we extend our stay for another 2 nights?']].map(([id,received,guest_text])=>({id,received,guest_text,kind:'guest',guest_name:'Synthetic Guest'}));
const thread={id:'t',property_id:P,channel:'booking',booking_id:'5990000999'};
check('Simulation answers each turn in context and groups messages sent minutes apart',()=>{
 const turns=sim.simulateConversation({thread,events:conv,stay:{checkIn:'2026-10-20',checkOut:'2026-10-23',sourceId:'',conflict:false},templates:[]});
 const replies=turns.filter(t=>t.role==='hotel');assert.equal(turns.filter(t=>t.role==='guest').length,7);assert.equal(replies.length,6,'m2 and m3 answered together');
 const [r1,r2,r3,r4,r5,r6]=replies.map(r=>r.text);
 assert.match(r1,/Happy early anniversary/);assert.match(r1,/bathtub depend on availability/);
 assert.match(r2,/arrival around 16:00\. Check-in is from 14:00/);assert.match(r2,/a small cake and flowers/);assert.match(r2,/the 21st morning/);assert.match(r2,/pay at the hotel/);assert.match(r2,/surprise is still safe/);assert.match(r2,/share the number/);
 assert.doesNotMatch(r2,/Happy early/,'congratulated once, in the first turn');
 assert.match(r3,/place the surprise in your room on Saturday, after 10am/);
 assert.match(r4,/delighted you like the room/);assert.match(r4,/Noted: a small cake for the surprise/);assert.doesNotMatch(r4,/flowers/);
 assert.equal(r5,'Thank you for letting us know. Have a wonderful day!');
 assert.match(r6,/check availability for 2 more nights/);
 for(const r of replies){assert.doesNotMatch(r.text,/\d{1,3}[.,]\d{3}|VND|đ\b/);assert.doesNotMatch(r.text,/look forward to welcoming/);}
});
check('Key points summarise arrival, occasion, room, money, booking change and stay status',()=>{
 const facts=prof.ruleProfileWithHistory(conv).facts;
 const points=kp.guestKeyPoints(conv,facts),text=points.map(p=>`${p.topic}: ${p.text} ${p.day}`).join('\n');
 assert.match(text,/Giờ đến: Khoảng 16:00/);assert.match(text,/Dịp đặc biệt: Kỷ niệm: bánh nhỏ, hoa · đặt vào phòng ngày 21, thứ Bảy, sau 10am/);
 assert.match(text,/Yêu cầu phòng: Muốn phòng có bồn tắm/);assert.match(text,/Thanh toán: Muốn thanh toán tại khách sạn/);
 assert.match(text,/Đổi booking: Hỏi gia hạn thêm 2 ngày/);assert.match(text,/Liên hệ: Nhắc WhatsApp nhưng chưa để số/);assert.match(text,/Tình trạng: Khách đã nhận phòng 20\/10/);
});
check('Children and dates are not invented from English words ("be", "tomorrow")',()=>{
 const c=ta.constraintsOf('Would you be able to prepare it tomorrow? We will be there at 3pm.');assert.equal(c.children,false);assert.equal(c.date,'');
 assert.equal(ta.constraintsOf('Chúng tôi đi cùng 2 bé.').children,true);
});
await build({entryPoints:['lib/extension-quote.ts'],outdir:'.quote-tests/services',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'},loader:{'.json':'json'}});
const ext=await import('../.quote-tests/services/extension-quote.mjs');
check('Direct extension: keep booked rate, or current OTA rate minus 10%, with exact amounts in the guest text',()=>{
 const input={checkOut:'2026-10-17',nights:4,roomType:'Deluxe Double Room',bookedRate:1200000,currentRates:[1350000,1350000,1500000,1350000],discountPercent:10};
 const r=ext.extensionQuote(input);
 assert.deepEqual(r.dates,['2026-10-17','2026-10-18','2026-10-19','2026-10-20']);assert.equal(r.newCheckOut,'2026-10-21');
 assert.equal(r.keepTotal,4800000);assert.equal(r.otaTotal,5550000);assert.equal(r.otaMinusTotal,4995000);assert.equal(r.saving,555000);
 assert.equal(r.perNight[2].otaMinus,1350000);
 const keep=ext.extensionMessage(input,r,'keep',false);assert.match(keep.text,/1,200,000 VND per night, 4,800,000 VND in total for 4 nights/);assert.match(keep.text,/check-out 21\/10/);
 const minus=ext.extensionMessage(input,r,'ota_minus',false);assert.match(minus.text,/10% below the current online rate/);assert.match(minus.text,/19\/10: 1,350,000 VND/);assert.match(minus.text,/4,995,000 VND in total/);
 for(const m of [keep,minus]){assert.match(m.text,/^Subject to availability/);assert.match(m.text,/check availability and confirm with you before holding the room/);assert.doesNotMatch(m.text,/We have availability/);}
 for(const m of [keep,minus])assert.deepEqual(ta.guestDraftProblems(m.text,{facts:[],allowedAmounts:m.amounts}).filter(p=>p.hard),[],'Cua-computed amounts pass');
 assert.ok(ta.guestDraftProblems(minus.text,{facts:[]}).some(p=>p.hard),'without the recorded amounts the price is blocked');
 const vi=ext.extensionMessage({...input,currentRates:[1350000]},ext.extensionQuote({...input,currentRates:[1350000]}),'ota_minus',true);assert.match(vi.text,/1\.215\.000đ\/đêm, tổng 4\.860\.000đ cho 4 đêm/);
 assert.equal(ext.extensionMessage({...input,bookedRate:null},r,'keep',false).text,'','no booked rate, no text');
});
console.log(JSON.stringify({passed,scope:'hotel services: extranet branch, tour WhatsApp branch, contact, presentation, quote products'}));
