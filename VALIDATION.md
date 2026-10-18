# Kiểm tra bản nền TourFlow CRM

Ngày kiểm tra: 14/10/2026, giờ Việt Nam. Chỉ dữ liệu giả lập.

- TypeScript `tsc --noEmit`: đạt.
- Bộ kiểm thử `tests/local-flow.mjs`: 15/15 đạt trên preview localhost có D1 riêng.
- Giao diện desktop: mở tổng quan và hộp thư, sửa người phụ trách/ghi chú, lưu phản hồi mẫu, tải lại trang; đã thấy nội dung được giữ lại. Danh mục 7 sản phẩm hiển thị đủ. Không ghi nhận lỗi console trong lượt kiểm tra.
- Chưa kiểm thử trên điện thoại hoặc máy chiếu; chưa kiểm thử nhiều tài khoản nhân viên.

## Các kiểm tra API đã đạt

1. Không đăng nhập: từ chối đọc.
2. Trang ứng dụng trả HTTP 200 cho phiên local.
3. Seed đúng 20 khách, 20 tin, 5 tour, 2 xe, 3 nhà cung cấp.
4. Từ chối yêu cầu ghi khác origin.
5. Khôi phục yêu cầu chuỗi xác nhận đúng.
6. Tạo khách độc lập với booking; gửi lại ID không tạo trùng.
7. Từ chối số người lớn bằng 0 và ngày không tồn tại.
8. Phân công, hạn và ghi chú lưu qua lần đọc mới.
9. Từ chối sửa từ phiên bản cũ.
10. Cùng ID tin chỉ có một tin và một sự kiện nhật ký.
11. Phản hồi mô phỏng được lưu.
12. Từ chối tin gắn với khách không tồn tại.
13. Ba hồ sơ kịch bản tồn tại với ngữ cảnh phù hợp.
14. Đối chiếu lãi mẫu Ninh Bình 220.000 VND và xe đón 70.000 VND/đơn vị bằng phép tính độc lập.
15. Khôi phục về bộ 20 khách và xóa các bản ghi kiểm thử.

Các kết quả này xác nhận nền CRM ở môi trường thử nghiệm; không xác nhận WhatsApp, AI, báo giá, đơn dịch vụ hoặc sẵn sàng vận hành thực tế.


## 0.2 reference library validation — 14 October 2026

- TypeScript noEmit passed.
- 11 data checks passed: totals, unique sample/product IDs, 28 complete itinerary records, price parsing, HTTPS source links, synthetic identity format, absence of messaging links and secret markers.
- The prepared JSON was compared in memory against original guest names, phone numbers, booking IDs, email message IDs and pickup-name fields; no exact matches longer than five characters were found. Raw guest data was not written to this checkout.
- Existing 15 local API flow checks passed on the local synthetic D1 database.
- Browser QA at the default narrow viewport: 151 profiles and 189 catalog entries shown; cancelled filter returns 10; LPD-001 creates a contact and opens the inbox; reload preserves it and the reference action becomes Open in CRM; NB01 search opens its itinerary and unapproved-price status.
- Hosted deployment is verified through the native Sites deployment result. Hosted per-user mutations and multiple device layouts were not independently tested in this pass.

## 0.3 source audit and knowledge library — 14 October 2026

- TypeScript noEmit passed after the UI additions.
- All 57 primary worksheet value reads returned successfully. Backup/QA files were inventoried only. No Make scenario was executed or changed; nine structures were inspected and six transient internal read errors succeeded on sequential retry.
- Source ranges, unique workbook/backup inventories, 1–28 duration sequence, contiguous 14/21/28 itinerary-day sequences and HTTPS source URLs verified. UI-downloaded JSON deep-equals the three source JSON objects combined.
- New sanitized audit and knowledge objects were compared in memory with 1,427 non-empty identity/contact/reference fields of at least seven characters from Guest Master and the multi-property import store; zero exact substring matches. This complements the previous reference-profile scan and is not a formal anonymization guarantee. Raw records were not written to the checkout.
- Browser QA at the default viewport: five reference tabs, eight source workbooks, six filtered templates, successful browser copy acknowledgement, 14 rendered itinerary-day cards, and FO accordion with 17 tab ranges. Download produced the complete JSON bundle. Browser clipboard read-back did not confirm the copied value, so only the UI/API copy acknowledgement was verified.
- This update changes the read-only library and export; CRM API/database code and live customer data were unchanged. No WhatsApp, AI or Make runtime integration was tested or added.

