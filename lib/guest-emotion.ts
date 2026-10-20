import {normalize} from './ota-profile';
import {travelOrigins} from './guest-origin';

// Reads the guest's descriptive words to infer how they feel and which care path fits:
//  · tired / sleepless / noisy → empathy, a quiet room and a restorative spa invitation (no tour selling)
//  · worried / first time      → reassurance, 24/7 WhatsApp, step-by-step help
//  · excited / celebrating     → share the joy, Hanoi experiences, tours
//  · room-only facts           → confirm, then a gentle tour suggestion at the end
export type EmotionalState='SENSORY_OVERLOAD_TIRED'|'PHYSICAL_EXHAUSTION'|'ANXIOUS_UNCERTAIN'|'EXCITED_EXPLORER'|'NEUTRAL_BUSINESS';
export type CarePath='SPA_RECOVERY'|'TOUR_UPSELL'|'TRANQUIL_REST'|'STANDARD';
export type GuestEmotionalProfile={detected_adjectives:string[];emotional_state:EmotionalState;applicable_care_path:CarePath;origins:string[]};

// [canonical adjective, pattern] on normalized text.
const SLEEP:[string,RegExp][]=[['sleepless',/sleepless|couldn.?t sleep|could not sleep|can.?t sleep|haven.?t slept|have not slept|no sleep|didn.?t sleep|barely slept|slept (?:badly|poorly|little)|khong ngu duoc|mat ngu/],['noisy',/noisy|noise|no sound ?proof|loud|cried (?:nearly |almost )?all night|on ?ao/],['light sleeper',/light sleeper/],['jet-lagged',/jet ?lag/]];
const BODY:[string,RegExp][]=[['exhausted',/exhaust(?:ed|ing)|worn out|drained|draining|kiet suc/],['tired',/\btired\b|tiring|fatigued|met moi|met qua/],['bumpy',/bumpy|rough (?:ride|road|journey|sea)|long (?:bus|drive|journey|flight|trip)|overnight bus|night bus|sleeper bus/],['terrible',/terrible|awful|horrible|not the best|bad (?:night|stay|experience)/]];
const WORRY:[string,RegExp][]=[['worried',/worried|worry|concern(?:ed)?|lo lang/],['nervous',/nervous|anxious|scared|afraid/],['first time',/first time (?:in|to|visiting) (?:vietnam|hanoi|asia)|never been to (?:vietnam|hanoi)|lan dau/],['confused',/confus|not sure how|unsure|don.?t know how/]];
const JOY:[string,RegExp][]=[['excited',/excited|exciting|can.?t wait|so happy|thrilled|hao huc/],['amazing',/amazing|wonderful|fantastic|awesome/],['lovely',/lovely|beautiful|gorgeous|stunning/],['celebrating',/celebrat|honeymoon|anniversary|birthday|trang mat|ky niem|sinh nhat/]];
const find=(n:string,list:[string,RegExp][])=>list.filter(([,re])=>re.test(n)).map(([w])=>w);

export function extractAdjectivesAndEmotion(text:string,opts:{spaAvailable?:boolean;complaint?:boolean}={}):GuestEmotionalProfile{
 const n=normalize(text),origins=travelOrigins(n);
 const sleep=find(n,SLEEP),body=find(n,BODY),worry=find(n,WORRY),joy=find(n,JOY);
 // "Terrible" alone is not tiredness; it counts with sleep/noise words or a hard journey.
 const tiredBody=body.filter(w=>w!=='terrible'||sleep.length||body.length>1);
 let state:EmotionalState='NEUTRAL_BUSINESS';
 if(sleep.length)state='SENSORY_OVERLOAD_TIRED';
 else if(tiredBody.length)state='PHYSICAL_EXHAUSTION';
 else if(worry.length)state='ANXIOUS_UNCERTAIN';
 else if(joy.length)state='EXCITED_EXPLORER';
 const tired=state==='SENSORY_OVERLOAD_TIRED'||state==='PHYSICAL_EXHAUSTION';
 const path:CarePath=tired?(opts.spaAvailable===false?'TRANQUIL_REST':'SPA_RECOVERY'):opts.complaint||state==='ANXIOUS_UNCERTAIN'?'STANDARD':'TOUR_UPSELL';
 return {detected_adjectives:[...new Set([...sleep,...tiredBody,...worry,...joy])],emotional_state:state,applicable_care_path:path,origins};
}

