import {formatMoney} from './hotel-policy-config';

// Direct stay extension (the guest extends with the hotel, not through the OTA, so no OTA commission):
//  · Option "keep": the nightly rate the guest already booked.
//  · Option "ota_minus": tonight-by-night current OTA rate (Cua reads it in the extranet) minus the
//    configured direct discount (default 10%).
// Cua enters the rates; the result goes into the draft for the guest to consider and confirm.
export type ExtensionOption='keep'|'ota_minus';
export type ExtensionInput={checkOut:string;nights:number;roomType:string;bookedRate:number|null;currentRates:(number|null)[];discountPercent:number;guests?:number};
export type ExtensionResult={dates:string[];newCheckOut:string;perNight:{date:string;keep:number|null;ota:number|null;otaMinus:number|null}[];keepTotal:number|null;otaTotal:number|null;otaMinusTotal:number|null;saving:number|null};

const addDays=(iso:string,n:number)=>{const d=new Date(iso+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const dmy=(iso:string)=>iso?`${iso.slice(8,10)}/${iso.slice(5,7)}`:'';
// Round to the nearest 1,000 VND, as hotel prices are quoted.
const round=(n:number)=>Math.round(n/1000)*1000;

export function extensionQuote(i:ExtensionInput):ExtensionResult{
 const dates=Array.from({length:Math.max(0,i.nights)},(_,k)=>addDays(i.checkOut,k));
 const perNight=dates.map((date,k)=>{const ota=i.currentRates[k]??i.currentRates[0]??null;return {date,keep:i.bookedRate,ota,otaMinus:ota===null?null:round(ota*(1-i.discountPercent/100))};});
 const sum=(key:'keep'|'ota'|'otaMinus')=>perNight.every(p=>p[key]!==null)&&perNight.length?perNight.reduce((a,p)=>a+(p[key] as number),0):null;
 const keepTotal=sum('keep'),otaTotal=sum('ota'),otaMinusTotal=sum('otaMinus');
 return {dates,newCheckOut:addDays(i.checkOut,i.nights),perNight,keepTotal,otaTotal,otaMinusTotal,saving:otaTotal!==null&&otaMinusTotal!==null?otaTotal-otaMinusTotal:null};
}

// Guest-facing text for the chosen option; amounts are exactly those computed above.
export function extensionMessage(i:ExtensionInput,r:ExtensionResult,option:ExtensionOption,vi:boolean):{text:string;amounts:number[]}{
 const room=i.roomType.trim(),n=r.dates.length,from=dmy(r.dates[0]),to=dmy(r.newCheckOut);
 if(option==='keep'&&i.bookedRate!==null&&r.keepTotal!==null){
  const text=vi?`Khách sạn còn phòng để bạn ở thêm ${n} đêm (từ ${from}, trả phòng ${to})${room?` với loại phòng ${room}`:''}. Vì bạn gia hạn trực tiếp với khách sạn, mình giữ nguyên giá bạn đã đặt: ${formatMoney(i.bookedRate,vi)}/đêm, tổng ${formatMoney(r.keepTotal,vi)} cho ${n} đêm. Bạn xác nhận giúp mình để khách sạn giữ phòng nhé.`
   :`We have availability for ${n} more night${n>1?'s':''} (from ${from}, check-out ${to})${room?` in your ${room}`:''}. As you would extend directly with the hotel, we can keep the same rate you booked: ${formatMoney(i.bookedRate,vi)} per night, ${formatMoney(r.keepTotal,vi)} in total for ${n} night${n>1?'s':''}. Please let us know if you would like to confirm and we will hold the room for you.`;
  return {text,amounts:[i.bookedRate,r.keepTotal]};
 }
 if(option==='ota_minus'&&r.otaMinusTotal!==null){
  const same=r.perNight.every(p=>p.otaMinus===r.perNight[0].otaMinus);
  const rate=same?(vi?`${formatMoney(r.perNight[0].otaMinus!,vi)}/đêm`:`${formatMoney(r.perNight[0].otaMinus!,vi)} per night`):r.perNight.map(p=>`${dmy(p.date)}: ${formatMoney(p.otaMinus!,vi)}`).join(', ');
  const text=vi?`Khách sạn còn phòng để bạn ở thêm ${n} đêm (từ ${from}, trả phòng ${to})${room?` với loại phòng ${room}`:''}. Vì bạn đặt trực tiếp với khách sạn, mình gửi bạn giá ưu đãi thấp hơn ${i.discountPercent}% so với giá đang bán online: ${rate}, tổng ${formatMoney(r.otaMinusTotal,vi)} cho ${n} đêm. Bạn tham khảo và xác nhận giúp mình để khách sạn giữ phòng nhé.`
   :`We have availability for ${n} more night${n>1?'s':''} (from ${from}, check-out ${to})${room?` in your ${room}`:''}. As you would book directly with the hotel, we can offer you ${i.discountPercent}% below the current online rate: ${rate}, ${formatMoney(r.otaMinusTotal,vi)} in total for ${n} night${n>1?'s':''}. Please have a look and let us know if you would like to confirm, and we will hold the room for you.`;
  return {text,amounts:[...new Set([...r.perNight.map(p=>p.otaMinus!),r.otaMinusTotal])]};
 }
 return {text:'',amounts:[]};
}
