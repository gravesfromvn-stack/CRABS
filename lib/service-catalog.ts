import {z} from 'zod';
import seed from './service-catalog-seed.json';
import type {PropertyPolicy} from './hotel-policy-config';

// One service & rate catalog for OTA advice, quotes and the tour library. Seeded from the merged
// sources (scripts/build-service-catalog.mjs) into D1 per owner, then edited in the app.
// Only APPROVED entries with a selling price may put an amount into a guest draft or quote.
export const categoryLabels={AIRPORT_TRANSFER:'Xe sân bay',HALONG_TOUR:'Tour Hạ Long',NINHBINH_TOUR:'Tour Ninh Bình',SAPA_TOUR:'Tour Sa Pa',HANOI_TOUR:'Tour Hà Nội',OTHER_TOUR:'Tour khác',INTERCITY_BUS_12GO:'Xe khách / 12Go',SPA:'Spa',ROOM_POLICY:'Phụ phí phòng / gia hạn'} as const;
export const statusLabels={APPROVED:'Đã duyệt giá',REFERENCE_ONLY:'Chỉ tham khảo',ARCHIVED:'Lưu trữ'} as const;
export const flowLabels={EXTRANET_DIRECT:'Báo giá trên Extranet',WHATSAPP_CONSULT:'Tư vấn qua WhatsApp'} as const;
export type CatalogCategory=keyof typeof categoryLabels;
export type CatalogStatus=keyof typeof statusLabels;
export type CatalogFlow=keyof typeof flowLabels;
export type CatalogRule={kind:'percent_of_room'|'discount_percent';percent:number;window:string;text:string};
export type CatalogEntry={id:string;crmCode:string|null;sourceIds:string[];propertyScope:'ALL'|string[];category:CatalogCategory;channelFlow:CatalogFlow;
 title:string;variant:string;unit:string;duration:string;summary:string;highlights:string[];inclusions:string;exclusions:string;supplierName:string;
 netCost:number|null;sellingPrice:number|null;commission:number|null;currency:'VND'|'USD';status:CatalogStatus;place:string;validUntil:string;
 sourceNote:string;sourceUrl:string;approvedBy:string;approvedAt:string;capacity?:number;direction?:'pickup'|'dropoff';rule?:CatalogRule};
export type StoredEntry=CatalogEntry&{version:number;updated:string};

export const seedEntries=seed.entries as unknown as CatalogEntry[];
export const seedVersion=seed.version;

const money=z.number().min(0).max(1000000000).nullable();
const day=z.string().refine(v=>v===''||/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v)),'Ngày không hợp lệ');
// Fields Cua edits in the manager; identity, sources and approval stamps are kept by the server.
export const entryEdit=z.object({
 title:z.string().trim().min(2).max(200),variant:z.string().trim().max(200),unit:z.string().trim().min(1).max(80),duration:z.string().trim().max(120),
 summary:z.string().trim().max(2000),inclusions:z.string().trim().max(2000),exclusions:z.string().trim().max(2000),supplierName:z.string().trim().max(200),
 category:z.enum(Object.keys(categoryLabels) as [CatalogCategory,...CatalogCategory[]]),channelFlow:z.enum(['EXTRANET_DIRECT','WHATSAPP_CONSULT']),
 propertyScope:z.union([z.literal('ALL'),z.array(z.string().min(1).max(60)).min(1).max(20)]),
 sellingPrice:money,netCost:money,commission:money,currency:z.enum(['VND','USD']),validUntil:day,
 status:z.enum(['APPROVED','REFERENCE_ONLY','ARCHIVED']),
}).superRefine((v,c)=>{
 if(v.status==='APPROVED'&&v.category!=='ROOM_POLICY'&&!v.sellingPrice)c.addIssue({code:'custom',message:'Cần giá bán trước khi duyệt.'});
 if(v.currency==='VND'&&[v.sellingPrice,v.netCost,v.commission].some(x=>x!==null&&!Number.isInteger(x)))c.addIssue({code:'custom',message:'Giá VND phải là số nguyên.'});
 if(v.sellingPrice!==null&&v.netCost!==null&&v.netCost>v.sellingPrice)c.addIssue({code:'custom',message:'Giá vốn cao hơn giá bán.'});
});
export type EntryEdit=z.infer<typeof entryEdit>;
export const catalogCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),operationId:z.string().uuid(),id:z.string().min(1).max(120),version:z.number().int().nonnegative(),entry:entryEdit}),
 z.object({action:z.literal('create'),operationId:z.string().uuid(),entry:entryEdit}),
]);

export const inScope=(e:Pick<CatalogEntry,'propertyScope'>,propertyId?:string)=>!propertyId||e.propertyScope==='ALL'||e.propertyScope.includes(propertyId);
export const priceApproved=(e:CatalogEntry)=>e.status==='APPROVED'&&e.sellingPrice!==null&&e.sellingPrice>0;
// Ready for an approvable quote with profit: approved price, cost and commission, in VND.
export const quoteReady=(e:CatalogEntry)=>priceApproved(e)&&e.currency==='VND'&&e.netCost!==null&&e.commission!==null;
export function formatEntryPrice(e:Pick<CatalogEntry,'sellingPrice'|'currency'>,vi=true){
 if(e.sellingPrice===null)return 'Chưa có giá';
 return e.currency==='USD'?`${e.sellingPrice.toLocaleString(vi?'vi-VN':'en-US')} USD`:vi?e.sellingPrice.toLocaleString('vi-VN')+'đ':e.sellingPrice.toLocaleString('en-US')+' VND';
}

