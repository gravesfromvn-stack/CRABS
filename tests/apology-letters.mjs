import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/apology',{recursive:true});
await build({entryPoints:{letters:'lib/apology-letters.ts',profile:'lib/ota-profile.ts',replies:'lib/service-replies.ts',tags:'lib/smart-tags.ts',advice:'lib/tour-advice.ts',cat:'lib/service-catalog.ts',policy:'lib/hotel-policy-config.ts'},outdir:'.quote-tests/apology',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const m=n=>import(`../.quote-tests/apology/${n}.mjs`);
const [letters,profile,replies,tags,advice,cat,policy]=await Promise.all(['letters','profile','replies','tags','advice','cat','policy'].map(m));
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};
const reply=(text,o={})=>{const facts=profile.ruleProfile([{id:'e1',guest_text:text,received:'2026-10-14T03:00:00Z',kind:'guest'}]);
 return replies.serviceReply({catalog:cat.seedEntries,propertyId:'luxe-75pht',text,facts,vi:false,tourInterested:false,hasContact:false,guestName:'Anna',...o});};
const hard=t=>advice.guestDraftProblems(t,{facts:[]}).filter(p=>p.hard);

check('Room issue during the stay: apology letter, 15 minutes, room change if available, no compensation',()=>{
 const r=reply('The air conditioning in our room is not working and it is very hot.');
 assert.deepEqual(r.needs,['apology_room']);assert.equal(r.paragraphs.length,1);assert.equal(r.letter,r.paragraphs[0]);
 assert.match(r.letter,/^Dear Anna,/);assert.match(r.letter,/sorry that the air conditioning in your room/);assert.match(r.letter,/technical team has been notified and will attend to it within 15 minutes/);
 assert.match(r.letter,/another room, subject to availability/);assert.match(r.letter,/Front Office Manager · /);
 assert.doesNotMatch(r.letter,/refund|discount|complimentary|free night|compensat|voucher/i,'no compensation');
 assert.doesNotMatch(r.letter,/interested in visiting|spa menu|airport/i,'no offers in an apology');
 assert.match(r.internal.join(' '),/\[SỰ CỐ PHÒNG\] điều hòa: báo Bộ phận kỹ thuật xử lý trong 15 phút/);assert.match(r.internal.join(' '),/chưa đưa bồi thường/);
});
check('Hotline is a [Cua điền] blank until the PO confirms it: blocks approval',()=>{
 const r=reply('There is no hot water in the shower.');
 assert.match(r.letter,/WhatsApp \[Cua điền: correct hotline\]/);assert.ok(hard(r.letter).length>0,'approval blocked');
 assert.match(r.internal.join(' '),/Hotline trong thư đang để trống/);
 const p=structuredClone(policy.policyFor('luxe-75pht'));p.frontDesk.letters.hotline='+84 00 000 0000';
 assert.match(letters.apologyLetter(p,{kind:'room',issue:{en:'the Wi-Fi',vi:'Wi-Fi'},team:{en:'technical team',vi:'Bộ phận kỹ thuật'},money:false},false,'Anna').body,/WhatsApp \+84 00 000 0000/);
});
check('Cleanliness and noise go to the right team; Vietnamese letter',()=>{
 assert.match(reply('The bathroom is dirty and there is a bad smell.').letter,/housekeeping team/);
 assert.match(reply('The room next door is very noisy, we cannot sleep.').letter,/the noise in your room.*reception team/s);
 const v=reply('Điều hòa phòng mình bị hỏng rồi, nóng quá.',{vi:true});
 assert.deepEqual(v.needs,['apology_room']);assert.match(v.letter,/^Chào Anna,/);assert.match(v.letter,/xin lỗi vì điều hòa trong phòng/);assert.match(v.letter,/Bộ phận kỹ thuật đã được báo và sẽ xử lý trong vòng 15 phút/);assert.match(v.letter,/Quản lý Lễ tân · /);
});
check('Unhappy stay: apology, Front Office Manager asks to speak, refund is Cua’s decision',()=>{
 const r=reply('We are very disappointed with the hotel, the reception staff were rude. We want a refund.');
 assert.deepEqual(r.needs,['apology_stay']);assert.match(r.letter,/stay did not meet your expectations, especially regarding the service from our staff\./);
 assert.match(r.letter,/Our Front Office Manager would like to speak with you personally/);assert.doesNotMatch(r.letter,/refund|discount|compensat/i);
 assert.match(r.internal.join(' '),/Khách nhắc hoàn tiền\/bồi thường\/giảm giá: Cua quyết định/);
});
check('Not an apology: a bad night elsewhere, a plain request, a cancellation only',()=>{
 const tired=reply("We had a terrible noisy night in Cat Ba and couldn't sleep. Please ensure our room is quiet.");
 assert.ok(!tired.letter);assert.ok(tired.needs.includes('care'));
 assert.ok(!reply('Could you bring two extra towels to our room?').letter);
 assert.ok(!reply('We will arrive at 14:00, please prepare a double bed.').letter);
 const c=reply('Please cancel my booking.');assert.ok(!c.letter);assert.equal(c.paragraphs.length,0);
 assert.equal(letters.detectApology('the hotel in hoi an was dirty and disappointing'),null);
});
check('Check-out day message and post-stay thanks (honest feedback, no 10/10 request)',()=>{
 const p=policy.policyFor('luxe-75pht');
 const c=letters.checkoutDayMessage(p,false,'Anna');
 assert.match(c,/^Good morning Anna/);assert.match(c,new RegExp(`check-out is by ${p.checkOut} today`));assert.match(c,/late check-out until 16:00 is available at 50% of the nightly room rate plus tax, subject to room availability/);
 assert.match(c,/store your luggage free of charge/);assert.match(c,/private car to the airport/);assert.deepEqual(hard(c),[]);
 assert.match(letters.checkoutDayMessage(p,true,''),/^Chào buổi sáng bạn.*trả phòng muộn đến 16:00/s);
 const t=letters.thanksAfterStay(p,false,'Anna');assert.match(t,/honest feedback/);assert.doesNotMatch(t,/10\/10|10 out of 10|review/i);assert.deepEqual(hard(t),[]);
});
check('Front desk: room problem is urgent with a 15-minute note; unhappy stay note',()=>{
 const tg=tags.smartTags([{text:'The toilet is leaking in our room.',at:'2026-10-14T03:00:00Z'}],{});
 const codes=tg.tags.map(x=>x.code);assert.ok(codes.includes('TAG_URGENT'));assert.ok(codes.includes('TAG_COMPLAINT'));
 assert.match(tg.notes.join(' '),/\[SỰ CỐ PHÒNG\] phòng tắm: báo Bộ phận kỹ thuật xử lý trong 15 phút/);
 assert.match(tags.smartTags([{text:'Honestly we are not happy with this hotel.',at:'2026-10-14T03:00:00Z'}],{}).notes.join(' '),/\[KHÁCH KHÔNG HÀI LÒNG\]/);
});
console.log(JSON.stringify({passed,scope:'apology letters (room issue, unhappy stay), check-out day, post-stay thanks, front-desk notes'}));
