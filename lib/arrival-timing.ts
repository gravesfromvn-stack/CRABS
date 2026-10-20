import {clockTimes,normalize} from './ota-profile';
import {travelOrigins} from './guest-origin';

// When the guest actually reaches the hotel relative to the booking, from the message time,
// the check-in date and the hour the guest gives (Vietnam time, UTC+7).
//  · early: before check-in on the check-in day (e.g. landing 05:00) → options (extra night / early check-in)
//  · night: after midnight inside the booked night (check-in yesterday) → room is held, reception 24/7
//  · sameDayLate: arriving this evening on the check-in day, said on that day → urgent hand-off
export type ArrivalTiming={kind:'early'|'night'|'sameDayLate'|'normal';time:string;date:string;origin:string;overland:boolean};
const VN=7*3600000;
const dayOf=(ms:number)=>new Date(ms+VN).toISOString().slice(0,10);
const at=(date:string,time:string)=>Date.parse(`${date}T${time}:00+07:00`);

export function arrivalTiming(input:{text:string;sentAt:string;checkIn?:string;checkInTime?:string}):ArrivalTiming|null{
 const n=normalize(input.text);
 const origin=travelOrigins(n)[0]||'';
 const overland=/\b(?:bus|coach|train|sleeper|limousine|xe khach|tau|xe giuong nam)\b/.test(n)||!!origin;
 const arriving=/arriv|reach|get (?:to|in)|be (?:there|with you)|check.?in|land|plane|flight|toi noi|den (?:khach san|noi|luc)|qua nhan phong|nhan phong|прибыт|到达|הגעה|סביב שעה/.test(n);
 const times=clockTimes(input.text.replace(/(\d{1,2})\s+in\s+the\s+morning/gi,'$1 am').replace(/(\d{1,2})\s*(?:in\s+the\s+)?(?:evening|tonight)/gi,'$1 pm'));
 let time=times[0]||'';
 if(!time&&/after (?:dinner|eating)|an (?:toi )?xong|sau khi an/.test(n))time='21:00';
 if(!time||!arriving)return null;
 const sent=Date.parse(input.sentAt),checkIn=input.checkIn||'',ci=input.checkInTime||'14:00';
 if(!checkIn||Number.isNaN(sent))return {kind:'normal',time,date:'',origin,overland};
 // The arrival is the first occurrence of that hour on/after the check-in day that is not in the past.
 let when=at(checkIn,time);if(when<sent)when+=86400000;
 if(when<sent)when=at(dayOf(sent),time)+(at(dayOf(sent),time)<sent?86400000:0);
 const date=dayOf(when),checkInAt=at(checkIn,ci);
 if(date===checkIn&&when<checkInAt)return {kind:'early',time,date,origin,overland};
 if(date>checkIn&&when-at(checkIn,'00:00')<36*3600000&&+time.slice(0,2)<7)return {kind:'night',time,date,origin,overland};
 if(dayOf(sent)===checkIn&&date===checkIn&&+time.slice(0,2)>=20)return {kind:'sameDayLate',time,date,origin,overland};
 return {kind:'normal',time,date,origin,overland};
}
