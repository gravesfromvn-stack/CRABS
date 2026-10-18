import type { Contact, Message } from './validation';
import { readReception } from './reception';
import { products } from './demo-data';
import { sourceSuggestion } from './source-cases';

export const replyPolicyVersion='luxe-value-first-2026-10-15';
export type Suggestion={body:string;sources:string[];known:string[];review:string[];kind:string};
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
export async function contextKey(c:Contact,m:Message[]){
 const policy=c.id.startsWith('src75-')?'luxe-source-first-2026-10-15-v2':replyPolicyVersion;
 const bytes=new TextEncoder().encode(JSON.stringify({policy,contact:c,messages:m.map(x=>[x.id,x.direction,x.body,x.created])}));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
}
export function suggestReply(c:Contact,messages:Message[]):Suggestion{
 const sourced=sourceSuggestion(c,messages);if(sourced)return sourced;
 const r=readReception(c.reception),incoming=messages.filter(m=>m.direction==='in'),last=incoming.at(-1)?.body||'',text=incoming.map(m=>m.body).join('\n'),n=normalize([c.interest,text,r.preferences,...r.requests.filter(x=>!['done','cancelled'].includes(x.status)).map(x=>x.title)].join(' ')),latest=normalize(last);
 const en=/\b(i would|we would|please|our|i want|we want|vegetarian|what do you)\b/i.test(last);
 const name=c.name.replace(/\s*·.*$/,'').trim();
 const date=c.service_date?c.service_date.split('-').reverse().slice(0,2).join('/'):'';
 const flight=r.flight||[...text.matchAll(/(?:chuyến(?: bay)?|flight)\s*(?:number\s*)?[:#]?\s*([A-Z]{2,8}[- ]?\d{2,5})/gi)].at(-1)?.[1]||'';
 const time=r.flightTime?r.flightTime.slice(11,16):[...text.matchAll(/\b(\d{1,2}:\d{2})\b/g)].at(-1)?.[1]||'';
 const arrival=r.arrival?r.arrival.split('-').reverse().slice(0,2).join('/'):[...text.matchAll(/(?:đến[^\n.]{0,35}?ngày|arriv[^\n.]{0,35}?)\s*(\d{1,2}\/\d{1,2})/gi)].at(-1)?.[1]||'';
 const bags=[...[text,r.preferences,c.note].join(' ').matchAll(/(\d+)\s*(?:vali|va li|suitcases?|bags?|kiện hành lý)/gi)].at(-1)?.[0]||'';
 const adults=[...text.matchAll(/(\d+)\s*(?:người lớn|adults?)/gi)].at(-1)?.[1]||String(c.adults);
 const known=[`${adults} người lớn${c.children?`; trẻ: ${c.children} tuổi`:''}`,date?`Ngày dịch vụ trong hồ sơ: ${date}`:'',flight?`Chuyến bay: ${flight}`:'',arrival?`Ngày đến: ${arrival}`:'',time?`Giờ đã cung cấp: ${time}`:'',bags?`Hành lý: ${bags}`:'',c.budget?`Ngân sách đã ghi: ${c.budget.toLocaleString('vi-VN')}đ`:''].filter(Boolean);
 const review=['Giá, chỗ, điểm đón, quyền lợi và điều kiện hủy phải đối chiếu với nhà cung cấp trước khi chốt.','Thông tin gồm trong gói dưới đây là phương án demo để khách lựa chọn, chưa phải cam kết nhà cung cấp.'];
 const opening=en?`Hello ${name}, thank you for sharing the details.`:`Chào ${name}, cảm ơn bạn đã gửi thông tin.`;
 const finish=en?'Once you choose the option, I will send the final price and booking terms for your review.':'Sau khi bạn chọn phương án, em sẽ gửi báo giá và điều kiện đặt để mình chốt ở bước tiếp theo.';
 if(/\b(?:huy|cancel(?:lation)?|refund|hoan tien|khieu nai|complaint)\b/.test(latest))return {kind:'Thay đổi / hủy / khiếu nại',known,sources:['N10.3','N10.4'],review,body:en?`${opening}\n\nI have noted your request: “${last}”. I will check the applicable conditions and available options, then explain any charges or refund conditions before you decide. This message does not confirm a cancellation or refund.`:`${opening}\n\nEm đã ghi nhận yêu cầu: “${last}”. Em sẽ đối chiếu điều kiện áp dụng và gửi bạn các phương án xử lý, cùng khoản phí hoặc điều kiện hoàn tiền nếu có, trước khi bạn quyết định. Yêu cầu hiện chưa được xác nhận hủy hoặc hoàn tiền.`};
 if(/\bdoi\b[^.\n]{0,50}\bngay\b|move our|reschedul|change.*date/.test(latest))return {kind:'Đổi lịch',known,sources:['N10.2','N6.5'],review,body:en?`${opening}\n\nI have noted your requested change: “${last}”. The itinerary and included services will be checked against your existing booking for the new date. I will share the available options and any differences before asking you to confirm. Your original booking remains unchanged until the operator accepts the change.`:`${opening}\n\nEm đã ghi nhận đề nghị đổi lịch: “${last}”. Em sẽ đối chiếu chương trình và quyền lợi của đơn hiện tại với ngày mới, gửi phương án cùng phần thay đổi để bạn lựa chọn. Đơn cũ chưa thay đổi cho đến khi nhà cung cấp chấp nhận.`};
 const ids:string[]=[];
 if(/ninh binh|trang an|hang mua/.test(n))ids.push('T02');
 if(/ha long|halong|lan ha/.test(n))ids.push('T03');
 if(/sa pa|sapa/.test(n))ids.push('T04');
 if(/am thuc|food tour|vegetarian/.test(n))ids.push('T05');
 if(!ids.length&&/ha noi|hanoi|city tour/.test(n)&&!/san bay|xe don|airport/.test(n))ids.push('T01');
 const transfer=/xe|san bay|airport|pickup|pick-up|transfer/.test(n),departure=/tien san bay|drop-off|dropoff|trung tam → noi bai/.test(n);
 const parts=[opening],sources=['A02','N5.3'];
 if(transfer){sources.push('M04','N15.2');parts.push(en?`For your airport transfer${flight?` on flight ${flight}`:''}${arrival?` arriving ${arrival}`:''}${time?` at ${time}`:''}, a private vehicle offers a direct journey and space for your party's luggage. Vehicle size and the meeting point will be confirmed for your chosen option.`:`Về xe ${departure?'tiễn':'đón'} sân bay${flight?`, chuyến ${flight}`:''}${arrival?`, ngày ${arrival}`:''}${time?`, lúc ${time}`:''}: phương án xe riêng giúp ${adults} người chủ động di chuyển và sắp xếp hành lý. Loại xe, điểm gặp và các khoản bao gồm sẽ được xác nhận theo phương án đã chọn.`);}
 for(const id of ids){const p=products.find(p=>p.id===id)!;sources.push(({T01:'N3.1',T02:'N4.4',T03:'N4.3',T04:'N4.2',T05:'N17.1'} as Record<string,string>)[id]);
 const outlines:Record<string,[string,string]>={T01:['Khám phá Văn Miếu, phố cổ và trải nghiệm ẩm thực trong một ngày.','Explore the Temple of Literature, Old Quarter and local food in one day.'],T02:['Gợi ý một ngày Hoa Lư – Tràng An – Hang Múa: khám phá cố đô, đi thuyền giữa núi đá vôi và ngắm cảnh. Phần lên điểm ngắm cảnh ở Hang Múa có nhiều bậc thang; có thể trao đổi phương án ít leo bậc hơn.','A suggested day visiting Hoa Lu, Trang An and Mua Cave combines cultural sights, a scenic boat trip and viewpoints. Mua Cave involves many steps; we can discuss a gentler option.'],T03:['Hành trình trên vịnh trong ngày, kết hợp ngắm cảnh từ tàu và tham quan theo lịch trình. Hoạt động cụ thể phụ thuộc chương trình và điều kiện thời tiết.','A day on the bay combines cruising and sightseeing. Specific activities depend on the selected itinerary and weather.'],T04:['Hành trình hai ngày một đêm khám phá bản làng, cảnh núi và văn hóa địa phương; chọn mức đi bộ phù hợp.','A two-day, one-night journey through villages, mountain scenery and local culture, with a suitable walking pace.'],T05:['Trải nghiệm ẩm thực phố cổ khoảng ba giờ, tìm hiểu món ăn và văn hóa địa phương qua các điểm dừng.','An approximately three-hour Old Quarter food experience exploring local dishes and culture.']};
 const benefits:Record<string,string>={T01:'Transport, guide and a sample lunch',T02:'Transport, guide, entry tickets and a sample lunch',T03:'Transport, boat, lunch and itinerary tickets',T04:'Transport, twin-share accommodation, guiding and meals',T05:'Guiding and food tastings'};
 parts.push(en?`${p.region}${date?` · ${date}`:''}: ${outlines[id][1]}\nProposed package: ${benefits[id]}. These inclusions are illustrative and will be confirmed with the operator before booking.`:`${p.title}${date?` · ngày ${date}`:''}\n${outlines[id][0]}\nQuyền lợi dự kiến của gói minh họa: ${p.includes.replace(/ mẫu/g,'')}. Các hạng mục sẽ được đối chiếu với chương trình nhà tổ chức trước khi chốt.`);
 }
 if(/an chay|vegetarian|allerg|di ung|halal/.test(n)){sources.push('N17.1','N17.2');parts.push(en?'I have noted the dietary preference already provided. Food arrangements will be checked with the provider before confirmation.':'Em đã ghi nhận yêu cầu ăn uống bạn cung cấp; phương án món ăn sẽ được kiểm tra trước khi xác nhận.');}
 if(c.children){sources.push('N19.1','N19.2');parts.push(en?`I have noted the children's ages (${c.children}). The pace and child conditions will be checked for the selected tour.`:`Em đã ghi nhận tuổi các bé (${c.children}); nhịp hành trình và quyền lợi trẻ em sẽ được đối chiếu theo tour được chọn.`);}
 if(!ids.length&&!transfer){sources.push('N3.1');parts.push(en?'You can choose a cultural city visit, a scenic day trip or a local food experience. Each option can be compared by itinerary, pace and included services before pricing.':'Bạn có thể tham khảo trải nghiệm văn hóa trong thành phố, tour cảnh quan trong ngày hoặc ẩm thực địa phương. Em sẽ giới thiệu lịch trình, nhịp di chuyển và quyền lợi của phương án phù hợp trước khi báo giá.');}
 const question=en?(ids.length>1?'Which of these itineraries would suit your group best?':'Does this proposed itinerary/service suit your plans?'):(ids.length>1?'Bạn thấy phương án nào phù hợp với gia đình mình hơn?':'Bạn thấy phương án này phù hợp để em chuẩn bị bước tiếp theo không?');
 parts.push(question);
 // Ask only service-critical gaps, never budget before offering value.
 if(transfer&&!bags&&!/(?:[467]|16)[ -]?(?:cho|seater)/.test(n))parts.push(en?'To select a suitable vehicle, how many suitcases will you bring?':'Để chọn xe phù hợp, bạn cho em biết thêm số vali nhé.');
 if(!c.service_date&&!/\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:october|november|december)/i.test(text))parts.push(en?'Which day would you like to travel?':'Bạn dự kiến sử dụng dịch vụ ngày nào?');
 parts.push(finish);
 review.push('Đối chiếu thông tin nhận diện từ hội thoại và hồ sơ; nếu khách vừa đổi ngày/số người, cập nhật hồ sơ trước báo giá.');
 return {body:parts.join('\n\n'),sources:[...new Set(sources)],known,review,kind:ids.length?'Tư vấn tour trước · chọn phương án · giá sau':transfer?'Xe sân bay':'Tìm hiểu nhu cầu'};
}
