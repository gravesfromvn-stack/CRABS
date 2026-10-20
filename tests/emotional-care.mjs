import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/emotion',{recursive:true});
await build({entryPoints:{emotion:'lib/guest-emotion.ts',profile:'lib/ota-profile.ts',replies:'lib/service-replies.ts',lang:'lib/reply-language.ts',tags:'lib/smart-tags.ts',keypoints:'lib/guest-keypoints.ts',advice:'lib/tour-advice.ts',cat:'lib/service-catalog.ts'},outdir:'.quote-tests/emotion',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const m=n=>import(`../.quote-tests/emotion/${n}.mjs`);
const [emotion,profile,replies,lang,tags,keypoints,advice,cat]=await Promise.all(['emotion','profile','replies','lang','tags','keypoints','advice','cat'].map(m));
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};
const reply=(text,o={})=>{const facts=profile.ruleProfile([{id:'e1',guest_text:text,received:'2026-10-14T03:00:00Z',kind:'guest'}]);
 const r=replies.serviceReply({catalog:cat.seedEntries,propertyId:'luxe-75pht',text,facts,vi:false,tourInterested:false,hasContact:false,...o});return {...r,text:r.paragraphs.join('\n\n')};};

check('Adjectives → emotional state → care path',()=>{
 const e=emotion.extractAdjectivesAndEmotion;
 const tired=e("We had a terrible noisy night in Cat Ba and couldn't sleep. The boat was exhausting.");
 assert.equal(tired.emotional_state,'SENSORY_OVERLOAD_TIRED');assert.equal(tired.applicable_care_path,'SPA_RECOVERY');
 for(const a of ['sleepless','noisy','exhausted','terrible'])assert.ok(tired.detected_adjectives.includes(a),a);assert.deepEqual(tired.origins,['cat ba']);
 assert.equal(e('After a long bumpy overnight bus we are worn out.').emotional_state,'PHYSICAL_EXHAUSTION');
 assert.equal(e('It is our first time in Vietnam and we are a bit nervous.').emotional_state,'ANXIOUS_UNCERTAIN');
 assert.equal(e('We are so excited, it is our honeymoon!').emotional_state,'EXCITED_EXPLORER');
 assert.deepEqual([e('We will arrive at 14:00.').emotional_state,e('We will arrive at 14:00.').applicable_care_path],['NEUTRAL_BUSINESS','TOUR_UPSELL']);
 assert.equal(e('The food was terrible.').emotional_state,'NEUTRAL_BUSINESS','"terrible" alone is not tiredness');
 assert.equal(e('We could not sleep at all.',{spaAvailable:false}).applicable_care_path,'TRANQUIL_REST');
});
check('PO case 1 · tired guest from Cat Ba: empathy, quiet room, restorative spa, NO tour',()=>{
 const r=reply("We had a terrible noisy night in Cat Ba and couldn't sleep. The boat was exhausting. Please ensure our room is quiet.");
 assert.deepEqual(r.needs,['care','spa_recovery']);
 assert.match(r.text,/sorry you had such a tiring, sleepless journey from Cat Ba/);assert.match(r.text,/we will prioritise a quiet, fresh and tranquil room/);
 assert.match(r.text,/invite you to try our in-house spa treatments.*continue exploring Vietnam/s);
 assert.doesNotMatch(r.text,/interested in visiting|\btour/i);assert.doesNotMatch(r.text,/has prioriti[sz]ed|guarantee/i,'no claim that the room is already set');
 assert.ok(r.text.indexOf('tranquil room')<r.text.indexOf('spa treatments'),'spa after the room reassurance');
 assert.deepEqual(advice.guestDraftProblems(r.text,{facts:[]}).filter(p=>p.hard),[]);
});
check('PO case 2 · arrival + double bed only: confirm, then the tour question at the very end',()=>{
 const r=reply('We will arrive at 14:00, please prepare a double bed.');
 assert.match(r.text,/arrival around 14:00/);assert.match(r.text,/request for a double bed/);assert.ok(!r.needs.includes('bed_change'),'a double bed is a preference, not a change from twin');
 const last=r.paragraphs.at(-1);assert.match(last,/^By the way, are you interested in visiting Ha Long Bay, Ninh Binh, Sapa, or Ha Giang during your stay\?/);assert.doesNotMatch(last,/drop-off/);
});
check('PO case 3 · coming from Sapa: Sapa removed from the suggestion; Cat Ba removes Ha Long',()=>{
 const r=reply('We are taking the morning bus from Sapa and will arrive around 15:00.');
 assert.match(r.text,/arrival around 15:00/);assert.match(r.paragraphs.at(-1),/interested in visiting Ha Long Bay, Ninh Binh, or Ha Giang during your stay\?/);assert.doesNotMatch(r.paragraphs.at(-1),/Sapa/);
 assert.match(r.paragraphs.at(-1),/airport drop-off and car transfers to other provinces/,'overland guests also hear about cars');
 assert.deepEqual(emotion.tourPlacesExcluding(['cat ba']).map(x=>x.key),['ninhbinh','sapa','hagiang']);
 assert.deepEqual(emotion.tourPlacesExcluding(['halong bay']).map(x=>x.key),['ninhbinh','sapa','hagiang']);
 assert.equal(emotion.joinOr(['vịnh Hạ Long','Ninh Bình','Hà Giang'],'hoặc'),'vịnh Hạ Long, Ninh Bình hoặc Hà Giang');
});
check('No tour suggestion when a service is asked, the guest is worried, or it was already offered',()=>{
 assert.ok(!reply('We arrive at 14:00. Can you arrange an airport pick-up?').needs.includes('tour_upsell'));
 assert.ok(!reply('We arrive at 14:00.',{offeredTour:true}).needs.includes('tour_upsell'));
 assert.ok(!reply('We arrive at 14:00.',{tourInterested:true}).needs.includes('tour_upsell'));
 const worried=reply('It is our first time in Vietnam and we are a bit nervous. We land at 22:00.');
 assert.ok(worried.needs.includes('anxious'));assert.ok(!worried.needs.includes('tour_upsell'));
 assert.match(worried.text,/Please don't worry.*24\/7 on WhatsApp \+84 896 867 575.*private airport pick-up/s);
});
check('Excited guests: shared joy, Hanoi experiences, then a tour suggestion',()=>{
 const r=reply('We are so excited for our honeymoon! We arrive at 16:00.');
 assert.ok(r.needs.includes('excited'));assert.match(r.text,/Congratulations on your honeymoon!/);assert.doesNotMatch(r.text,/early honeymoon/);
 assert.match(r.text,/Hoan Kiem Lake.*egg coffee/s);assert.match(r.paragraphs.at(-1),/interested in visiting/);
});
check('Vietnamese: same flows in Vietnamese',()=>{
 const r=reply('Chúng tôi vừa có một đêm rất ồn ào ở Cát Bà, mất ngủ và mệt mỏi. Mong phòng yên tĩnh.',{vi:true});
 assert.ok(r.needs.includes('spa_recovery'));assert.match(r.text,/mệt mỏi và mất ngủ từ Cát Bà/);assert.match(r.text,/liệu trình spa/);
 const t=reply('Chúng tôi sẽ đến khoảng 14:00, cho mình giường đôi nhé.',{vi:true});assert.match(t.paragraphs.at(-1),/^Nhân tiện, bạn có muốn tham quan vịnh Hạ Long, Ninh Bình, Sa Pa hoặc Hà Giang/);
});
check('Guest language: care, spa and tour blocks are written in the guest’s language',()=>{
 const meta={sleepy:true,origin:'Cat Ba',places:['ninhbinh','sapa','hagiang'],overland:true,whatsapp:'+84 896 867 575'};
 const fr=lang.localizedFromNeeds('fr',['care','spa_recovery'],{time:'',checkIn:'14:00',night:false,meta});
 assert.match(fr,/^Bonjour/);assert.match(fr,/trajet depuis Cat Ba ait été aussi fatigant et sans sommeil/);assert.match(fr,/soins du spa/);assert.doesNotMatch(fr,/\bthe\b|\byou\b/);
 const zh=lang.localizedFromNeeds('zh',['arrival','tour_upsell'],{time:'15:00',checkIn:'14:00',night:false,meta:{...meta,sleepy:false}});
 assert.match(zh,/宁平、沙坝或河江/);assert.match(zh,/机场送机/);
 const he=lang.localizedFromNeeds('he',['anxious'],{time:'',checkIn:'14:00',night:false,meta:{...meta,overland:false}});assert.match(he,/\+84 896 867 575/);assert.match(he,/הסעה פרטית/);
 for(const l of ['he','ru','fr','es','de','zh','ja','ko'])assert.ok(lang.localizedFromNeeds(l,['excited','tour_upsell'],{time:'',checkIn:'14:00',night:false,meta}),l);
 assert.equal(lang.localizedFromNeeds('fr',['care','transfer'],{time:'',checkIn:'14:00',night:false,meta}),null,'unsupported needs stay in English');
});
check('Front desk: VIP care (rest) and spa potential notes; emotion in key points',()=>{
 const t="We had a terrible noisy night in Cat Ba and couldn't sleep. The boat was exhausting. Please ensure our room is quiet.";
 const tg=tags.smartTags([{text:t,at:'2026-10-14T03:00:00Z'}],{checkIn:'2026-10-14'});
 const codes=tg.tags.map(x=>x.code);assert.ok(codes.includes('TAG_VIP_CARE'));assert.ok(codes.includes('TAG_SPA_POTENTIAL'));assert.ok(!codes.includes('TAG_COMPLAINT'),'a bad night elsewhere is not a complaint');
 assert.match(tg.notes.join(' '),/\[VIP CARE - CẦN NGHỈ NGƠI\].*Cat Ba/);assert.match(tg.notes.join(' '),/\[TIỀM NĂNG SPA\]/);
 const kp=keypoints.guestKeyPoints([{id:'1',guest_text:t,received:'2026-10-14T03:00:00Z',kind:'guest'}],[]);
 const e=kp.find(x=>x.topic==='Cảm xúc');assert.match(e.text,/Mệt, thiếu ngủ.*Mời spa phục hồi/);assert.equal(e.status,'need');
 const plain=tags.smartTags([{text:'We will arrive at 14:00, please prepare a double bed.',at:'2026-10-14T03:00:00Z'}],{});
 assert.ok(!plain.notes.some(n=>/ĐỔI GIƯỜNG/.test(n)),'double bed preference is not a bed change');
});
console.log(JSON.stringify({passed,scope:'emotional intelligence: adjectives, care paths, spa recovery, proactive tour with origin exclusion, excited/anxious, guest language, tags'}));