## 0.4 — Báo giá và phân tích 75PHT (14/10/2026)

- `node tests/quotes.mjs`: 14 nhóm đạt trên D1 cục bộ thật; route bundle dùng stub ở ranh giới danh tính ChatGPT. Tour riêng, xe riêng, ghép; giá vốn/hoa hồng/chi phí/giảm giá/lãi; dữ liệu không hợp lệ; duyệt; v1 bất biến khi tạo v2; chặn ghi đè cạnh tranh; idempotency; phạm vi tài khoản; đọc mới giữ dữ liệu và nhật ký.
- `node tests/analysis.mjs`: 7 nhóm đạt: phủ 26 bảng/212 tab giá trị và 3 tab cấu hình loại trừ, bảo toàn tổng phân nhóm, khóa hợp nhất, số dòng dịch vụ, tổng tài chính, backup, cấu trúc export không nhận diện.
- Rà 688 giá trị tên/liên hệ/mã booking từ nguồn: không khớp trong JSON phân tích. Không lưu nguồn khách thật hoặc bản mapper Make trong repository.
- Đọc độc lập ô `UNFORMATTED_VALUE`: tour tháng 8 = 130,013,000 VND (29 ô); tour tháng 9 = 158,696,000 (40 ô); xe tháng 10 = 21,800,000 (33 ô), khớp tổng nhóm phân tích. Không chứng minh tiền đã thu/doanh thu đối soát.
- TypeScript đạt. Build chạy qua helper Sites.
- Không có công cụ control-browser ở môi trường managed: chưa kiểm thử bố cục, thao tác trình duyệt, đăng nhập laptop, tải lại trình duyệt hay máy chiếu. Không dùng build để thay cho nghiệm thu vận hành.
- Không ghi/reset database cloud; migration chỉ tạo hai bảng báo giá, giữ bảng hiện có. Không chạy Make, gửi tin, đổi quyền Site hoặc nối AI/API thật.

Phạm vi nguồn: 8 bảng chính + 18 backup/QA (215 tab metadata, 212 tab giá trị, 3 cấu hình không đọc); 12 PDF lịch trình/brochure và một tài liệu mẫu chăm sóc đã đọc văn bản. 21 luồng Make kiểm kê, 16 cấu trúc đọc được; 5 lỗi công cụ được ghi rõ. Chưa có toàn bộ email, ảnh/chứng từ, nhận xét, Apps Script, lịch sử Drive hoặc nguồn chưa xác định. Các bản backup không cộng vào số booking hiện hành.

## 0.5 — Rà soát khoảng trống (15/10/2026)

- Mở đúng nguồn cloud hiện hành, HEAD 53f3e21ee6442d9e14ed346ea376555f07cb4483; owner-private version 4. Không thay schema/bảng DB hoặc chức năng báo giá.
- Đọc thành công lại 5 cấu trúc Make từng lỗi nội bộ; chỉ đọc. Sửa trạng thái kiểm kê 21/21 cấu trúc đã đọc (16 mốc trước + 5 đọc lại).
- Gmail khách sạn, truy vấn giới hạn tên/địa chỉ 75PHT và PropertyID 16856467, 01/09–15/10/2026: hết 4 trang/378 mã duy nhất, đọc đầy đủ MIME sau khi giảm batch và thử lại từng mã lỗi. 318 thư có bằng chứng 75PHT riêng; 54 hỗn hợp; 1 Premium; 5 chưa xác minh. 42 khớp Gmail ID/RFC Message-ID với OTA Event Log; 336 không khớp được giữ là nhóm đối chiếu, không nhập booking/sự kiện mới.
- Chủ đề trong thư đủ phạm vi là phép dò từ khóa, có thể chồng lặp, không phải số nhu cầu hoặc dịch vụ đã xác nhận. Không xuất nội dung thư, khách, mã thư hoặc nhận diện.
- Mở 14 PDF đính kèm: chỉ bản xem trước, tất cả có cờ trích xuất chưa đầy đủ. Môi trường không có tool đọc sediment extraction_file_uri; không dùng số tiền/chứng từ từ preview để tính tài chính.
- Bốn sổ dịch vụ/14 tab: đọc CellData A1:Z250 để tìm hyperlink, note, formula và rich-text; không có link chứng từ trong phạm vi ô này. Không kết luận không có ảnh nổi ngoài ô. Master K1:K180 có 29 công thức ảnh Welcome cá nhân hóa; phân loại không cần cho phân tích, không tải.
- Drive: Guest information revision 6318 đọc text, cùng mốc 0.4, đối chiếu Master hiện hành. Sổ xe có 139 revisions được liệt kê, trước 1582/hiện hành 1588; không đọc từng bản vì đã có hiện hành/backup và chưa chứng minh cần phục hồi.
- Đọc lại Guest Master A1:BI200, FO _BookingData A1:B500, OTA Event Log A1:S500 để đối chiếu. Thu hẹp nhận diện: chỉ PropertyID 16856467 hoặc tên/địa chỉ Phạm Hồng Thái; Premium/Premier không có bằng chứng để riêng. Tổng khóa hợp nhất giảm 80→47, không xóa dữ liệu CRM. 14 Master + 35 Gmail − 2 thiếu khóa, không có giao khóa đã chứng minh. 151 dòng Master gồm 118 cơ sở khác, 14 thuộc 75PHT, 19 cần đối chiếu.
- `node tests/analysis.mjs`: 8 nhóm đạt. JSON mới kiểm với 933 giá trị nhận diện thực tế từ email/Master, 0 khớp; không giữ raw source trong repository. Kiểm thử báo giá 14 nhóm được chạy lại để phát hiện hồi quy.
- TypeScript/build qua helper Sites. Không có control-browser: chưa kiểm chứng thao tác/hiển thị trình duyệt laptop, máy chiếu hoặc đăng nhập production. Không thay việc này bằng kết luận từ build.


