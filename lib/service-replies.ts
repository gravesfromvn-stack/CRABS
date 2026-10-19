import {normalize,clockTimes,type GuestFact} from './ota-profile';
import {policyFor,formatMoney,chooseVehicle} from './hotel-policy-config';
import {catalogPolicy,type CatalogEntry} from './service-catalog';

// Two reply branches for OTA messages:
//  1. Services closed directly on the OTA extranet (airport car, spa, early check-in / late
//     check-out, hotel times): the draft states the configured, approved terms so Cua can copy it.
//  2. Tours: suggest the route (tour-advice) and ask for WhatsApp to send the detailed itinerary.
// Amounts appear only when the configuration marks them approved.
export type ServiceNeed='early_checkin'|'late_checkout'|'hotel_times'|'transfer'|'spa'|'tour_whatsapp'|'occasion'|'room_feature'|'payment'|'extension'|'thanks'|'arrival'|'contact';
export type ServiceReply={needs:ServiceNeed[];paragraphs:string[];internal:string[];transferParagraph?:string;vi?:boolean};

const partySize=(text:string)=>{const m=text.match(/\b(\d{1,2})\s*(?:adults?|people|persons|pax|guests|nguoi(?: lon)?|khach)\b/)||text.match(/\b(two|three|four|five|six)\s+(?:adults?|people|persons|of us)\b/);if(!m)return 0;const map:Record<string,number>={two:2,three:3,four:4,five:5,six:6};return map[m[1]]??Number(m[1]);};
const luggageCount=(text:string)=>{const m=text.match(/\b(\d{1,2}|two|three|four|five|six)\s+(?:suitcases?|bags?|luggage|pieces of luggage|vali|kien hanh ly)\b/);if(!m)return 0;const map:Record<string,number>={two:2,three:3,four:4,five:5,six:6};return map[m[1]]??Number(m[1]);};

