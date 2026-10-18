# CRABS bản tích hợp local (Claude + Travis)

Cập nhật 18/10/2026. Nhánh `integration/claude-travis` trong `C:\Users\Captain Cua\Documents\CRABS-Claude`. Chỉ chạy trên máy này; chưa push, merge, deploy, đổi Make hay nối Hotel Link.

## Mở ở đâu

| Cổng | Là gì | Dùng để |
|---|---|---|
| **http://localhost:5173** | **Bản tích hợp** (mã Claude + 3 commit của Travis), database `.wrangler/state` của CRABS-Claude | Cua dùng hằng ngày |
| http://127.0.0.1:5188 | Bản riêng của Travis (`work/crabs-daily-operation`), database riêng | Chỉ để đối chiếu; không đồng bộ với 5173 |

Hai database độc lập. Tích hợp mã không chép dữ liệu giữa chúng. Phiếu và bàn giao thử Travis tạo ở 5188 không có ở 5173.

Khởi động lại 5173 trong VS Code: mở terminal tại thư mục CRABS-Claude, chạy `npm run dev`, mở http://localhost:5173/signin-with-chatgpt?return_to=/ rồi vào http://localhost:5173/. Dừng bằng `Ctrl+C`.

Trang mở mặc định vào **Lễ tân & vận hành → Hôm nay** (theo thay đổi của Travis). Hộp thư OTA, Báo giá và các mục khác ở menu bên trái.

## Đã tích hợp

- **Hộp thư OTA** (Claude):
  - Đề xuất từ mẫu Cua cho phép dùng lại; ca chưa đủ điều kiện vào "Cần Cua xử lý" kèm lý do.
  - Không tự duyệt, không tự gửi; không đè bản Cua đang sửa; tin mới sau duyệt được đối chiếu lại.
  - Các sửa lỗi đọc giờ: giờ bay khác giờ đến khách sạn; khoảng giờ, "không trước", đính chính, AM/PM, "14.00".
- **Lễ tân & vận hành** (Travis):
  - Hôm nay, Lịch dịch vụ, Hồ sơ khách, Bàn giao ca. Công việc gắn đúng nguồn khách/booking/cơ sở.
  - Tách riêng khách đồng ý, nhà cung cấp xác nhận, hoàn thành; thanh toán ghi riêng.
  - Có cảnh báo khi nguồn khách có tin mới.
- **Báo giá** (Travis):
  - Có hướng dẫn; nội dung và quyền lợi trước, giá ở cuối; giá vốn, hoa hồng và lãi là phần nội bộ.
  - Lịch sử phiên bản; kho nguồn 75PHT 223 mục đang chờ xác nhận.
  - Chặn duyệt/copy nguồn chưa xác nhận.
- **Điểm sửa khi ghép hai phần:**
  - "I'd like to request check-in at …" giờ là yêu cầu nhận phòng chưa xác nhận ở cả hộp thư lẫn lễ tân. Lễ tân giữ nhãn "Yêu cầu nhận phòng · Chưa xác nhận đáp ứng".
  - Lời mời xe được kiểm tra theo từng chiều: khách từ chối đón vẫn có thể được mời tiễn.
  - Lý do của nháp tự động được cập nhật khi mẫu thay đổi.

## Vẫn làm thủ công

- Gửi trả lời trên OTA, rồi bấm "Ghi nhận đã gửi".
- Tạo công việc lễ tân từ hồ sơ khách: chưa tự tạo từ một câu trả lời hay báo giá đã duyệt.
- Khách chấp nhận báo giá thì tạo việc trong Lễ tân & vận hành. Chưa có đơn dịch vụ, thu/hoàn tiền, xác nhận điện tử của nhà cung cấp.
- Phân công chỉ là nhãn; chưa có tài khoản/quyền nhân viên. Bàn giao không gửi thông báo.
- Dữ liệu 5173 là bản sao 803 email ẩn danh; không nhận thư mới từ Make.

## Cua xem và duyệt ở đâu

- **Mẫu dùng lại:** Hộp thư OTA → nút **Mẫu được phép dùng lại**. Hiện **chưa có mẫu nào** trên 5173. Mẫu đề xuất "Khách báo giờ đến · Luxe Suites · tiếng Anh" chờ Cua quyết định, xem `docs/AUTO_DRAFTS.md` → *Mẫu chờ Cua duyệt*.
- **Ca ngoài phạm vi:** Hộp thư OTA → tab **Cần Cua xử lý**. Mỗi hội thoại có ô *Việc của Cua* ghi lý do.
- **Đề xuất từ mẫu:** tab **Đề xuất từ mẫu** (trống cho tới khi có mẫu).
- **Giá nguồn chờ xác nhận:** Báo giá → **Kho giá & điều kiện 75PHT**; danh sách cần xác nhận ở `docs/QUOTE_SOURCE_REVIEW.md`.

