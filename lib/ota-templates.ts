import {ruleProfile,normalize,clockTimes,type GuestFact,type GuestProfile} from './ota-profile';
import {properties,channels} from './ota';
import type {Stay} from './ota-stay';

// A reply approved for one booking is not permission to reuse it. Only rows in
// ota_templates, created when Cua explicitly allows reuse, can drive automatic drafts.
export const situationCodes=['arrival','departure','early_checkin','room','stay','transfer_declined','transfer_interest','tour_interest','tour_deferred','spa','thanks'] as const;
export type Situation=typeof situationCodes[number];
export const situationLabels:Record<Situation,string>={arrival:'Khách báo giờ đến',departure:'Khách báo giờ rời đi',early_checkin:'Khách hỏi nhận phòng sớm',room:'Yêu cầu về phòng',stay:'Yêu cầu trong kỳ lưu trú',transfer_declined:'Không cần xe / tự di chuyển / để sau',transfer_interest:'Quan tâm xe sân bay',tour_interest:'Quan tâm tour / tham quan',tour_deferred:'Muốn bàn tour sau',spa:'Quan tâm / đặt spa',thanks:'Cảm ơn / xác nhận'};
export type Template={id:string;version:number;title:string;body:string;situations:Situation[];properties:string[];channels:string[];language:'en'|'vi';approved_at:string;approved_by:string;source_thread:string;source_revision:number;retired_at:string|null};
export type TemplateRow=Omit<Template,'situations'|'properties'|'channels'|'language'>&{situations:string;properties:string;channels:string;language:string};
export const parseTemplate=(r:TemplateRow):Template=>({...r,situations:JSON.parse(r.situations),properties:JSON.parse(r.properties),channels:JSON.parse(r.channels),language:r.language==='vi'?'vi':'en'});

type Ev={id:string;guest_text:string;received:string;kind:string;guest_name?:string;full_text?:string};
type Sent={created:string};
// tourParagraph: sourced, price-free tour content prepared for this conversation (lib/tour-advice.ts).
// serviceInfo: configured, approved hotel-service terms for this conversation (lib/service-replies.ts).
export type ThreadFacts={thread:{id:string;property_id:string;channel:string;booking_id:string};events:Ev[];sent:Sent[];stay?:Stay;profile?:GuestProfile;tourParagraph?:string;serviceInfo?:string};

