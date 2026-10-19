import {normalize,type GuestFact} from './ota-profile';
import {policyFor,formatMoney,chooseVehicle} from './hotel-policy-config';

// Two reply branches for OTA messages:
//  1. Services closed directly on the OTA extranet (airport car, spa, early check-in / late
//     check-out, hotel times): the draft states the configured, approved terms so Cua can copy it.
//  2. Tours: suggest the route (tour-advice) and ask for WhatsApp to send the detailed itinerary.
// Amounts appear only when the configuration marks them approved.
export type ServiceNeed='early_checkin'|'late_checkout'|'hotel_times'|'transfer'|'spa'|'tour_whatsapp';
export type ServiceReply={needs:ServiceNeed[];paragraphs:string[];internal:string[];transferParagraph?:string};

const partySize=(text:string)=>{const m=text.match(/\b(\d{1,2})\s*(?:adults?|people|persons|pax|guests|nguoi(?: lon)?|khach)\b/)||text.match(/\b(two|three|four|five|six)\s+(?:adults?|people|persons|of us)\b/);if(!m)return 0;const map:Record<string,number>={two:2,three:3,four:4,five:5,six:6};return map[m[1]]??Number(m[1]);};
const luggageCount=(text:string)=>{const m=text.match(/\b(\d{1,2}|two|three|four|five|six)\s+(?:suitcases?|bags?|luggage|pieces of luggage|vali|kien hanh ly)\b/);if(!m)return 0;const map:Record<string,number>={two:2,three:3,four:4,five:5,six:6};return map[m[1]]??Number(m[1]);};

export function serviceReply(input:{propertyId:string;text:string;facts:GuestFact[];vi:boolean;tourInterested:boolean;hasContact:boolean;tourPlaces?:string[]}):ServiceReply{
 const p=policyFor(input.propertyId),out:ServiceReply={needs:[],paragraphs:[],internal:[]};
 if(!p)return out;
 const n=normalize(input.text),vi=input.vi,k=vi?'vi':'en';
 // Complaints and cancellations get no service offers.
 if(/complain|refund|cancel|khieu nai|hoan tien|huy phong|not happy|disappoint/.test(n))return out;
 const blocked=(c:'pickup'|'dropoff')=>input.facts.some(f=>f.category===c&&['declined','own_transport','deferred','arranged_by_guest'].includes(f.status));
 const stayCheckIn=input.facts.some(f=>f.category==='stay'&&f.status==='requested'&&/check.?in|nhan phong/.test(normalize(f.summary+' '+f.sources[0].quote)));
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

 if(input.tourInterested&&p.tours.whatsappAsk){out.needs.push('tour_whatsapp');
  const ranges=p.tours.products.filter(t=>t.approved&&t.fromPrice!==null&&(input.tourPlaces||[]).some(pl=>normalize(pl).includes(normalize(t.place))||normalize(t.place).includes(normalize(pl))));
  const priceLine=ranges.map(t=>vi?`${t.title.vi}: từ ${formatMoney(t.fromPrice!,vi)}/${t.unit}.`:`${t.title.en}: from ${formatMoney(t.fromPrice!,vi)} per person.`).join(' ');
  out.paragraphs.push((priceLine?priceLine+' ':'')+(input.hasContact?(vi?'Mình sẽ gửi lịch trình chi tiết kèm ảnh qua WhatsApp bạn đã để lại.':'We will send the detailed itinerary with photos to the WhatsApp number you shared.'):(vi?'Để gửi bạn lịch trình chi tiết kèm ảnh (PDF), bạn cho mình xin số WhatsApp nhé?':'To send you the detailed itinerary with photos (PDF), could you share your WhatsApp number?')));
  if(!ranges.length)out.internal.push('Chưa có khoảng giá tour được duyệt cho tuyến khách hỏi: nháp chỉ xin WhatsApp, không nêu giá.');
 }
 return out;
}

// Puts the service paragraphs into a draft: the priced transfer paragraph replaces the generic one.
export function applyServiceReply(body:string,s:ServiceReply):string{
 if(!s.paragraphs.length)return body;
 let out=body,extra=[...s.paragraphs];
 if(s.transferParagraph){const generic=/(?:For your airport transfer,|Về xe sân bay,)[\s\S]*?(?=\n\n|$)/;if(generic.test(out)){out=out.replace(generic,s.transferParagraph);extra=extra.filter(x=>x!==s.transferParagraph);}}
 // Keep the reply on what the guest asked: drop the generic "would you like a pick-up?" question
 // whenever a service or tour paragraph answers the guest (at most the date/WhatsApp questions remain).
 if(s.needs.length)out=out.split('\n\n').filter(x=>!/^(?:Would you like us to arrange an airport|Bạn có cần mình hỗ trợ xe)/.test(x)).join('\n\n');
 return [out,...extra].filter(Boolean).join('\n\n');
}
