import type { Reception } from './reception';
import { z } from 'zod';
import { quoteProducts as products, isSourceProduct, type QuoteSourceSnapshot } from './quote-sources';
const day=z.string().refine(v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'Ngày không hợp lệ');
const amount=z.number().int().min(0).max(1000000000);
export const lineSchema=z.object({productId:z.string().refine(v=>products.some(p=>p.id===v)),date:day,quantity:z.number().int().min(1).max(100),passengers:z.number().int().min(1).max(100),price:amount.nullable(),cost:amount.nullable(),commission:amount.nullable(),extraCost:amount,discount:amount,details:z.string().trim().max(1000)}).superRefine((l,c)=>{if(l.price!==null&&l.discount>l.price*l.quantity)c.addIssue({code:'custom',message:'Giảm giá vượt giá bán'});if(!isSourceProduct(l.productId)&&[l.price,l.cost,l.commission].includes(null))c.addIssue({code:'custom',message:'Giá mẫu cần đủ số liệu'});});
export const quoteInput=z.object({lines:z.array(lineSchema).min(1).max(20),validUntil:day,conditions:z.string().trim().min(10).max(3000),missing:z.string().trim().max(2000),childrenPolicy:z.string().trim().max(1000),demoPriceConfirmed:z.boolean()});
export type QuoteInput=z.infer<typeof quoteInput>;
export type QuoteLine=z.infer<typeof lineSchema>;
export type QuotePayload=Omit<QuoteInput,'lines'>&{contactReception?:Reception;contactVersion:number;contactName:string;contactDate:string;children:string;lines:(QuoteLine&{title:string;unit:string;supplier:string;kind:string;reference?:QuoteSourceSnapshot})[]};
export type QuoteVersion={quote_id:string;revision:number;contact_id:string;payload:QuotePayload;status:'draft'|'approved';created:string;approved_at:string|null;current_revision:number;current_contact_version:number|null};
export function totals(lines:QuoteLine[]){
 const known=(key:'price'|'cost'|'commission')=>lines.every(l=>l[key]!==null);
 const sum=(key:'price'|'cost'|'commission')=>known(key)?lines.reduce((a,l)=>a+l[key]!*l.quantity-(key==='price'?l.discount:0),0):null;
 const sale=sum('price'),cost=sum('cost'),commission=sum('commission'),extra=lines.reduce((a,l)=>a+l.extraCost,0),discount=lines.reduce((a,l)=>a+l.discount,0);
 return {sale,cost,commission,extra,discount,profit:sale===null||cost===null||commission===null?null:sale-cost-commission-extra};
}
export function approvalIssues(p:QuotePayload,today:string){const issues:string[]=[];if(!p.demoPriceConfirmed)issues.push('Xác nhận đã kiểm tra giá mẫu cho demo.');if(p.missing)issues.push('Giải quyết thông tin còn thiếu trước khi duyệt.');if(p.validUntil<today)issues.push('Báo giá đã hết hiệu lực.');if(p.children&&!p.childrenPolicy)issues.push('Ghi chính sách và cách tính trẻ em; không tự áp giá người lớn.');for(const l of p.lines){
 const product=products.find(v=>v.id===l.productId);
 if(isSourceProduct(l.productId)||l.reference){issues.push(`${l.title}: nguồn tham khảo 75PHT đang chờ Cua xác nhận giá, đơn vị, cơ sở, hiệu lực và điều kiện. Chỉ lưu nháp; chưa duyệt/copy.`);}
 else if(!product||l.date<today||l.date>product.validUntil)issues.push(`${l.title}: ngày nằm ngoài hiệu lực giá mẫu.`);
 if(l.date<today)issues.push(`${l.title}: ngày dịch vụ đã qua.`);
 if(p.validUntil>l.date)issues.push('Hiệu lực báo giá không được sau ngày dịch vụ.');
 if(l.price===null||l.cost===null||l.price===0||l.cost===0)issues.push(`${l.title}: thiếu giá bán hoặc giá vốn.`);
 if(l.commission===null)issues.push(`${l.title}: hoa hồng chưa được xác nhận; chưa tính lãi.`);
 if(l.kind==='transfer'){if(!l.details)issues.push(`${l.title}: cần chuyến bay/giờ đón, điểm đón/trả và hành lý.`);if(!isSourceProduct(l.productId)){const capacity=l.productId==='X01'?3:5;if(l.passengers>capacity*l.quantity)issues.push(`${l.title}: số khách vượt sức chứa xe mẫu.`);}}
 }const profit=totals(p.lines).profit;if(profit!==null&&profit<0)issues.push('Lãi dự kiến âm; điều chỉnh báo giá trước khi duyệt.');return [...new Set(issues)];}
export const quoteCommand=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),operationId:z.string().uuid(),id:z.string().uuid(),contactId:z.string().min(1).max(100),expectedRevision:z.number().int().min(0),contactVersion:z.number().int().positive(),quote:quoteInput}),
 z.object({action:z.literal('approve'),operationId:z.string().uuid(),id:z.string().uuid(),revision:z.number().int().positive()}),
]);