// Letters only Vietnamese uses; â/ê/ô also occur in French ("hôtel").
export const isVietnamese=(s:string)=>/[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉĩịọỏốồổỗộớờởỡợụủũứừửữựỳỵỷỹ]/i.test(s);
// Templates are English or Vietnamese; French, German and other languages always go to Cua.
// One stray accent ("hôtel" in English) is not enough; foreign words or several accents are.
export const messageLanguage=(s:string):'en'|'vi'|'other'=>isVietnamese(s)?'vi':/\b(?:merci|bonjour|nous|vous|danke|wir|gracias|hola|grazie)\b/i.test(s)||(s.match(/[àâçéèêëîïôûùüÿœæäöß¿¡ñ]/gi)||[]).length>=2?'other':'en';
const filler=/^(?:hi|hello|hey|dear\b.*|good (?:morning|afternoon|evening)|thanks?(?: you)?(?: so much| very much)?|many thanks|regards|best(?: regards)?|kind regards|cheers|see you(?: soon| tomorrow)?|xin chao|chao (?:ban|anh|chi|em)|cam on(?: ban| nhieu)?|tran trong|than ai)[\s!.,]*$|^(?:hi|hello|hey|dear)\s+[a-z#\d ]{1,25}[!,.]*$|^(?:(?:kind|best|warm|warmest)\s+)?regards,?\s+[a-z#\d .]{1,30}$|^best,?\s+[a-z#\d ]{1,20}$|^(?:my |our )?(?:e-?mail|(?:direct |mobile )?phone(?: number)?|number|whatsapp)(?: is)?:?\s*.{1,45}$|^(?:i|we) can be (?:contacted|reached)\b.{0,90}$|^\S+@\S+\.\S+[\s.]*$|^\[phone [^\]]+\][\s.]*$/;
const extranetRequest=/accept for free|accept with charg|decline request/;
const thanksOnly=/^(?:(?:hi|hello|hey|dear)\b[^.!?]{0,20}?[,!.]?\s*)?(?:ok(?:ay)?|great|perfect|noted|got it|sounds good|thanks?(?: you)?.*|many thanks.*|cam on.*|da nhan.*|vang.*|duoc roi.*)[\s!.,]*$/;
// Content that always needs Cua's decision: money, cancellation, complaints, booking changes, guarantees.
const blockers:[RegExp,string][]=[
 [/cancel|refund|huy (?:phong|dat|booking)|hoan tien/,'Khách nói về hủy hoặc hoàn tiền: Cua kiểm tra điều kiện booking và quyết định.'],
 [/complain|not happy|disappoint|unacceptable|terrible|khieu nai|that vong|khong hai long/,'Khách phàn nàn: Cua xử lý trực tiếp.'],
 [/price|cost|how much|\brates?\b|\bfees?\b|charge|\bpay\b|payment|paid|invoice|receipt|deposit|discount|bao nhieu|\bgia\b(?! dinh| han)|\bphi\b|thanh toan|hoa don|\bcoc\b|giam gia/,'Khách hỏi giá, phí hoặc thanh toán: Cua quyết định giá và điều kiện.'],
 [/change (?:the |my |our )?(?:date|booking|reservation|room type|dates)|extend|extra night|add (?:a |one )?night|modify|doi ngay|gia han|them dem|doi phong/,'Khách muốn thay đổi booking: Cua kiểm tra trên OTA/PMS.'],
 [/please confirm|can you confirm|confirm (?:that|if|whether)|guarantee|make sure|^is this ok\??$|please confirm below if you agree|xac nhan (?:giup|cho)|dam bao/,'Khách cần xác nhận khả năng đáp ứng: Cua kiểm tra rồi quyết định.']
];
function sentenceSituations(sentence:string,id:string):Situation[]{
 const facts=ruleProfile([{id,guest_text:sentence,received:'',kind:'guest'}]);
 const out=new Set<Situation>();
 for(const f of facts){
  if(f.category==='arrival')out.add('arrival');
  else if(f.category==='departure')out.add('departure');
  else if(f.category==='room')out.add('room');
  else if(f.category==='stay')out.add(/check.?in|nhan phong/.test(normalize(f.sources[0].quote+' '+f.summary))?'early_checkin':'stay');
  else if(f.category==='pickup'||f.category==='dropoff')out.add(f.status==='interested'?'transfer_interest':'transfer_declined');
  else if(f.category==='itinerary')out.add(f.status==='interested'?'tour_interest':'tour_deferred');
 }
 if(/\bspa\b|massage|mat xa|xoa bop/.test(normalize(sentence)))out.add('spa');
 return [...out];
}
export type Classified={situations:Situation[];blockers:{reason:string;quote:string}[];unclassified:string[];open:Ev[]};
// Classifies guest messages that have not been answered (after the latest recorded send).
export function classifyOpenMessages(f:Pick<ThreadFacts,'events'|'sent'>):Classified{
 const lastSent=f.sent.map(s=>s.created).sort().at(-1)||'';
 const open=f.events.filter(e=>e.kind==='guest'&&e.guest_text&&e.received>lastSent);
 const situations=new Set<Situation>(),found:Classified['blockers']=[],unclassified:string[]=[];
 let thanks=false;
 for(const e of open){
  // Booking.com check-in requests carry extranet buttons: accepting free, with charges or declining is Cua's call.
  // parseMail strips the buttons from guest_text, so read the source email as well.
  const extranet=extranetRequest.test(normalize(e.guest_text+' '+(e.full_text||'')));
  if(extranet){const reason='OTA gửi yêu cầu cần khách sạn chấp nhận (miễn phí / có phí / từ chối): Cua quyết định trên extranet.';if(!found.some(b=>b.reason===reason))found.push({reason,quote:e.guest_text.split(/\n/)[0].slice(0,160)});}
  for(const sentence of e.guest_text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(Boolean)){
  const n=normalize(sentence);
  // The extranet reason above already covers the button text and its "Is this ok?".
  if(extranetRequest.test(n)||/^_+$/.test(n.replace(/\s/g,''))||extranet&&/^is this ok\??$/.test(n))continue;
  const block=blockers.filter(([re])=>re.test(n));
  for(const [,reason] of block)if(!found.some(b=>b.reason===reason))found.push({reason,quote:sentence});
  const s=sentenceSituations(sentence,e.id);s.forEach(x=>situations.add(x));
  if(block.length||s.length)continue;
  if(thanksOnly.test(n)){thanks=true;continue;}
  if(filler.test(n)||n.replace(/[^a-z0-9]/g,'').length<3)continue;
  unclassified.push(sentence);
 }}
 if(thanks&&!situations.size&&!found.length&&!unclassified.length)situations.add('thanks');
 return {situations:[...situations],blockers:found,unclassified,open};
}

const placeholders=['guest_name','booking','property','check_in','check_out','arrival_time','tour_options','service_info'] as const;
type Placeholder=typeof placeholders[number];
const placeholderLabels:Record<Placeholder,string>={guest_name:'tên khách',booking:'mã booking',property:'tên cơ sở',check_in:'ngày nhận phòng',check_out:'ngày trả phòng',arrival_time:'giờ đến khách sạn (một mốc giờ)',tour_options:'phương án tour có nguồn cho đúng cơ sở',service_info:'thông tin dịch vụ theo cấu hình khách sạn (xe, spa, giờ nhận/trả phòng, xin WhatsApp)'};
const blockNames=/\[\[(ask|offer|if):([a-z_]+)\]\]([\s\S]*?)\[\[\/\1\]\]/g;
const commitment=/\b(?:confirmed|guarantee[sd]?|we have arranged|has been arranged|is arranged|have reserved|has been reserved|we will upgrade|upgrade(?:d)? (?:you|your)|free of charge|complimentary|discount|\d+\s?% off)\b|đã (?:xác nhận|bố trí|sắp xếp|đặt được|giữ)|đảm bảo|miễn phí|giảm giá|nâng hạng|ưu đãi/i;
const allowedNegations=/\b(?:not (?:yet )?(?:confirmed|guaranteed)|cannot (?:be )?(?:confirmed|guaranteed)|unconfirmed|until (?:it is |we have )?confirmed|before (?:it is )?confirmed)\b|chưa (?:được )?(?:xác nhận|bố trí|đảm bảo)|chưa thể (?:xác nhận|đảm bảo)/gi;
const money=/(?:\$|€|£)\s?\d|\d+(?:[.,]\d+)?\s?%|\d[\d.,]*\s?(?:vnd|usd|eur|k)\b|\d[\d.,]*\s?(?:vnđ|đồng|nghìn|ngàn|triệu|đ)(?![a-zA-Zà-ỹÀ-Ỹđ])|(?:^|\s)đ\s?\d/i;
// Template text must not carry a price, discount or an "already arranged" promise from the booking it came from.
export function templateProblems(input:{body:string;situations:string[];properties:string[];channels:string[]},source?:{guestName?:string;bookingId?:string;guestText?:string;stay?:{checkIn:string;checkOut:string}}):string[]{
 const p:string[]=[],body=input.body;
 if(body.trim().length<20)p.push('Nội dung mẫu quá ngắn.');
 if(!input.situations.length||input.situations.some(s=>!(situationCodes as readonly string[]).includes(s)))p.push('Chọn ít nhất một tình huống hợp lệ.');
 if(!input.properties.length||input.properties.some(x=>!properties.some(y=>y.id===x)))p.push('Chọn đúng cơ sở được dùng mẫu.');
 if(input.channels.some(x=>!(channels as readonly string[]).includes(x)))p.push('Kênh OTA không hợp lệ.');
 const stripped=body.replace(allowedNegations,' ');
 const c=stripped.match(commitment);if(c)p.push(`Mẫu dùng lại không được chứa cam kết hoặc ưu đãi ("${c[0]}"). Để phần này cho Cua quyết định từng ca.`);
 const m=body.match(money);if(m)p.push(`Mẫu dùng lại không được chứa giá ("${m[0]}"). Giá trao đổi sau cùng, theo từng ca.`);
 for(const x of body.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g))if(!(placeholders as readonly string[]).includes(x[1]))p.push(`Chỗ trống không hỗ trợ: {{${x[1]}}}.`);
 for(const x of body.matchAll(blockNames)){const ok=x[1]==='ask'?['arrival','departure'].includes(x[2]):x[1]==='offer'?['pickup','dropoff','tour'].includes(x[2]):(situationCodes as readonly string[]).includes(x[2]);if(!ok)p.push(`Khối điều kiện không hỗ trợ: [[${x[1]}:${x[2]}]].`);}
 if(/\[\[|\]\]/.test(body.replace(blockNames,'')))p.push('Khối điều kiện [[...]] chưa đóng đúng.');
 const n=normalize(body);
 if(source?.guestName&&source.guestName.trim().length>2&&n.includes(normalize(source.guestName)))p.push('Thay tên khách của booking gốc bằng {{guest_name}}.');
 if(source?.bookingId&&source.bookingId.length>=5&&body.includes(source.bookingId))p.push('Thay mã booking gốc bằng {{booking}}.');
 // Facts the source guest gave belong to that booking only; reuse them through placeholders.
 const guestTimes=new Set(clockTimes(source?.guestText||'')),copied=[...new Set(clockTimes(body.replace(blockNames,'$3')).filter(t=>guestTimes.has(t)))];
 if(copied.length)p.push(`Mẫu còn giờ của khách gốc (${copied.join(', ')}). Dùng {{arrival_time}} hoặc bỏ giờ cụ thể.`);
 for(const d of [source?.stay?.checkIn,source?.stay?.checkOut].filter(Boolean) as string[]){const [y,m,day]=d.split('-');if([`${day}/${m}/${y}`,`${day}/${m}`,`${+day}/${+m}`,d].some(x=>body.includes(x))){p.push('Mẫu còn ngày lưu trú của booking gốc. Dùng {{check_in}} / {{check_out}}.');break;}}
 return p;
}
// Suggests a reusable draft from an approved reply; Cua still edits and confirms it.
export function generalize(body:string,source:{guestName?:string;bookingId?:string}){
 let out=body;
 if(source.guestName&&source.guestName.trim().length>2)out=out.replace(new RegExp(source.guestName.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),'{{guest_name}}');
 if(source.bookingId&&source.bookingId.length>=5)out=out.split(source.bookingId).join('{{booking}}');
 return out;
}

