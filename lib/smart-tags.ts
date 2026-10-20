import {normalize} from './ota-profile';
import {arrivalTiming} from './arrival-timing';
import {transferConfirmation} from './transfer-confirm';
import {extractAdjectivesAndEmotion,adjectivesVi} from './guest-emotion';
import {detectApology} from './apology-letters';

// Front-desk tags read from the guest's messages, with the hand-off note reception needs before the
// guest walks in. Rules only; Cua reviews the conversation before acting.
export const tagInfo={
 TAG_URGENT:{label:'[KHẨN CẤP]',tone:'red'},
 TAG_SERVICE_REQUEST:{label:'[YÊU CẦU DỊCH VỤ]',tone:'blue'},
 TAG_COMPLAINT:{label:'[PHÀN NÀN]',tone:'complaint'},
 TAG_SPECIAL_REQUEST:{label:'[YÊU CẦU ĐẶC BIỆT]',tone:'purple'},
 TAG_VIP_CARE:{label:'[VIP CARE - CHĂM SÓC ĐẶC BIỆT]',tone:'orange'},
 TAG_BILLING:{label:'[THANH TOÁN / HÓA ĐƠN]',tone:'green'},
 TAG_SPA_POTENTIAL:{label:'[TIỀM NĂNG SPA]',tone:'teal'},
} as const;
export type TagCode=keyof typeof tagInfo;
export type SmartTag={code:TagCode;label:string;tone:string;reason:string};
export type TagResult={tags:SmartTag[];notes:string[]};
type Msg={text:string;at:string};
const titleCase=(s:string)=>s.replace(/(^|\s)\S/g,c=>c.toUpperCase());