// history: earlier guest messages of the conversation, to read short follow-ups in context
// (e.g. "On Friday after 9am please" after a surprise request).
export function serviceReply(input:{catalog?:CatalogEntry[];propertyId:string;text:string;facts:GuestFact[];vi:boolean;tourInterested:boolean;hasContact:boolean;tourPlaces?:string[];history?:string}):ServiceReply{
 const p=catalogPolicy(policyFor(input.propertyId),input.catalog,input.propertyId),out:ServiceReply={needs:[],paragraphs:[],internal:[],vi:input.vi};
 if(!p)return out;
 const n=normalize(input.text),vi=input.vi,k=vi?'vi':'en',h=normalize(input.history||'');
 // Complaints and cancellations get no service offers.
 if(/complain|refund|cancel|khieu nai|hoan tien|huy phong|not happy|disappoint/.test(n))return out;
 const blocked=(c:'pickup'|'dropoff')=>input.facts.some(f=>f.category===c&&['declined','own_transport','deferred','arranged_by_guest'].includes(f.status));
 // Facts said in this message (not earlier ones), so answers are not repeated every turn.
 const saidNow=(f:GuestFact)=>f.sources.some(s=>n.includes(normalize(s.quote).slice(0,40)));
 const stayCheckIn=input.facts.some(f=>f.category==='stay'&&f.status==='requested'&&saidNow(f)&&/check.?in|nhan phong/.test(normalize(f.summary+' '+f.sources[0].quote)));
 // Arrival time given in this message: acknowledge it against the hotel's check-in time.
 const arrival=input.facts.filter(f=>f.category==='arrival'&&saidNow(f)).at(-1);
 const arrivalAt=arrival?(clockTimes(arrival.summary)[0]||clockTimes(arrival.sources[0].quote)[0]||''):'';
 if(arrivalAt){out.needs.push('arrival');const early=arrivalAt<p.checkIn&&!stayCheckIn;
  out.paragraphs.push(vi?`Mình đã ghi nhận bạn đến khoảng ${arrivalAt}. Giờ nhận phòng từ ${p.checkIn}${early?`; nếu muốn vào phòng sớm hơn, khách sạn sẽ kiểm tra phòng trống trong ngày (nhận phòng sớm có phụ thu ${p.earlyCheckIn.fee.vi})`:''}.`:`We have noted your arrival around ${arrivalAt}. Check-in is from ${p.checkIn}${early?`; if you would like the room earlier, we will check availability on the day (early check-in is ${p.earlyCheckIn.fee.en})`:''}.`);}
 const early=stayCheckIn||/early check.?in|check.?in (?:early|earlier)|arrive early|nhan phong som/.test(n);
 const late=/late check.?out|check.?out (?:late|later)|tra phong muon|stay (?:until|till) \d|keep (?:the|our) room/.test(n);
 const times=/what time (?:is|can we|do we) check.?(?:in|out)|check.?(?:in|out) time|gio (?:nhan|tra) phong|nhan phong (?:luc|tu) may gio/.test(n);
 const wantsPickup=/pick.?up|from (?:the )?airport|airport to (?:the )?hotel|xe don|don (?:tai|o) san bay/.test(n)&&!blocked('pickup');
 const wantsDropoff=/drop.?off|to (?:the )?airport|xe tien|tien san bay/.test(n)&&!blocked('dropoff');
 const transfer=(wantsPickup||wantsDropoff||/airport (?:transfer|car|taxi|shuttle)|xe san bay/.test(n))&&!(blocked('pickup')&&blocked('dropoff'));
 const spa=/\bspa\b|massage|mat xa|xoa bop/.test(n);

 if(early){out.needs.push('early_checkin');const r=p.earlyCheckIn;
  out.paragraphs.push(vi?`Giờ nhận phòng tiêu chuẩn từ ${p.checkIn}. Nhận phòng sớm từ ${r.from} đến ${r.until} có phụ thu ${r.fee.vi}, ${r.condition.vi}; khách sạn sẽ xác nhận lại vào ngày bạn đến.`:`Standard check-in is from ${p.checkIn}. Early check-in between ${r.from} and ${r.until} is available at ${r.fee.en}, ${r.condition.en}; we will confirm it on your arrival day.`);}
 if(late){out.needs.push('late_checkout');const r=p.lateCheckOut;
  out.paragraphs.push(vi?`Giờ trả phòng tiêu chuẩn trước ${p.checkOut}. Trả phòng muộn đến ${r.until} có phụ thu ${r.fee.vi}, ${r.condition.vi}.`:`Standard check-out is by ${p.checkOut}. Late check-out until ${r.until} is available at ${r.fee.en}, ${r.condition.en}.`);}
 if(times&&!early&&!late){out.needs.push('hotel_times');out.paragraphs.push(vi?`Giờ nhận phòng từ ${p.checkIn} và trả phòng trước ${p.checkOut}.`:`Check-in is from ${p.checkIn} and check-out is by ${p.checkOut}.`);}

 if(transfer){out.needs.push('transfer');const t=p.airportTransfer;
  const dirs=(wantsPickup||wantsDropoff)?[...(wantsPickup?['pickup' as const]:[]),...(wantsDropoff?['dropoff' as const]:[])]:(['pickup','dropoff'] as const).filter(d=>!blocked(d));
  const guests=partySize(n),bags=luggageCount(n),fit=chooseVehicle(p,guests,bags);
  if(t.approved&&t.vehicles.some(v=>dirs.some(d=>v[d]!==null))){
   const label=(d:'pickup'|'dropoff')=>vi?(d==='pickup'?'Đón sân bay':'Tiễn sân bay'):(d==='pickup'?'Airport pick-up':'Airport drop-off');
   const list=dirs.map(d=>`${label(d)}: `+t.vehicles.filter(v=>v[d]!==null).map(v=>`${vi?'xe':''} ${v.seats}${vi?' chỗ':'-seat'} ${formatMoney(v[d]!,vi)}`.trim()).join(' · ')).join('\n');
   const advice=fit?(vi?` Với ${guests} khách${bags?` và ${bags} vali`:''}, xe ${fit.seats} chỗ là phù hợp.`:` For ${guests} guest${guests>1?'s':''}${bags?` with ${bags} bag${bags>1?'s':''}`:''}, the ${fit.seats}-seat car fits well.`):'';
   const text=vi?`Xe riêng ${t.route.vi}, giá một chiều:\n${list}\n${t.includes.vi}${advice} Bạn chỉ cần trả lời xác nhận loại xe ngay tại đây, khách sạn sẽ đặt xe và gửi thông tin tài xế.`:`Private car, ${t.route.en}, one-way price:\n${list}\n${t.includes.en}${advice} Simply reply here to confirm the car and we will book it and send you the driver details.`;
   out.paragraphs.push(text);out.transferParagraph=text;
  }else{
   const text=vi?'Khách sạn có xe riêng đón/tiễn sân bay; mình sẽ gửi giá cho nhóm của bạn ngay khi kiểm tra xong.':'We can arrange a private airport car; we will send you the price for your group shortly.';
   out.paragraphs.push(text);out.transferParagraph=text;
   out.internal.push(`Giá xe sân bay cho cơ sở này chưa được duyệt trong cấu hình (${t.approvedNote}).`);
  }
  if(!fit&&guests)out.internal.push(`Nhóm ${guests} khách vượt sức chứa xe cấu hình: Cua chọn xe/ghép xe.`);
 }

 if(spa){out.needs.push('spa');const s=p.spa;const priced=s.approved&&s.items.some(i=>i.price!==null);
  if(priced){
   const groups=new Map<string,string[]>();for(const i of s.items.filter(i=>i.price!==null)){const name=i.name[k];groups.set(name,[...(groups.get(name)||[]),`${i.minutes} ${vi?'phút':'min'} ${formatMoney(i.price!,vi)}`]);}
   const menu=[...groups].map(([name,v])=>`${name}: ${v.join(' · ')}`).join('\n');
   out.paragraphs.push((vi?`Menu spa của khách sạn:\n${menu}`:`Our spa menu:\n${menu}`)+(s.advanceBookingOffer?'\n'+s.advanceBookingOffer[k]:'')+(vi?'\nBạn trả lời giờ mong muốn tại đây để khách sạn giữ lịch cho bạn.':'\nReply here with your preferred time and we will book the session for you.'));
  }else{
   out.paragraphs.push(vi?'Spa của khách sạn có massage truyền thống Việt Nam, massage tinh dầu và massage chân, liệu trình 60 hoặc 90 phút. Mình sẽ gửi bảng giá và khung giờ còn trống cho bạn.':'Our spa offers Vietnamese traditional, aroma and foot massage in 60- or 90-minute sessions. We will send you the price list and available times.');
   out.internal.push('Bảng giá Spa chưa có/chưa duyệt trong cấu hình: nhập giá vào lib/hotel-policy-config.json.');
  }
 }

 // In-stay requests: answered warmly, nothing promised or priced until the team has checked.
 const itemDefs:[string,string,string][]=[['balloon|bong bay','balloons','bóng bay'],['cake|banh (?:sinh nhat|kem)','a small cake','bánh nhỏ'],['bath bomb|bath cosmetic','bath cosmetics','đồ tắm thư giãn'],['flower|hoa tuoi|bo hoa','flowers','hoa']];
 const itemsIn=(t:string)=>itemDefs.filter(([re])=>new RegExp(re).test(t)).map(([,en,v])=>vi?v:en);
 const joinList=(a:string[])=>a.join(vi?', ':', ').replace(/, ([^,]*)$/,vi?' và $1':' and $1');
 // A confirmation question names exactly what the guest wants confirmed; other items in the
 // message may be praise for what was already done ("the balloons are fab").
 const sentences=n.split(/(?<=[.!?])\s+/);
 const confirmSentence=sentences.find(s=>/(?:can i|could you|please) confirm|to confirm|is it still/.test(s)&&itemsIn(s).length);
 const items=confirmSentence?itemsIn(confirmSentence):itemsIn(n);
 // "He deleted the message so it didn't spoil the surprise" is about secrecy, not a new request.
 const secrecy=/spoil|secret|surprise (?:is )?safe|didnt read|deleted the message|bi mat/.test(n);
 const occasionNow=!secrecy&&/birthday|anniversary|honeymoon|sinh nhat|ky niem|trang mat|surprise|bat ngo/.test(n)||items.length>0;
 const occasionBefore=/birthday|anniversary|honeymoon|sinh nhat|ky niem|surprise|bat ngo|balloon|cake/.test(h);
 const whenRe=/\b(?:on|for) the \d{1,2}(?:st|nd|rd|th)?(?: morning| afternoon| evening)?\b|\b(?:on )?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?: morning| afternoon| evening)?\b|after \d{1,2}(?:[:.]\d{2})?\s?(?:am|pm)\b|\bthe \d{1,2}(?:st|nd|rd|th) morning\b|\bngay \d{1,2}\b/g;
 const found=[...new Set((n.match(whenRe)||[]).map(x=>x.replace(/^(?:on|for) /,'')))];
 const day=(s:string)=>s.replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,w=>w[0].toUpperCase()+w.slice(1));
 // Keep the most specific mention ("the 16th morning" over "the 16th").
 const when=found.filter(x=>!found.some(y=>y!==x&&y.includes(x))).map(day).join(', ');
 // Praise for what the hotel already did, not a polite "that's lovely" to an offer.
 const praise=/(?:room|balloon|decoration|cake|surprise)[^.!?]{0,30}\b(?:lovely|fab|perfect|beautiful|amazing|wonderful)|(?:lovely|fab|perfect|beautiful|amazing|wonderful)[^.!?]{0,20}\b(?:room|balloon|decoration)|thank you for (?:our|the) room/.test(n);
 if(occasionNow||(occasionBefore&&when)){out.needs.push('occasion');
  const kind=/anniversary|ky niem/.test(n)?(vi?'kỷ niệm':'anniversary'):/honeymoon|trang mat/.test(n)?(vi?'tuần trăng mật':'honeymoon'):/birthday|sinh nhat/.test(n)?(vi?'sinh nhật':'birthday'):'';
  const firstTime=!occasionBefore;
  const thanksFor=praise?(vi?'Rất vui vì bạn thích phòng và phần trang trí! ':'We are delighted you like the room and the decorations! '):'';
  const at=when?(vi?` (${when})`:` (${when})`):'';
  if(confirmSentence&&items.length)out.paragraphs.push(thanksFor+(vi?`Mình đã ghi nhận ${joinList(items)} cho bất ngờ${at}; lễ tân sẽ xác nhận lại với bộ phận chuẩn bị và báo bạn.`:`Noted: ${joinList(items)} for the surprise${at}. Our team will double-check the arrangement and confirm with you.`));
  else if(!firstTime&&items.length)out.paragraphs.push(thanksFor+(vi?`Mình đã ghi nhận ${joinList(items)} cho bất ngờ${at}. Lễ tân sẽ báo bạn chi phí sớm nhất.`:`Of course: we have noted ${joinList(items)} for the surprise${at}. We will confirm the cost with you shortly.`));
  else if(!firstTime&&when)out.paragraphs.push(thanksFor+(vi?`Mình đã ghi nhận thời gian đặt bất ngờ vào phòng: ${when}, khi bạn ra ngoài.`:`Noted: we will place the surprise in your room on ${when}, while you are out.`));
  else if(!firstTime)out.paragraphs.push(thanksFor+(vi?'Mình đã ghi nhận yêu cầu cho bất ngờ của bạn.':'Noted for the surprise.'));
  else out.paragraphs.push(thanksFor+(vi?`${kind?`Chúc mừng ${kind} sớm! `:''}Khách sạn rất vui được chuẩn bị bất ngờ nhỏ trong phòng${items.length?` gồm ${joinList(items)}`:' (ví dụ bóng bay, bánh nhỏ, đồ tắm thư giãn)'}${at}. Mình sẽ xác nhận lại món chuẩn bị và chi phí trước khi thực hiện.`:`${kind?`Happy early ${kind}! `:''}We would be glad to prepare a small surprise in your room${items.length?` with ${joinList(items)}`:', for example balloons, a small cake and bath cosmetics'}${at}. We will confirm the items and the cost with you before arranging it.`));
  out.internal.push('Dịp đặc biệt: chưa có gói/giá trang trí trong cấu hình; Cua chốt món, giờ đặt vào phòng và chi phí.');
 }
 // The guest mentions WhatsApp without a number, or asks to keep a surprise secret.
 if(/whats ?app/.test(n)&&!input.hasContact){out.needs.push('contact');
  out.paragraphs.push(vi?'Cảm ơn bạn đã báo. Mình sẽ tiếp tục trao đổi tại đây trên tin nhắn đặt phòng; nếu bạn muốn dùng WhatsApp, bạn cho mình xin đúng số cần liên hệ nhé.':'Thank you for letting us know. We will keep replying here on the booking messages; if you prefer WhatsApp, please share the number you would like us to use.');}
 if(secrecy){out.needs.push('occasion');
  out.paragraphs.push(vi?'Thật tốt là bất ngờ vẫn được giữ kín! Mình sẽ chỉ trao đổi chi tiết với bạn tại đây.':'Glad the surprise is still safe! We will keep all the details between us here.');}
 if(/bath ?tub|bon tam/.test(n)){out.needs.push('room_feature');
  out.paragraphs.push(vi?'Phòng có bồn tắm tùy tình trạng phòng trong ngày bạn ở; khách sạn sẽ kiểm tra và báo lại phòng có thể bố trí.':'Rooms with a bathtub depend on availability for your dates; we will check and let you know which room we can offer.');}
 if(/pay (?:when|once) (?:i|we) (?:get|arrive)|pay (?:on|upon) arrival|pay at (?:the )?(?:hotel|reception|check.?in)|can i pay (?:when|there|at)|thanh toan (?:khi|tai) (?:den|khach san|le tan)/.test(n)){out.needs.push('payment');
  out.paragraphs.push(vi?'Mình đã ghi nhận bạn muốn thanh toán tại khách sạn; lễ tân sẽ xác nhận cùng với chi phí dịch vụ.':'We have noted that you would like to pay at the hotel; our reception will confirm this together with the cost of the extras.');}
 const ext=n.match(/extend(?:ed|ing)? (?:our|my|the) stay(?: for)?(?: another| an extra)? (\d+|one|two|three|four|five) (?:more )?(?:days?|nights?)|another (\d+|one|two|three|four|five) (?:days?|nights?)|(\d+|one|two|three|four|five) (?:more|extra) (?:days?|nights?)|gia han|o them (\d+) (?:dem|ngay)/);
 if(ext||/extend(?:ed|ing)? (?:our|my|the) stay|stay longer/.test(n)){out.needs.push('extension');const count=ext?.slice(1).find(Boolean)||'';
  out.paragraphs.push(vi?`Mình sẽ kiểm tra phòng trống${count?` cho ${count} đêm thêm`:' cho các đêm thêm'} và gửi bạn giá phòng; khi bạn đồng ý, mình hướng dẫn cách gia hạn trên đặt phòng hiện tại.`:`We will check availability${count?` for ${count} more nights`:' for the extra nights'} and send you the room rate; once you are happy with it, we will guide you on extending your current reservation.`);
  out.internal.push('Gia hạn lưu trú: kiểm tra phòng trống và giá trên OTA/PMS; không báo giá trong nháp khi chưa có giá.');
 }
 // Thanks or a simple update with nothing else to answer: a short, warm acknowledgement.
 if(!out.needs.length&&!input.tourInterested){
  const thanks=/thank|perfect|lovely|wonderful|great|cam on|tuyet voi/.test(n),update=/we are (?:out|leaving|back|on our way)|out now|just landed|we have arrived|da den|dang ra ngoai/.test(n);
  if(thanks||update){out.needs.push('thanks');
   out.paragraphs.push(vi?(update?'Cảm ơn bạn đã báo. Chúc bạn một ngày thật vui!':'Rất vui vì bạn hài lòng. Chúc bạn có kỳ nghỉ thật đáng nhớ!'):(update?'Thank you for letting us know. Have a wonderful day!':'You are very welcome; we are so glad you are enjoying your stay. Have a lovely time!'));}
 }
 if(input.tourInterested&&p.tours.whatsappAsk){out.needs.push('tour_whatsapp');
  const ranges=p.tours.products.filter(t=>t.approved&&t.fromPrice!==null&&(input.tourPlaces||[]).some(pl=>normalize(pl).includes(normalize(t.place))||normalize(t.place).includes(normalize(pl))));
  const priceLine=ranges.map(t=>vi?`${t.title.vi}: từ ${formatMoney(t.fromPrice!,vi)}/${t.unit}.`:`${t.title.en}: from ${formatMoney(t.fromPrice!,vi)} per person.`).join(' ');
  out.paragraphs.push((priceLine?priceLine+' ':'')+(input.hasContact?(vi?'Mình sẽ gửi lịch trình chi tiết kèm ảnh qua WhatsApp bạn đã để lại.':'We will send the detailed itinerary with photos to the WhatsApp number you shared.'):(vi?'Để gửi bạn lịch trình chi tiết kèm ảnh (PDF), bạn cho mình xin số WhatsApp nhé?':'To send you the detailed itinerary with photos (PDF), could you share your WhatsApp number?')));
  if(!ranges.length)out.internal.push('Chưa có khoảng giá tour được duyệt cho tuyến khách hỏi: nháp chỉ xin WhatsApp, không nêu giá.');
 }
 return out;
}