const dmy=(d:string)=>{const [y,m,day]=d.split('-');return day&&m&&y?`${day}/${m}/${y}`:'';};
function factFor(facts:GuestFact[],category:GuestFact['category']){return facts.filter(f=>f.category===category).at(-1);}
// Single point-in-time hotel arrival; a window or lower bound is left for Cua.
function arrivalTime(facts:GuestFact[]){
 const a=factFor(facts,'arrival');if(!a)return '';
 if(/trong khoảng|không trước|sau |trước |chậm nhất|đính chính/.test(a.summary))return '';
 if(!a.summary.startsWith('Đến khách sạn')&&/\b(?:not|before|after|by|between|until|till|no later|no earlier|or)\b|\bkhong\b|\btruoc\b|\bsau\b|\btu\b.*\bden\b/.test(normalize(a.sources[0].quote)))return '';
 // "1 to 2 pm", "10/11 pm", "2–3 PM" are windows, not one time.
 if(/\d\s*(?:[:.]\d{2})?\s*(?:am|pm)?\s*(?:to|-|–|—|\/|or|&)\s*\d/i.test(a.sources[0].quote))return '';
 const t=a.summary.startsWith('Đến khách sạn')?clockTimes(a.summary):clockTimes(a.sources[0].quote);
 return t.length===1||a.summary.startsWith('Đến khách sạn')?t[0]||'':'';
}
const declined=['declined','own_transport','arranged_by_guest','deferred'];
export type Rendered={body:string;missing:string[];problems:string[]};
export function renderTemplate(t:Template,f:ThreadFacts):Rendered{
 const facts=f.profile?.facts||[],missing:string[]=[],problems:string[]=[];
 const known=(c:GuestFact['category'])=>Boolean(factFor(facts,c));
 const offerOpen=(c:'pickup'|'dropoff'|'tour')=>{const x=factFor(facts,c==='tour'?'itinerary':c);return !x||!declined.includes(x.status)&&!(c==='tour'&&x.status==='declined');};
 const situations=classifyOpenMessages(f).situations;
 let body=t.body.replace(blockNames,(_,kind:string,name:string,inner:string)=>{
  const keep=kind==='ask'?!known(name as GuestFact['category']):kind==='offer'?offerOpen(name as 'pickup'|'dropoff'|'tour'):situations.includes(name as Situation);
  return keep?inner:'';
 });
 const values:Record<Placeholder,string>={guest_name:f.events.filter(e=>e.guest_name).at(-1)?.guest_name||'',booking:f.thread.booking_id,property:properties.find(p=>p.id===f.thread.property_id)?.name||'',check_in:f.stay&&!f.stay.conflict?dmy(f.stay.checkIn):'',check_out:f.stay&&!f.stay.conflict?dmy(f.stay.checkOut):'',arrival_time:arrivalTime(facts),tour_options:f.tourParagraph||'',service_info:f.serviceInfo||''};
 body=body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g,(all,name:string)=>{const v=values[name as Placeholder];if(!v){const label=placeholderLabels[name as Placeholder]||name;if(!missing.includes(label))missing.push(label);return all;}return v;});
 body=body.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 // Safety net on the rendered text: never ask again for what the guest gave, never re-offer what they refused.
 const n=normalize(body);
 // Only questions or requests for information count as asking again; "we noted your arrival time" does not.
 const asks=body.split(/(?<=[.!?])\s+|\n+/).map(normalize).filter(x=>/\?$/.test(x)||/(?:could|can|would) you (?:please )?(?:let us know|share|tell|advise|confirm)|please (?:let us know|share|advise|tell)|may i ask|vui long cho|cho (?:minh|toi|chung toi) biet/.test(x));
 if(known('arrival')&&asks.some(x=>/what time|arrival time|time of arrival|\beta\b|when (?:will|do|would) you (?:arrive|reach|get)|may gio|gio (?:den|toi)|khi nao .{0,12}den/.test(x)))problems.push('Mẫu vẫn hỏi giờ đến dù khách đã cung cấp.');
 const offering=/(?:would (?:you )?(?:also )?like|shall (?:we|i)|can (?:we|i) (?:also )?arrange|do you (?:also )?need|if you (?:would )?(?:also )?(?:like|need|want)|let us know if|happy to arrange|ban co can|co muon|neu ban can)/.source;
 // Direction matters: refusing the pickup does not refuse the dropoff. A sentence with a generic
 // vehicle word and no direction counts as offering both.
 for(const sentence of body.split(/(?<=[.!?])\s+|\n+/).map(normalize).filter(x=>new RegExp(offering).test(x))){
  const pick=/pick.?up|from (?:the )?airport|airport to|for your arrival|xe don|\bdon\b/.test(sentence),drop=/drop.?off|to (?:the )?airport|end of your stay|departure|xe tien|\btien\b/.test(sentence),generic=/transfer|\bcar\b|vehicle|taxi|shuttle|\bxe\b/.test(sentence);
  const offers={pickup:pick||generic&&!drop,dropoff:drop||generic&&!pick};
  if(offers.pickup&&!offerOpen('pickup')||offers.dropoff&&!offerOpen('dropoff')){problems.push('Mẫu vẫn mời xe dù khách đã từ chối, tự di chuyển hoặc muốn để sau.');break;}
 }
 if(!offerOpen('tour')&&new RegExp('(?:'+offering+'|interested in|recommend|goi y).{0,80}(?:tour|sightseeing|trip|tham quan)').test(n))problems.push('Mẫu vẫn mời tour dù khách muốn bàn sau hoặc từ chối.');
 // Approved configured service terms may carry prices; everything else in the template may not.
 const checked=(f.serviceInfo?body.split(f.serviceInfo).join(' '):body);
 if(commitment.test(checked.replace(allowedNegations,' '))||money.test(checked))problems.push('Nội dung sau khi điền có giá hoặc cam kết.');
 return {body,missing,problems};
}