// Amounts a guest draft may contain for this property: approved selling prices in scope.
export function catalogApprovedAmounts(entries:CatalogEntry[],propertyId:string):number[]{
 return [...new Set(entries.filter(e=>priceApproved(e)&&inScope(e,propertyId)).map(e=>e.sellingPrice!))];
}

// The hotel policy with prices and approvals taken from the catalog (transfer, spa, room rules).
export function catalogPolicy(base:PropertyPolicy|undefined,entries:CatalogEntry[]|undefined,propertyId:string):PropertyPolicy|undefined{
 if(!base||!entries)return base;
 const p:PropertyPolicy=structuredClone(base);const byId=new Map(entries.map(e=>[e.id,e]));
 let transfer=false;
 for(const v of p.airportTransfer.vehicles)for(const d of ['pickup','dropoff'] as const){const e=byId.get(`HS-${propertyId}-${v.id}-${d}`);const ok=!!e&&priceApproved(e)&&inScope(e,propertyId);v[d]=ok?e!.sellingPrice:null;if(e){v.cost=e.netCost;v.commission=e.commission;}transfer||=ok;}
 p.airportTransfer.approved=transfer;
 let spa=false;
 for(const i of p.spa.items){const e=byId.get(`HS-${propertyId}-${i.id}`);const ok=!!e&&priceApproved(e)&&inScope(e,propertyId);i.price=ok?e!.sellingPrice:null;if(e){i.cost=e.netCost;i.commission=e.commission;}spa||=ok;}
 p.spa.approved=spa;
 const rule=(id:string)=>byId.get(`ROOM-${propertyId}-${id}`);
 const early=rule('early-checkin'),late=rule('late-checkout'),ext=rule('extension-direct');
 if(early)p.earlyCheckIn.approved=early.status==='APPROVED';
 if(late)p.lateCheckOut.approved=late.status==='APPROVED';
 if(ext){p.extensionDirect.approved=ext.status==='APPROVED';if(ext.rule)p.extensionDirect.discountPercent=ext.rule.percent;}
 return p;
}

// Approved price for a workbook tour item (NB01…) at this property and service date.
export function catalogTourApproval(entries:CatalogEntry[]|undefined,rateItemId:string,ctx:{propertyId?:string;serviceDate?:string}){
 const e=entries?.find(x=>x.id===rateItemId||x.sourceIds.includes(rateItemId));
 if(!e)return null;
 if(e.status==='ARCHIVED')return {entry:e,archived:true,approved:null,reasons:['Mục đã lưu trữ trong kho dịch vụ']};
 const reasons:string[]=[];
 if(!priceApproved(e))reasons.push('Kho dịch vụ: chưa duyệt giá');
 if(!inScope(e,ctx.propertyId))reasons.push('Kho dịch vụ: không áp dụng cho cơ sở này');
 if(ctx.serviceDate&&e.validUntil&&ctx.serviceDate>e.validUntil)reasons.push(`Ngày ${ctx.serviceDate} sau hiệu lực ${e.validUntil}`);
 return {entry:e,archived:false,reasons,approved:reasons.length?null:{price:e.sellingPrice!,currency:e.currency,unit:e.unit,from:e.approvedAt,until:e.validUntil}};
}

// Quote product view of a catalog entry (room policies are rules, not quotable lines).
export type CatalogProduct={id:string;title:string;kind:string;unit:string;supplier:string;duration:string;price:number|null;cost:number|null;commission:number|null;validUntil:string;description:string;includes:string;excludes:string;region:string;capacity?:number;direction?:'pickup'|'dropoff';status:CatalogStatus;ready:boolean;category:CatalogCategory;propertyScope:'ALL'|string[];currency:'VND'|'USD'};
const kindOf=(c:CatalogCategory)=>c==='AIRPORT_TRANSFER'?'transfer':c==='SPA'?'spa':c==='INTERCITY_BUS_12GO'?'transport':'tour';
export function catalogProduct(e:CatalogEntry):CatalogProduct{
 const ready=quoteReady(e);
 return {id:e.id,title:e.variant&&!e.title.includes(e.variant)?`${e.title} · ${e.variant}`:e.title,kind:kindOf(e.category),unit:e.unit,supplier:e.supplierName,duration:e.duration,
  price:ready?e.sellingPrice:null,cost:ready?e.netCost:null,commission:ready?e.commission:null,validUntil:e.validUntil,description:e.summary,includes:e.inclusions||'Chưa xác nhận',excludes:e.exclusions||'Chưa xác nhận',region:e.place,
  ...(e.capacity?{capacity:e.capacity}:{}),...(e.direction?{direction:e.direction}:{}),status:e.status,ready,category:e.category,propertyScope:e.propertyScope,currency:e.currency};
}
export const catalogProducts=(entries:CatalogEntry[])=>entries.filter(e=>e.category!=='ROOM_POLICY').map(catalogProduct);
// An id merged into another entry (R75 row, XE…, config id) still resolves to that entry.
export function findEntry<T extends CatalogEntry>(entries:T[]|undefined,id:string):T|undefined{return entries?.find(e=>e.id===id)||entries?.find(e=>e.sourceIds.includes(id));}
