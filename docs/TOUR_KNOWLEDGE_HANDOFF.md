# Bàn giao kho chương trình và giá tour · 18/10/2026

## Dùng trên localhost

Mở **Tour & dịch vụ** tại http://127.0.0.1:5188/#products.

- **Chương trình & giá:** tìm theo mã/tên/điểm đến; mở thẻ để đọc lịch trình, quyền lợi, giá theo gói, nguồn và phần thiếu.
- **Ghép lịch 1–28 ngày:** khung số ngày; có 63 dòng sáng/chiều/tối cho gói 14, 21, 28 ngày.
- **Lưu ý tư vấn:** quy tắc, mẫu tham khảo và thông báo lịch mở cửa. Đọc hồ sơ trước; chỉ hỏi thông tin còn thiếu.
- **Cần Cua xác nhận:** điều kiện thương mại và các trường hợp chưa thể báo giá.
- **Mở Báo giá:** chọn đúng hồ sơ, tìm mã chương trình trong Kho giá & điều kiện 75PHT, rồi đưa vào nháp. Chưa tự tạo đơn dịch vụ hay duyệt giá.

7 sản phẩm giả lập được giữ trong vùng thu gọn bên dưới, tách khỏi nguồn thật.

## Đã đối chiếu

Nguồn: [Private DATA INBOUND TOUR](https://docs.google.com/spreadsheets/d/1x79lIP4IknSngcuQJqid-QL1EdW0mXCjoQ59tgVc8u4/edit).

Tab người dùng mở là Tour information (gid 1833620342), chứa nhu cầu khách. Đợt này chỉ đọc A1:R1 của tab đó; không nhập thêm danh tính/hội thoại khách.

28 lịch đầy đủ khớp bản local; 161 tên/giá/link sản phẩm cũng khớp. Sửa 28 liên kết Tour Program Details từng trỏ A0:H0 thành đúng dòng 2–29. Không sửa Google Sheets.

Phạm vi đọc cụ thể ở lib/tour-research-data.json: Tour Catalog A1:Z60; Program Details A1:H60; Products A1:P180; Durations A1:J40; Itinerary Days A1:L180; Sources A1:H100; AI Rules A1:J40; Change Log A1:J35.

Đọc thêm 5 trang sản phẩm: TST-003, TST-021, TST-028, TST-036, TST-046. Ghi riêng gói/hạng, lịch trình tóm tắt, bao gồm/chưa gồm, trẻ em, điểm mâu thuẫn và URL. Hai trang chuyển hướng từ thesinhtour.com sang vinabooker.com; giữ cả link Sheets và URL trang đã đọc. 156 sản phẩm khác chưa kiểm tra lại website.

AI09 được đối chiếu với Báo điện tử Chính phủ; link Bộ Tư lệnh trong Sheets bị timeout. Không lấy ngày lệch trên trang tour làm lịch chính thức. Các quy tắc theo mùa khác chưa xác minh lại, vẫn là dữ liệu lịch sử.

## Cua cần bổ sung/xác nhận

1. Nhà cung cấp thực sự hợp tác, cơ sở áp dụng, điểm đón/trả 75PHT cho từng gói.
2. Giá hợp đồng, giá bán, hoa hồng, đơn vị tính và ngày hiệu lực. Không tự dùng +15%/+20%.
3. Hạng xe/tàu/cabin; trẻ em, phòng đơn, lễ/cuối tuần, thuế/phí.
4. Đặt cọc, đổi/hủy, hoàn tiền, hạn đặt và đầu mối xác nhận chỗ.

Ưu tiên giải quyết: khác biệt điểm đón Dragon King; thiếu giá và mốc tuổi Thung Ui; phần du thuyền chưa có trong tổng Ninh Bình–Hạ Long. Chi tiết và nguồn nằm trong thẻ tương ứng, không suy diễn thành giá được phép bán.

## Handoff cho Claude

- Base: fd3c423; nhánh bổ sung travis/tour-knowledge tại checkout crabs-daily-operation. Nhánh travis/daily-operation giữ nguyên để Claude hoàn tất đợt tích hợp trước.
- Sau khi đã tích hợp ba commit 1bce353, 1c9b36b, fd3c423, lấy riêng commit bổ sung của nhánh này. Nếu chưa có base, xem dependency trước khi cherry-pick.
- File mới: app/tour-knowledge.tsx, app/tour-knowledge.css, app/tour-research-note.tsx; lib/tour-research.ts, lib/tour-research-data.json; tests/tour-research.mjs.
- Thay đổi tối thiểu trong workspace: một import, gắn TourKnowledge vào view products và thu gọn 7 sản phẩm demo. Khi có conflict, giữ router và thay đổi mới của Claude.
- QuoteSourceSnapshot mới có websiteReview tùy chọn. Server tự tạo evidence từ catalog; lưu bản sao độc lập cùng phiên bản báo giá. Phiên bản cũ không tự thêm websiteReview hay thay link nguồn.
- Không có migration, dependency mới, thao tác import DB hay sửa OTA parser/template. Không copy .wrangler, .env hoặc dữ liệu email sang checkout khác.
- Đây là thư viện để người dùng tra cứu. Chưa nối 189 sản phẩm vào bộ tạo phản hồi AI, chưa duyệt giá, chưa nối OTA thành đơn dịch vụ. Không báo người dùng rằng AI đã tự học toàn bộ kho.
- Giá website chỉ là quan sát tại thời điểm đọc; không chứng minh còn chỗ, giá vốn, thời hạn hoặc quan hệ hợp đồng. Các nguồn R75 vẫn chỉ lưu nháp, bị chặn duyệt/copy theo logic hiện tại.

## Kiểm tra

Windows ARM64, Node 22.23.3 x64; bộ test dùng môi trường cách ly:

- TypeScript --noEmit --incremental false: đạt.
- tests/tour-research.mjs: 5 kiểm tra đạt.
- tests/quote-sources.mjs: 8 kiểm tra đạt.
- tests/quotes.mjs: 17 kiểm tra đạt.
- npm run build: đạt; còn cảnh báo bundle trên 500 kB.
- UI port 5188: tìm Dragon King, đọc hai gói theo điểm đón; lịch 14 ngày hiện 14 chặng; nguồn Chính phủ và trang cần xác nhận hiển thị đúng.

Không chạy tests/local-flow.mjs, không gửi khách, không sửa Make/online/checkout Claude. UI là kiểm tra local, chưa phải nghiệm thu vận hành.