// Tour suggestion without the places the guest has just come from.
const TOURS:{key:string;en:string;vi:string;from:RegExp}[]=[
 {key:'halong',en:'Ha Long Bay',vi:'vịnh Hạ Long',from:/ha ?long|halong|cat ba|lan ha|bai tu long/},
 {key:'ninhbinh',en:'Ninh Binh',vi:'Ninh Bình',from:/ninh binh|trang an|tam coc|hoa lu/},
 {key:'sapa',en:'Sapa',vi:'Sa Pa',from:/sa ?pa|fansipan|lao cai/},
 {key:'hagiang',en:'Ha Giang',vi:'Hà Giang',from:/ha giang/},
];
export function tourPlacesExcluding(origins:string[]){
 const o=origins.map(normalize).join(' | ');
 return TOURS.filter(t=>!t.from.test(o));
}
// English keeps the serial comma ("Sapa, or Ha Giang"); Vietnamese does not.
export function joinOr(items:string[],word:string){return items.length<2?items.join(''):items.slice(0,-1).join(', ')+(word==='or'&&items.length>2?',':'')+` ${word} `+items.at(-1);}

export const stateLabels:Record<EmotionalState,string>={SENSORY_OVERLOAD_TIRED:'Mệt, thiếu ngủ, nhạy cảm tiếng ồn',PHYSICAL_EXHAUSTION:'Kiệt sức sau chặng đường dài',ANXIOUS_UNCERTAIN:'Băn khoăn, lo lắng',EXCITED_EXPLORER:'Hào hứng khám phá',NEUTRAL_BUSINESS:'Trao đổi thông tin'};
export const pathLabels:Record<CarePath,string>={SPA_RECOVERY:'Mời spa phục hồi, không mời tour',TOUR_UPSELL:'Gợi ý tour cuối thư',TRANQUIL_REST:'Ưu tiên phòng yên tĩnh',STANDARD:'Trả lời chuẩn'};

// Place names for the reply text (origins are matched without accents).
const VI_NAMES:Record<string,string>={'cat ba':'Cát Bà','cat ba island':'Cát Bà','sapa':'Sa Pa','sa pa':'Sa Pa','ninh binh':'Ninh Bình','ha long':'Hạ Long','halong':'Hạ Long','ha long bay':'vịnh Hạ Long','halong bay':'vịnh Hạ Long','ha giang':'Hà Giang','thanh hoa':'Thanh Hóa','hue':'Huế','hoi an':'Hội An','da nang':'Đà Nẵng','lan ha':'Lan Hạ','mai chau':'Mai Châu','pu luong':'Pù Luông','cao bang':'Cao Bằng','hai phong':'Hải Phòng','trang an':'Tràng An','tam coc':'Tam Cốc'};
export function placeName(origin:string,vi:boolean){const key=origin.toLowerCase().trim();return vi&&VI_NAMES[key]?VI_NAMES[key]:key.replace(/(^|\s)\S/g,c=>c.toUpperCase());}
// Vietnamese labels of the detected words, for staff notes and key points.
const ADJ_VI:Record<string,string>={sleepless:'mất ngủ',noisy:'bị ồn','light sleeper':'ngủ không sâu','jet-lagged':'lệch múi giờ',exhausted:'kiệt sức',tired:'mệt',bumpy:'đường dài/xóc',terrible:'trải nghiệm tệ',worried:'lo lắng',nervous:'bồn chồn','first time':'lần đầu đến Việt Nam',confused:'bối rối',excited:'hào hứng',amazing:'phấn khởi',lovely:'thích thú',celebrating:'đang kỷ niệm'};
export const adjectivesVi=(list:string[])=>list.map(a=>ADJ_VI[a]||a).join(', ');
