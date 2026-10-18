# Nháp tự động từ mẫu đã duyệt

Cập nhật 18/10/2026, nhánh `claude/local-setup`. Chỉ chạy trên local; chưa deploy.

## Nguyên tắc

- **Duyệt một phản hồi** chỉ áp dụng cho đúng booking đó. Nó được ghi lại kèm thời điểm duyệt và "Ý Cua", nhưng không tự trở thành mẫu.
- **Mẫu được phép dùng lại** là quyết định riêng. Cua tạo mẫu từ một phản hồi đã duyệt, tổng quát hóa nội dung, chọn tình huống, cơ sở và kênh, rồi tick xác nhận cho phép dùng lại. Mẫu có phiên bản; sửa mẫu tạo phiên bản mới; có thể ngừng dùng.
- Hệ thống chỉ tự chuẩn bị nháp từ mẫu khi **mọi nhu cầu trong tin chưa trả lời** đều thuộc phạm vi một mẫu, đúng cơ sở, kênh và ngôn ngữ, và đủ dữ kiện để điền. Nháp này có nhãn **"Đề xuất từ mẫu đã duyệt"**, trạng thái **chờ Cua duyệt**. Chỉ khi Cua bấm Duyệt nội dung thì nháp mới thành "đã duyệt".
- Các ca còn lại vào **"Cần Cua xử lý"**, ghi rõ lý do và phần Cua cần quyết định.
- Không có thao tác nào tự gửi khách hay tự ghi nhận đã gửi.

## Cách dùng (Cua)

1. Hộp thư OTA → **Mẫu được phép dùng lại**. Danh sách "Phản hồi Cua đã duyệt cho từng booking" cho thấy booking, cơ sở, kênh, ngày ở, thời điểm duyệt, Ý Cua và tình huống.
2. Chọn **Tạo mẫu dùng lại từ phản hồi này**. Tên khách và mã booking được thay sẵn bằng `{{guest_name}}`, `{{booking}}`. Cua sửa tiếp:
   - Chỗ trống: `{{guest_name}} {{booking}} {{property}} {{check_in}} {{check_out}} {{arrival_time}}`.
   - `[[ask:arrival]]…[[/ask]]`: chỉ hỏi giờ đến khi khách chưa cho.
   - `[[offer:pickup]]`, `[[offer:dropoff]]`, `[[offer:tour]]` … `[[/offer]]`: tự bỏ khi khách từ chối, tự di chuyển hoặc muốn để sau.
   - `[[if:room]]…[[/if]]` (hoặc tình huống khác): chỉ hiện khi tin khách có tình huống đó.
3. Hệ thống **từ chối lưu** mẫu nếu còn giá, phí %, ưu đãi, câu "đã bố trí/đã xác nhận", hoặc còn tên, mã booking, giờ, ngày của khách gốc.
4. Lưu mẫu xong, các hội thoại đang mở khớp mẫu nhận đề xuất mới. Bản đã duyệt, đã gửi, hoặc bản Cua đang sửa thì không bị đụng.
5. Tab **Đề xuất từ mẫu**: đọc, sửa nếu cần, rồi Duyệt nội dung → Sao chép → gửi trên OTA → Ghi nhận đã gửi.

Mỗi hội thoại có ô **Tóm tắt xử lý**: *Khách cần gì* · *Hệ thống đã chuẩn bị* (nguồn nháp, mẫu và phiên bản) · *Việc của Cua* (kèm lý do nếu cần Cua).

## Khi nào vào "Cần Cua xử lý"

- Chưa có mẫu cho tình huống, cơ sở, kênh hoặc ngôn ngữ; tin có nhiều nhu cầu mà không mẫu nào bao trọn.
- Khách hỏi giá, phí, thanh toán, hóa đơn; hủy, hoàn tiền; phàn nàn; đổi booking.
- Khách hoặc OTA cần khách sạn xác nhận khả năng đáp ứng ("please confirm", "Is this ok?", nút Accept for free / with charges trên Booking.com).
- Có câu chưa thuộc tình huống nào (ví dụ hỏi spa, phòng gym, xe miễn phí, đổi số khách).
- Thiếu dữ kiện để điền mẫu. Ví dụ khách cho khoảng giờ "2–3 PM" trong khi mẫu cần một mốc giờ.
- Ngày lưu trú mâu thuẫn; khách viết ngôn ngữ khác tiếng Anh/tiếng Việt.
- Tin mới đến sau phiên bản đã duyệt: bản cũ giữ nguyên trong lịch sử; đề xuất mới ghi lý do "Có tin mới sau phiên bản vN đã duyệt".
- Tin mới đến khi Cua đang có bản sửa chưa duyệt: không tạo nháp tự động đè lên; hội thoại báo "Có tin mới trong lúc bản này chưa duyệt".
- Mẫu không còn khớp (đã ngừng dùng, hoặc quy tắc đọc đã chặt hơn): đề xuất cũ giữ nội dung nhưng chuyển về Cua kèm lý do.