## Quyết định kinh doanh còn thiếu

Không cần nhập lại dữ liệu khách/booking đã có. Chỉ cần quyết định:

**Hộp thư và mẫu**
1. Mẫu Suites "khách báo giờ đến": chọn **bản A** (không mời xe) hay **bản B** (mời xe đón/tiễn). Bản B cần xác nhận **Luxe Suites có cung cấp xe sân bay** và ai điều phối. Kho giá xe hiện chỉ có nguồn 75PHT.
2. **Giờ nhận phòng tiêu chuẩn của Luxe Suites.** Căn cứ duy nhất là một phản hồi duyệt riêng cho booking 8800000024 ("Check-in is from 2 pm"). Hiện dùng câu trung tính, không ghi giờ.
3. **Giờ trả phòng** đang mâu thuẫn 11:00/12:00 (lib/luxe-knowledge.ts). Chưa đưa vào mẫu nào.
4. Yêu cầu nhận phòng sớm (vd "request check-in 11:00–12:00") **có được coi là giờ đến dự kiến** không. Ý Cua khi duyệt booking 8800000093 nói *có*. Quy tắc hiện hành coi là *yêu cầu chưa xác nhận* và không tự ghi thành giờ đến. Hệ thống giữ quy tắc an toàn cho tới khi Cua chọn.
5. Có cần thêm mẫu cho "giờ đến + không cần xe / tự đi / bàn tour sau" không. Hiện những ca này về Cua, vì mẫu chỉ được phép cho "giờ đến".
6. Chính sách chấp nhận yêu cầu nhận phòng sớm của Booking.com (Accept for free / with charges): 34 ca trong kho đang chờ quyết định này.
7. Câu "I am a local…" đổi thành "our reception team is happy to share local tips" có được không.

**Báo giá** (chi tiết: `docs/QUOTE_SOURCE_REVIEW.md`)
8. Với mỗi dịch vụ muốn bán trước, xác nhận: nguồn → cơ sở → nhà cung cấp/gói → đơn vị → giá bán → giá vốn → hoa hồng → hiệu lực → bao gồm/chưa gồm → trẻ em/phụ thu → cọc/đổi/hủy → người duyệt. Đề xuất bắt đầu với xe 4/7 chỗ và một tour Ninh Bình/Hạ Long.
9. Limousine dòng 7 và 9 (2 × 486.000 khác tổng 486.000): giá theo khách hay theo nhóm.
10. Xe sân bay có nhiều mức cho cùng chiều/loại xe (vd tiễn 4 chỗ 300/350/400/600 nghìn): mức nào áp dụng và lý do chênh lệch. Xe 16 chỗ chiều đón chưa có giá; tab 11.2026 chưa rõ chiều.
11. Mẫu USD "++": nghĩa của "++", tỷ giá/tiền thanh toán, hiệu lực. Combo cũ (xe miễn phí, spa giảm 20%) còn áp dụng không. Hai cột +15%/+20% TheSinhTour không được dùng làm chính sách giá.

**Vận hành**
12. Vai trò nhân viên và ai được xác nhận/hoàn tất/hủy việc; người nhận bàn giao.

## Database và quay lại

- Migration đã áp dụng cho 5173: 0000–0008 (đã có) và **0010_daily_operations** (thêm `ops_tasks`, `ops_history`, `ops_handoffs`). Số 0009 để trống. Không có lệnh xóa bảng/cột. Không chạy `drizzle-kit generate`: snapshot Drizzle chỉ có tới 0005.
- Sau khi migrate: 803 email, 215 hội thoại, 383 nháp (11 đã duyệt), 89 phiếu đối chiếu, 171 liên hệ, 0 mẫu, 0 việc vận hành. Chỉ thêm 3 bảng trống so với trước.
- Bản sao an toàn (thư mục `private-data/crabs-803-2026-10-18/`, bị Git bỏ qua):
  - `claude-before-integration-20261018T142420.sqlite`: trước migration 0010.
  - `claude-after-integration-0010.sqlite`: ngay sau migration 0010.
- **Quay lại mã cũ:** `git switch claude/local-setup` (giữ nguyên ở 00cba81). Nhánh của Travis không bị sửa.
- **Quay lại database:** dừng `npm run dev`, chép tệp sao lưu mong muốn đè lên `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b04….sqlite`, xóa các tệp `-wal`/`-shm` cùng tên, rồi `npm run dev`. Nếu quay về bản trước 0010 trong khi vẫn dùng mã tích hợp, chạy lại `npm run db:local:migrate`.