// WhatsApp follow-up for a tour enquiry: the sourced programme first, the classes to choose from,
// what the guest already gave (never asked again), no price, and one question.
const variantEn:[RegExp,string][]=[[/Tiêu chuẩn/g,'Standard'],[/Bắt đầu tại bến Hạ Long/g,'starts at the Ha Long pier'],[/không xe Hà Nội/g,'no transfer from Hanoi'],[/Từ Phố Cổ Hà Nội/g,'from the Hanoi Old Quarter'],[/limousine (\d+[/–-]\d+) (?:ghế|chỗ)/g,'$1-seat limousine'],[/Dcar (\d+[/–-]\d+) (?:ghế|chỗ)/gi,'$1-seat DCar van'],[/xe (\d+[/–-]\d+) (?:ghế|chỗ)/g,'$1-seat coach'],[/set menu/g,'set-menu lunch'],[/\bbuffet\b/g,'buffet lunch'],[/ · /g,' – ']];
function variantLabel(title:string,vi:boolean){const part=title.includes(' / ')?title.split(' / ').slice(1).join(' / '):title;if(vi)return part;let s=part;for(const [re,v] of variantEn)s=s.replace(re,v);return /[ăâđêôơưàáạảãèéẹẻẽìíịỉĩòóọỏõùúụủũỳýỵỷỹ]/i.test(s)?'':s;}
type TourLike={constraints:{date:string;party:string;children:boolean;childAges:number[]};options:{guestName:{en:string;vi:string}|null;guestFacts:{en:string;vi:string}[];considerations:{en:string;vi:string}[];variants?:{title:string}[]}[]};
export function whatsappTourMessage(a:TourLike,guestName:string,vi:boolean):string{
 const k=vi?'vi':'en',c=a.constraints,name=guestName.trim();
 const known=[c.date&&(vi?`ngày ${c.date}`:c.date),c.party].filter(Boolean).join(vi?', ':', ');
 const lines:string[]=[vi?`Chào ${name||'bạn'}, mình là lễ tân khách sạn. Cảm ơn bạn đã để lại số WhatsApp.`:`Hello ${name||'there'}, this is the hotel reception team. Thank you for sharing your WhatsApp number.`];
 const opts=a.options.filter(o=>o.guestName);
 if(!opts.length){lines.push(vi?'Mình sẽ gửi bạn lịch trình chi tiết ngay khi chuẩn bị xong.':'We will send you the detailed itinerary as soon as it is ready.');return lines.join('\n\n');}
 const choices:string[]=[];
 for(const o of opts){
  lines.push((vi?`Thông tin ${o.guestName!.vi}`:`Here are the details of the ${o.guestName!.en}`)+(known?` (${known})`:'')+':\n'+[...o.guestFacts,...o.considerations].map(f=>'• '+f[k]).join('\n'));
  for(const v of o.variants||[]){const l=variantLabel(v.title,vi);if(l&&!choices.includes(l))choices.push(l);}
 }
 if(choices.length>1)lines.push((vi?'Bạn có thể chọn hạng dịch vụ:':'You can choose the level of comfort:')+'\n'+choices.map((x,i)=>`${i+1}. ${x}`).join('\n'));
 const partyText=c.party?(vi?` cho ${c.party}`:` for ${c.party}`):'';
 lines.push(choices.length>1?(vi?`Bạn muốn chọn phương án nào? Mình sẽ kiểm tra chỗ và gửi giá${partyText} ngay sau đó.`:`Which option would you like? We will then check availability and send you the price${partyText}.`):(vi?`Lịch trình này có phù hợp với bạn không? Mình sẽ kiểm tra chỗ và gửi giá${partyText} ngay sau đó.`:`Does this programme suit you? We will then check availability and send you the price${partyText}.`));
 return lines.join('\n\n');
}