export function smartTags(messages:Msg[],stay:{checkIn?:string;checkOut?:string}={}):TagResult{
 const tags=new Map<TagCode,string>(),notes:string[]=[];
 const add=(code:TagCode,reason:string)=>{if(!tags.has(code))tags.set(code,reason);};
 const all=messages.map(m=>m.text).join('\n'),n=normalize(all);
 // Arrival timing from the latest message that gives one.
 const timing=[...messages].reverse().map(m=>arrivalTiming({text:m.text,sentAt:m.at,checkIn:stay.checkIn})).find(Boolean)||null;
 if(timing?.kind==='sameDayLate'){add('TAG_URGENT','Khách nhận phòng hôm nay, đến muộn');notes.push(`[ĐẾN MUỘN CÙNG NGÀY] Khách check-in hôm nay, sẽ đến khoảng ${timing.time}${/an (?:toi|xong)|dinner/.test(n)?' (sau bữa tối)':''}. Chuẩn bị sẵn thẻ phòng và hồ sơ nhận phòng.`);}
 if(timing?.kind==='night'){add('TAG_URGENT','Khách đến lúc rạng sáng');notes.push(`[ĐẾN KHUYA] Khách đến khoảng ${timing.time} ngày ${timing.date.split('-').reverse().slice(0,2).join('/')}${timing.origin?` (từ ${titleCase(timing.origin)})`:''}. Giữ phòng, ca đêm đón khách, không tính no-show.`);}
 if(timing?.kind==='early')notes.push(`[ĐẾN SỚM] Khách đến khoảng ${timing.time}, trước giờ nhận phòng. Đã báo 2 phương án (thêm đêm trước / nhận sớm từ 09:00 có phụ thu); giữ hành lý miễn phí.`);
 if(/\b(?:today|tonight)\b|hom nay|toi nay/.test(n)&&/flight (?:has been )?(?:delay|cancel|chang)|doi gio|hoan chuyen/.test(n))add('TAG_URGENT','Đổi giờ sát ngày đến');
 // Services: car, tour, spa, invoice.
 const service=[/pick.?up|drop.?off|airport (?:transfer|car)|xe (?:don|tien)|san bay/.test(n)&&'xe sân bay',/\btour\b|excursion|cruise|day trip/.test(n)&&'tour',/\bspa\b|massage/.test(n)&&'spa',/invoice|vat|hoa don/.test(n)&&'hóa đơn'].filter(Boolean) as string[];
 if(service.length)add('TAG_SERVICE_REQUEST',service.join(', '));
 if(messages.some(m=>transferConfirmation(m.text)))notes.push('[XE SÂN BAY] Khách đã chốt xe: xem Yêu cầu dịch vụ để điều xe.');
 // Complaints about THIS stay (another hotel's problems are care, not a complaint).
 const elsewhere=/(?:other|previous|last|not the best of) hotels?|in (?:cat ba|sapa|ha long|ninh binh|hue|hoi an)\b/.test(n);
 if(/disappoint|unacceptable|complain|refund|very bad service|terrible|worst|rude|dirty|not clean|broken|(?:your|this|the) (?:room|hotel|staff|service)[^.]{0,30}(?:bad|awful|noisy)/.test(n)&&!(elsewhere&&!/your|this hotel|here/.test(n)))add('TAG_COMPLAINT','Khách phàn nàn dịch vụ');
 // Room problems during the stay (PO 20/10): fix within 15 minutes, Front Office Manager follows up.
 const issue=detectApology(n);
 if(issue?.kind==='room'){add('TAG_URGENT',`Sự cố phòng: ${issue.issue!.vi}`);add('TAG_COMPLAINT',`Sự cố phòng: ${issue.issue!.vi}`);notes.push(`[SỰ CỐ PHÒNG] ${issue.issue!.vi}: báo ${issue.team!.vi} xử lý trong 15 phút; Quản lý Lễ tân gọi lại khách. Chưa hứa bồi thường.`);}
 else if(issue?.kind==='stay')notes.push('[KHÁCH KHÔNG HÀI LÒNG] Quản lý Lễ tân liên hệ trực tiếp với khách. Chưa hứa bồi thường.');
 // Special requests: occasions, bed type, room position.
 const occasion=/honeymoon|trang mat/.test(n)?'honeymoon':/anniversary|ky niem/.test(n)?'kỷ niệm':/birthday|sinh nhat/.test(n)?'sinh nhật':'';
 const bedChange=/(?:two|2) separate beds|twin[^.]{0,40}(?:double|one bed|king|queen)|double bed instead|doi (?:sang )?giuong doi/.test(n)||/(?:one|a) double bed/.test(n)&&/twin|separate beds|two beds|2 beds|mistake/.test(n);
 const room=[/high(?:er)? floor|tang cao/.test(n)&&'tầng cao',/quiet|yen tinh/.test(n)&&'phòng yên tĩnh',/non.?smoking|khong hut thuoc/.test(n)&&'không hút thuốc',!bedChange&&/double bed|king bed|queen bed|giuong doi/.test(n)&&'giường đôi'].filter(Boolean) as string[];
 if(occasion||bedChange||room.length)add('TAG_SPECIAL_REQUEST',[occasion,bedChange&&'đổi sang giường đôi',...room].filter(Boolean).join(', '));
 if(occasion&&bedChange)notes.push(`[${occasion==='honeymoon'?'HONEYMOON':'KỶ NIỆM'} & ĐỔI GIƯỜNG] ${timing?.time?`Khách đến khoảng ${timing.time}. `:''}Bắt buộc xếp phòng giường đôi (Double), không xếp Twin. Setup trang trí ${occasion==='honeymoon'?'trăng mật':'kỷ niệm'} (thiệp chúc mừng, hoa/thiên nga gấp khăn).`);
 else if(bedChange)notes.push('[ĐỔI GIƯỜNG] Xếp phòng giường đôi (Double), không xếp Twin.');
 else if(occasion)notes.push(`[${occasion.toUpperCase()}] Chuẩn bị lời chúc/trang trí theo tiêu chuẩn khách sạn.`);
 if(room.length&&!bedChange)notes.push(`[YÊU CẦU PHÒNG] Ưu tiên ${room.join(', ')}.`);
 // Care: the guest's own words (sleepless, noisy, exhausting journey…) → rest first, spa as recovery.
 const emo=extractAdjectivesAndEmotion(all);
 if(emo.emotional_state==='SENSORY_OVERLOAD_TIRED'||emo.emotional_state==='PHYSICAL_EXHAUSTION'||/unwell|feel(?:ing)? sick/.test(n)){
  add('TAG_VIP_CARE',`Khách mệt/thiếu ngủ (${adjectivesVi(emo.detected_adjectives)||'không khỏe'})`);
  notes.push(`[VIP CARE - CẦN NGHỈ NGƠI] Khách ${adjectivesVi(emo.detected_adjectives)||'mệt'}${emo.origins[0]?` sau chặng ${titleCase(emo.origins[0])}`:''}${timing?.time?`, đến khoảng ${timing.time}`:''}: xếp phòng yên tĩnh nhất, xa thang máy/đường phố, chào đón nhẹ nhàng (nước, khăn lạnh), nhận phòng nhanh.`);
  if(emo.applicable_care_path==='SPA_RECOVERY'&&!/\bspa\b|massage/.test(n)){add('TAG_SPA_POTENTIAL','Khách mệt: mời spa phục hồi');notes.push('[TIỀM NĂNG SPA] Đã mời spa phục hồi trong nháp: khi khách nhận phòng, hỏi lại và giữ khung giờ spa (60/90/120 phút) nếu khách muốn.');}}
 else if(emo.emotional_state==='ANXIOUS_UNCERTAIN')notes.push(`[TRẤN AN] Khách ${adjectivesVi(emo.detected_adjectives)}: hướng dẫn từng bước khi đến, nhắc WhatsApp lễ tân 24/7.`);
 // Billing: paying for someone else, prepayment, card, invoice.
 const onBehalf=/on behalf of|for my client|for my (?:friend|colleague|boss|parents|mother|father)|dat ho|dat cho/.test(n);
 const prepay=/pay (?:in advance|before|for (?:him|her|them))|prepay|credit card|avoid (?:him|her|them) paying|thanh toan truoc/.test(n);
 const invoice=/invoice|vat|hoa don/.test(n);
 if(onBehalf||prepay||invoice||/pay in vnd|do not charge my card/.test(n))add('TAG_BILLING',[onBehalf&&'đặt hộ',prepay&&'thanh toán trước',invoice&&'hóa đơn'].filter(Boolean).join(', ')||'thanh toán');
 if(onBehalf&&prepay)notes.push('[THANH TOÁN HỘ] Khách đặt hộ, cần thu tiền trước qua WhatsApp (link thanh toán bảo mật). Theo dõi trạng thái thanh toán trước khi khách ở nhận phòng. Không nhận số thẻ qua tin nhắn OTA.');
 if(invoice)notes.push('[HÓA ĐƠN VAT] Xuất hóa đơn điện tử gửi email: lấy tên công ty, mã số thuế, địa chỉ, email nhận. Chuyển Kế toán.');
 return {tags:[...tags].map(([code,reason])=>({code,label:tagInfo[code].label,tone:tagInfo[code].tone,reason})),notes};
}
