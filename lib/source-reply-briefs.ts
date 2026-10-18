export type SourceReplyBrief={title:string;known:string[];review:string[];body:string};
// Each entry was reviewed against the anonymized customer transcript, not inferred from the old AI draft.
export const remainingSourceBriefs:Record<number,SourceReplyBrief>={
7:{title:'Nhận phòng 13:00–14:00',known:['Khách đã yêu cầu đến 13:00–14:00; ngày nhận trong hồ sơ 10/10.'],review:['Kiểm tra phòng sẵn và phí nếu có; không lấy mức 50% trong nháp cũ làm chính sách đã duyệt.'],body:`Hello, thank you. We have noted your request to arrive between 13:00 and 14:00 on 10 October.

Reception will check whether your room can be released at that time. If it is not ready, we can check a luggage-drop arrangement so you can start your visit while waiting. We will explain any applicable early-access charge before you decide.

You do not need to repeat your arrival time. Please let us know only if your plans change.`},
9:{title:'Đến buổi tối 19:00–20:00',known:['Khách đã nêu 19:00–20:00; ngày nhận trong hồ sơ 09/10.','Nguồn chưa có ngày trả chắc chắn.'],review:['Không lấy ngày trả 18/10 chỉ xuất hiện trong nháp AI cũ; lễ tân kiểm tra trạng thái phòng.'],body:`Hello, thank you for letting us know. We have noted your planned arrival between 19:00 and 20:00 on 9 October and will pass this timing to reception for your arrival arrangements.

There is no need to reconfirm the same time. If your journey is delayed, a short update will help the team adjust.`},
11:{title:'Gửi vali lúc 12:00',known:['Khách muốn gửi vali lúc trưa; kỳ ở 09–10/10.'],review:['Đối chiếu khả năng giữ hành lý tại đúng cơ sở; không tự cam kết miễn phí hoặc có tủ khóa từ nháp cũ.'],body:`Hello, thank you. We have noted that you would like to leave your suitcases at around 12:00 noon.

A luggage drop before room access would let you go out without carrying your bags. Reception will confirm the storage arrangement and collection procedure for your arrival. Please keep passports, money and valuables with you.

We already have the time you requested; you only need to update us if it changes.`},
12:{title:'Phòng không hút thuốc',known:['Khách đã yêu cầu phòng không hút thuốc; nguồn ghi 2 Large Double Room.'],review:['Kiểm tra cả các phòng trong booking; nháp cũ ký tên Premium khác tên cơ sở nguồn.'],body:`Hello, thank you. We have noted your preference for non-smoking rooms for your stay from 12 to 14 October.

Reception will check the room allocation for the rooms in your reservation and let you know if there is any limitation before arrival. You do not need to repeat this preference.`},
15:{title:'Địa chỉ đón trả đang mâu thuẫn',known:['Khách đã tự đặt xe; dự kiến tới khách sạn 10:30.','Khách hỏi địa chỉ chính xác và gửi hành lý trước nhận phòng.'],review:['Cơ sở ghi Suites nhưng nháp cũ tự điền 75 Phạm Hồng Thái; phải đối chiếu xác nhận booking trước khi cung cấp địa chỉ.','Không mời đặt thêm xe; không chuyển lỗi dữ liệu thành yêu cầu khách cung cấp lại.'],body:`Hello, thank you for flagging the address issue. We have noted that you already arranged your own transfer and expect to reach the hotel at about 10:30.

We will check the exact property and entrance against your reservation, then send one verified address and map link for your driver. This check matters because the Luxe Paradise properties have similar names.

We will also confirm an early luggage-drop arrangement while your room is being prepared. You do not need to resend the arrival time or arrange another transfer.`},
18:{title:'Người thân đến trước',known:['Giờ đến 14:00–15:00; anh/em trai khách sẽ đến trước và đã nêu tên trong nguồn gốc.'],review:['Đối chiếu tên người thân trong nguồn gốc có quyền truy cập; không yêu cầu gửi lại vì tên đã ẩn trong demo.','Kiểm tra người được phép nhận phòng và yêu cầu giấy tờ tại lễ tân.'],body:`Hello, thank you. We have noted the arrival window of 14:00–15:00 and that your brother will arrive before you.

Reception will check the arrival arrangement using the name you already supplied and the reservation details. If any authorization or identification step is required, we will explain that specific step in advance. There is no need to send your brother's name again.`},
20:{title:'Đến rất sớm 05:00–06:00',known:['Khách đã yêu cầu nhận phòng 05:00–06:00; nguồn nhận 08/10.'],review:['Kiểm tra đêm đã đặt trước khi đề nghị mua thêm đêm; không hứa chắc phòng hoặc mức phí.'],body:`Hello, thank you. We have noted your request to arrive between 05:00 and 06:00 on 8 October.

For access that early, reception needs to check both the room availability and the nights already covered by your reservation. If immediate access would require an additional night, we will first explain the option and its total cost; we will not add a night without your agreement. If you prefer to wait for room access, we can check an early luggage-drop arrangement.

Would you prefer us to explore immediate room access, or the luggage-drop option? We already have your arrival time.`},
21:{title:'Trả phòng muộn và tầng cao',known:['Khách hỏi trả phòng muộn thứ Sáu và phòng tầng cao; booking trả 09/10.'],review:['Nháp cũ bỏ sót câu hỏi trả muộn; kiểm tra giờ trống, phí và tầng phòng.','Chỉ thiếu giờ khách muốn giữ phòng đến; không hỏi lại ngày trả.'],body:`Hello, thank you. We have noted both your preference for a higher floor and your request for late check-out on Friday, 9 October, before your late flight.

A late check-out would give you more time to rest and prepare for departure. Reception will check how long the room can be retained and any additional charge. If the room is needed earlier, we can check luggage storage after check-out as an alternative. The higher-floor request will also be checked against room availability.

Until what time would you like to keep the room? We will then present the available option and price for your decision.`},
22:{title:'Xe tới Hà Nội 20:30 và tới khách sạn 21:30',known:['Khách nói xe từ Hà Giang tới 20:30; “half 9” là khoảng 21:30 tại khách sạn.'],review:['Sửa cách hiểu 20:30–21:00 trong nháp cũ; không nhầm giờ xe tới với giờ tới khách sạn.'],body:`Hello, thank you for the update. We have noted that your bus from Ha Giang is expected to reach Hanoi around 20:30 and that you expect to arrive at the hotel around 21:30 on 9 October.

We will pass the hotel arrival time to reception. You do not need to reconfirm it; please just update us if the bus is delayed.`},
24:{title:'Đến muộn cùng yêu cầu ăn sáng và phòng gần nhau',known:['Đến 22:00–23:00; muốn món Âu cho bữa sáng và các phòng gần nhau.','Kỳ ở 24–26/11; ngày ghi tin 07/10 không phải ngày đến.'],review:['Kiểm tra thực đơn và cách xếp phòng; chưa hứa phòng liền nhau.','Không dùng giờ ăn sáng hoặc tầng B1 chỉ có trong nháp AI cũ.'],body:`Hello, thank you. For your stay from 24 to 26 November, we have noted your arrival between 22:00 and 23:00, your preference for Western breakfast options and rooms close to each other.

Reception will review the room allocation and breakfast options together, so you can plan your stay with clear information. Nearby rooms depend on availability; we will confirm what can be arranged rather than promise adjoining rooms in advance.

You have already provided these preferences, so there is no need to repeat them.`},
27:{title:'Đến 20:00–21:00',known:['Khách đã yêu cầu 20:00–21:00; ngày nhận ghi 09/10.'],review:['Kiểm tra booking hoạt động trước khi cam kết phòng sẵn; không suy ngày đến từ dấu giờ tin nhắn.'],body:`Hello, thank you. We have noted your planned arrival between 20:00 and 21:00 on 9 October and will pass this timing to reception.

Please let us know only if your arrival changes. There is no need to reconfirm the time already provided.`},
29:{title:'Đến 12:00–13:00',known:['Khách nói sẽ đến khoảng 12–13h; booking 07–09/10.'],review:['Không tự coi giờ đến là xác nhận được nhận phòng sớm; lễ tân kiểm tra phòng.'],body:`Hello, thank you. We have noted your expected arrival between 12:00 and 13:00 on 7 October.

Reception will check whether your room is ready when you arrive. If access is not yet available, we can check a luggage-drop arrangement while you wait. Any charge for earlier room access would be explained before you decide.

Please update us only if your arrival time changes.`},
30:{title:'Ưu tiên giờ đến mới 17:45–18:00',known:['Tin mới đổi từ 16:30–17:00 sang 17:45–18:00; ngày nhận 07/10.'],review:['Dùng cập nhật cuối; không hỏi khách xác nhận lại hai khung giờ.'],body:`Hello, thank you for the update. We have replaced the earlier arrival estimate with your latest time of 17:45–18:00 on 7 October.

We will pass this updated timing to reception. Nothing else is needed from you unless your plans change again.`},
31:{title:'Xin linh hoạt phí hủy hai phòng',known:['Yêu cầu mới nhất là xem xét phí hủy 2 phòng, 4 đêm, 07–11/10.','Yêu cầu không hút thuốc là nội dung cũ; không ưu tiên bán thêm.'],review:['Kiểm tra điều kiện rate plan và lịch sử OTA; số 15.836.000đ trong thông báo chưa chứng minh là phí hủy.','Khách đã yêu cầu xem xét miễn/giảm phí; không hỏi lại có muốn xem xét hay không.'],body:`Hello, thank you. We have received your request to review flexibility on the cancellation charge for two rooms covering 7–11 October.

We will check the booking terms, the current reservation status and whether any waiver or reduction can be offered. We will explain the available option and any applicable charge clearly before you make a further decision. This message does not confirm a cancellation or refund.

Your request for a fee review is already clear; there is no need to submit it again.`},
36:{title:'Đến khoảng 21:00',known:['Khách đã báo đến 21:00; booking nhận 06/10.'],review:['Ghi giờ đến cho lễ tân; không tạo thêm câu hỏi bán hàng.'],body:`Hello, thank you. We have noted your expected arrival at around 21:00 on 6 October and will pass this to reception for your arrival arrangements.

Please send a short update only if your travel plans change. We look forward to welcoming you.`},
38:{title:'Xe đêm Sa Pa tới 06:00 và gửi hành lý',known:['Khách tới Hà Nội khoảng 06:00 thứ Sáu; muốn gửi hành lý và nhận phòng sớm nếu có.','Đã cung cấp điện thoại/email; ngày trả phòng trong nguồn bị thiếu.'],review:['Đối chiếu ngày thứ Sáu với booking; dấu tin 06/10 không phải ngày đến.','Không hỏi lại điện thoại/email bị ẩn danh; kiểm tra gửi hành lý và phòng sẵn.'],body:`Hello, thank you for the details. We have noted that your overnight bus from Sa Pa reaches Hanoi around 06:00 on Friday and that you would like to leave your luggage before going out.

We will check the early luggage-drop arrangement and ask reception to release the room earlier if it becomes available. This would let you explore without your bags while the room is prepared. Any early-access charge would be explained before you agree.

We already have your arrival plan and the contact details you supplied; you do not need to resend them.`},
41:{title:'Xe từ Cát Bà cho hai người',known:['Khách cần xe từ thị trấn Cát Bà tới khách sạn cho 2 người; booking nhận 07/10.'],review:['Kiểm tra đúng điểm trả vì nguồn đa cơ sở; phương án Cát Bà phải gồm chặng qua biển phù hợp.','Chưa có nhà xe, giờ, giá hoặc lịch chạy xác nhận.'],body:`Hello, thank you. For two travellers from Cat Ba town to the hotel, we can compare a shared transfer with coordinated road and sea crossings, or a private arrangement with more flexibility over departure and luggage.

The shared option may suit a fixed schedule; a private option may be more convenient if timing is your priority. We will check the exact pickup point, crossing arrangements and hotel drop-off before presenting a bookable option.

Your stay is recorded to start on 7 October. Would travelling that day suit you, and would you prefer a shared transfer or a private option? We will then check the available departure times and final price. We already have the number of travellers.`},
44:{title:'Khoảng giờ đến rộng và hai suất ăn sáng',known:['Nguồn ghi khoảng 14:00 ngày 07/10 đến 06:00 ngày 08/10; 2 suất ăn sáng.'],review:['Đây là khoảng giờ rộng, không phải khách xác nhận đến đúng 14:00.','Nếu khách chỉ đưa khoảng này, một câu thu hẹp giờ là cần thiết; kiểm tra bữa sáng đi kèm gói đặt.'],body:`Hello, thank you. We have noted the arrival window provided, from 14:00 on 7 October to 06:00 on 8 October, and the two breakfast servings shown in your booking information.

Reception will check the arrival arrangements for that window. If you expect to reach the hotel after midnight, we will flag this as a late arrival against the night already reserved.

When you have a firmer estimate, approximately where within that window do you expect to arrive? There is no need to resend the booking dates or breakfast information.`},
46:{title:'Yêu cầu miễn phí hủy sau trao đổi xe',known:['Tin trước bằng tiếng Ả Rập hỏi xe sân bay, tới 14:00.','Tin mới nhất xin hủy miễn phí một đêm 07–08/10.'],review:['Ưu tiên yêu cầu hủy; rà OTA, điều kiện phí và xe nếu đã giữ trước đó.','1.398.600đ trong thông báo chưa phải phí hủy được xác minh; không hứa miễn phí.'],body:`مرحباً، شكراً لتواصلكم. تلقينا طلبكم الأخير لإلغاء الحجز لليلة من 7 إلى 8 أكتوبر دون رسوم.

سنراجع شروط الحجز وحالته الحالية وإمكانية إعفائكم من الرسوم أو تخفيضها، ثم نوضح لكم الخيارات وأي مبلغ مستحق قبل اتخاذ قرار إضافي. هذه الرسالة لا تؤكد الإلغاء أو استرداد المبلغ.

كما سنراجع طلب النقل من المطار الذي سبق أن أرسلتموه حتى لا تتم متابعة ترتيبات سفر لم تعد مناسبة. لا حاجة لإعادة إرسال تفاصيل طلب الإلغاء.`},
48:{title:'Đến 14:00–15:00',known:['Khách đã báo 14:00–15:00; booking 06–07/10.'],review:['Chỉ ghi nhận giờ và chuyển lễ tân; không hỏi lại.'],body:`Hello, thank you. We have noted your expected arrival between 14:00 and 15:00 on 6 October and will pass the timing to reception.

You do not need to reconfirm it. Please just let us know if your journey changes.`},
49:{title:'Đến 15:00–16:00 ngày nhận đã ghi',known:['Khách yêu cầu 15:00–16:00; nguồn ghi nhận 18/10, thiếu ngày trả.'],review:['Không hỏi lại giờ đến hoặc tự điền ngày trả phòng.'],body:`Hello, thank you. We have noted your request to arrive between 15:00 and 16:00 on 18 October and will pass this to reception for your arrival arrangements.

Please update us only if the timing changes; no further confirmation of the same information is needed.`},
50:{title:'Khách đã gửi chi tiết ở hội thoại khác',known:['Khách nói đã gửi chi tiết trong tin khác; tin cuối cảm ơn.'],review:['Tìm hội thoại liên quan bằng booking trước; không hỏi lại khách vì đoạn demo thiếu nội dung.','Không tự suy chi tiết từ booking gần giống hoặc khách cùng tên.'],body:`Hello, thank you. We understand that you have already supplied the details in another conversation with the hotel.

We will check that earlier message against your reservation and keep the information together so you do not need to repeat it. If anything essential is still missing after that check, we will ask only for that specific item.`},
51:{title:'Xe đón bốn người và đến sớm ngày 27 tháng 12',known:['Khách đến 06:00 ngày 27/12; muốn gửi hành lý, nhận phòng khoảng 12–13h.','Cần xe đón một chiều cho 4 người cùng hành lý; sẽ gửi chi tiết chuyến bay gần ngày đi.'],review:['Không thúc hỏi ngay chuyến bay hoặc hỏi lại số khách/ngày/giờ/email.','Cần chọn xe theo hành lý; kiểm tra 06:00 là giờ tới đâu trước khi chốt nhà xe, không tự coi là giờ hạ cánh.'],body:`Hello, thank you. We have kept your plan for 27 December: arrival around 06:00, a one-way airport pickup for four people with luggage, a luggage drop at the hotel and a preference for room access around noon or 13:00.

A private transfer would keep your group and bags together. We will compare a vehicle with enough luggage space and check the luggage-drop and early-room options with reception. Room access at noon cannot yet be guaranteed.

It is fine to send the remaining flight details closer to travel, as you suggested. At that stage, the flight number and luggage count will help us finalize the vehicle and pickup timing; the date, four travellers and one-way request are already recorded. We will present the confirmed option and total price before booking.`},
52:{title:'Phòng yên tĩnh và không có mùi',known:['Khách đã yêu cầu phòng khử mùi và yên tĩnh; kỳ ở 15–19/11.'],review:['Bàn giao kiểm tra mùi và vị trí phòng; không suy ra dị ứng hoặc tự dùng hương liệu mạnh.'],body:`Hello, thank you. We have noted your requests for a quiet room and a room free from unpleasant odours for your stay from 15 to 19 November.

Reception and housekeeping will review the room allocation and preparation together. We will let you know if there is any limitation before confirming the arrangement. There is no need to repeat these preferences.`},
54:{title:'Xe đón sân bay chưa đủ chi tiết',known:['Khách đã nói rõ cần xe đón sân bay; nguồn ghi ngày nhận 08/10.'],review:['Không hỏi lại có cần xe hay không; chỉ cần chuyến bay, số người và hành lý để chọn xe.','Chưa dùng giá cũ 400/500/800 nghìn thành báo giá hiện hành.'],body:`Hello, thank you. A private airport pickup would take you directly from Noi Bai to the hotel, with the vehicle selected to fit your group and luggage. We will provide the meeting instructions once the transport provider confirms the arrangement.

Your booking shows arrival on 8 October. If the pickup is for that day, please send the flight number, number of travellers and luggage count; if your flight arrives on a different day, just mention that change. We already have your request for an airport pickup.

We will then recommend a suitable vehicle and show the total price and conditions before you decide.`},
58:{title:'Từ du thuyền về 14:00–16:00',known:['Khách đang trên du thuyền và dự kiến tới khách sạn 14:00–16:00; kỳ ở 08–09/10.'],review:['Khách đã có hành trình về; không tự thêm xe đón sân bay.'],body:`Hello, thank you for the update. We have noted that you are returning from your cruise and expect to reach the hotel between 14:00 and 16:00 on 8 October.

We will pass this arrival window to reception. Please let us know only if the cruise transfer timing changes.`},
60:{title:'Hạ cánh 07:00 và hỏi giờ tới khách sạn',known:['Khách đã báo chuyến bay tới 07:00; kỳ ở 07–10/10.'],review:['Không hỏi lại giờ hạ cánh; không tự coi là giờ đến khách sạn.','Đối chiếu giờ nhận phòng chuẩn và khả năng gửi hành lý đúng cơ sở trước khi hứa.'],body:`Hello, thank you. We have noted that your flight arrives at 07:00.

You can plan to come to reception after the airport journey; reaching the hotel early and having immediate access to the room are separate arrangements. We will check an early luggage drop so you can go out while waiting, together with any earlier room access available for your stay. Any extra room charge would be explained before you agree.

You do not need to repeat the flight arrival time. We will confirm the practical arrival and room-access arrangements with reception.`},
63:{title:'Trao đổi đối tác về hóa đơn',known:['Nội dung hỏi “Booking này bên mình có lấy hóa đơn không ạ”; có thể là trao đổi đối tác.','Booking ghi Premium 05–06/10; chưa rõ bên nhận hóa đơn.'],review:['Xác định người gửi là đối tác hay khách và chứng từ booking trước khi gửi; không hiểu ngược thành khách xin hóa đơn.','Đối chiếu thông tin hóa đơn đã lưu; không xin lại nếu đã có.'],body:`Chào bạn, cảm ơn bạn đã nhắc về hóa đơn cho booking này.

Mình sẽ đối chiếu booking, bên nhận hóa đơn và yêu cầu chứng từ với bộ phận phụ trách, rồi phản hồi rõ bên mình có cần lấy hóa đơn hay không. Nếu cần, mình sẽ kiểm tra thông tin xuất hóa đơn đã lưu trước và chỉ bổ sung những mục còn thiếu, để tránh xuất sai hoặc xuất trùng.

Bạn chưa cần thực hiện xuất hóa đơn chỉ dựa trên tin nhắn này nhé.`},
64:{title:'Khách đã chọn phương án 1',known:['Khách nói Option 1 phù hợp và đã cảm ơn; không có nội dung phương án 1 trong đoạn đọc.'],review:['Tìm lại nội dung Option 1 trước khi diễn giải quyền lợi hoặc giá; không yêu cầu khách chọn lại.'],body:`Hello, thank you. We have noted that you would like to proceed with Option 1.

We will refer back to the option already discussed and check the arrangements attached to it before sending a clear recap of what is included and any remaining conditions. You do not need to choose the option again.`},
65:{title:'Yêu cầu căn hộ khác với cơ sở trong hồ sơ',known:['Yêu cầu ghi căn hộ Spacious 2BR tại West Lake, 09–15/11/2026.','Tên căn hộ khác tên cơ sở Premium trong Master.'],review:['Ưu tiên xác minh đúng căn hộ/đơn vị vận hành; chưa coi là booking 75PHT hoặc xác nhận tiện ích free gym.','Đây là nội dung tóm tắt yêu cầu, chưa có nguyên hội thoại khách; nháp chỉ ghi nhận.'],body:`Chào bạn, mình đã nhận được yêu cầu lưu trú cho căn hộ hai phòng ngủ Spacious 2BR tại khu vực Hồ Tây từ ngày 9 đến 15 tháng 11 năm 2026.

Mình sẽ đối chiếu đúng căn hộ và đơn vị tiếp nhận, sau đó kiểm tra tình trạng còn chỗ, các tiện ích được bao gồm và điều kiện đặt. Khi xác minh xong, mình sẽ gửi phương án cùng tổng giá để bạn xem trước khi quyết định.

Ngày ở và căn hộ bạn quan tâm đã được ghi nhận, bạn chưa cần gửi lại thông tin đó.`},
68:{title:'Đến 16:00–17:00',known:['Khách đã báo 16:00–17:00; kỳ ở 07–10/10.'],review:['Không hỏi lại giờ hoặc suy ngày đến từ ngày ghi tin 05/10.'],body:`Hello, thank you. We have noted your expected arrival between 16:00 and 17:00 on 7 October and will pass the timing to reception.

Please just send an update if your travel plans change. We look forward to welcoming you.`},
72:{title:'Tuần trăng mật và tới khách sạn 08:00',known:['Hạ cánh 06:30 ngày 25/11, tới khách sạn khoảng 08:00; muốn nhận phòng sớm, đi trăng mật.'],review:['Không gán ưu đãi bóng miễn phí hay giá USD25 từ nháp cũ khi chưa duyệt chính sách.','Kiểm tra đêm đã đặt trước khi đề xuất thêm đêm; chưa hứa nhận sớm.'],body:`Good morning, and congratulations on your honeymoon. We have noted your flight arrival at 06:30 on 25 November and your expected hotel arrival around 08:00.

For a more comfortable start, we can check early room access or a luggage-drop arrangement while you wait. We can also explore a simple room decoration or a special setup for your honeymoon, with the available contents and any charge explained first. Neither room access nor a complimentary decoration is confirmed yet.

Would you prefer us to focus on immediate room access, or luggage drop followed by check-in when the room is ready? Your flight date, times and honeymoon occasion are already recorded.`},
77:{title:'Yêu cầu chăm sóc tuần trăng mật',known:['Khách đã nói đây là tuần trăng mật; kỳ ở 11–17/10.'],review:['Không tự cam kết nâng hạng hoặc trang trí miễn phí; kiểm tra phương án với lễ tân.'],body:`Hello, and congratulations on your honeymoon. We have noted the occasion for your stay from 11 to 17 October.

We can explore a simple room decoration or a more detailed celebration setup to make the stay feel personal. Reception will check what can be arranged for your room, what is included and whether any extra charge applies before you decide.

Would you prefer a simple welcome decoration or a more special setup? You do not need to repeat the occasion or your stay dates.`},
81:{title:'Gửi hành lý trong chuyến Hà Giang',known:['Khách đang ở khách sạn, để hành lý từ ngày 05 và quay lại khoảng 19:00 sau Hà Giang.','Booking tiếp theo ghi 08–10/10.'],review:['Đối chiếu phiếu hành lý giữa hai kỳ ở; chưa có chứng cứ kho khóa hoặc nhận giữ dài ngày đã xác nhận.'],body:`Hello, thank you. We have noted that you are currently staying with us, plan to leave your bags from the 5th and expect to return around 19:00 after the Ha Giang Loop.

Reception will check the storage arrangement across the two stays and the collection details so your bags can be linked to the correct return booking. Please keep valuables and essential travel documents with you.

There is no need to repeat the dates or return time already provided; please just update us if the tour schedule changes.`},
82:{title:'Sửa giờ từ 15:00 thành 03:00',known:['Khách sửa giờ hạ cánh 03:00, dự kiến tới khách sạn 05:00; muốn phòng yên tĩnh.'],review:['Dùng giờ mới, không nhắc 15:00 như kế hoạch hiện tại.','Không hiểu Chinese National Day Campaign là ưu đãi đã được duyệt; kiểm tra đêm đặt và phí nhận sớm.'],body:`Hello, thank you for correcting the timing. We have updated your flight arrival to 03:00 and your expected hotel arrival to around 05:00, and have kept your request for a quiet room.

Reception will check the nights already covered by your reservation and the options for room access that early. If an additional night would be needed for immediate access, we will explain its price before you decide. We can also check a luggage-drop arrangement if you prefer to wait for the room.

Would you prefer us to explore immediate access or luggage drop while waiting? You do not need to reconfirm the corrected flight and hotel arrival times.`},
89:{title:'Khách công tác đến sớm và dùng thẻ công ty',known:['Hạ cánh 06:40; dự kiến tới khách sạn 08:00–09:00; có thể dùng thẻ công ty.'],review:['Không hỏi lại có muốn ghi chú thẻ công ty; không xin số thẻ qua chat.','Kiểm tra quy trình thẻ, phòng sẵn và phí tại đúng cơ sở.'],body:`Hello, thank you. We have noted your flight arrival at 06:40, expected hotel arrival between 08:00 and 09:00, and that you may use a business credit card.

Reception will check early room access and a luggage-drop option so you can plan the start of your business visit. Any additional room charge will be explained before you agree. We will also check the hotel's procedure for payment with a business card and advise you if a specific authorization is needed.

You do not need to resend these details or send card numbers in this conversation.`},
91:{title:'Phòng có cửa sổ và giờ đến đã biết',known:['Muốn phòng có cửa sổ/hướng nhìn; tới 15:00–16:00; kỳ ở 09–15/10.'],review:['Đối chiếu hạng phòng đặt và hướng nhìn; không tự hứa đổi hạng miễn phí.'],body:`Hello, thank you. We have noted your request for a room with a window and a view, together with your expected arrival between 15:00 and 16:00 on 9 October.

Reception will check the features of your booked room category and the available allocation. If a different category is needed to meet the preference, we will explain that option and any price difference before you decide. There is no need to repeat your arrival time or room preference.`},
100:{title:'Ưu tiên khiếu nại phòng chưa dọn',known:['Khách đã hỏi dọn phòng rồi nhắc lại phòng vẫn chưa được dọn.','Có câu hỏi thanh toán tiếng Hàn từ tin trước nhưng không rõ dịch vụ nào.'],review:['Bàn giao lễ tân/buồng phòng; không nói đã dọn hoặc hứa giờ hoàn thành chưa xác nhận.','Kiểm tra câu hỏi thanh toán trong chuỗi gốc; không suy giá hoặc phương thức thu.'],body:`안녕하세요. 객실 청소가 아직 이루어지지 않아 불편을 드려 죄송합니다.

프런트와 하우스키핑 팀에 우선 확인하여 가능한 청소 시간과 진행 상황을 안내드리겠습니다. 청소가 완료되었다고 안내하기 전에 실제 처리 여부도 확인하겠습니다.

직원이 객실에 들어가도 괜찮은 시간만 알려주시겠어요? 이미 말씀해 주신 청소 요청을 다시 설명하실 필요는 없습니다.

앞서 문의하신 결제 방법도 기존 대화에서 어떤 서비스에 대한 문의인지 먼저 확인한 뒤 정확히 안내드리겠습니다.`},
103:{title:'Chuyến bay 18:15 trong khi tới Hà Nội 16:00',known:['Nhóm đang từ Cát Bà về; tới Hà Nội khoảng 16:00 ngày 08/10.','1 khách cần ra sân bay, chuyến CA756 lúc 18:15.'],review:['Khoảng chuyển tiếp rất ngắn; kiểm tra ngay khả năng tới sân bay và hạn làm thủ tục, không đảm bảo kịp.','Khách đã yêu cầu xe; không hỏi lại có cần đặt hay không. Chỉ thiếu điểm xe Cát Bà trả và hành lý.'],body:`Hello, thank you for the update. We have noted the expected arrival in Hanoi at about 16:00 on 8 October and the airport transfer needed for one traveller on flight CA756 departing at 18:15.

That leaves a short connection. A direct transfer from your Cat Ba bus drop-off point to Noi Bai may avoid the extra journey to the hotel, but the driver availability, travel time and airline check-in deadline need an immediate check. We cannot promise that this timing will be sufficient.

Please send the bus drop-off location in Hanoi and the traveller's luggage count. We already have the flight, departure time and number of travellers. Once feasibility is checked, we will explain the available arrangement and total price before booking.`},
105:{title:'Xe đón VJ928 cho một người',known:['Khách đã đồng ý xe đón; VJ928 từ Jakarta, 04/10 lúc 18:15, Nội Bài T2, 1 người.'],review:['Không tự coi xe 4 chỗ/giá 400.000đ chỉ trong nháp cũ là khách đã chấp nhận.','Kiểm tra nhà xe và điểm gặp; không hỏi lại chuyến bay hoặc số người.'],body:`Hello, thank you. We have recorded your airport pickup request for one traveller arriving on Vietjet VJ928 from Jakarta, at Noi Bai Terminal 2 on 4 October at 18:15.

A private transfer would take you directly to the hotel. Reception will check the vehicle, agreed price and transport-provider confirmation in the existing booking record, then send the verified driver and meeting instructions. We will flag any item that still needs your decision before booking it.

You do not need to resend the flight number, terminal, date, time or number of travellers.`},
108:{title:'Khách đã báo hủy qua Booking',known:['Khách nói đã hủy trên Booking.com do hoãn chuyến; sẽ tự đặt lại nếu quay lại.'],review:['Đối chiếu OTA, không biến lời khách thành xác nhận hoàn tiền hoặc hủy thành công của khách sạn.','Không hỏi ngày mới khi khách chưa có kế hoạch.'],body:`Hello, thank you for letting us know. We have noted that you cancelled through Booking.com because your trip was postponed.

Reception will reconcile the reservation status with the platform and check whether any remaining action is needed. This acknowledgement does not confirm a refund. If you decide to return later, we will be happy to help you review a new stay when your plans are clear; there is no need to choose new dates now.`},
113:{title:'Khách xác nhận booking và tới 10:00',known:['Khách xác nhận thông tin booking đúng và tới khoảng 10:00; kỳ ở 03–05/10.'],review:['Ghi nhận không hỏi lại booking; kiểm tra phòng sớm/gửi hành lý, không áp phí 50% theo nháp cũ.'],body:`Hello, thank you for confirming the reservation details. We have noted that you expect to reach the hotel around 10:00 on 3 October.

Reception will check whether earlier room access is available. If not, we can check a luggage-drop arrangement while you wait. Any early-access charge will be explained before you decide.

No further confirmation of the booking details or arrival time is needed unless something changes.`},
116:{title:'Gửi ba lô trước nhận phòng',known:['Tới 09:00–10:00, muốn để ba lô; khách nói không có yêu cầu đặc biệt khác.'],review:['Không hỏi lại yêu cầu đặc biệt hoặc tự chào xe/nhận sớm ngoài nhu cầu đã nêu.','Xác minh quy trình gửi hành lý, chưa khẳng định miễn phí từ nháp AI.'],body:`Hello, thank you. We have noted your arrival between 09:00 and 10:00 on 1 October and your request to leave your backpacks before check-in.

We will confirm the luggage-drop arrangement with reception so you can go out while the room is prepared. Please keep valuables and travel documents with you.

We have also noted that you have no other special requests at present. There is nothing else you need to repeat.`},
124:{title:'Khách xác nhận mọi thông tin đúng',known:['Khách đã xác nhận thông tin đúng; kỳ ở 11–13/10.'],review:['Chỉ cảm ơn và ghi nhận; không tự thêm điều kiện dịch vụ hoặc yêu cầu xác nhận lần nữa.'],body:`Hello, thank you for confirming that the reservation details are correct. We have noted your confirmation for the stay from 11 to 13 October.

There is nothing further you need to reconfirm now. Please just let us know if your plans change or you need assistance before arrival.`},
126:{title:'Tới 08:00 ngày 03 tháng 10 và gửi hành lý',known:['Khách xác nhận booking, tới Hà Nội 08:00 thứ Bảy 03/10; muốn gửi hành lý để đi tham quan.'],review:['Không tự hiểu 08:00 là giờ tới khách sạn; không thêm phí nhận sớm khi khách chỉ muốn gửi đồ.'],body:`Hello, thank you for confirming the details. We have noted that you arrive in Hanoi at 08:00 on Saturday, 3 October, and would like to leave your luggage before going sightseeing.

We will check the early luggage-drop arrangement with reception so you can explore without carrying your bags while the room is being prepared. Please keep valuables and essential travel documents with you.

Your arrival date and request are already recorded; no further confirmation is needed unless your plans change.`},
127:{title:'Xe SQ196 dùng giờ mới 15:25',known:['Khách đã chọn xe 4 chỗ một chiều giá 400.000đ; SQ196, 01/10, giờ mới 15:25.'],review:['Dùng 15:25 thay 15:30; kiểm tra nhà xe trước khi nói tài xế đang chờ.','Giá 400.000đ chỉ thuộc trao đổi lịch sử này.'],body:`Hello, thank you. We have recorded your choice of a private 4-seater airport pickup for Singapore Airlines SQ196 on 1 October, using your updated arrival time of 15:25.

The one-way price discussed in this conversation is 400,000 VND. Reception will verify the transport provider's confirmation and send the driver and exact meeting instructions once checked. The pickup is not treated as confirmed by the provider solely because you selected it.

You do not need to resend the flight, vehicle choice or arrival details. Please update us only if the flight changes.`},
132:{title:'Khách thông báo đã hủy đặt phòng',known:['Khách nói đã hủy booking; nguồn kỳ ở 03–06/10.'],review:['Kiểm tra trạng thái OTA trước khi xác nhận hủy/hoàn; không hỏi khách xác nhận hủy lại.'],body:`Hello, thank you for letting us know. We have noted your message that you have cancelled the reservation.

Reception will check that the cancellation is reflected correctly in the booking record and advise you if any further action is required. This acknowledgement does not confirm a refund or waive any applicable terms. There is no need to submit the same cancellation message again.`},
135:{title:'Xe từ Tulip Cruise về 15:00–16:00',known:['Khách đã có xe từ Tulip Cruise Hạ Long; dự kiến tới 15:00–16:00.'],review:['Không tự chào thêm xe sân bay; giờ là dự kiến từ lịch du thuyền.'],body:`Hello, thank you. We have noted that you are coming with the transfer from Tulip Cruise in Ha Long and expect to reach the hotel between 15:00 and 16:00.

We will pass that arrival window to reception. You already have transport arranged, so no additional transfer request is needed. Please just update us if the cruise schedule changes.`},
143:{title:'Đón sân bay và phương án chờ phòng',known:['Khách hạ cánh khoảng 11:00; muốn nhận sớm, nếu không thì gửi hành lý.','Khách hỏi xe sân bay; kỳ ở 04–06/10.'],review:['Không hỏi lại giờ tới 11:00 hoặc nhu cầu nhận sớm/gửi đồ.','Chưa có chuyến bay, số người và hành lý; không dùng giá khứ hồi từ nháp cũ làm giá đã duyệt.'],body:`Hello, thank you. We have noted your flight arrival at around 11:00 and your preference for early check-in, with luggage drop as an alternative if the room is not ready.

For the airport journey, a private transfer would take you directly to the hotel, with a vehicle chosen for your group and bags. Reception can check the room and luggage arrangements alongside the transfer so you have one clear arrival plan.

Your reservation starts on 4 October. For a pickup on that day, please send the flight number, number of travellers and luggage count; mention only if your flight arrives on a different date. We already have the approximate arrival time. We will recommend the suitable vehicle and present the total price and conditions before you decide.`}
};
