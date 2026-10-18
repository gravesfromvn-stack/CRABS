import data from './rate-catalog.json';
import {normalize} from './ota-profile';

// Runtime view of the imported 6-tab workbook (scripts/import-rate-sheet.mjs). Every amount is
// source/reference data unless the full approval record is complete and valid on the service date.
export type CatalogItem={id:string;crmIds:string[];title:string;group:string;kind:string;supplier:string;variant:string;duration:string;route:string;baseRouteId:string;origin:string;destination:string;vehicleClass:string;times:string;includes:string;excludes:string;children:string;toConfirm:string[];sourceNotes:string[];
 sourcePrice:{raw:string;unit:string;amounts:{amount:number;currency:string|null}[]};evidence:{type:string;crmId:string;supplier:string;package:string;price:number|null;currency:string;unit:string;asOf:string;meaning:string;url:string;note:string}[];
 approval:{choice:string;price:number|null;cost:number|null;commission:number|null;unit:string;property:string;supplier:string;from:string;until:string;approver:string;approvedAt:string;note:string;sheetStatus:string;conditions:Record<string,string>|null}|null;
 comparison:{with:string;assessment:string;tourUrl:string;compareUrl:string}|null;transport:Record<string,unknown>|null;refs:{tab:string;row:number;range:string;url:string}[];readAt:string;
 classification:{category:'quotable'|'advise'|'reference'|'unusable';canAdvise:boolean;canQuote:boolean;referenceOnly:boolean;unusable:boolean;approvalComplete:boolean;approvalMissing:string[];issues:string[]};importVersion:number;removedInSource?:number};
export const rateCatalog=data as unknown as {version:number;sheetUrl:string;sourceReadAt:string;imports:{version:number;at:string;sha256:string;rows:Record<string,number>}[];items:Record<string,CatalogItem>;changes:{version:number;id:string;field:string;needsReview:boolean}[]};
export const catalogItems=Object.values(rateCatalog.items).filter(i=>!i.removedInSource);
export const findCatalogItem=(id:string)=>rateCatalog.items[id];
export const catalogVersion=`rate-sheet v${rateCatalog.version}/${rateCatalog.imports.at(-1)?.sha256.slice(0,12)||''}`;

// Price is usable only with a complete approval record, the right property and a valid date.
// A "Cua duyệt" choice alone is not enough (e.g. HN01 has the choice but no price or conditions).
export function priceStatus(item:CatalogItem,ctx:{propertyId?:string;serviceDate?:string}={}){
 const a=item.approval,c=item.classification,reasons:string[]=[];
 if(!c.approvalComplete)reasons.push(c.approvalMissing.length?`Hồ sơ duyệt còn thiếu: ${c.approvalMissing.join(', ')}`:'Chưa được Cua duyệt');
 if(a&&c.approvalComplete){
  if(ctx.propertyId&&a.property&&!normalize(a.property).includes(ctx.propertyId==='luxe-75pht'?'75':'suites'))reasons.push(`Giá duyệt cho cơ sở "${a.property}", không phải cơ sở của booking này`);
  if(!ctx.serviceDate)reasons.push('Chưa biết ngày dùng dịch vụ để kiểm tra hiệu lực');
  else if((a.from&&ctx.serviceDate<a.from)||(a.until&&ctx.serviceDate>a.until))reasons.push(`Ngày ${ctx.serviceDate} ngoài hiệu lực ${a.from}–${a.until}`);
 }
 const quotable=c.approvalComplete&&!reasons.length;
 return {quotable,label:quotable?'Giá đã duyệt':'Tham khảo · Cần Cua chốt giá',reasons,approved:quotable&&a?{price:a.price!,unit:a.unit,from:a.from,until:a.until}:null};
}

const places:[RegExp,string][]=[[/ha giang|dong van|ma pi leng|lung cu|meo vac|du gia/,'Hà Giang'],[/cao bang|ban gioc|nguom ngao|pac bo/,'Cao Bằng'],[/sa ?pa|fansipan|cat cat|lao chai|ta van/,'Sa Pa'],[/cat ba|lan ha/,'Cát Bà / Lan Hạ'],[/ha ?long|halong|bai tu long/,'Hạ Long'],[/ninh binh|hoa lu|trang an|tam coc|mua cave|hang mua|bai dinh|thung ui/,'Ninh Bình'],[/phong nha|thien duong|paradise cave/,'Phong Nha'],[/\bhue\b/,'Huế'],[/hoi an|my son/,'Hội An'],[/da nang|ba na|golden bridge|cau vang/,'Đà Nẵng'],[/da lat/,'Đà Lạt'],[/mui ne/,'Mũi Né'],[/mekong|can tho|cai rang|cu chi/,'Mekong / TP.HCM'],[/phu quoc/,'Phú Quốc']];
export function placesIn(text:string){const n=normalize(text);return places.filter(([re])=>re.test(n)).map(([,p])=>p);}
export const daysOf=(duration:string)=>{const m=normalize(duration).match(/(\d+)\s*ngay/);if(m)return Number(m[1]);const h=normalize(duration).match(/(\d+(?:[.,]\d+)?)\s*(?:-\s*\d+\s*)?gio/);return h?Number(h[1].replace(',','.'))/24:0;};
export function includesTransportFromHanoi(i:CatalogItem){const inc=normalize(i.includes),exc=normalize(i.excludes);return /xe (?:ha noi )?khu hoi|xe ha noi|cabin bus|limousine|airport|^xe[ ,]|; xe[ ,]/.test(inc)&&!/transfer|xe ha noi/.test(exc);}