## Kỹ thuật (cho Travis)

- Migration `drizzle/0008_ota_templates.sql`: bảng `ota_templates` (khóa owner+id+version, chỉ mục duy nhất theo `operation_id`); thêm vào `ota_drafts` các cột `source`, `template_id`, `template_version`, `attention`. Local: `npm run db:local:migrate`. **Production chưa áp dụng.**
- `lib/ota-templates.ts` (thuần, không DB): phân loại tin chưa trả lời theo câu, chặn các trường hợp phải về Cua, kiểm tra và điền mẫu, `planReply`, `nextStep`, `draftSource`.
- `lib/ota-template-store.ts`: đọc/lưu mẫu, danh sách phản hồi đã duyệt.
- `lib/ota-store.ts` `prepareDraft(…, refresh)`:
  - Giữ bản hiện hành nếu đã duyệt, đã gửi, hoặc do Cua viết.
  - Không chồng nháp tự động lên bản Cua đang sửa.
  - Mã thao tác `tpl-<thread>-<context>-<template>-v<n>` / `auto-<thread>-<context>` nên chạy lại không tạo bản trùng.
  - `refreshDrafts` chạy cho mọi hội thoại.
- API:
  - `GET/POST /api/ota/templates`: save có `confirmed:true` bắt buộc; retire.
  - `POST /api/ota {action:'autodraft', id?}`.
  - `GET /api/ota?id=` trả thêm `plan`, `prepared`, `next`.
  - Hàng chờ `review` và `template`.
- Các bản ghi cũ không có `source`: suy ra từ `operation_id`/`notes` (`draftSource`).

## Kết quả trên bản sao 803 email (local)

- 205 hội thoại chờ xử lý. Theo quy tắc cuối cùng:
  - 46 ca "sạch": chỉ có nhu cầu nhận diện được; vẫn cần mẫu phù hợp và đủ dữ kiện mới thành đề xuất.
  - 64 ca có nội dung phải về Cua. Lý do (một ca có thể có nhiều): 27 yêu cầu Accept của OTA, 23 giá/thanh toán, 15 cần xác nhận khả năng đáp ứng, 5 đổi booking, 4 hủy/hoàn tiền, 1 phàn nàn.
  - 128 ca có câu chưa phân loại.
- Nhóm sạch lớn nhất: Luxe Suites, tiếng Anh, chỉ báo giờ đến (16 ca); 75PHT, tiếng Anh, chỉ yêu cầu phòng (6 ca); 75PHT chỉ báo giờ đến (3 ca); Luxe Suites quan tâm xe sân bay (3 ca).
- Đã thử một mẫu **[THỬ – Claude]** cho nhóm đầu: 10 → 14 đề xuất. Rà từng ca phát hiện 5 ca điền sai giờ: giờ máy bay; "7:30" sau khi hạ cánh 5:30 pm; các khoảng giờ "1 to 2 pm", "10/11 pm", "2–3 PM". Đã sửa quy tắc và thêm test; 5 ca này tự về Cua, 8 đề xuất còn lại đúng giờ.
- Chạy lại nhiều lần: 215/215 giữ nguyên, không tạo bản trùng. 11 phản hồi đã duyệt không đổi.
- Sau khi thử, database local được **khôi phục về trạng thái sạch sau migration** (0 mẫu). Mẫu thử không còn, để Cua tự quyết mẫu nào được dùng.

## Giới hạn còn lại

- Chưa có mẫu nào được Cua cho phép dùng lại. Hệ thống chỉ tự chuẩn bị nháp sau khi Cua tạo mẫu.
- Mỗi nháp dùng một mẫu; chưa ghép nhiều mẫu thành một câu trả lời.
- `{{arrival_time}}` chỉ nhận một mốc giờ; khoảng giờ hoặc "không trước" thì về Cua.
- Bộ phân loại theo quy tắc, thiên về an toàn: nhiều ca hợp lệ vẫn về Cua. Chưa có đánh giá AI 60 ca.
- Tin chỉ "cảm ơn" sau khi đã duyệt vẫn làm bản duyệt lỗi thời (theo ngữ cảnh), cần Cua duyệt lại.
- Giờ rời đi/giờ cất cánh chưa tách (như ghi trong REVIEW_PACKET).
- Chưa nối OTA sang lễ tân/báo giá.
