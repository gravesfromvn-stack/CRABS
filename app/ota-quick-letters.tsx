import {policyFor} from '../lib/hotel-policy-config';
import {apologyLetter,checkoutDayMessage,thanksAfterStay} from '../lib/apology-letters';

// Letters Cua puts into the draft by hand (PO 20/10/2026): check-out day reminder, post-stay thanks and
// the two apology letters. The text goes into the draft box only; Cua saves it as a new version and
// approves it like any other draft. [Cua điền] blanks block approval until filled.
const blank={en:'[Cua điền: sự cố]',vi:'[Cua điền: sự cố]'},team={en:'[Cua điền: bộ phận]',vi:'[Cua điền: bộ phận]'};
export function OtaQuickLetters({propertyId,guestName,vi,disabled,onInsert}:{propertyId:string;guestName:string;vi:boolean;disabled:boolean;onInsert:(text:string,label:string)=>void}){
 const p=policyFor(propertyId);
 if(!p?.frontDesk?.approved||!p.frontDesk.letters)return null;
 const items:[string,()=>string][]=[
  ['Tin ngày trả phòng',()=>checkoutDayMessage(p,vi,guestName)],
  ['Thư cảm ơn sau lưu trú',()=>thanksAfterStay(p,vi,guestName)],
  ['Xin lỗi: sự cố phòng',()=>apologyLetter(p,{kind:'room',issue:blank,team,money:false},vi,guestName).body],
  ['Xin lỗi: khách không hài lòng',()=>apologyLetter(p,{kind:'stay',money:false},vi,guestName).body],
 ];
 return <div className="ota-quick-letters" aria-label="Mẫu thư chèn vào nháp"><small>Mẫu thư ({vi?'tiếng Việt':'tiếng Anh'}):</small>{items.map(([label,make])=><button key={label} type="button" className="text-button" disabled={disabled} onClick={()=>onInsert(make(),label)}>{label}</button>)}</div>;
}