// Advisable tour items for the places the guest named, filtered by time available and length.
export function searchTours(q:{places:string[];multiDay:boolean;halfDay:boolean;preference:string}){
 if(q.halfDay)return [];
 const pref=normalize(q.preference);
 return catalogItems.filter(i=>i.classification.canAdvise&&i.kind==='tour'&&q.places.some(p=>placesIn([i.title,i.route,i.group].join(' ')).includes(p)))
  .filter(i=>{const d=daysOf(i.duration);return q.multiDay?d!==1:d<=1;})
  .sort((a,b)=>Number(Boolean(pref)&&normalize(b.title).includes(pref.split(' ')[0]))-Number(Boolean(pref)&&normalize(a.title).includes(pref.split(' ')[0]))||a.id.localeCompare(b.id));
}
// Bus/limousine schedules from Hanoi and 12Go routes for a destination, with the source cautions.
export function transportFor(place:string){
 const p=normalize(place);
 return catalogItems.filter(i=>(i.kind==='bus_schedule'||i.kind==='transport_route')&&normalize(i.destination).includes(p.split(' /')[0])).map(i=>{const t=(i.transport||{}) as Record<string,string>;const cautions:string[]=[];
  const all=[i.times,t.duration,t.scheduleType,t.check].join(' ');
  if(/\+1 ngay|\+1 ngày/i.test(all))cautions.push('Có chuyến đến vào ngày hôm sau (+1 ngày).');
  if(/\b00:\d\d\b/.test(i.times))cautions.push('Chuyến 00:xx là sau nửa đêm: thuộc ngày hôm sau so với tối hôm trước.');
  if(/tong hop|tổng hợp/i.test(all))cautions.push('Lịch tổng hợp: không áp mọi giờ cho mọi điểm đón/hạng xe.');
  if(/mau|mẫu/i.test(all))cautions.push('Chuyến/lịch mẫu: không có nghĩa còn chỗ hoặc chạy đúng ngày khách đi.');
  if(/noi bai|nội bài/i.test(all))cautions.push('Không dùng giờ nội thành cho điểm Nội Bài và ngược lại.');
  if(/ha giang/.test(normalize(i.destination)))cautions.push('Xe tới TP Hà Giang không gồm Hà Giang Loop.');
  if(/cao bang/.test(normalize(i.destination)))cautions.push('Xe tới TP Cao Bằng không gồm tour Bản Giốc.');
  cautions.push('Thời lượng là ước tính; không phải giờ đến được bảo đảm.');
  return {id:i.id,kind:i.kind,supplier:i.supplier,vehicleClass:i.vehicleClass,departures:i.times,duration:String(t.duration||''),pickup:String(t.pickup||''),scheduleType:String(t.scheduleType||''),price:i.sourcePrice.raw,cautions,ref:i.refs[0]?.range||''};});
}
const durationMap:[RegExp,(m:RegExpMatchArray)=>string][]=[[/(\d+)\s*ngày\s*(\d+)\s*đêm/i,m=>`${m[1]} days / ${m[2]} nights`],[/(\d+)N(\d+)Đ/,m=>`${m[1]} days / ${m[2]} nights`],[/^1 ngày$/i,()=>'1 day'],[/khoảng\s*([\d,]+)\s*giờ/i,m=>`about ${m[1].replace(',','.')} hours`],[/([\d–-]+)\s*giờ/i,m=>`${m[1]} hours`]];
export function durationEn(d:string){for(const [re,f] of durationMap){const m=d.match(re);if(m)return f(m);}return '';}
const classMap:[RegExp,string][]=[[/budget dorm|dorm/i,'budget dorm'],[/phòng riêng/i,'private room'],[/premium/i,'premium'],[/easy rider/i,'with an easy rider (driver)'],[/tự lái/i,'self-drive motorbike'],[/jeep/i,'by jeep'],[/cabin đôi|double cabin/i,'double cabin'],[/cabin đơn|single cabin/i,'single cabin'],[/limousine/i,'limousine'],[/xe thường/i,'standard coach']];
export function classEn(title:string){return classMap.filter(([re])=>re.test(title)).map(([,v])=>v).join(', ');}
