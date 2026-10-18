import {quoteProducts as products,findQuoteSource,isSourceProduct} from './quote-sources';
import {approvalIssues, totals, type QuoteInput, type QuoteLine, type QuotePayload, type QuoteVersion} from './quotes';
import type {Contact} from './validation';
export const quoteMoney=(n:number|null)=>n===null?'Chưa đủ dữ liệu':new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
export const quoteDay=(v:string)=>v?v.split('-').reverse().join('/'):'Chưa có ngày';
export function newQuote(day:string):QuoteInput {
 const expiry=new Date(day+'T12:00:00Z');expiry.setUTCDate(expiry.getUTCDate()+2);
 return {lines:[],validUntil:expiry.toISOString().slice(0,10),conditions:'Giá và điều kiện giả lập để luyện quy trình. Chỗ chưa được nhà cung cấp xác nhận. Cần bổ sung điều kiện đặt cọc, đổi/hủy, phụ thu và thời hạn xác nhận trước khi sử dụng thực tế.',missing:'',childrenPolicy:'',demoPriceConfirmed:false};
}
export function initialQuoteLine(contact:Contact,productId:string):QuoteLine {
 const p=products.find(p=>p.id===productId);if(!p)throw Error('Không có dịch vụ trong danh mục.');
 const r=contact.reception;
 const childAges=contact.children.split(',').map(x=>x.trim()).filter(Boolean);
 const knownChildren=childAges.every(x=>/^\d{1,2}$/.test(x))?childAges.length:0;
 // A departure transfer is not an arrival; a flight clock is not a pickup clock.
 const ref=findQuoteSource(productId);
 const serviceDate=p.kind==='tour'?contact.service_date||'':ref?(ref.direction==='dropoff'?r?.departure||'':ref.direction==='pickup'?r?.arrival||'':''):productId==='X02'?r?.departure||'':r?.arrival||'';
 const introduction=p.description.split(/(?<=[.!?])\s+/)[0];
 const detail=ref?[`Nội dung nguồn tham khảo: ${ref.summary.slice(0,600)}`,`Chương trình, quyền lợi bao gồm/chưa gồm đang chờ xác nhận; không phải cam kết dịch vụ.`]:[introduction,`Bao gồm (mẫu): ${p.includes}.`,`Chưa gồm (mẫu): ${p.excludes}.`];
 if(p.kind==='transfer'){
  if(r?.flight)detail.push(`Chuyến bay đã ghi: ${r.flight}.`);
  if(r?.flightTime)detail.push(`Thời gian chuyến bay đã ghi: ${r.flightTime} (cần đối chiếu chiều bay; không phải giờ đón).`);
  // Generic pickup/dropoff fields can describe the other direction; keep them as reference, not an agreed route.
  if(r?.pickup||r?.dropoff)detail.push(`Điểm di chuyển trong hồ sơ, cần đối chiếu chiều xe: ${r.pickup||'chưa rõ'} → ${r.dropoff||'chưa rõ'}.`);
 }
 return {productId,date:serviceDate,quantity:p.kind==='tour'?contact.adults:1,passengers:contact.adults+(p.kind==='transfer'?knownChildren:0),price:p.price,cost:p.cost,commission:p.commission,extraCost:0,discount:0,details:detail.join('\n').slice(0,1000)};
}
export function quoteCopyIssues(v:QuoteVersion,day:string):string[]{
 const out:string[]=[];
 if(v.revision!==v.current_revision)out.push('Đây là phiên bản cũ; mở bản mới nhất.');
 if(v.payload.contactVersion!==v.current_contact_version)out.push('Hồ sơ khách đã đổi; tạo phiên bản mới và đối chiếu lại.');
 if(v.status!=='approved')out.push('Lưu và duyệt nội bộ phiên bản này trước khi copy bản mẫu.');
 return [...out,...approvalIssues(v.payload,day)];
}
// Only these explicit saved fields enter the presentation. Never serialize the payload,
// internal financial fields, supplier identity or the full guest reception profile.
export function guestQuoteText(p:QuotePayload):string {
 const reference=p.lines.some(l=>isSourceProduct(l.productId));
 const lines=[reference?'BẢN NHÁP THAM KHẢO CRABS — CHƯA XÁC NHẬN GIÁ VÀ ĐIỀU KIỆN; CHƯA GỬI KHÁCH':'BẢN MẪU CRABS — GIÁ GIẢ LẬP, CHƯA DÙNG ĐỂ CHỐT DỊCH VỤ THẬT','',`Chào ${p.contactName},`,'Đây là phương án dịch vụ để bạn xem xét:',''];
 p.lines.forEach((l,i)=>{lines.push(`${i+1}. ${l.title}`,`Ngày: ${quoteDay(l.date)} · Số lượng: ${l.quantity} ${l.unit}${l.kind==='transfer'?` · ${l.passengers} khách`:''}`,l.details||'Nội dung và quyền lợi dịch vụ chưa được ghi trong phiên bản này.','');});
 lines.push('Điều kiện áp dụng:',p.conditions);
 if(p.childrenPolicy)lines.push('Chính sách trẻ em: '+p.childrenPolicy);
 lines.push('','Chi phí dự kiến (VND):');
 p.lines.forEach((l,i)=>lines.push(`${i+1}. ${l.title}: ${quoteMoney(l.price===null?null:l.price*l.quantity-l.discount)}${l.discount?` (đã giảm ${quoteMoney(l.discount)})`:''}`));
 lines.push(`Tổng giá bán: ${quoteMoney(totals(p.lines).sale)}`,`Hiệu lực báo giá đến: ${quoteDay(p.validUntil)}.`,'Chỗ/dịch vụ còn cần nhà cung cấp xác nhận; chưa ghi nhận đặt cọc hoặc thanh toán.','','Bạn thấy phương án này phù hợp không? Nếu muốn điều chỉnh lựa chọn hoặc ngân sách, bạn cứ cho mình biết để mình kiểm tra phương án phù hợp.');
 return lines.join('\n');
}
