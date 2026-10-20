import {clockTimes,normalize} from './ota-profile';

// A guest confirming an airport car with its details ("I would like to book the 4-seater airport
// pick-up for 400,000 VND tomorrow, Friday 2 October. Flight: VN166 ... Arrival time: 1:00 pm").
// Only the guest's message is read; nothing here confirms the car with a supplier.
export type TransferConfirmation={direction:'pickup'|'dropoff';flight:string;route:string;date:string;time:string;seats:number|null;price:number|null;terminal:'T1'|'T2'|''};
const MONTHS=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DOMESTIC=/da nang|danang|ho chi minh|saigon|sai gon|hcm|tan son nhat|phu quoc|nha trang|cam ranh|hue|da lat|dalat|lien khuong|quy nhon|phu cat|can tho|hai phong|cat bi|vinh|dong hoi|pleiku|buon ma thuot|chu lai|tuy hoa|con dao|rach gia|ca mau|dien bien|tho xuan|van don/;

export function transferConfirmation(text:string):TransferConfirmation|null{
 const n=normalize(text);
 const confirm=/(?:would like to|want to|we'?d like to|i'?d like to|please|let'?s|we will|i will|we'?ll|i'?ll)\s+(?:book|confirm|take|go with|reserve)[^.\n]{0,70}(?:pick.?up|drop.?off|transfer|car)|confirm(?:ed)? (?:the )?(?:car|pick.?up|transfer|drop.?off)|(?:book|reserve) (?:the |a )?(?:\d+.?seat(?:er)? )?(?:car|airport (?:pick.?up|drop.?off|transfer))/.test(n);
 if(!confirm)return null;
 const direction=/drop.?off|to (?:the )?airport|for (?:the )?airport|departure flight/.test(n)&&!/pick.?up|arriv|land/.test(n)?'dropoff':'pickup';
 const flight=(text.match(/\b(VN|VJ|QH|BL|VU|[A-Z]{2})\s?(\d{2,4})\b/)||[]).slice(1).join('');
 const route=(text.match(/route:\s*([^\n]+)/i)?.[1]||text.match(/\bfrom\s+([A-Z][\w ]{1,25}?)\s+to\s+(?:Hanoi|Ha Noi|Noi Bai)/)?.[1]||'').trim();
 // Prefer an explicit "Arrival/Departure time" line; whole words only ("land" must not match inside names).
 const timeLine=(text.match(/\b(?:arrival|departure|landing) time\b[^\n]{0,40}/i)||text.match(/\b(?:arriv(?:e|es|ing|al)|land(?:s|ing)?|depart(?:s|ing|ure)?)\b[^\n]{0,40}/i))?.[0]||'';
 const time=clockTimes(timeLine)[0]||'';
 const d=n.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/)||n.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);
 const date=d?(/^\d/.test(d[1])?`${+d[1]} ${d[2][0].toUpperCase()+d[2].slice(1)}`:`${+d[2]} ${d[1][0].toUpperCase()+d[1].slice(1)}`):'';
 const seats=Number((n.match(/(\d{1,2})\s*-?\s*(?:seat(?:er)?s?|cho)\b/)||[])[1])||null;
 const priceText=text.match(/(\d{1,3}(?:[.,]\d{3})+)\s*(?:VND|vnd|đ|dong)/)?.[1];
 const price=priceText?Number(priceText.replace(/[.,]/g,'')):null;
 // A confirmation carries something concrete (flight, car size or price); "I need to book a transfer" is a request.
 if(!flight&&!seats&&!price)return null;
 if(/\b(?:is it possible|can you|could you|do you)\b[^.?\n]{0,60}(?:book|arrange)/.test(n)&&!flight&&!price)return null;
 const r=normalize(route);
 const terminal=direction!=='pickup'||!r?'':DOMESTIC.test(r)?'T1':'T2';
 return {direction,flight,route,date,time,seats,price,terminal};
}
// "Our flight has been delayed and is now set to arrive at 3:25"
export function flightUpdate(text:string){
 const n=normalize(text);
 if(!/(?:flight|plane)[^.\n]{0,60}(?:delay|changed|reschedul|now (?:set to )?(?:arriv|land)|new (?:time|arrival))|(?:delay|change)[^.\n]{0,40}flight/.test(n))return null;
 const t=clockTimes(text.match(/(?:arriv\w*|land\w*|at)[^\n]{0,30}/i)?.[0]||text);
 let time=t[0]||'';
 // "3:25" without am/pm after an afternoon landing is read as 15:25.
 if(time&&+time.slice(0,2)<7&&!/\b(?:am|a\.m)\b/i.test(text))time=String(+time.slice(0,2)+12).padStart(2,'0')+time.slice(2);
 return time?{time}:null;
}
export const monthIndex=(m:string)=>MONTHS.indexOf(m.slice(0,3).toLowerCase());
