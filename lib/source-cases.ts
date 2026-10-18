import snapshot from './source-demo-data.json';
import type {Contact,Message} from './validation';
import type {Suggestion} from './replies';
import {remainingSourceBriefs} from './source-reply-briefs';
export {snapshot};
export type SourceCase=(typeof snapshot.cases)[number];
export type SourceService=(typeof snapshot.services)[number];
export const sourceCase=(id:string)=>snapshot.cases.find(c=>c.id===id);
export const featuredRows=[71,85,86,8,35,87,83,110,145];
export const featuredCases=featuredRows.map(row=>snapshot.cases.find(c=>c.masterRow===row)!).filter(Boolean);
export const firstSourceId=featuredCases[0].id;
const cheers='https://vietnamcheershostel.com/tour/ha-giang-loop-motorbike-tour-from-hanoi/';
const briefs:Record<number,{title:string;known:string[];review:string[];body:string}>={
 71:{title:'Hà Giang · nội dung trước, chốt phương án sau',known:['3 ngày 2 đêm trên cung đường, sau kỳ ở 26–28/11/2026; đang cân nhắc 2 hoặc 4 khách.','Easy Rider; tối đa 10 khách; phòng riêng cho từng cặp; 2 khách ăn chay.','Đi bộ mức vừa; ít đông; mũ/bảo hộ; gửi hành lý có khóa; VIP sleeper đi và về; muốn điều khoản thời tiết xấu.'],review:['Trang Cheers mô tả 3 ngày 3 đêm gồm chặng xe đêm; cần đối chiếu với 3D2N khách yêu cầu.','Chiều về trong chương trình tham khảo là limousine, chưa đáp ứng VIP sleeper hai chiều.','Tối đa 10 người, khóa hành lý, mức đi bộ, phòng riêng và hủy do thời tiết phải được nhà tổ chức xác nhận; không lấy giá web làm giá được duyệt.'],body:`Hello, thank you for the detailed brief, and congratulations on your honeymoon.

A useful reference for your 3-day Ha Giang Loop is:
• Day 1: Ha Giang – Yen Minh – Dong Van, with mountain passes and local villages.
• Day 2: Dong Van – Ma Pi Leng – Du Gia, with valley viewpoints and village scenery.
• Day 3: Du Gia – Lung Tam – Ha Giang, then return to Hanoi.

This offers the mountain scenery and local-life experience you are looking for, with an Easy Rider doing the driving. The Cheers programme you mentioned lists riding equipment, meals and accommodation, with private-room categories available. We would compare a private-room option rather than a dorm package for your honeymoon.

I have kept your requirements: no more than 10 guests, a private room for each couple, two vegetarian meals per sitting, moderate walking, quieter stops and secure luggage storage. These specific arrangements still need the operator's confirmation. The published reference uses an overnight bus outbound and a limousine back, so VIP sleeper travel in both directions and bad-weather cancellation terms need a separate check.

Would this route and private-room approach suit you? For the dates, would you prefer to leave Hanoi on the evening of 28 November, after your stay, or another evening? When decided, please confirm whether there will be 2 or 4 participants. I already have the other preferences.

After you choose the option, I will put the total price and confirmed inclusions/conditions side by side so you can decide.`},
 85:{title:'Xe đón · khách đã chọn xe, chờ nhà xe',known:['FD640 · 12/10/2026 · 11:50; khách đã chọn xe 4 chỗ.','Giá đã trao đổi trong hội thoại: 400.000đ/chiều; Airport Pickup và sổ xe có cùng mã booking.','Đón Nội Bài, trả tại 75 Phạm Hồng Thái; nhà xe chưa xác nhận.'],review:['Không hỏi lại chuyến bay/ngày/giờ/loại xe.','400.000đ là giá của tình huống lịch sử; không áp mặc định cho khách mới.','Không dùng nhãn CONFIRMED khi mới có sự đồng ý của khách.'],body:`Hello, thank you — we have recorded your choice of a private 4-seater airport pick-up.

Your request is for AirAsia FD640, arriving on 12 October 2026 at 11:50, from Noi Bai Airport to 75 Pham Hong Thai. The one-way price discussed in this conversation is 400,000 VND.

There is no need to resend your flight details. We are awaiting the transport provider's confirmation and will send the driver and meeting instructions once verified. The current source note lists Column 3 outside international arrivals; reception will reconfirm the exact meeting point with the assigned driver.

Please let us know only if your arrival plans change.`},
 86:{title:'Xe tiễn · giữ đúng chiều và giờ khách chọn',known:['2 khách; xe 4 chỗ, giá đã trao đổi 300.000đ.','Rời 75 Phạm Hồng Thái lúc 11:00 ngày 10/10; chuyến quốc tế lúc 14:10.'],review:['Sổ xe còn chờ nhà xe xác nhận. Không lấy giá xe đón 400.000đ cho chiều tiễn.','Kiểm tra giờ đến sân bay cùng nhà xe; không tự đảm bảo khách kịp chuyến.'],body:`Hello, thank you. We have recorded your request for a private 4-seater car for two guests, leaving 75 Pham Hong Thai for Noi Bai Airport at 11:00 on 10 October 2026.

The price agreed in this conversation is 300,000 VND for the one-way drop-off. We have also noted your international flight departs at 14:10.

We are awaiting the driver's confirmation and checking the pickup timing against your flight. We will send the final driver and meeting details once confirmed. You do not need to repeat the vehicle, number of guests or departure time.`},
 8:{title:'Khách đổi ý · bỏ yêu cầu xe cũ',known:['Khách đã tự thu xếp xe; câu mới nhất hủy nhu cầu xe đón.','Đến 23:00–24:00 ngày 12/10; hỏi nâng hạng dịp kỷ niệm cưới.'],review:['Không tạo/chào xác nhận xe từ yêu cầu VJ160 cũ.','Nâng hạng còn phụ thuộc phòng; không tự hứa miễn phí.'],body:`Hello, thank you for the update. We have noted that you have already arranged your airport transfer, so we will not book another car for you.

We have recorded your expected arrival between 23:00 and 24:00 on 12 October. Congratulations on your anniversary. We will pass your preference for a King Suite with Balcony to reception; an upgrade is subject to availability and cannot yet be promised.

If a paid upgrade is available, we will share the room details and additional cost before you decide.`},
 35:{title:'Lễ tân · cũi em bé và phòng gần nhau',known:['Booking nguồn 15–17/10; giờ nhận phòng khách nêu 14:00–15:00.','Khách yêu cầu cũi em bé và các phòng gần nhau.'],review:['06/10 trong dấu ngoặc là thời điểm ghi tin, không phải ngày đến.','Nháp cũ bỏ sót hai yêu cầu quan trọng; xác minh cũi và phòng với lễ tân.'],body:`Hello, thank you for sharing your plans. For your stay from 15 to 17 October, we have noted your expected check-in time of 14:00–15:00, a baby cot and rooms close together.

Reception will check the cot and room allocation together so your family can settle in more comfortably. These are requests at this stage; we will confirm what can be arranged and advise any applicable cot charge before you decide.

You do not need to resend the arrival time or these room requests.`},
 87:{title:'Nhận phòng lúc 03:00 · đêm trước đã đặt',known:['Booking 17–20/10; đến khoảng 03:00 ngày 18/10 sau xe đêm Hà Giang.','Đêm 17/10 đã nằm trong kỳ đặt phòng.'],review:['Không yêu cầu mua lại đêm 17/10 hoặc áp phí nhận sớm cho cùng đêm đã đặt.','Lễ tân cần ghi chú đến muộn/giữ phòng và kiểm tra trạng thái booking.'],body:`Hello, thank you for letting us know. You plan to arrive around 03:00 on 18 October after the overnight bus from Ha Giang.

Your reservation runs from 17 to 20 October, so the night of 17 October is already included. There is no need to buy that same night again for this arrival time.

We will alert reception to the late arrival and ask them to keep the booking and room ready for you. Please let us know only if the bus arrival time changes.`},
 83:{title:'Hồ sơ lẫn nội dung · chỉ dùng lời khách đúng booking',known:['Lời khách nói đến ngày 17 lúc 15:55 từ Bangkok; kỳ ở 17–19/10.','Muốn xe đón và thông tin khách sạn/xe đi Sa Pa 2 ngày.'],review:['Phần cuối hội thoại chứa phản hồi xe tiễn của khách khác; không dùng để ghép dịch vụ.','Tóm tắt cũ ghi ngày 10/10 trái lời khách và booking; cần sửa ở nguồn khi được yêu cầu.','Chưa có khách sạn Sa Pa cụ thể và giá được duyệt; không tự đặt tên.'],body:`Hello, thank you for the details. We have noted your arrival from Bangkok on 17 October at 15:55 and your request for an airport pick-up.

A private transfer would take you directly from Noi Bai to the hotel. To select the car, we only need the flight number, number of travellers and luggage count; you have already provided the date and time.

For your two days in Sa Pa, we can compare a town-based stay, which makes restaurants and onward travel easier, with a village/homestay stay for more time in the landscape. The exact property, room and transport schedule need checking before we recommend a bookable option.

Which style would you prefer, and on which two dates will you be in Sa Pa? We will then present the suitable stay and transport option, with the final price and conditions at the end.`},
 110:{title:'Nháp nhầm khách · kiểm tra booking và tiện ích',known:['Khách đã đặt lại phòng nâng hạng, muốn bảo đảm chỉ còn một booking.','Khách hỏi bể bơi sân thượng.'],review:['Nháp nguồn đang nói chuyến bay/ngày của khách khác; không sử dụng.','Đối chiếu booking trên OTA và tình trạng bể bơi đúng cơ sở trước khi cam kết.'],body:`Hello, thank you for the update. We have noted that you rebooked an upgraded room and want to ensure only the intended reservation remains active.

Reception will compare the original and replacement bookings before confirming their status. We will also check whether the rooftop pool is available at your property for your stay, and return with a clear answer on both points.

There is no need to send flight information for these requests.`},
 145:{title:'Ngày đến mâu thuẫn · ưu tiên tin mới',known:['Booking nguồn 09–11/10. Tin mới bằng tiếng Pháp nói đã hạ cánh và tới trong tối đa 2 giờ.','Ngày 10/09 trong tin đầu và 10/10 trong nháp AI không khớp nhau.'],review:['Không khẳng định lại 10/10 dựa vào nháp AI.','Đối chiếu thời điểm tin mới với lễ tân; không thu lại đêm đã nằm trong booking.'],body:`Hello, thank you for the update that you have landed and expect to reach the hotel within two hours. We will pass this update to reception now.

Your reservation is recorded for 9–11 October. Reception will reconcile the earlier date notation with your latest arrival message and check the room status. Any night already included in your reservation should not be charged again as an additional early-arrival night.`}
};
export function sourceSuggestion(c:Contact,messages:Message[]):Suggestion|null{
 const s=sourceCase(c.id);if(!s)return null;const b=briefs[s.masterRow]||remainingSourceBriefs[s.masterRow];
 const changed=c.version>1||messages.some(m=>m.direction==='in'&&!m.id.startsWith('source-'));
 return {body:changed?'':b?.body||'',kind:changed?'Có dữ kiện mới · cần đối chiếu lại':b?.title||'Đọc lời khách và nháp lịch sử trước khi soạn',known:b?.known||s.proposal.known,sources:[...s.proposal.sources,...(s.masterRow===71?['N4.1','N17.1','Cheers · lịch trình tham khảo 15/10/2026']:[])],review:[...(b?.review||s.issues),...(changed?['Hồ sơ hoặc tin khách đã thay đổi sau bản đọc nguồn; đề xuất chuẩn bị sẵn được để trống để tránh dùng dữ kiện cũ.']:[])]};
}
export function sourceReviewPlan(id:string){
 const s=sourceCase(id);if(!s||!s.customerText)return null;
 const b=briefs[s.masterRow]||remainingSourceBriefs[s.masterRow];
 const careful=[15,20,21,31,38,44,46,54,63,64,65,71,72,82,83,85,86,87,89,100,103,105,108,110,127,132,143,145].includes(s.masterRow);
 return {code:s.code,title:b?.title||s.contact.interest,known:b?.known||s.proposal.known,review:b?.review||s.issues,careful};
}
export function sourceExternalLinks(s:SourceCase){return s.masterRow===71?[{label:'Cheers · chương trình tham khảo (đã đọc 15/10/2026)',url:cheers}]:[];}