// Puts the service paragraphs into a draft: the priced transfer paragraph replaces the generic one.
export function applyServiceReply(body:string,s:ServiceReply):string{
 if(!s.paragraphs.length)return body;
 let out=body,extra=[...s.paragraphs];
 if(s.transferParagraph){const generic=/(?:For your airport transfer,|Về xe sân bay,)[\s\S]*?(?=\n\n|$)/;if(generic.test(out)){out=out.replace(generic,s.transferParagraph);extra=extra.filter(x=>x!==s.transferParagraph);}}
 // Keep the reply on what the guest asked: drop the generic "would you like a pick-up?" question
 // whenever a service or tour paragraph answers the guest (at most the date/WhatsApp questions remain).
 // The specific arrival acknowledgement replaces the generic one; a "plans in Hanoi?" question is
 // left out while the guest is asking about something else.
 if(s.needs.length)out=out.split('\n\n').filter(x=>!/^(?:Would you like us to arrange an airport|Bạn có cần mình hỗ trợ xe|Do you have any places you would like to visit|Bạn có muốn đi đâu)/.test(x)&&!(s.needs.includes('arrival')&&/^(?:I have noted the arrival details you provided|Mình đã ghi nhận thông tin về việc đến khách sạn)/.test(x))).join('\n\n');
 // A reply made only of service paragraphs still opens with a greeting, except a short thank-you.
 if(!out.trim()&&!(s.needs.length===1&&s.needs[0]==='thanks'))out=s.vi?'Chào bạn, cảm ơn bạn đã nhắn tin.':'Hello, thank you for your message.';
 return [out,...extra].filter(Boolean).join('\n\n');
}
