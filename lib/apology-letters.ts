import type {PropertyPolicy} from './hotel-policy-config';
const fill=(t:string,v:Record<string,string>)=>t.replace(/\{(\w+)\}/g,(_,key:string)=>v[key]??'');

// Apology letters and the check-out day message (PO 20/10/2026): problem fixed within the configured
// minutes, contact is the Front Office Manager, no compensation in the draft. Every letter is a draft
// Cua approves; the hotline stays a [Cua điền] blank (blocks approval) until the PO confirms the number.
// Works on normalized text (lowercase, no diacritics).
type T={en:string;vi:string};
const TECH:T={en:'technical team',vi:'Bộ phận kỹ thuật'},HK:T={en:'housekeeping team',vi:'Bộ phận buồng phòng'},FO:T={en:'reception team',vi:'Lễ tân'};
const ISSUES:{re:RegExp;issue:T;team:T}[]=[
 {re:/dirty|not clean|unclean|stain|smell|smelly|mou?ld|bed ?bugs?|insects?|cockroach|\bants\b|hair (?:in|on)|ban qua|chua sach|mui hoi|con trung|con gian/,issue:{en:'the cleanliness',vi:'vệ sinh phòng'},team:HK},
 {re:/air ?con|aircon|air.?condition|\bac\b|heater|heating|dieu hoa|may lanh|suoi/,issue:{en:'the air conditioning',vi:'điều hòa'},team:TECH},
 {re:/hot water|no water|water pressure|nuoc nong|mat nuoc|khong co nuoc/,issue:{en:'the water supply',vi:'nước nóng/nước sinh hoạt'},team:TECH},
 {re:/shower|toilet|flush|drain|leak|sink|bathroom|voi sen|bon cau|ro ri|bi tac|phong tam/,issue:{en:'the bathroom',vi:'phòng tắm'},team:TECH},
 {re:/wi.?fi|internet/,issue:{en:'the Wi-Fi',vi:'Wi-Fi'},team:TECH},
 {re:/\btv\b|television|tivi/,issue:{en:'the TV',vi:'TV'},team:TECH},
 {re:/\blights?\b|\blamp|electric|power cut|no power|key ?card|door lock|safe box|bong den|mat dien|the tu|khoa cua/,issue:{en:'the room equipment',vi:'thiết bị trong phòng'},team:TECH},
 {re:/(?:room|next door|neighbou?r|upstairs|corridor|construction|karaoke|phong ben)[^.!?]{0,40}(?:noisy|noise|loud|on ao)|(?:noisy|noise|loud|on ao)[^.!?]{0,40}(?:room|next door|neighbou?r|upstairs|corridor|construction|karaoke|phong ben)/,issue:{en:'the noise',vi:'tiếng ồn'},team:FO},
];
const FAULT=/not working|doesn'?t work|does not work|isn'?t working|stopped working|broken|no (?:hot )?water|not (?:hot|cold|clean)|problem|issue|leak|dirty|unclean|smell|stain|mou?ld|bugs?|insect|cockroach|noisy|noise|loud|can'?t (?:turn|open|lock|sleep)|khong (?:hoat dong|chay|sach|co nuoc)|bi hong|hong roi|ro ri|bi tac|\bban\b|mui hoi|on ao|bi loi/;
// Problems at another hotel or on a previous stop are care, not an apology from this hotel.
const ELSEWHERE=/(?:other|previous|last|not the best of) hotels?|\bin (?:cat ba|sapa|sa pa|ha long|halong|ninh binh|hue|hoi an|da nang)\b|on the (?:boat|cruise|bus|train)/;
const HERE=/your (?:hotel|room|staff|service)|this hotel|\bhere\b|our room|my room|in the room|khach san|phong (?:minh|toi|chung toi)/;
const DISSATISFIED=/disappoint|not happy|unhappy|complain|unacceptable|very bad|terrible service|worst|rude|not satisfied|dissatisfied|not (?:as|what) (?:described|expected|advertised)|expected (?:more|better)|khong hai long|that vong|khieu nai|te qua|qua te/;
const MONEY=/refund|compensat|discount|money back|hoan tien|boi thuong|giam gia/;

