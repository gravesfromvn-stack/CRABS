import {clockTimes,normalize} from './ota-profile';
import {formatMoney,type PropertyPolicy} from './hotel-policy-config';
import {detectApology} from './apology-letters';
import {withoutOrigins} from './guest-origin';
import type {CatalogEntry} from './service-catalog';

// Front-desk rules from the PO's Old Quarter operations brief (20/10/2026): arrival time (ETA) on the
// check-in day, who answers a request (reception or tour sales), complaints at every stage of the
// stay, shift checklists and who may see supplier costs. Rules only; drafts still wait for Cua.

// ── ETA on the check-in day ────────────────────────────────────────────────
export type EtaStatus='MISSING_ETA'|'EARLY_ARRIVAL'|'CONFIRMED_ETA';
export type RoomReadiness='WAITING_ETA'|'CLEANING_PRIORITY'|'READY_FOR_GUEST';
export const etaLabels:Record<EtaStatus,string>={MISSING_ETA:'Chưa có giờ về',EARLY_ARRIVAL:'Đến sớm · Ưu tiên dọn phòng #1',CONFIRMED_ETA:'Đã có giờ về'};
export const readinessLabels:Record<RoomReadiness,string>={WAITING_ETA:'Chờ giờ về',CLEANING_PRIORITY:'Ưu tiên dọn',READY_FOR_GUEST:'Phòng sẵn sàng'};
export type Eta={status:EtaStatus;time:string;flight:string;basis:'hotel'|'landing'|'flight'|'pickup'|'';quote:string};
// Driving time Noi Bai → Old Quarter, added to a landing time to estimate the hotel arrival.
export const AIRPORT_MINUTES=60;
const AIRLINE='VN|VJ|QH|BL|VU|SQ|TG|CX|KE|OZ|JL|NH|CZ|MU|CA|QR|EK|TK|AF|LH|BA|AK|FD|PG|MH|CI|BR|3K|TR|5J|EY|KL|DD|OD|SL|VZ|HX|UO|ZE|TW|7C|LJ|BX|MM|IT|JX';
const FLIGHT=new RegExp(`\\b(${AIRLINE})\\s?-?(\\d{2,4})\\b`,'i');
const LANDING=/\b(?:land|lands|landing|touch(?:es)? down|flight (?:arrives|lands|gets in)|arrive at (?:the )?airport|arriving at (?:noi bai|the airport))\b|ha canh|toi san bay|den san bay/;
const ARRIVAL=/\barriv|get (?:to|in)|reach|be (?:there|at the hotel)|come (?:at|around)|around|check.?in (?:at|around)|\beta\b|den (?:khach san|noi|luc|khoang)|toi (?:khach san|noi|luc|khoang)|ve (?:khach san|toi)|co mat/;
const addMinutes=(t:string,m:number)=>{const [h,mm]=t.split(':').map(Number),x=h*60+mm+m;return x>=1440?'':`${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;};
export function flightCode(text:string){const m=text.match(FLIGHT);return m?(m[1]+m[2]).toUpperCase():'';}

// Latest guest message that gives a time or a flight decides; a booked pick-up also counts as known.
export function etaFrom(messages:{text:string;at:string}[],opts:{checkInTime?:string;pickupBooked?:boolean}={}):Eta{
 const checkIn=opts.checkInTime||'14:00';
 const status=(t:string):EtaStatus=>t&&t>='05:00'&&t<checkIn?'EARLY_ARRIVAL':'CONFIRMED_ETA';
 for(const m of [...messages].sort((a,b)=>b.at.localeCompare(a.at))){
  const n=normalize(m.text),times=clockTimes(m.text),flight=flightCode(m.text),quote=m.text.slice(0,160);
  // A flight number with a time is the landing time unless the guest says it is the hotel arrival.
  if(times.length&&(LANDING.test(n)||flight&&!/(?:at|to|reach) the hotel|den khach san|toi khach san/.test(n))){const t=addMinutes(times[0],AIRPORT_MINUTES);return {status:t?status(t):'CONFIRMED_ETA',time:t||times[0],flight,basis:'landing',quote};}
  if(times.length&&(ARRIVAL.test(n)||flight))return {status:status(times[0]),time:times[0],flight,basis:'hotel',quote};
  if(flight)return {status:'CONFIRMED_ETA',time:'',flight,basis:'flight',quote};
 }
 if(opts.pickupBooked)return {status:'CONFIRMED_ETA',time:'',flight:'',basis:'pickup',quote:''};
 return {status:'MISSING_ETA',time:'',flight:'',basis:'',quote:''};
}
export const defaultReadiness=(e:Eta):RoomReadiness=>e.status==='EARLY_ARRIVAL'?'CLEANING_PRIORITY':'WAITING_ETA';

// One-tap message asking the arrival time, with the airport pick-up offer at the approved prices.
export function etaPrompt(p:PropertyPolicy,guestName:string,vi=false):string{
 const cars=p.airportTransfer.approved?p.airportTransfer.vehicles.filter(v=>v.pickup!==null&&v.seats<=7).map(v=>vi?`${formatMoney(v.pickup!,true)} xe ${v.seats} chỗ`:`${formatMoney(v.pickup!,false)} for a ${v.seats}-seat ${v.seats<=4?'car':'SUV'}`):[];
 const hotel=p.displayName;
 return vi
  ?`Chào ${guestName||'bạn'}, lễ tân ${hotel} xin gửi lời chào!\nĐể bộ phận Buồng phòng ưu tiên chuẩn bị phòng sạch đẹp, sẵn sàng khi bạn đến hôm nay, bạn cho khách sạn biết giờ dự kiến đến khách sạn (hoặc số hiệu chuyến bay/tàu) nhé?\n\nNếu bạn cần xe riêng đón sân bay, tài xế chờ ở cửa ra với bảng tên${cars.length?` (${cars.join(' / ')})`:''}, bạn chỉ cần gửi thông tin chuyến bay, khách sạn sẽ sắp xếp và xác nhận lại với bạn.`
  :`Dear ${guestName||'Guest'}, warm greetings from the ${hotel} Front Desk!\nTo help our Housekeeping team prioritise preparing your room so it is spotless and ready on your arrival today, could you kindly share your estimated arrival time at the hotel (or your flight/train number)?\n\nIf you would like a private airport pick-up, with our driver waiting at the arrival gate holding a welcome sign${cars.length?` (${cars.join(' / ')})`:''}, simply reply with your flight details and we will arrange it and confirm with you.`;
}

// ── Who answers: reception or tour sales ────────────────────────────────────
export type AssignedRole='RECEPTIONIST'|'SALE';
export const roleLabels:Record<AssignedRole,string>={RECEPTIONIST:'[LỄ TÂN XÁC NHẬN]',SALE:'[CHUYỂN SALER TOUR]'};
const TOUR=/\btours?\b|excursion|cruise|day trip|sightseeing|ha ?long|lan ha|ninh binh|trang an|tam coc|sa ?pa|fansipan|ha giang|jeep|tham quan|du thuyen/;
const RECEPTION=/pick.?up|drop.?off|airport|transfer|\bcar\b|taxi|\bspa\b|massage|room|bed|check.?in|check.?out|arriv|land|flight|eta|xe (?:don|tien)|san bay|phong|giuong|nhan phong|tra phong/;
export function routeRequest(text:string,allowReceptionistTourSales=false):{roles:AssignedRole[];tour:boolean;reception:boolean}{
 const n=withoutOrigins(normalize(text)),tour=TOUR.test(n),reception=RECEPTION.test(n);
 const roles:AssignedRole[]=[];if(reception||tour&&allowReceptionistTourSales)roles.push('RECEPTIONIST');if(tour&&!allowReceptionistTourSales)roles.push('SALE');
 return {roles,tour,reception};
}
// Tour question while a sales team exists: reception passes it on, no promise of a time or a price.
export function tourHandoffReply(vi:boolean,salerName=''):string{
 return vi?`Cảm ơn bạn đã quan tâm khám phá miền Bắc Việt Nam cùng khách sạn! Để bạn có lịch trình phù hợp nhất với thời gian của mình, lễ tân đã chuyển yêu cầu tới chuyên viên tour${salerName?` (${salerName})`:''} của khách sạn. Chuyên viên sẽ xem các lựa chọn còn chỗ cho ngày bạn đi và gửi bạn báo giá chi tiết ngay tại đây.`
  :`Thank you for your interest in exploring Northern Vietnam with us! To make sure you get the itinerary that best matches your schedule, we have passed your request to our Tour Specialist${salerName?` (${salerName})`:''}, who will review the available options for your dates and send you a tailored quotation right here.`;
}
// Small hotel without a sales team: reception offers the main tours at their approved catalog prices.
// The PO's brief named Ha Long 5-star cruise 1.450.000đ and Ninh Binh 1.150.000đ; those prices are not
// approved in the catalog yet, so the closest approved day tours are used until Cua approves them.
export const RECEPTION_TOURS=['HL02','NB01','HN04'];
export function receptionTourOffer(entries:CatalogEntry[],ids:string[],vi:boolean):string{
 const list=ids.map(id=>entries.find(e=>e.id===id)).filter((e):e is CatalogEntry=>Boolean(e&&e.status==='APPROVED'&&e.sellingPrice&&e.currency==='VND'));
 if(!list.length)return '';
 const lines=list.map((e,i)=>`${i+1}. ${e.title}${e.variant&&!e.title.includes(e.variant)?` (${e.variant})`:''}: ${formatMoney(e.sellingPrice!,vi)}/${vi?'khách':'guest'}.`);
 return vi?`Cảm ơn bạn đã hỏi về tour! Lễ tân có thể sắp xếp trực tiếp các tour trong ngày được khách yêu thích, có đón tại khách sạn:\n${lines.join('\n')}\n\nBạn muốn đi tour nào và ngày nào? Bạn trả lời tại đây, khách sạn sẽ kiểm tra chỗ và xác nhận lại với bạn.`
  :`Thank you for asking about our tours! Here at the Front Desk we can arrange our most popular day tours directly for you, with hotel pick-up included:\n${lines.join('\n')}\n\nWhich tour and date would you like? Just reply here and we will check availability and confirm your seats with you.`;
}

// ── Complaints at every stage of the stay ──────────────────────────────────
export type StayStage='PRE_STAY'|'IN_STAY'|'POST_STAY';
export const stageLabels:Record<StayStage,string>={PRE_STAY:'Trước lưu trú',IN_STAY:'Đang lưu trú',POST_STAY:'Sau lưu trú'};
const VN=7*3600000;
export function stayStage(at:string,stay:{checkIn?:string;checkOut?:string}):StayStage|''{
 if(!at||!stay.checkIn)return '';const day=new Date(Date.parse(at)+VN).toISOString().slice(0,10);
 if(day<stay.checkIn)return 'PRE_STAY';if(stay.checkOut&&day>stay.checkOut)return 'POST_STAY';return 'IN_STAY';
}
const ELSEWHERE=/(?:other|previous|last|not the best of) hotels?|\bin (?:cat ba|sapa|sa pa|ha long|halong|ninh binh|hue|hoi an|da nang)\b|on the (?:boat|cruise|bus|train)/;
const HERE=/your (?:hotel|room|staff|service|reception)|this hotel|\bhere\b|our room|my room|in the room|khach san|phong (?:minh|toi|chung toi)/;
const PRICE=/overcharg|charged (?:me |us |my card |our card |my credit card )?(?:twice|double|more|extra|wrong)|double charg|wrong (?:price|amount|charge)|price (?:is |was )?(?:different|higher|wrong)|not the (?:price|rate) (?:we|i) (?:booked|paid)|tinh sai tien|thu sai|thu them|tru tien (?:2|hai) lan|gia khac/;
const GENERAL=/disappoint|unacceptable|complain|very bad (?:service|experience|stay|room|hotel|staff)|(?:service|experience|stay|room|hotel|staff) (?:was|is) (?:very |so |really )?bad|terrible service|worst|rude|unfriendly|impolite|not happy|unhappy with|(?:we|i)(?:'m| am| are|'re) (?:very |so |really )?unhappy|not satisfied|dissatisfied|dirty|not clean|broken|weak water|low water pressure|no hot water|smell|noisy|khong hai long|that vong|khieu nai|thai do|nuoc yeu|mat nuoc nong|on ao|mui hoi|dieu hoa (?:keu|on|hong)/;
// Topic in Vietnamese for reception, or null when the message is not a complaint about this hotel.
// Read sentence by sentence: "a terrible noisy night in Cat Ba. Please make our room quiet." is care, not a complaint.
export function complaintTopic(text:string):string|null{
 const here=normalize(text).replace(/đ/g,'d').split(/(?<=[.!?\n])\s*/).filter(s=>!(ELSEWHERE.test(s)&&!HERE.test(s)));
 if(!here.length)return null;const n=here.join(' ');
 if(PRICE.test(n))return 'tranh chấp giá / thu tiền';
 const a=detectApology(n);
 if(a?.kind==='room')return a.issue!.vi;
 if(/rude|unfriendly|impolite|thai do|staff|nhan vien/.test(n)&&GENERAL.test(n))return 'thái độ phục vụ';
 if(/weak water|water pressure|nuoc yeu/.test(n))return 'nước yếu';
 if(a||GENERAL.test(n))return 'khách không hài lòng';
 return null;
}
export type Complaint={stage:StayStage|'';topic:string;at:string;quote:string;requiresManagerAttention:true};
export function findComplaints(messages:{text:string;at:string}[],stay:{checkIn?:string;checkOut?:string}):Complaint[]{
 return messages.flatMap(m=>{const topic=complaintTopic(m.text);return topic?[{stage:stayStage(m.at,stay),topic,at:m.at,quote:m.text.slice(0,200),requiresManagerAttention:true as const}]:[];});
}

// ── Shifts, checklists and the shift log ────────────────────────────────────
export type ShiftKey='morning'|'afternoon'|'night';
export type RoleView='RECEPTIONIST'|'SALE'|'MANAGER'|'ADMIN';
export const roleViewLabels:Record<RoleView,string>={RECEPTIONIST:'Lễ tân',SALE:'Saler',MANAGER:'Quản lý',ADMIN:'Admin'};
export const shifts:Record<ShiftKey,{label:string;from:string;to:string}>={morning:{label:'Ca Sáng',from:'06:30',to:'14:30'},afternoon:{label:'Ca Chiều',from:'14:00',to:'22:00'},night:{label:'Ca Đêm',from:'22:00',to:'07:00'}};
// Overlaps go to the shift that has just started (14:00 → afternoon, 06:30 → morning).
export function shiftAt(hhmm:string):ShiftKey{return hhmm>='06:30'&&hhmm<'14:00'?'morning':hhmm>='14:00'&&hhmm<'22:00'?'afternoon':'night';}
export function vietnamClock(now=new Date()){return new Date(now.getTime()+VN).toISOString().slice(11,16);}
export type CheckMetric='complaints'|'missingEta'|'handoffs'|'arrivals'|'lateArrivals';
export type CheckItem={id:string;text:string;roles:RoleView[];metric?:CheckMetric};
const R:RoleView[]=['RECEPTIONIST','MANAGER','ADMIN'],RS:RoleView[]=['RECEPTIONIST','SALE','MANAGER','ADMIN'],M:RoleView[]=['MANAGER','ADMIN'];
export const checklists:Record<ShiftKey,CheckItem[]>={
 morning:[
  {id:'m1',text:'Đọc CRM và ký nhận bàn giao từ Ca Đêm (kiểm tra các tag [COMPLAIN]).',roles:[...RS],metric:'handoffs'},
  {id:'m2',text:'Rà soát 100% khách check-in hôm nay chưa có giờ về (MISSING_ETA) và gửi tin hỏi giờ trước 09:00.',roles:R,metric:'missingEta'},
  {id:'m3',text:'Chốt thứ tự ưu tiên dọn phòng với Buồng phòng theo giờ ETA.',roles:R,metric:'arrivals'},
  {id:'m4',text:'Kiểm tra xe đón/tiễn sân bay khung sáng–trưa trước 60 phút.',roles:R},
  {id:'m5',text:'Xác nhận tin nhắn Spa và chuyển câu hỏi Tour cho Saler.',roles:RS},
  {id:'m6',text:'Xử lý các phàn nàn chưa giải quyết, gọi lại khách.',roles:M,metric:'complaints'},
 ],
 afternoon:[
  {id:'a1',text:'Ký nhận bàn giao CRM từ Ca Sáng.',roles:[...RS],metric:'handoffs'},
  {id:'a2',text:'Ghi nhận vào CRM mọi yêu cầu phát sinh khi khách check-in khung 14:00–18:00.',roles:R,metric:'arrivals'},
  {id:'a3',text:'Hỏi thăm độ hài lòng của khách sau 30 phút lên phòng (bắt sớm [COMPLAIN]).',roles:R,metric:'complaints'},
  {id:'a4',text:'Rà soát khách đến muộn sau 19:00 và xe đón sân bay buổi tối.',roles:R,metric:'lateArrivals'},
  {id:'a5',text:'Chốt danh sách khách đi tour sáng mai với Saler và dặn bếp chuẩn bị Breakfast Box.',roles:RS},
 ],
 night:[
  {id:'n1',text:'Ký nhận bàn giao CRM từ Ca Chiều và chuẩn bị sẵn chìa khóa cho khách Late Check-in sau 22:00.',roles:[...RS],metric:'handoffs'},
  {id:'n2',text:'Trực xử lý sự cố tiếng ồn/điều hòa ban đêm và gắn tag [COMPLAIN] báo Quản lý.',roles:[...R],metric:'complaints'},
  {id:'n3',text:'Phản hồi nhanh tin nhắn OTA của khách quốc tế lệch múi giờ.',roles:RS},
  {id:'n4',text:'Đối soát xe tiễn sân bay chuyến sớm (04:00–07:00) và gọi Wake-up call.',roles:R},
  {id:'n5',text:'Tổng hợp bảng check-in ngày mới (lọc sẵn khách thiếu ETA) bàn giao cho Ca Sáng.',roles:R,metric:'missingEta'},
 ],
};
export const checklistFor=(shift:ShiftKey,role:RoleView)=>checklists[shift].filter(i=>i.roles.includes(role));
export const handoffStages=stageLabels;
export const handoffCategories={ROOM_REQUEST:'Yêu cầu buồng phòng',TRANSFER_SPA:'Xe / Spa',TOUR_LEAD:'Chuyển Saler Tour',COMPLAIN:'Phàn nàn · báo Quản lý'} as const;
export type HandoffCategory=keyof typeof handoffCategories;

// ── Who sees supplier costs ─────────────────────────────────────────────────
export const canSeeCost=(role:RoleView)=>role==='MANAGER'||role==='ADMIN';
