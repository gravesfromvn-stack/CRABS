export type Stay={checkIn:string;checkOut:string;sourceId:string;conflict:boolean};
type Envelope={id:string;full_text:string;guest_text:string;channel:string;authenticated:number;booking_id:string;received:string};
const empty=():Stay=>({checkIn:'',checkOut:'',sourceId:'',conflict:false});
export function stayDate(value:string){
 const s=value.trim().replace(/,/g,'').replace(/^(\d{1,2})\s+(?:thg|tháng)\s+(\d{1,2})\s+(20\d{2})$/i,'$1/$2/$3').replace(/^(20\d{2})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?$/,'$1-$2-$3');let y=0,m=0,d=0;
 let a=s.match(/^(20\d{2})[-年](\d{1,2})[-月](\d{1,2})日?$/);
 if(a){[,y,m,d]=a.map(Number);}else{
  a=s.match(/^(\d{1,2})[/.](\d{1,2})[/.](20\d{2})$/);
  if(a){d=+a[1];m=+a[2];y=+a[3];}else{
   a=s.match(/^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\w*\s+)?(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})$/i);
   if(a){d=+a[1];m=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(a[2].slice(0,3).toLowerCase())+1;y=+a[3];}
   else {a=s.match(/^([A-Za-z]+)\s+(\d{1,2})\s+(20\d{2})$/i);if(a){m=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(a[1].slice(0,3).toLowerCase())+1;d=+a[2];y=+a[3];}}
  }
 }
 const date=new Date(Date.UTC(y,m-1,d));
 return y>=2000&&m>=1&&m<=12&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';
}
export function emailStay(e:Envelope):Stay{
 if(!e.authenticated||!e.booking_id)return empty();
 // Never treat dates requested by a guest as confirmed booking dates.
 const text=e.full_text.replace(e.guest_text,'');
 const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&x!=='•');
 const label=(name:string)=>{const i=lines.findIndex(x=>new RegExp('^'+name+'\\s*:','i').test(x));if(i<0)return '';return stayDate(lines[i].replace(/^[^:]+:\s*/,''))||stayDate(lines[i+1]||'');};
 let checkIn=label('Check-in'),checkOut=label('Check-out');
 if(e.channel==='agoda'&&(!checkIn||!checkOut)){
  const start=lines.findIndex(x=>/^Booking details$/i.test(x)),part=start<0?[]:lines.slice(start);
  const index=part.indexOf(e.booking_id);
  if(index>=0&&part.some(x=>/^Check-in$/i.test(x))&&part.some(x=>/^Check-out$/i.test(x))){checkIn=stayDate(part[index+1]||'');checkOut=stayDate(part[index+2]||'');}
 }
 if(!checkIn||!checkOut||checkIn>=checkOut)return empty();
 return {checkIn,checkOut,sourceId:e.id,conflict:false};
}
export function threadStay(events:Envelope[]):Stay{
 const found=events.map(emailStay).filter(s=>s.checkIn);
 if(!found.length)return empty();
 if(new Set(found.map(s=>s.checkIn+'|'+s.checkOut)).size>1)return {...empty(),conflict:true};
 return found.at(-1)!;
}
export function stayLabel(s?:Stay){
 if(s?.conflict)return 'Ngày lưu trú cần đối chiếu';
 if(!s?.checkIn||!s.checkOut)return 'Chưa có ngày lưu trú';
 const [yi,mi,di]=s.checkIn.split('-'),[yo,mo,do_]=s.checkOut.split('-');
 return `${di}/${mi}${yi===yo?'':'/'+yi}–${do_}/${mo}/${yo}`;
}