## 0.7 — 15/10/2026

- 14 nhóm kiểm thử replies đạt: Linh chủ động tư vấn và giá cuối; không lặp hành lý/ngày/tuổi/ngân sách đã có; đổi ngày, ăn chay, xe tiễn, hủy; lưu/đọc, chống trùng, duyệt không gửi, giữ bản đã duyệt, cạnh tranh, dữ kiện mới làm nháp cũ cần duyệt lại, phạm vi tài khoản và Origin.
- 6 nhóm reception đạt sau thêm export nháp; hồ sơ chung và báo giá cũ giữ nguyên. TypeScript và build Sites đạt.
- Máy Windows ARM cần runtime Node x64 cục bộ cho workerd; công cụ tải trong .sites-runtime được bỏ qua khi lưu source/đóng gói. Không đưa runtime/credential vào repository.
- Không dùng chính sách Theodore làm nguồn Luxe. 84 mục thư viện đã nhập từ bản tổng hợp, gồm 83 khách + 1 nội bộ; 65 Hospitality đã nằm trong bộ này. Chưa kiểm chứng mọi cách diễn đạt tự do; đề xuất vẫn cần nhân viên duyệt.

- Kiểm tra trình duyệt xem thử: hộp thư Linh hiển thị đúng ngày/chuyến bay và nội dung; bấm Lưu nháp tạo v1 Chờ duyệt; kho nguồn hiện đủ 84 mục (83 khách + 1 nội bộ). Đóng gói trên laptop thiếu bash; nguồn đã đẩy, dùng remote build Sites theo luồng dự phòng.
## 0.8 — Liên kết hồ sơ và dịch vụ nguồn · 15/10/2026

- 12 nhóm source-data đạt: 151 hồ sơ, 58 đoạn trao đổi, 76 dòng dịch vụ, 4 liên kết mã booking; kiểm tra dữ kiện Hà Giang/xe/nhận phòng; khóa ngữ cảnh tương thích nháp cũ; import lặp/tiếp tục không mất chỉnh sửa; nháp chờ duyệt; tách tài khoản và yêu cầu chưa đăng nhập.
- 14 nhóm replies và 6 nhóm reception đạt. Không ghi ngược nguồn và không tạo tin gửi ra ngoài.
- Rà snapshot với 193 tên khách trong nguồn và 151 mã booking: không còn khớp nguyên tên/mã; không thấy email hoặc điện thoại trong trường xuất bản. Đây là kiểm tra theo tập nguồn đã đọc, không khẳng định có thể xác định mọi tên riêng trong văn bản tự do.
- Trình duyệt cục bộ hiển thị 151/58/76/4; mở được hội thoại Hà Giang, nháp lịch sử và đề xuất cụ thể. TypeScript và build Sites đạt. Trình duyệt cũng mở được sổ 76 dịch vụ, bộ lọc và liên kết đúng dòng nguồn. Trạng thái production được kiểm tra sau khi phát hành.
