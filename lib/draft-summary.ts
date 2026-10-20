import {normalize} from './ota-profile';

// One short Vietnamese line saying what the draft does, read from the draft text itself (any source:
// template, AI, rules, edited by hand), so reception sees the gist before reading the English.
// Rules only; at most three points and about twenty words. It does not replace reading the draft.
const k=(n:number)=>n%1000===0?`${n/1000}k`:n.toLocaleString('vi-VN');
const TOPICS:[RegExp,string|((n:string,raw:string)=>string)][]=[
 [/we are very sorry that .{0,80} in your room|xin loi vi .{0,60} trong phong/,'Xin lỗi sự cố phòng, xử lý trong 15 phút'],
 [/apologies that your stay did not meet|ky nghi chua duoc nhu ban mong doi/,'Xin lỗi khách không hài lòng, Quản lý Lễ tân sẽ liên hệ'],
 [/apologies for the inconvenience|xin loi vi su bat tien/,'Xin lỗi sự bất tiện, Quản lý Lễ tân kiểm tra'],
 [/check-out is by .{0,12} today|gio tra phong hom nay/,'Nhắc giờ trả phòng, giữ hành lý, xe ra sân bay'],
 [/thank you for staying with|cam on ban da luu tru tai/,'Cảm ơn sau lưu trú, mời góp ý'],
 [/estimated arrival time|gio du kien den khach san/,'Hỏi giờ khách về để xếp phòng sớm'],
 [/passed your request to our tour specialist|chuyen yeu cau toi chuyen vien tour/,'Chuyển yêu cầu tour cho Saler'],
 [/most popular day tours|tour trong ngay duoc khach yeu thich/,'Báo giá nhanh 3 tour'],
 [/secure payment link|arranging this booking for your guest|link thanh toan/,'Đặt hộ: gửi link thanh toán an toàn qua WhatsApp'],
 [/conditions of your booking|refund conditions|dieu kien (?:dat phong|hoan tien|huy)/,'Kiểm tra điều kiện booking/hủy, chưa hứa hoàn tiền'],
 [/received your messages|da nhan duoc tin nhan cua ban/,'Báo đã nhận tin khách'],
 [/please don.t worry|ban dung lo/,'Trấn an khách, gửi hotline 24/7'],
 [/sorry you had such a|sorry to hear you had|rat tiec .{0,30}(?:met moi|mat ngu)/,'Hỏi thăm khách mệt, ưu tiên phòng yên tĩnh'],
 [/invite you to try our in-house spa|moi ban trai nghiem .{0,20}spa/,'Mời spa phục hồi'],
 [/our reception is open 24\/7|le tan khach san mo cua 24\/7/,'Báo lễ tân 24/7, phòng được giữ'],
 [/noted your arrival around (\d{1,2}:\d{2})|ghi nhan ban den khoang (\d{1,2}:\d{2})/,(n)=>{const m=n.match(/(?:arrival around|den khoang) (\d{1,2}:\d{2})/);return `Ghi nhận giờ đến${m?' '+m[1]:''}`;}],
 [/noted the arrival details|ghi nhan thong tin ve viec den/,'Ghi nhận thông tin đến'],
 [/early check-in is not yet confirmed|nhan phong som chua (?:duoc )?xac nhan/,'Nhận phòng sớm chưa xác nhận'],
 [/early check-in between|nhan phong som tu|option 1|phuong an 1/,'Báo phương án nhận phòng sớm (có phụ thu)'],
 [/late check-out until|tra phong muon den/,'Báo trả phòng muộn (có phụ thu)'],
 [/thank you for confirming|cam on ban da xac nhan xe|meeting point|diem don/,'Xác nhận thông tin xe đón sân bay'],
 [/airport pick-up|airport transfer|private car|private airport|xe rieng|xe don san bay/,(n,raw)=>{const prices=[...raw.matchAll(/(\d{1,3}(?:[.,]\d{3})+)\s?(?:VND|đ)/g)].map(m=>Number(m[1].replace(/[.,]/g,''))).filter(x=>x>=100000&&x<=2000000);return 'Gợi ý xe sân bay'+(prices.length?' '+[...new Set(prices)].slice(0,2).map(k).join('/'):'');}],
 [/spa menu|menu spa|our spa offers|spa cua khach san co/,'Gửi menu spa'],
 [/one double bed instead|doi sang mot giuong doi/,'Đổi sang giường đôi'],
 [/noted your request for (?!an invoice)|ghi nhan yeu cau (?!gui|hoa don)/,'Ghi nhận yêu cầu phòng'],
 [/surprise|birthday|anniversary|honeymoon|bat ngo|sinh nhat|ky niem|trang mat/,'Chuẩn bị dịp đặc biệt'],
 [/^breakfast|\nbreakfast|bua sang/,'Thông tin bữa sáng'],
 [/store your luggage|giu hanh ly/,'Giữ hành lý miễn phí'],
 [/request for an invoice|yeu cau hoa don/,'Xin thông tin xuất hóa đơn'],
 [/would like to pay|muon thanh toan/,'Ghi nhận cách thanh toán'],
 [/check availability for .{0,20}(?:more nights|extra nights)|kiem tra phong trong cho/,'Kiểm tra phòng để gia hạn'],
 [/share your whatsapp|xin so whatsapp/,'Xin WhatsApp gửi lịch trình tour'],
 [/interested in visiting|co muon tham quan/,'Gợi ý tour'],
 [/you are very welcome|thank you for letting us know(?! your arrival)|cam on ban da bao(?! gio den)/,'Cảm ơn khách'],
];
export function draftSummary(body:string):{text:string;blanks:boolean}{
 const raw=body||'',n=normalize(raw).replace(/đ/g,'d'),blanks=/\[Cua điền/.test(raw);
 if(!raw.trim())return {text:'',blanks:false};
 const found:string[]=[];
 // Up to three points while the line stays within about twenty words (a point is never cut in half).
 const wc=(s:string)=>s.split(/\s+/).length;
 for(const [re,label] of TOPICS){if(found.length>=3)break;if(re.test(n)){const l=typeof label==='string'?label:label(n,raw);if(!found.includes(l)&&(!found.length||wc([...found,l].join(' + '))<=20))found.push(l);}}
 // Other scripts / languages the rules do not read.
 if(!found.length)return {text:/[֐-׿Ѐ-ӿ一-鿿぀-ヿ가-힯]/.test(raw)||/\b(?:bonjour|hola|guten|merci|gracias|danke)\b/i.test(raw)?'Nháp tiếng nước ngoài: bấm Dịch để đọc trước khi duyệt':'Trả lời chung, chưa nhận ra ý cụ thể: đọc kỹ trước khi duyệt',blanks};
 return {text:found.join(' + '),blanks};
}
