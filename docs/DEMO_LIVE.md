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

## Kho dịch vụ & bảng giá (một nguồn giá)

- Menu "Kho dịch vụ & giá" có 322 mục, gộp từ ba nguồn:
  - workbook 6 tab (`lib/rate-catalog.json`);
  - các dòng R75 (`lib/quote-source-data.json`) và 5 sản phẩm đã đối chiếu website;
  - cấu hình khách sạn (`lib/hotel-policy-config.json`).
- Seed được tạo lại bằng lệnh `node scripts/build-service-catalog.mjs`, ghi ra `lib/service-catalog-seed.json`.
  - Seed nạp vào D1 (bảng `service_catalog`, migration 0011) trong lần đọc đầu tiên.
  - Seed mới chỉ thêm mã chưa có, không ghi đè giá Cua đã sửa.
- Mã R75, XE… đã gộp vẫn tra được và trỏ về mục mới. Ví dụ: XE01 → `HS-luxe-75pht-car4-pickup`, R75-TOUR-OCT-5 → NB05.
- Trạng thái:
  - **Đã duyệt giá:** được điền số tiền vào nháp OTA và báo giá.
  - **Chỉ tham khảo:** tư vấn nội dung, không báo giá.
  - **Lưu trữ:** ẩn khỏi tư vấn. HT06, HT13, CH05 và các tour mẫu cũ trong cấu hình nằm ở đây.
- Đã duyệt ngày 19/10:
  - 6 chiều xe sân bay 75PHT;
  - NB01–NB04, HL01–HL02, HN01, HN02, HN04 (Jeep), HT03 (Sa Pa, 255 USD);
  - 6 quy định phòng (nhận sớm, trả muộn, gia hạn).
- **Còn thiếu:**
  - Giá Spa: chưa nguồn nào có. 12 mục Spa đang "Chỉ tham khảo"; nhập giá rồi bấm Duyệt.
  - Giá vốn và hoa hồng của các mục đã duyệt. Báo giá chỉ duyệt được khi mục có đủ giá bán, giá vốn, hoa hồng và tính bằng VND.
- Dữ liệu dùng chung:
  - Hộp thư OTA: bộ kiểm tra giá, giá xe/spa, giá tour theo hạng hiện trong bảng tư vấn. Tour vẫn qua WhatsApp, nháp OTA không ghi giá tour.
  - Báo giá: chọn dịch vụ từ kho; khi duyệt, kiểm tra giá bán đúng giá đã duyệt.
  - Tour & dịch vụ: trạng thái và giá lấy từ kho.
- Báo giá đã duyệt có nút "Tạo việc lễ tân" cho từng dịch vụ. Việc mới mở ở trạng thái khách đang tìm hiểu, nhà cung cấp chưa kiểm tra.

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
- Câu gửi khách viết "tùy tình trạng phòng trống" và hứa kiểm tra rồi xác nhận lại, không khẳng định còn phòng. Duyệt không có nghĩa là đã gửi hay đã giữ phòng.

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
