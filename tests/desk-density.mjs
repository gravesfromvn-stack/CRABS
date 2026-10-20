import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/density',{recursive:true});
// Synthetic texts only: draft summary line, list-row tag priority, ETA desk order.
await build({entryPoints:{sum:'lib/draft-summary.ts',fd:'lib/front-desk.ts',tags:'lib/smart-tags.ts',letters:'lib/apology-letters.ts',policy:'lib/hotel-policy-config.ts',cat:'lib/service-catalog.ts',replies:'lib/service-replies.ts',profile:'lib/ota-profile.ts',lang:'lib/reply-language.ts'},outdir:'.quote-tests/density',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const m=n=>import(`../.quote-tests/density/${n}.mjs`);
const [sum,fd,tags,letters,policy,cat,replies,profile,lang]=await Promise.all(['sum','fd','tags','letters','policy','cat','replies','profile','lang'].map(m));
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};
const p75=cat.catalogPolicy(policy.policyFor('luxe-75pht'),cat.seedEntries,'luxe-75pht');
const reply=(text,o={})=>{const facts=profile.ruleProfile([{id:'e1',guest_text:text,received:'2026-10-14T03:00:00Z',kind:'guest'}]);return replies.serviceReply({catalog:cat.seedEntries,propertyId:'luxe-75pht',text,facts,vi:false,tourInterested:false,hasContact:false,guestName:'Anna',...o});};
const words=s=>s.split(/\s+/).length;

check('Draft summary: one short Vietnamese line for each kind of draft',()=>{
 const s=t=>sum.draftSummary(t);
 const eta=s(fd.etaPrompt(p75,'Anna'));assert.equal(eta.text,'Hỏi giờ khách về để xếp phòng sớm + Gợi ý xe sân bay 350k/450k');assert.equal(eta.blanks,false);
 assert.match(s(letters.apologyLetter(policy.policyFor('luxe-75pht'),{kind:'room',issue:{en:'the air conditioning',vi:'điều hòa'},team:{en:'technical team',vi:'Bộ phận kỹ thuật'},money:false},false,'Anna').body).text,/^Xin lỗi sự cố phòng, xử lý trong 15 phút/);
 assert.match(s(letters.checkoutDayMessage(policy.policyFor('luxe-75pht'),false,'Anna')).text,/^Nhắc giờ trả phòng/);
 assert.match(s(fd.tourHandoffReply(false)).text,/Chuyển yêu cầu tour cho Saler/);
 const arrive=reply('We will arrive at 16:00, please prepare a double bed.');assert.match(s(arrive.paragraphs.join('\n\n')).text,/^Ghi nhận giờ đến 16:00/);
 const tired=reply("We had a terrible noisy night in Cat Ba and couldn't sleep. Please ensure our room is quiet.");assert.match(s(tired.paragraphs.join('\n\n')).text,/Hỏi thăm khách mệt, ưu tiên phòng yên tĩnh \+ Mời spa phục hồi/);
 const inv=reply('Can you issue an invoice for my company?');const it=s(inv.paragraphs.join('\n\n')).text;assert.match(it,/Xin thông tin xuất hóa đơn/);assert.doesNotMatch(it,/yêu cầu phòng/);
 for(const d of [eta.text,it])assert.ok(words(d)<=20,d);
 assert.equal(s('Meet at [Cua điền: điểm đón]').blanks,true);
 const fr=lang.localizedFromNeeds('fr',['arrival'],{time:'15:00',checkIn:'14:00',night:false,meta:{sleepy:false,origin:'',places:[],overland:false,whatsapp:'+84 896 867 575'}});assert.match(s(fr).text,/bấm Dịch/);
 assert.match(s('Hello, thanks.').text,/Cảm ơn khách|chưa nhận ra/);assert.equal(s('').text,'');
});
check('List rows: at most two tags — [COMPLAIN] first, then reception/Saler, then ETA — and +N',()=>{
 const all=tags.smartTags([{text:'The air conditioning in our room is not working. Also we want a Ha Long tour and an airport pick-up.',at:'2026-10-20T03:00:00Z'}],{}).tags;
 const c=fd.compactTags(all,{status:'MISSING_ETA',time:'',flight:'',basis:'',quote:''});
 assert.equal(c.shown.length,2);assert.equal(c.shown[0].label,'[COMPLAIN]');assert.ok(['[LỄ TÂN XÁC NHẬN]','[CHUYỂN SALER TOUR]'].includes(c.shown[1].label));assert.equal(c.more,c.all.length-2);assert.ok(c.more>=2);
 const quiet=fd.compactTags(tags.smartTags([{text:'Hello',at:'2026-10-20T03:00:00Z'}],{}).tags,{status:'EARLY_ARRIVAL',time:'10:00',flight:'',basis:'hotel',quote:''});
 assert.deepEqual(quiet.shown.map(t=>t.label),['Đến sớm']);assert.equal(quiet.more,0);
});
check('ETA desk order: early with room not ready → no arrival time → the rest; earlier time first',()=>{
 const e=(status,time='')=>({status,time,flight:'',basis:'',quote:''});
 const guests=[{n:'A',eta:e('CONFIRMED_ETA','15:00'),r:'WAITING_ETA'},{n:'B',eta:e('MISSING_ETA'),r:'WAITING_ETA'},{n:'C',eta:e('EARLY_ARRIVAL','11:00'),r:'READY_FOR_GUEST'},{n:'D',eta:e('EARLY_ARRIVAL','10:00'),r:'CLEANING_PRIORITY'},{n:'E',eta:e('EARLY_ARRIVAL','09:00'),r:'WAITING_ETA'}];
 assert.deepEqual(fd.sortForDesk(guests,g=>g.eta,g=>g.r).map(g=>g.n),['E','D','B','C','A']);
});
console.log(JSON.stringify({passed,scope:'desk density: Vietnamese draft summary, two-tag list rows, ETA desk order'}));
