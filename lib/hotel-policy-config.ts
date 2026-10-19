import data from './hotel-policy-config.json';

// Hotel rules and service prices per property, edited in hotel-policy-config.json.
// Only entries marked "approved" may put an amount into a guest draft or an approvable quote.
type Text={vi:string;en:string};
export type Vehicle={id:string;seats:number;maxGuests:number;maxLuggage:number;pickup:number|null;dropoff:number|null;cost:number|null;commission:number|null};
export type SpaItem={id:string;name:Text;minutes:number;price:number|null;cost:number|null;commission:number|null};
export type TourProduct={id:string;place:string;title:Text;duration:string;unit:string;fromPrice:number|null;price:number|null;cost:number|null;commission:number|null;approved:boolean;source:string};
export type PropertyPolicy={displayName:string;demoName:string;checkIn:string;checkOut:string;
 earlyCheckIn:{approved:boolean;from:string;until:string;fee:Text;condition:Text};
 lateCheckOut:{approved:boolean;until:string;fee:Text;condition:Text};
 airportTransfer:{approved:boolean;approvedNote:string;validUntil:string;route:Text;vehicles:Vehicle[];includes:Text};
 spa:{approved:boolean;note:string;advanceBookingOffer:Text|null;items:SpaItem[]};
 tours:{whatsappAsk:boolean;note:string;products:TourProduct[]}};
export const hotelPolicy=data as unknown as {version:string;presentation:{brandDemoName:string;maskPatterns:string[]};properties:Record<string,PropertyPolicy>};
export const policyFor=(propertyId:string):PropertyPolicy|undefined=>hotelPolicy.properties[propertyId];

export const formatMoney=(n:number,vi:boolean)=>vi?n.toLocaleString('vi-VN')+'đ':n.toLocaleString('en-US')+' VND';

// Smallest vehicle that fits the party and luggage; undefined if the party is unknown or too large.
export function chooseVehicle(p:PropertyPolicy,guests:number,luggage=0){
 if(!guests)return undefined;
 return p.airportTransfer.vehicles.filter(v=>guests<=v.maxGuests&&(!luggage||luggage<=v.maxLuggage)).sort((a,b)=>a.seats-b.seats)[0];
}
const spaPriced=(p:PropertyPolicy)=>p.spa.approved&&p.spa.items.some(i=>i.price!==null);

// Amounts a guest draft may contain for this property: exactly the approved configured prices.
export function approvedAmounts(propertyId:string):number[]{
 const p=policyFor(propertyId);if(!p)return [];
 const out:number[]=[];
 if(p.airportTransfer.approved)for(const v of p.airportTransfer.vehicles)for(const x of [v.pickup,v.dropoff])if(x!==null)out.push(x);
 if(spaPriced(p))for(const i of p.spa.items)if(i.price!==null)out.push(i.price);
 for(const t of p.tours.products)if(t.approved&&t.fromPrice!==null)out.push(t.fromPrice);
 return out;
}

// Hotel services offered in the quote screen. A product is "complete" (approvable with profit)
// only when it is approved and has sale price, cost and commission.
export type ServiceProduct={id:string;propertyId:string;title:string;region:string;duration:string;kind:'transfer'|'spa'|'tour';supplier:string;unit:string;price:number|null;cost:number|null;commission:number|null;validUntil:string;description:string;includes:string;excludes:string;capacity?:number;direction?:'pickup'|'dropoff';approved:boolean;complete:boolean};
export const serviceProducts:ServiceProduct[]=Object.entries(hotelPolicy.properties).flatMap(([propertyId,p])=>{
 const tag=p.demoName;const out:ServiceProduct[]=[];
 const complete=(approved:boolean,...v:(number|null)[])=>approved&&v.every(x=>x!==null&&x>0)||false;
 for(const v of p.airportTransfer.vehicles)for(const direction of ['pickup','dropoff'] as const){const price=v[direction];
  out.push({id:`HS-${propertyId}-${v.id}-${direction}`,propertyId,title:`${direction==='pickup'?'Đón sân bay':'Tiễn sân bay'} · xe ${v.seats} chỗ`,region:tag,duration:'Một chiều',kind:'transfer',supplier:'Nhà xe khách sạn',unit:'xe / chiều',price,cost:v.cost,commission:v.commission,validUntil:p.airportTransfer.validUntil,description:`${p.airportTransfer.route.vi}. Tối đa ${v.maxGuests} khách, ${v.maxLuggage} vali.`,includes:p.airportTransfer.includes.vi,excludes:'Phụ thu chờ quá giờ, điểm dừng thêm',capacity:v.maxGuests,direction,approved:p.airportTransfer.approved,complete:complete(p.airportTransfer.approved,price,v.cost)&&v.commission!==null});}
 for(const i of p.spa.items)out.push({id:`HS-${propertyId}-${i.id}`,propertyId,title:`Spa · ${i.name.vi} ${i.minutes} phút`,region:tag,duration:`${i.minutes} phút`,kind:'spa',supplier:'Spa khách sạn',unit:'khách',price:i.price,cost:i.cost,commission:i.commission,validUntil:'2026-12-31',description:`${i.name.vi} ${i.minutes} phút tại spa khách sạn.`,includes:'Liệu trình theo menu spa',excludes:'Đồ uống, dịch vụ ngoài menu',approved:p.spa.approved,complete:complete(p.spa.approved,i.price,i.cost)&&i.commission!==null});
 for(const t of p.tours.products)out.push({id:`HS-${propertyId}-${t.id}`,propertyId,title:t.title.vi,region:t.place,duration:t.duration,kind:'tour',supplier:'Nhà cung cấp tour (theo nguồn)',unit:t.unit,price:t.price,cost:t.cost,commission:t.commission,validUntil:'2026-12-31',description:`${t.title.vi}. Nguồn giá: ${t.source}.`,includes:'Theo chương trình nhà cung cấp, cần xác nhận',excludes:'Chi phí cá nhân',approved:t.approved,complete:complete(t.approved,t.price,t.cost)&&t.commission!==null});
 return out;
});
export const findServiceProduct=(id:string)=>serviceProducts.find(p=>p.id===id);

// Presentation mode: neutral names on screen without changing stored data.
export const PRESENTATION_KEY='crabs-presentation';
export function presentationOn(){try{return typeof window!=='undefined'&&window.localStorage.getItem(PRESENTATION_KEY)==='1';}catch{return false;}}
const maskRules=(()=>{const rules:[RegExp,string][]=[];
 for(const p of Object.values(hotelPolicy.properties))rules.push([new RegExp(p.displayName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi'),p.demoName]);
 rules.push([/Luxe Paradise Suites[^\n,<]*/gi,hotelPolicy.properties['luxe-suites']?.demoName||hotelPolicy.presentation.brandDemoName]);
 rules.push([/(?:Luxe Paradise|LP Hotel)[^\n,<]*(?:Pham Hong Thai|Phạm Hồng Thái)[^\n,<]*/gi,hotelPolicy.properties['luxe-75pht']?.demoName||hotelPolicy.presentation.brandDemoName]);
 for(const s of hotelPolicy.presentation.maskPatterns)rules.push([new RegExp(s,'gi'),hotelPolicy.presentation.brandDemoName]);
 return rules;})();
export function maskText(s:string,on=presentationOn()){if(!on||!s)return s;let out=s;for(const [re,v] of maskRules)out=out.replace(re,v);return out;}
export function propertyName(id:string,fallback='',on=presentationOn()){const p=policyFor(id);return p?(on?p.demoName:p.displayName):fallback;}