export type Apology={kind:'room'|'stay';issue?:T;team?:T;point?:T;money:boolean};
export function detectApology(text:string):Apology|null{
 const n=text.replace(/đ/g,'d');
 const elsewhereOnly=ELSEWHERE.test(n)&&!HERE.test(n);if(elsewhereOnly)return null;
 const money=MONEY.test(n);
 const found=ISSUES.find(i=>i.re.test(n));
 if(found&&FAULT.test(n))return {kind:'room',issue:found.issue,team:found.team,money};
 if(DISSATISFIED.test(n)){
  const point=/rude|staff|reception|nhan vien|le tan/.test(n)?{en:', especially regarding the service from our staff',vi:', đặc biệt là về thái độ phục vụ của nhân viên'}:/breakfast|bua sang/.test(n)?{en:', especially regarding breakfast',vi:', đặc biệt là về bữa sáng'}:/clean|dirty|ve sinh|ban/.test(n)?{en:', especially regarding cleanliness',vi:', đặc biệt là về vệ sinh'}:/room|phong/.test(n)?{en:', especially regarding your room',vi:', đặc biệt là về phòng của bạn'}:{en:'',vi:''};
  return {kind:'stay',point,money};
 }
 return null;
}
export const hotlineOf=(p:PropertyPolicy,vi:boolean)=>p.frontDesk?.letters.hotline||(vi?'[Cua điền: hotline đúng cho thư xin lỗi]':'[Cua điền: correct hotline]');
const greet=(name:string,vi:boolean)=>vi?`Chào ${name||'bạn'},`:`Dear ${name||'Guest'},`;
const sign=(p:PropertyPolicy,vi:boolean)=>`${vi?'Trân trọng,':'Kind regards,'}\n${p.frontDesk!.letters.contact[vi?'vi':'en']} · ${p.displayName}`;

// Full letter body (greeting, apology, signature) and Cua's internal notes.
export function apologyLetter(p:PropertyPolicy,a:Apology,vi:boolean,guestName=''):{body:string;internal:string[]}{
 const L=p.frontDesk!.letters,k=vi?'vi':'en',hotline=hotlineOf(p,vi),contact=L.contact[k];
 const text=a.kind==='room'
  ?fill(L.apologyRoom[k],{issue:a.issue![k],team:vi?a.team!.vi:a.team!.en,minutes:String(L.fixMinutes),hotline})
  :fill(L.apologyStay[k],{point:a.point?.[k]||'',contact,hotline});
 const body=[greet(guestName,vi),text.replace(/^./,c=>c.toUpperCase()),sign(p,vi)].join('\n\n');
 const internal=a.kind==='room'
  ?[`[SỰ CỐ PHÒNG] ${a.issue!.vi}: báo ${a.team!.vi} xử lý trong ${L.fixMinutes} phút; Quản lý Lễ tân theo dõi và gọi lại khách. Đổi phòng chỉ khi còn phòng trống.`]
  :['[KHÁCH KHÔNG HÀI LÒNG] Quản lý Lễ tân liên hệ trực tiếp với khách; ghi lại sự việc trước khi trả lời thêm.'];
 internal.push('Thư xin lỗi chưa đưa bồi thường (theo PO 20/10).');
 if(a.money)internal.push('Khách nhắc hoàn tiền/bồi thường/giảm giá: Cua quyết định, nháp không hứa.');
 if(!L.hotline)internal.push('Hotline trong thư đang để trống [Cua điền]: PO chưa xác nhận số đúng.');
 return {body,internal};
}

// Proactive messages Cua inserts from the draft panel: check-out day reminder and post-stay thanks.
export function checkoutDayMessage(p:PropertyPolicy,vi:boolean,guestName=''):string{
 const L=p.frontDesk!.letters,k=vi?'vi':'en',late=p.lateCheckOut;
 const text=fill(L.checkoutDay[k],{name:guestName||(vi?'bạn':'there'),checkOut:p.checkOut,lateUntil:late.until,lateFee:late.fee[k]});
 return [text,sign(p,vi)].join('\n\n');
}
export function thanksAfterStay(p:PropertyPolicy,vi:boolean,guestName=''):string{
 const L=p.frontDesk!.letters,k=vi?'vi':'en';
 return [greet(guestName,vi),fill(L.thanksAfter[k],{hotel:p.displayName}),sign(p,vi)].join('\n\n');
}