export type Plan={situations:Situation[];blockers:Classified['blockers'];unclassified:string[];language:'en'|'vi'|'other';template?:Template;body?:string;reasons:string[]};
// Picks at most one reusable template that covers every need in the unanswered messages.
export function planReply(f:ThreadFacts,templates:Template[]):Plan{
 const c=classifyOpenMessages(f),text=c.open.map(e=>e.guest_text).join(' '),language=messageLanguage(text);
 const reasons:string[]=[];
 if(language==='other')reasons.push('Khách viết ngôn ngữ khác tiếng Anh/tiếng Việt: Cua đọc và soạn.');
 for(const b of c.blockers)reasons.push(b.reason+` ("${b.quote.slice(0,160)}")`);
 for(const u of c.unclassified.slice(0,3))reasons.push(`Nội dung chưa thuộc tình huống nào có mẫu: "${u.slice(0,160)}". Cua soạn hoặc quyết định cách trả lời.`);
 if(f.stay?.conflict)reasons.push('Ngày lưu trú mâu thuẫn giữa các email: Cua đối chiếu trên OTA.');
 if(!c.open.length)reasons.push('Không có lời khách mới chưa trả lời.');
 if(!c.situations.length&&c.open.length&&!c.blockers.length&&!c.unclassified.length)reasons.push('Chưa nhận diện được nhu cầu trong tin khách: Cua đọc và soạn.');
 const usable=templates.filter(t=>!t.retired_at);
 const here=usable.filter(t=>t.properties.includes(f.thread.property_id)&&(!t.channels.length||t.channels.includes(f.thread.channel)));
 const plan:Plan={situations:c.situations,blockers:c.blockers,unclassified:c.unclassified,language,reasons};
 if(reasons.length||!c.situations.length)return plan;
 if(!usable.length){plan.reasons.push('Chưa có mẫu nào được Cua cho phép dùng lại.');return plan;}
 if(!here.length){plan.reasons.push('Chưa có mẫu được phép dùng lại cho cơ sở/kênh này.');return plan;}
 const fit=here.filter(t=>t.language===language&&c.situations.every(s=>t.situations.includes(s))).sort((a,b)=>a.situations.length-b.situations.length||b.approved_at.localeCompare(a.approved_at));
 if(!fit.length){
  const covered=new Set(here.filter(t=>t.language===language).flatMap(t=>t.situations));
  const gaps=c.situations.filter(s=>!covered.has(s)).map(s=>situationLabels[s]);
  plan.reasons.push(!here.some(t=>t.language===language)?`Khách viết ${language==='vi'?'tiếng Việt':'tiếng Anh'} nhưng chưa có mẫu ${language==='vi'?'tiếng Việt':'tiếng Anh'} được phép dùng lại: Cua soạn hoặc tạo mẫu.`:gaps.length?`Tình huống chưa có mẫu phù hợp: ${gaps.join(', ')}. Cua soạn hoặc tạo mẫu.`:'Không mẫu nào bao trọn các nhu cầu trong tin này: Cua soạn hoặc tạo mẫu gộp.');
  return plan;
 }
 for(const t of fit){
  const r=renderTemplate(t,f);
  if(r.missing.length){plan.reasons.push(`Thiếu dữ kiện để điền mẫu "${t.title}": ${r.missing.join(', ')}. Cua kiểm tra trên OTA.`);continue;}
  if(r.problems.length){plan.reasons.push(`Mẫu "${t.title}" chưa dùng được cho ca này: ${r.problems.join(' ')}`);continue;}
  return {...plan,reasons:[],template:t,body:r.body};
 }
 return plan;
}

