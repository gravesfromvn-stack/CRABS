import {normalize,clockTimes,type GuestFact} from './ota-profile';
import {guestContact} from './guest-contact';

// Short key points of what the guest needs, for the top of the conversation: arrival, special
// requests, payment, booking changes, transport, tours, contact. Each point names the day the
// guest said it, latest first within a topic. Read from guest messages only.
export type KeyPoint={topic:string;text:string;day:string;status:'need'|'info'|'done'};
type Ev={guest_text:string;received:string;kind:string};
const day=(iso:string)=>iso?`${iso.slice(8,10)}/${iso.slice(5,7)}`:'';

export function guestKeyPoints(events:Ev[],facts:GuestFact[]):KeyPoint[]{
 const msgs=events.filter(e=>e.kind==='guest'&&e.guest_text).sort((a,b)=>a.received.localeCompare(b.received));
 const out:KeyPoint[]=[];const add=(p:KeyPoint)=>{if(!out.some(x=>x.topic===p.topic&&x.text===p.text))out.push(p);};
 const lastWith=(re:RegExp)=>[...msgs].reverse().find(m=>re.test(normalize(m.guest_text)));
 // Arrival / departure from the profile (already separates flight time from hotel arrival).
 const arrival=facts.filter(f=>f.category==='arrival').at(-1);
 if(arrival){const t=clockTimes(arrival.summary)[0]||clockTimes(arrival.sources[0].quote)[0];add({topic:'Giờ đến',text:t?`Khoảng ${t}`+(arrival.summary.startsWith('Đến khách sạn')&&/chuyến bay/.test(arrival.summary)?` · ${arrival.summary.split('·').slice(1).join('·').trim()}`:''):arrival.summary.slice(0,120),day:'',status:'info'});}
 const departure=facts.filter(f=>f.category==='departure').at(-1);
 if(departure)add({topic:'Giờ đi',text:departure.summary.slice(0,120),day:'',status:'info'});
 // Special occasion and the items asked for.
 const occ=lastWith(/birthday|anniversary|honeymoon|sinh nhat|ky niem|trang mat/);
 const itemMsgs=msgs.filter(m=>/balloon|cake|bath bomb|bath cosmetic|flower|bong bay|banh (?:sinh nhat|kem)|hoa tuoi/.test(normalize(m.guest_text)));
 if(occ||itemMsgs.length){
  // Short follow-ups that only give the timing ("On Saturday after 10am please") belong to the surprise.
  const start=[occ,...itemMsgs].filter(Boolean).map(m=>m!.received).sort()[0];
  const timing=msgs.filter(m=>m.received>=start&&/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b|after \d{1,2}(?::\d{2})?\s?(?:am|pm)/.test(normalize(m.guest_text)));
  const n=normalize([...(occ?[occ]:[]),...itemMsgs,...timing].map(m=>m.guest_text).join(' '));
  const kind=/anniversary|ky niem/.test(n)?'Kỷ niệm':/honeymoon|trang mat/.test(n)?'Trăng mật':/birthday|sinh nhat/.test(n)?'Sinh nhật':'Bất ngờ trong phòng';
  const items=[['balloon|bong bay','bóng bay'],['cake|banh','bánh nhỏ'],['bath bomb|bath cosmetic','đồ tắm thư giãn'],['flower|hoa tuoi','hoa']].filter(([re])=>new RegExp(re).test(n)).map(([,v])=>v);
  const on=(n.match(/(?:on|for) the (\d{1,2})(?:st|nd|rd|th)?/)||[])[1],after=(n.match(/after (\d{1,2}(?::\d{2})?\s?(?:am|pm))/)||[])[1],wd=(n.match(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/)||[])[1];
  const when=[on&&`ngày ${on}`,wd&&{monday:'thứ Hai',tuesday:'thứ Ba',wednesday:'thứ Tư',thursday:'thứ Năm',friday:'thứ Sáu',saturday:'thứ Bảy',sunday:'Chủ nhật'}[wd],after&&`sau ${after}`].filter(Boolean).join(', ');
  const last=itemMsgs.at(-1)||occ!;
  add({topic:'Dịp đặc biệt',text:`${kind}${items.length?': '+items.join(', '):''}${when?` · đặt vào phòng ${when}`:''}${/surprise|bat ngo/.test(n)?' · giữ bí mật (bất ngờ)':''}`,day:day(last.received),status:'need'});
 }
 // Room features and other room requests from the profile.
 const tub=lastWith(/bath ?tub|bon tam/);if(tub)add({topic:'Yêu cầu phòng',text:'Muốn phòng có bồn tắm',day:day(tub.received),status:'need'});
 for(const f of facts.filter(f=>f.category==='room'))add({topic:'Yêu cầu phòng',text:f.summary.slice(0,110),day:'',status:'need'});
 const early=facts.filter(f=>f.category==='stay'&&f.status==='requested'&&/check.?in|nhan phong/.test(normalize(f.summary))).at(-1);
 if(early)add({topic:'Nhận/trả phòng',text:early.summary.slice(0,110),day:'',status:'need'});
 const late=lastWith(/late check.?out|tra phong muon/);if(late)add({topic:'Nhận/trả phòng',text:'Hỏi trả phòng muộn',day:day(late.received),status:'need'});
 const luggage=lastWith(/(?:leave|store|keep) (?:our |my |the )?(?:luggage|bags|suitcases)|giu hanh ly/);if(luggage)add({topic:'Yêu cầu phòng',text:'Gửi hành lý',day:day(luggage.received),status:'need'});
 // Money and booking changes.
 const cost=lastWith(/how much|cost|price|bao nhieu|\bgia\b/);
 if(cost){const n=normalize(cost.guest_text);const what=/extend|another \d+|extra night|gia han/.test(n)?'giá gia hạn phòng':/balloon|cake|bath|surprise|extra/.test(n)?'chi phí bất ngờ/dịch vụ thêm':/pick.?up|transfer|airport|xe/.test(n)?'giá xe sân bay':/tour|trip|cruise/.test(n)?'giá tour':/massage|spa/.test(n)?'giá spa':'chi phí';add({topic:'Hỏi giá',text:`Hỏi ${what}`,day:day(cost.received),status:'need'});}
 const pay=lastWith(/pay (?:when|once|on arrival|upon arrival|at (?:the )?(?:hotel|reception))|can i pay|thanh toan (?:khi|tai)/);if(pay)add({topic:'Thanh toán',text:'Muốn thanh toán tại khách sạn',day:day(pay.received),status:'need'});
 const ext=lastWith(/extend|another \d+ (?:days?|nights?)|extra nights?|stay longer|gia han|o them/);
 if(ext){const m=normalize(ext.guest_text).match(/(\d+|one|two|three|four|five) (?:more |extra )?(?:days?|nights?)/);add({topic:'Đổi booking',text:`Hỏi gia hạn${m?` thêm ${m[1]} ngày`:''} · cần kiểm tra phòng trống và giá`,day:day(ext.received),status:'need'});}
 const cancel=lastWith(/cancel|refund|huy (?:phong|dat)|hoan tien/);if(cancel)add({topic:'Đổi booking',text:'Nhắc hủy/hoàn tiền',day:day(cancel.received),status:'need'});
 // Transport and tours from the profile (status words from the guest).
 const label:Record<string,string>={interested:'quan tâm',declined:'không cần',own_transport:'tự đi',deferred:'để sau',arranged_by_guest:'đã tự thu xếp',provided:'đã cho',requested:'yêu cầu'};
 for(const c of ['pickup','dropoff'] as const){const f=facts.filter(x=>x.category===c).at(-1);if(f)add({topic:'Xe sân bay',text:`${c==='pickup'?'Đón':'Tiễn'}: ${label[f.status]||f.status}`,day:'',status:f.status==='interested'?'need':'info'});}
 const tour=facts.filter(x=>x.category==='itinerary').at(-1);if(tour)add({topic:'Tour',text:`${label[tour.status]||tour.status}: ${tour.summary.slice(0,90)}`,day:'',status:tour.status==='interested'?'need':'info'});
 // Contact.
 const contact=guestContact(msgs.map(m=>m.guest_text));
 const wa=lastWith(/whats ?app|zalo/);
 if(contact)add({topic:'Liên hệ',text:`WhatsApp ${contact.display}`,day:'',status:'info'});
 else if(wa)add({topic:'Liên hệ',text:'Nhắc WhatsApp nhưng chưa để số',day:day(wa.received),status:'info'});
 // Where the stay stands, from the guest's own words.
 const inRoom=lastWith(/thank you for (?:our|the) room|we (?:have )?arrived|checked in|room is (?:lovely|great|perfect)|da nhan phong/);if(inRoom)add({topic:'Tình trạng',text:'Khách đã nhận phòng',day:day(inRoom.received),status:'done'});
 const happy=lastWith(/it'?s perfect|so lovely|loved|amazing|wonderful|tuyet voi|rat hai long/);if(happy)add({topic:'Tình trạng',text:'Khách phản hồi hài lòng',day:day(happy.received),status:'done'});
 return out;
}
