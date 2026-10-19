# Live demo · Gói 1 (19/10/2026)

Bản chạy local `http://localhost:5173`, nhánh `integration/claude-travis`.

## Cấu hình quy định & giá dịch vụ

- Sửa tại `lib/hotel-policy-config.json`, rồi tải lại trang.
  - Mỗi cơ sở có: giờ nhận/trả phòng, nhận sớm 09:00–14:00, trả muộn đến 16:00 (phụ thu 50% giá phòng một đêm + thuế), bảng xe sân bay 4/7/16 chỗ, menu spa, tour chủ lực.
- Chỉ mục có `"approved": true` mới được đưa số tiền vào nháp gửi khách hoặc được duyệt trong báo giá.
- Trạng thái hiện tại:
  - **Đã duyệt:** quy định nhận/trả phòng (cả hai cơ sở); bảng xe sân bay 04/10 của 75PHT.
  - **Chưa duyệt:**
    - xe cho Suites (cần làm rõ chính sách xe miễn phí);
    - giá Spa (để trống, anh nhập);
    - khoảng giá tour (đã điền gợi ý từ kho nguồn để anh rà);
    - giá vốn và hoa hồng của xe/spa/tour.
- Một dịch vụ được duyệt trong Báo giá và tính lãi khi có đủ: `approved: true` + giá bán + giá vốn + hoa hồng.

## Hai nhánh trả lời OTA

1. **Chốt thẳng trên Extranet** (xe sân bay, spa, nhận sớm/trả muộn, giờ nhận/trả phòng):
   - nháp tự điền điều kiện và giá đã duyệt, chọn xe theo số khách/hành lý, mời khách trả lời xác nhận ngay trên OTA;
   - chưa có giá duyệt thì nháp chỉ hứa gửi giá.
2. **Tour → WhatsApp:**
   - nháp giới thiệu tuyến có nguồn, kèm "giá từ…" nếu tuyến đã duyệt, và xin số WhatsApp;
   - nếu khách đã để số trong tin nhắn, panel "Tư vấn nội bộ" hiện số đó và nút **Mở WhatsApp Web** với lời chào điền sẵn. Cua tự gửi; hệ thống không gửi.

## Chế độ trình chiếu

- Nút **Trình chiếu** ở đầu Hộp thư OTA:
  - đổi tên cơ sở thành tên Demo trung lập trên màn hình;
  - ẩn các màn lịch sử của dự án nguồn (Phân tích, Kho tham chiếu, Kho trả lời, Hồ sơ/Duyệt từ Sheets, Thông tin & quy định).
- Dữ liệu lưu và ô nhập liệu không đổi. Bật/tắt sẽ tải lại trang.
- Khi trình diễn, nên mở **6 hội thoại tổng hợp** (khách "Demo Guest …", booking `59919001xx`) thay cho email thật.

## Khách xin gia hạn trực tiếp

- Khi tin chưa trả lời có ý gia hạn ("extend", "4 more nights", "ở thêm"…), khung nháp hiện "Báo giá gia hạn trực tiếp".
  - Hệ thống tự điền số đêm thêm, ngày trả phòng hiện tại, số khách và số phòng.
- Cua mở admin Booking, xem loại phòng, giá khách đã đặt và giá đang bán cho các đêm thêm, rồi nhập vào khung này.
- Hai phương án (đặt trực tiếp nên không mất commission OTA):
  - **Phương án 1:** giữ nguyên giá khách đã đặt.
  - **Phương án 2:** giá Booking hiện tại −10%, làm tròn đến 1.000đ. Mức % nằm ở `extensionDirect.discountPercent`.
- Cách dùng: chọn phương án, bấm "Chèn vào nháp", đọc lại, bấm Lưu nháp rồi Duyệt.
  - Số tiền được ghi vào ghi chú nháp dưới dạng `[Giá Cua tính: …]`, nên bước kiểm tra giá cho duyệt.
  - Giá không có ghi chú này vẫn bị chặn.
- Câu gửi khách có viết "còn phòng". Cua cần kiểm tra phòng trống trước khi chèn. Duyệt không có nghĩa là đã gửi hay đã giữ phòng.

## Dữ liệu mẫu (đã nạp)

- Lệnh: `node scripts/seed-demo-live.mjs`
  - Chỉ chạy với dev server 5173 đang chạy; đi qua API như người dùng.
  - Chỉ thêm, không xóa. Chạy lại không tạo trùng.
- Dữ liệu đã nạp:
  - 6 hội thoại OTA tổng hợp;
  - 5 mẫu trả lời đã duyệt (Welcome, Hotel Info, Airport Transfer, Spa, Tour → WhatsApp);
  - 8 báo giá trên khách demo (5 đã duyệt, 3 nháp);
  - 10 việc lễ tân;
  - 2 bàn giao ca.
- Bản sao lưu database trước khi nạp nằm trong `private-data/backups/` (không vào Git).

## Lưu ý

- Khi mẫu được duyệt, hệ thống tự đề xuất nháp cho các hội thoại đang mở. Lần nạp này đã tạo 12 nháp đề xuất từ mẫu trên hội thoại cũ và cập nhật lý do "cần xử lý" của một số nháp tự động. Không có email hay nháp nào bị xóa.
- Bản online, Make và Gmail không bị thay đổi.
