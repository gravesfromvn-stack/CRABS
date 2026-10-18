import {z} from 'zod';

export const profileCategories=['arrival','departure','room','stay','pickup','dropoff','itinerary'] as const;
export type ProfileCategory=typeof profileCategories[number];
export const profileLabels:Record<ProfileCategory,string>={arrival:'Dự kiến đến',departure:'Dự kiến rời đi',room:'Yêu cầu phòng',stay:'Trong kỳ lưu trú',pickup:'Xe đón sân bay',dropoff:'Xe tiễn sân bay',itinerary:'Lịch trình / tham quan'};
export const profileStatuses={provided:'Khách đã cung cấp',requested:'Yêu cầu · chưa xác nhận đáp ứng',interested:'Quan tâm · chưa đặt',declined:'Khách từ chối',own_transport:'Khách tự di chuyển',deferred:'Khách muốn trao đổi sau',arranged_by_guest:'Khách báo đã tự thu xếp'};
const factSchema=z.object({category:z.enum(profileCategories),summary:z.string().trim().min(1).max(650),status:z.enum(['provided','requested','interested','declined','own_transport','deferred','arranged_by_guest']),sources:z.array(z.object({eventId:z.string().min(1).max(100),quote:z.string().trim().min(3).max(2000)})).min(1).max(8)});
export const profileSchema=z.object({facts:z.array(factSchema).max(20)});
export type GuestFact=z.infer<typeof factSchema>;
export type GuestProfile={facts:GuestFact[];method:'ai'|'rules';updated:string;sourceKey:string;warning:string;proposedReply?:{body:string;review:string[]}};
export type ProfileEvent={id:string;guest_text:string;received:string;kind:string};
export const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
const clockTime=/\b\d{1,2}(?::\d{2}|\s*(?:am|pm|a\.m|p\.m|h\b))/;
const flightWords=/flight|land|may bay|ha canh/;
const hotelArrivalWords=/(?:arriv\w*|reach\w*|get(?:ting)? to|check.?in)\b.{0,20}\bhotel|check.?in|den khach san|nhan phong/;
const checkInWords=/check.?in|nhan phong/;
const isQuestion=(c:string)=>/\?\s*$/.test(c)||/^(?:can|could|may|would it be|is it (?:possible|ok|okay)|will it be possible|co the|lieu)\b/.test(normalize(c));
// The guest quoting hotel rules is not the guest's own plan.
const isPolicy=(n:string)=>/hotel (?:says|said|states)|check.?in (?:time )?(?:is|starts|begins|opens)\b|check.?in from|policy|quy dinh|gio nhan phong (?:la|tu|bat dau)|nhan phong tu/.test(n);
const isCorrection=(n:string)=>/instead|actually|correction|rather|change[sd]? to|thay vao do|doi (?:thanh|lai|sang)|chinh lai/.test(n);
// Clock times as 24-hour HH:MM; bare numbers (2 adults, 26 October, VN 123) are not times.
function clockTimes(text:string){
 const out:string[]=[];
 for(const m of text.matchAll(/(?<![\d:])(\d{1,2})(?!\d)(?:\s*(?::|h)\s*(\d{2})(?!\d))?\s*(a\.?\s?m\b\.?|p\.?\s?m\b\.?|h\b|giờ|gio\b)?/gi)){
  if(m[2]===undefined&&!m[3])continue;
  let h=+m[1];const min=+(m[2]||0),mer=(m[3]||'').replace(/[\s.]/g,'').toLowerCase();
  if(mer==='am'||mer==='pm'){if(h<1||h>12)continue;h=h%12+(mer==='pm'?12:0);}else if(h>23)continue;
  if(min>59)continue;
  out.push(String(h).padStart(2,'0')+':'+String(min).padStart(2,'0'));
 }
 return out;
}
function clauses(quote:string){
 // Keep "between 15:00 and 16:00" in one clause.
 return quote.replace(/(\bbetween\s+\d{1,2}(?:\s*[:h]\s*\d{2})?\s*(?:[ap]\.?\s?m\b\.?)?\s+)and(?=\s+\d)/gi,'$1\u0000')
  .split(/\s*(?:[,;]|\b(?:and|then|but|so)\b|(?<=\s)(?:và|rồi|nhưng|sau đó)(?=\s))\s*/i).filter(Boolean).map(c=>c.replace(/\u0000/g,'and'));
}
// Hotel arrival from one clause, keeping its qualifier; '' when the clause does not state one plainly.
function arrivalWhen(c:string){
 const n=normalize(c),t=clockTimes(c);
 if(t.length===2&&/between|from|\bto\b|until|till|[-–]|\btu\b|\bden\b/.test(n))return 'trong khoảng '+t[0]+'–'+t[1];
 if(t.length!==1)return '';
 if(/\bnot\b.{0,40}\bbefore\b|no earlier than|not until|khong .{0,25}truoc/.test(n))return 'không trước '+t[0];
 if(/\b(?:not|never|won't|wont|cannot|can't|cant)\b|\bkhong\b/.test(n))return '';
 if(/\bafter\s+\d|\bsau\s+\d/.test(n))return 'sau '+t[0];
 if(/\b(?:by|no later than)\s+\d|cham nhat/.test(n))return 'chậm nhất '+t[0];
 if(/\bbefore\s+\d|truoc\s+\d/.test(n))return 'trước '+t[0];
 return (/around|about|approx|roughly|khoang|tam\b|~/.test(n)?'khoảng ':'')+t[0];
}
// Reads a sentence that mentions a flight. Only a clause that names the hotel,
// is not a question or hotel rule, and does not mention the flight is hotel arrival.
// A check-in question becomes an unconfirmed stay request.
function flightSentence(quote:string):{category:'arrival'|'stay';summary:string}|null{
 const parts=clauses(quote).map(c=>({c,n:normalize(c)}));
 const flightTime=parts.find(p=>flightWords.test(p.n)&&clockTimes(p.c).length)?.c;
 const flightNote=flightTime?' · giờ chuyến bay '+clockTimes(flightTime)[0]+' (không phải giờ đến khách sạn)':'';
 const ask=parts.find(p=>isQuestion(p.c)&&checkInWords.test(p.n)&&clockTimes(p.c).length===1);
 if(ask)return {category:'stay',summary:'Khách hỏi nhận phòng lúc '+clockTimes(ask.c)[0]+' · chưa xác nhận'+flightNote.replace(' (không phải giờ đến khách sạn)','')};
 const hotel=parts.filter(p=>clockTimes(p.c).length&&hotelArrivalWords.test(p.n)&&!flightWords.test(p.n)&&!isQuestion(p.c)&&!isPolicy(p.n));
 if(!hotel.length)return null;
 const last=hotel[hotel.length-1],when=arrivalWhen(last.c);
 if(!when)return null;
 let note='';
 if(hotel.length>1){
  const earlier=hotel.slice(0,-1).map(p=>arrivalWhen(p.c)).filter(w=>w&&w!==when);
  // Two different hotel times without a correction is ambiguous: leave it unknown.
  if(earlier.length&&!isCorrection(last.n))return null;
  if(earlier.length)note=' · khách đã đính chính (trước đó: '+earlier.join(', ')+')';
 }
 return {category:'arrival',summary:'Đến khách sạn '+when+note+flightNote};
}
export function ruleProfile(events:ProfileEvent[]):GuestFact[]{
 const facts:GuestFact[]=[];
 const set=(category:ProfileCategory,status:GuestFact['status'],quote:string,eventId:string,append=false,summary=quote)=>{
  if(!append){for(let i=facts.length-1;i>=0;i--)if(facts[i].category===category)facts.splice(i,1);}
  if(facts.some(f=>f.category===category&&f.sources.some(s=>normalize(s.quote)===normalize(quote))))return;
  facts.push({category,status,summary:summary.slice(0,650),sources:[{eventId,quote:quote.slice(0,2000)}]});
 };
 for(const e of [...events].filter(e=>e.kind==='guest').sort((a,b)=>a.received.localeCompare(b.received)||a.id.localeCompare(b.id))){
  const sentences=e.guest_text.replace(/\s+/g,' ').split(/(?<=[.!?])\s+/).filter(Boolean);
  for(const quote of sentences){const n=normalize(quote);
   const time=clockTime.test(n);
   if(time&&flightWords.test(n)){const r=flightSentence(quote);if(r)set(r.category,r.category==='stay'?'requested':'provided',quote,e.id,r.category==='stay',r.summary);}
   else if(time&&checkInWords.test(n)&&isQuestion(quote))set('stay','requested',quote,e.id,true);
   else if(time&&/arriv|check.?in|den (?:khach san|luc)|nhan phong/.test(n)&&!isPolicy(n))set('arrival','provided',quote,e.id);
   if(time&&/depart|leav|check.?out|roi (?:di|khach san)|gio ve|tra phong/.test(n))set('departure','provided',quote,e.id);
   if(/connecting|adjoining|twin|single beds|large bed|king bed|double bed|quiet room|high(?:er)? floor|non.smoking|giuong|phong thong|yen tinh|tang cao/.test(n))set('room','requested',quote,e.id,true);
   if(/late check.?out|early check.?in|luggage stor|cot\b|crib\b|wheelchair|allerg|anniversary|birthday|honeymoon|extra (?:towel|pillow)|giu hanh ly|di ung|sinh nhat|xe lan|khan|goi them/.test(n))set('stay','requested',quote,e.id,true);
   const pickup=/pick.?up|airport to|from (?:the )?airport|xe don/.test(n),dropoff=/drop.?off|to (?:the )?airport|xe tien/.test(n);
   const transport=pickup||dropoff||/airport transfer|san bay|own (?:transport|way)|(?:come|arrive|get there) (?:on our own|by ourselves)|taxi|grab\b/.test(n);
   if(transport){let status:GuestFact['status']='interested';
    if(/(?:no|not|don't|do not|won't).{0,30}(?:need|require|want)|not (?:needed|required)|khong (?:can|muon)|tu choi/.test(n))status='declined';
    else if(/own (?:transport|way)|(?:come|arrive|get there) (?:on our own|by ourselves)|(?:take|use|book).{0,15}(?:taxi|grab)|tu (?:di|den)/.test(n))status='own_transport';
    else if(/already.{0,25}(?:book|arrang)|da.{0,15}(?:dat|sap xep)/.test(n))status='arranged_by_guest';
    else if(/later|when we arrive|upon (?:our )?arrival|discuss.{0,20}arrival|trao doi sau|khi den/.test(n))status='deferred';
    if(pickup||!dropoff)set('pickup',status,quote,e.id);
    if(dropoff||!pickup&&status!=='own_transport')set('dropoff',status,quote,e.id);
   }
   if(/tour|sightsee|itinerary|ha\s*long|halong|ninh binh|city tour|tham quan|lich trinh/.test(n)){
    let status:GuestFact['status']='interested';
    if(/no tours|not interested|don.t want|do not want|khong (?:can|muon)/.test(n))status='declined';
    else if(/prefer.{0,70}arriv|discuss.{0,70}arriv|upon (?:our )?arrival|later|trao doi sau|khi den/.test(n))status='deferred';
    set('itinerary',status,quote,e.id,status==='interested');
   }
  }
 }
 return facts.slice(-20);
}
export function validateProfile(value:unknown,events:ProfileEvent[]){
 const p=profileSchema.parse(value);
 for(const f of p.facts){
  if(!f.sources.every(s=>events.some(e=>e.kind==='guest'&&e.id===s.eventId&&normalize(e.guest_text).includes(normalize(s.quote)))))throw Error('PROFILE_UNSUPPORTED');
  const evidence=normalize(f.sources.map(s=>s.quote).join(' '));
  if(f.category==='stay'&&/connecting|twin|single beds|large bed|king bed|double bed|quiet room|high(?:er)? floor|non.smoking/.test(evidence)&&!/late check.?out|early check.?in|luggage|allerg|wheelchair|cot|crib/.test(evidence))f.category='room';
  if(f.category==='room'){
   if(/connecting/.test(evidence))f.summary=f.summary.replace(/liền kề/gi,'thông nhau (connecting)');
   if(/each with twin beds/.test(evidence)&&!/2 giường đơn|hai giường đơn/.test(f.summary))f.summary+=' Mỗi phòng 2 giường đơn (twin).';
  }
  // A guest requesting a room is not the hotel confirming that room.
  if(f.category==='room'||f.category==='stay')f.status='requested';
 }
 for(const category of ['arrival','departure','pickup','dropoff'] as const)if(p.facts.filter(f=>f.category===category).length>1)throw Error('PROFILE_CONFLICT');
 return p.facts;
}
export function followupDraft(base:{body:string;notes:string;kind:string},profile:GuestProfile,text:string,sent:{body:string}[]){
 if(!base.body||/cancel|refund|complaint|khieu nai|hoan tien|huy phong/.test(normalize(text)))return base;
 const vi=/[ăâđêôơư]/i.test(text),f=profile.facts,add:string[]=[];
 const categories=new Set(f.map(x=>x.category));
 // Current preferences from the entire thread, including earlier refusals, govern new drafts.
 const blocked=f.filter(x=>['pickup','dropoff'].includes(x.category)&&['declined','own_transport','deferred','arranged_by_guest'].includes(x.status));
 let body=base.body;
 if(blocked.length&&/For your airport transfer,/.test(body))body=body.replace(/For your airport transfer,[\s\S]*?(?=\n\n|$)/,'I have noted your transport preferences and will respect the arrangements you have already shared.');
 if(blocked.length&&/Về xe sân bay,/.test(body))body=body.replace(/Về xe sân bay,[\s\S]*?(?=\n\n|$)/,'Mình đã ghi nhận mong muốn di chuyển của bạn và sẽ theo các thông tin bạn đã cung cấp.');
 if(categories.has('room')&&!/room preferences|room arrangement|yeu cau.{0,15}phong/.test(normalize(body)))add.push(vi?'Mình đã ghi nhận yêu cầu phòng; khách sạn sẽ kiểm tra khả năng bố trí rồi xác nhận lại.':'We have also noted your room requests and will check availability before confirming the arrangement.');
 const asked=normalize(sent.map(s=>s.body).join(' '));
 if(categories.has('arrival')||categories.has('departure')){
  const pickup=!categories.has('pickup')&&!/would you like.{0,65}(?:pick.?up|transfer)|can xe don/.test(asked);
  const dropoff=!categories.has('dropoff')&&!/would you like.{0,65}(?:drop.?off|transfer)|can xe tien/.test(asked);
  if((pickup||dropoff)&&!/(?:would you like|ban co can).{0,80}(?:airport|san bay)/.test(normalize(body)))add.push(vi?`Bạn có cần mình hỗ trợ xe ${pickup&&dropoff?'đón hoặc tiễn':pickup?'đón':'tiễn'} sân bay không?`:`Would you like us to arrange an airport ${pickup&&dropoff?'pick-up or drop-off':pickup?'pick-up':'drop-off'}?`);
 }
 const itinerary=f.filter(x=>x.category==='itinerary');
 if(itinerary.some(x=>x.status==='deferred')){
  if(!/when you arrive|upon.{0,10}arrival|khi.{0,10}den/.test(normalize(body)))add.push(vi?'Mình đã ghi nhận bạn muốn trao đổi lịch trình khi đến Hà Nội. Mình là người bản địa và sẵn lòng chia sẻ gợi ý hữu ích khi bạn sẵn sàng.':'We can discuss sightseeing when you arrive, as you prefer. I am a local and would be happy to share useful tips when you are ready.');
 }else if(!itinerary.length&&!/places.{0,30}visit|plans.{0,30}hanoi|lich trinh|du dinh/.test(asked)&&!/[?？]/.test(text.slice(-1))&&(categories.has('arrival')||categories.has('room')||categories.has('departure'))){
  add.push(vi?'Bạn có lịch trình đi đâu hoặc dự kiến làm gì khi ở Hà Nội không? Mình là người bản địa ở đây nên có thể chia sẻ thông tin hữu ích cho bạn.':"Do you have any places you would like to visit or plans for your time in Hanoi? I am a local and would be happy to share useful tips.");
 }
 return {...base,body:[body,...add].join('\n\n'),notes:base.notes+' Đã đối chiếu nhu cầu trong toàn bộ hội thoại; yêu cầu phòng/dịch vụ chưa đồng nghĩa đã xác nhận.'};
}