export type DraftLike={revision:number;status:string;notes:string;operation_id?:string;source?:string;template_id?:string;template_version?:number;attention?:string;stale?:boolean;approved_at?:string|null};
// Older rows have no source column value; infer it from how they were written.
export function draftSource(d:DraftLike):'template'|'rules'|'ai'|'ai_cua'|'cua'|'review'{
 if(d.source)return d.source as ReturnType<typeof draftSource>;
 if(d.notes.startsWith('AI · Ý Cua'))return 'ai_cua';
 if(d.notes.startsWith('Cua đã sửa'))return 'cua';
 if(d.operation_id?.startsWith('auto-'))return d.notes.startsWith('AI ·')?'ai':'rules';
 if(d.notes.startsWith('AI ·'))return 'ai';
 return 'review';
}
export const sourceLabels:Record<ReturnType<typeof draftSource>,string>={template:'Đề xuất từ mẫu đã duyệt',rules:'Nháp theo quy tắc hệ thống (chưa phải mẫu Cua duyệt)',ai:'Nháp AI (chưa phải mẫu Cua duyệt)',ai_cua:'AI viết lại theo ý Cua',cua:'Cua tự sửa',review:'Nháp từ phiếu đối chiếu'};
export const isAutoDraft=(d:DraftLike)=>['template','rules','ai'].includes(draftSource(d));
// One line telling Cua what, if anything, to do next on this conversation.
export function nextStep(latest:DraftLike|undefined,plan:Pick<Plan,'reasons'>,answered:boolean):{needsCua:boolean;text:string;reasons:string[]}{
 const stored=(latest?.attention||'').split('\n').filter(Boolean);
 if(answered&&(!latest||latest.status==='sent'))return {needsCua:false,text:'Không cần làm gì: đã ghi nhận gửi cho tin mới nhất.',reasons:[]};
 if(!latest||latest.status==='needs_writing')return {needsCua:true,text:'Cua soạn câu trả lời.',reasons:stored.length?stored:plan.reasons};
 if(latest.stale&&latest.status==='approved')return {needsCua:true,text:`Có tin mới sau phiên bản v${latest.revision} đã duyệt: kiểm tra nội dung còn đúng không, sửa rồi duyệt lại.`,reasons:plan.reasons};
 if(latest.stale)return {needsCua:true,text:'Có tin mới trong lúc bản này chưa duyệt: rà lại, sửa và lưu phiên bản mới.',reasons:plan.reasons};
 if(latest.status==='approved')return {needsCua:true,text:'Đã duyệt: sao chép, gửi trên đúng booking OTA rồi ghi nhận đã gửi.',reasons:[]};
 if(latest.status==='sent')return {needsCua:false,text:'Không cần làm gì: đã ghi nhận gửi.',reasons:[]};
 if(draftSource(latest)==='template'&&!stored.length)return {needsCua:true,text:'Đọc đề xuất từ mẫu đã duyệt; nếu phù hợp bấm Duyệt nội dung, nếu không thì Sửa.',reasons:[]};
 return {needsCua:true,text:'Cần Cua xử lý: rà nháp, sửa nếu cần rồi duyệt.',reasons:stored.length?stored:plan.reasons};
}
