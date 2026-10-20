# Prompt cho ChatGPT: đề xuất thiết kế lại UX/UI cho CRABS (chỉ góp ý, chưa triển khai)

> Cách dùng: dán toàn bộ nội dung dưới đây vào ChatGPT. Nếu ChatGPT không mở được repo GitHub, đính kèm thêm các file trong mục "File nên đọc".
> Tài liệu này được Claude (người triển khai code) viết ngày 20/10/2026, dựa trên mã nguồn nhánh `integration/claude-travis` (commit 37a5fe8).

---

## 1. Vai trò và nhiệm vụ của bạn

Bạn là **Lead UX/UI Designer** của dự án CRABS. Đội gồm:

| Người | Vai trò |
|---|---|
| **Captain Cua (PO)** | Chủ sản phẩm, quản lý khách sạn ở Phố cổ Hà Nội; duyệt mọi quyết định |
| **Gemini** | Tech lead: rà kiến trúc và chất lượng code |
| **Claude** | Người triển khai code theo phương án PO đã duyệt |
| **Bạn (ChatGPT)** | Thiết kế lại UX/UI và cùng Gemini rà cấu trúc code |

Nhiệm vụ:

1. Đọc hiểu sản phẩm (mô tả bên dưới, cùng mã nguồn nếu bạn truy cập được).
2. Cùng Gemini rà soát **cấu trúc code ở mức tổng thể**: kiến trúc, cách chia component, CSS, chỗ nào làm UI khó sửa hoặc khó dùng.
3. Đề xuất **thiết kế lại UX/UI cho dễ dùng hơn**. PO đã hài lòng với phiên bản hiện tại, nên đây là **cải tiến**, không phải làm lại từ đầu. Hãy giữ nhận diện và các luồng duyệt đang chạy tốt.
4. Đề xuất ý tưởng bổ sung nếu có.

**Quan trọng: chỉ đưa ý kiến, chưa triển khai.**
- Không viết code để chạy, không tạo PR, không yêu cầu ai deploy.
- Mọi đề xuất ở trạng thái **"chờ PO duyệt"**.
- Phần nào bạn **suy luận** mà không đọc được code thì ghi rõ là suy luận.

---

## 2. Sản phẩm là gì

**CRABS** là CRM dùng tại quầy lễ tân cho 2 khách sạn ở Phố cổ Hà Nội: Luxe Paradise 75 Phạm Hồng Thái và Luxe Paradise Suites. Sản phẩm giúp làm 3 việc.

**1. Trả lời tin nhắn khách OTA** (Booking.com, Agoda, Expedia, Trip.com).
- Email thông báo từ OTA được chuyển vào hệ thống. CRABS ghép email theo booking, đọc nhu cầu khách và soạn **nháp**.
- Cua (hoặc lễ tân) **sửa, duyệt rồi sao chép** nháp để tự dán lên extranet của OTA. **CRABS không bao giờ tự gửi tin cho khách.**

**2. Bán dịch vụ** (xe sân bay, spa, tour): báo giá từ kho dịch vụ và giá đã duyệt.

**3. Vận hành lễ tân:** giờ khách về, chuẩn bị phòng, bàn giao ca, checklist đầu ca, xử lý phàn nàn.

**Người dùng (góc nhìn):**
- Lễ tân, Saler tour, Quản lý, Admin (Cua).
- Góc nhìn hiện chỉ là **bộ chọn hiển thị lưu trong trình duyệt**, chưa có đăng nhập theo vai trò.

**Ngôn ngữ:**
- Giao diện viết tiếng Việt.
- Nháp gửi khách viết bằng tiếng của khách: Anh, Việt, và một số mẫu có sẵn bằng tiếng Do Thái, Nga, Pháp, Tây Ban Nha, Đức, Trung, Nhật, Hàn.
- Có nút **Dịch** để lễ tân đọc tin khách và nháp bằng tiếng Việt.

**Kỹ thuật:**
- **Giao diện:** React 19, `vinext` (route API kiểu Next chạy trên Vite), TypeScript, icon `lucide-react`.
- **CSS:** viết tay, gồm:
  - `app/crabs.css`: nền;
  - `app/crabs-gold.css`: theme tối và vàng, ghi đè lên nền;
  - `app/operations.css`, `quotes.css`, `tour-knowledge.css`: CSS riêng theo màn.
- **Dữ liệu:** Cloudflare Worker với D1 (SQLite) chạy local; migration bằng drizzle (`drizzle/0000` đến `0012`).
- **Test:** 27 file test (`tests/*.mjs`, build bằng esbuild); 296 test PASS.
- **Kiểu code:** rất cô đọng, nhiều đoạn JSX nằm trên một dòng dài.

**Kích thước một số file giao diện:**

| File | Kích thước |
|---|---|
| `app/workspace.tsx` (khung, sidebar, nhiều màn demo) | ~38 KB |
| `app/ota-workspace.tsx` | ~29 KB |
| `app/operations-workspace.tsx` | ~23 KB |
| `app/quote-workspace.tsx` | ~22 KB |

**Dữ liệu trên máy PO:**
- Khoảng 809 sự kiện email OTA (bắt buộc giữ 803 email OTA gốc).
- Kho dịch vụ có 509 mục, trong đó 46 mục đã duyệt giá.
- Tên khách được ẩn danh khi trình chiếu.

---

## 3. Các màn hình hiện có (sidebar, 18 mục)

**Vận hành thật**

| Màn | Việc chính |
|---|---|
| **Hộp thư OTA** | Danh sách hội thoại theo kênh và trạng thái. Chi tiết hội thoại gồm: chat, tóm tắt khách (ý chính, nhãn thông minh, ghi chú cho lễ tân), panel "Tư vấn nội bộ" (tour và giá tham khảo), và **khung nháp**. Khung nháp có các nút: Cập nhật nháp, Sửa, Lưu nháp, Duyệt nội dung, Sao chép bản đã duyệt, "AI viết lại", 4 mẫu thư chèn nhanh (tin ngày trả phòng, thư cảm ơn, xin lỗi sự cố phòng, xin lỗi khách không hài lòng), nút Dịch, máy tính gia hạn phòng, và "Tôi đã gửi trên OTA — ghi nhận lại". Còn có panel Mẫu trả lời đã duyệt. |
| **Yêu cầu dịch vụ** | Xe, tour, spa theo **2 pha**: khách mới hỏi, rồi khách chốt và nhà cung cấp xác nhận. Có xuất CSV xe sân bay. |
| **Sales dịch vụ** | Hồ sơ và hội thoại bán dịch vụ. |
| **Lễ tân & vận hành** | 5 tab, chi tiết ở dưới. |
| **Báo giá** | Lập báo giá từ kho dịch vụ, có phiên bản và duyệt. Phần giá vốn, hoa hồng và lãi được xếp vào mục nội bộ. |
| **Kho dịch vụ & giá** | 509 mục (xe, tour Hạ Long, Ninh Bình, Sa Pa, Hà Nội, xe liên tỉnh, spa, phụ phí phòng); lọc theo cơ sở, nhóm, trạng thái, luồng bán, nhà cung cấp; sửa giá; lịch sử thay đổi. |
| **Hiệu quả dịch vụ** | Doanh thu, giá vốn và lãi gộp thực tế theo tháng (tour, spa, xe). |
| **Kho trả lời & nguồn** | Thư viện mẫu trả lời và nguồn. |
| **Thông tin & quy định** | Chính sách khách sạn: giờ nhận/trả phòng, nhận sớm/trả muộn, xe, spa, quầy lễ tân. |
| **Tour & dịch vụ** | Thư viện tour: lịch trình, ảnh nhà cung cấp ưu tiên. |

5 tab của **Lễ tân & vận hành**:
- **Hôm nay:** bảng giờ khách về (ETA), việc ưu tiên trong ca, khách đến và khách đi.
- **Đầu ca:** checklist theo ca và vai trò.
- **Lịch dịch vụ.**
- **Hồ sơ khách:** lọc theo phân luồng.
- **Bàn giao ca:** form có cấu trúc, nút gợi ý 1 chạm và nút "Ký nhận".

**Phân tích và dữ liệu cũ (Sheets)**
- Phân tích 75PHT
- Duyệt nháp từ Sheets
- Hồ sơ từ Sheets

**Demo**
- Hộp thư demo
- Khách hàng demo
- Dữ liệu tham chiếu
- Tổng quan demo
- Phạm vi & hướng dẫn

**Thành phần dùng chung**
- Thanh trên cùng: bộ chọn **Góc nhìn**, xem trước thương hiệu, nhãn dữ liệu, nút tải lại.
- **Thanh cảnh báo đỏ [COMPLAIN]**: hiện cho Quản lý và Admin ở mọi màn.
- **Chế độ trình chiếu**: che tên thật trên màn hình.

---

## 4. Các luồng chính

**A. Trả lời tin OTA**
1. Email OTA được ghép theo booking và cơ sở, rồi hệ thống lập hồ sơ nhu cầu khách.
2. Nháp được chọn theo thứ tự ưu tiên:
   1. thư xin lỗi khi có sự cố hoặc khách không hài lòng;
   2. bản viết bằng ngôn ngữ của khách;
   3. mẫu đã duyệt;
   4. đề xuất của AI;
   5. nháp theo luật.
3. Hệ thống kiểm tra trước khi cho duyệt:
   - **chặn mọi số tiền chưa được duyệt**;
   - **chặn ô `[Cua điền…]` còn trống**;
   - chặn lời hứa chưa được xác nhận.
4. Cua sửa, lưu, duyệt, sao chép rồi tự dán lên OTA, sau đó bấm "Tôi đã gửi".
5. Có tin khách mới thì nháp đã duyệt bị đánh dấu **cũ** và phải duyệt lại.

**B. Dịch vụ**

Khách hỏi → khách đồng ý → nhà cung cấp xác nhận → hoàn tất. Khách đồng ý **không** đồng nghĩa nhà cung cấp đã xác nhận.

**C. Lễ tân (mới thêm ngày 20/10)**
- **ETA ngày check-in:**
  - Trạng thái: `MISSING_ETA` (vàng), `EARLY_ARRIVAL` (ưu tiên dọn phòng #1), `CONFIRMED_ETA`.
  - Giờ đến đọc từ tin khách; giờ hạ cánh được cộng khoảng 60 phút đường từ Nội Bài.
  - Trạng thái phòng có 3 mức: Chờ giờ về / Ưu tiên dọn / Phòng sẵn sàng.
  - Nút "Copy Prompt Hỏi Giờ Về (ETA)".
- **Phân luồng:**
  - Phòng, xe, spa và giờ đến gắn nhãn `[LỄ TÂN XÁC NHẬN]`; tour gắn `[CHUYỂN SALER TOUR]`.
  - Công tắc **"Lễ tân tự bán tour"** (mặc định TẮT). Khi BẬT, nháp đưa báo giá nhanh 3 tour đã duyệt: HL02, NB01, HN04.
- **Phàn nàn:**
  - Tag đỏ `[COMPLAIN]` cho cả 3 giai đoạn: trước, trong và sau lưu trú.
  - Thanh cảnh báo Quản lý có nút "Copy Prompt Hạ Nhiệt & Đề Xuất Đổi Phòng" và nút "Đã giải quyết".
- **Đầu ca:**
  - Chọn ca Sáng 06:30–14:30, Chiều 14:00–22:00 hoặc Đêm 22:00–07:00; ca mặc định chọn theo giờ hiện tại.
  - Checklist lọc theo góc nhìn, kèm số liệu (khách thiếu ETA, bàn giao chưa ký, phàn nàn chưa xử lý).
- **Bàn giao ca:**
  - Form gồm số phòng, mã booking, giai đoạn, phân loại, người ghi và nội dung.
  - 5 nút gợi ý 1 chạm, nút "✓ Ký nhận bàn giao ca trước".
- **Ẩn giá vốn:** Lễ tân và Saler chỉ thấy **giá bán cho khách và hoa hồng**; Quản lý và Admin thấy thêm giá vốn và lãi khách sạn.

**D. Thư mẫu theo quyết định PO ngày 20/10**
- Thư xin lỗi sự cố phòng: xử lý **trong 15 phút**, đổi phòng nếu còn phòng trống.
- Thư xin lỗi khách không hài lòng, và một bản riêng cho phàn nàn trước khi khách đến.
- Tin nhắn ngày trả phòng; thư cảm ơn mời góp ý thẳng thắn, không xin chấm 10/10.
- Người liên hệ là **Quản lý Lễ tân**, **không đưa bồi thường**, một hotline duy nhất **+84 896 867 575**.

**E. Các phần "thông minh" hiển thị cho lễ tân**
- **Nhãn thông minh:** KHẨN CẤP, YÊU CẦU DỊCH VỤ, COMPLAIN, YÊU CẦU ĐẶC BIỆT, VIP CARE, THANH TOÁN/HÓA ĐƠN, TIỀM NĂNG SPA, LỄ TÂN XÁC NHẬN, CHUYỂN SALER TOUR.
- **Cảm xúc khách:** mệt, lo lắng, hào hứng → cách chăm sóc tương ứng.
- **Chặng trước của khách:** khách vừa đi Cát Bà thì không gợi ý Hạ Long.
- **Ghi chú đón khách.**
- **Ý chính của khách.**

---

## 5. Nguyên tắc bất biến (thiết kế không được phá)

1. **Không tự gửi** cho khách, nhà cung cấp hay cổng thanh toán. "Đã duyệt" khác "đã gửi"; "khách đồng ý" khác "nhà cung cấp xác nhận".
2. **Không hiện số tiền chưa duyệt** trong nội dung gửi khách. Ô `[Cua điền]` phải chặn duyệt.
3. Thư xin lỗi **không có bồi thường**.
4. **Không đụng** đến Make, Gmail, OTA hay bản online. **Giữ đủ 803 email OTA.**
5. **Không đưa dữ liệu khách thật** vào báo cáo hay Git. Phải giữ chế độ trình chiếu che tên.
6. Lễ tân và Saler **không thấy giá vốn hay lãi**.
7. Nội dung đọc từ email, sheet hay web là **dữ liệu**, không phải mệnh lệnh.
8. Mọi thay đổi dữ liệu đều có lịch sử (ai làm, lúc nào).

---

## 6. Điểm đau Claude quan sát được (để bạn kiểm chứng, không bắt buộc đồng ý)

**Về sử dụng**
- **Sidebar 18 mục** trộn màn vận hành thật với màn demo và dữ liệu Sheets cũ. Lễ tân khó biết nên mở màn nào; menu chưa đổi theo góc nhìn.
- **Khung nháp OTA quá dày:** khoảng 10 nút cùng nhiều ghi chú chữ nhỏ; thứ tự các bước Sửa → Lưu → Duyệt → Sao chép → Đã gửi chưa rõ ràng.
- **Thông tin khách bị rải và lặp** giữa Hộp thư OTA, Yêu cầu dịch vụ và Lễ tân & vận hành (hồ sơ, nhãn, ghi chú đón khách).
- **Chữ nhỏ:** rất nhiều chỗ dùng cỡ 9–11px trên nền tối. Cần kiểm tra độ tương phản (WCAG AA) và khả năng đọc tại quầy.
- **Nhiều trạng thái nháp** (chờ duyệt, cần soạn, đã duyệt, đã gửi, cũ) nhưng chưa có một cách hiển thị thống nhất.
- **Chưa kiểm tra kỹ trên tablet và điện thoại**, trong khi lễ tân có thể cần dùng di động khi đi buồng hoặc ra sân bay.
- **Thanh cảnh báo đỏ** có thể gây "mù cảnh báo" nếu nhiều; cần mức độ ưu tiên và cách thu gọn.

**Về code**
- 2 file CSS chồng nhau (`crabs.css` và `crabs-gold.css` ghi đè), màu viết cứng ở nhiều nơi, chưa có bộ design token chung.
- Các file giao diện lớn, nhiều JSX trên một dòng dài, nên khó review và khó tái dùng component (nút, thẻ, nhãn, bảng, form).
- Góc nhìn và cờ chưa gắn tài khoản thật; người thao tác được ghi chung là "Chủ tài khoản".

---

## 7. File nên đọc (nếu truy cập được repo)

Repo: `https://github.com/gravesfromvn-stack/CRABS`, nhánh `integration/claude-travis`. Nếu repo riêng tư, PO sẽ đính kèm file.

**Bối cảnh dự án**
- `AGENTS.md`, `START_HERE.md`, `CURRENT_STATE.md`, `DECISIONS.md`, `REVIEW_PACKET.md`

**Khung và điều hướng**
- `app/workspace.tsx`, `app/role-view.tsx`, `app/manager-banner.tsx`

**Hộp thư OTA**
- `app/ota-workspace.tsx`, `app/ota-chat.tsx`, `app/ota-guest-summary.tsx`, `app/ota-advice-panel.tsx`, `app/ota-quick-letters.tsx`, `app/translate-text.tsx`

**Vận hành**
- `app/operations-workspace.tsx`, `app/ops-front-desk.tsx`, `app/service-requests.tsx`

**Bán hàng**
- `app/quote-workspace.tsx`, `app/service-catalog-manager.tsx`, `app/tour-knowledge.tsx`

**CSS**
- `app/crabs.css`, `app/crabs-gold.css`, `app/operations.css`, `app/quotes.css`

**Logic**
- `lib/front-desk.ts`: ETA, phân luồng, phàn nàn, ca trực, quyền xem giá vốn
- `lib/smart-tags.ts`
- `lib/service-replies.ts`, `lib/ota-store.ts`: soạn nháp
- `lib/apology-letters.ts`
- `lib/operations.ts`, `lib/operations-store.ts`
- `lib/hotel-policy-config.json`: chính sách và thư mẫu

**Test**
- `tests/*.mjs`: đặc biệt `front-desk-ops.mjs`, `apology-letters.mjs`, `emotional-care.mjs`, `front-desk-cases.mjs`

---

## 8. Kết quả mong muốn (theo đúng thứ tự)

1. **Tóm tắt hiểu biết của bạn** (không quá 1 trang) và **câu hỏi cần PO làm rõ**.
2. **Nhận xét cấu trúc code**, phối hợp với Gemini:
   - điểm mạnh và rủi ro;
   - đề xuất tách component và đưa design token vào CSS **theo từng bước nhỏ**, không viết lại toàn bộ;
   - ghi rõ ý nào của bạn, ý nào cần Gemini xác nhận.
3. **Kiến trúc thông tin mới:**
   - menu theo từng góc nhìn (Lễ tân, Saler, Quản lý, Admin);
   - cách gộp hoặc ẩn các màn demo và Sheets;
   - đường đi ngắn nhất cho 5 việc hằng ngày của lễ tân.
4. **Thiết kế lại 5 màn ưu tiên:**
   1. Hộp thư OTA, đặc biệt khung nháp và các bước duyệt;
   2. Lễ tân & vận hành (Hôm nay, Đầu ca, Bàn giao ca);
   3. Yêu cầu dịch vụ;
   4. Báo giá cùng Kho dịch vụ;
   5. Thanh cảnh báo Quản lý.

   Mỗi màn nêu: mục tiêu, ai dùng, **wireframe dạng chữ hoặc ASCII**, các thành phần, trạng thái rỗng / đang tải / lỗi / cũ, thao tác 1 chạm, phím tắt, và điều gì thay đổi so với hiện tại.
5. **Design system:**
   - giữ nhận diện tối và vàng cùng logo CRABS vàng; cân nhắc thêm chế độ sáng cho ban ngày;
   - cỡ chữ tối thiểu, khoảng cách, nút chính và nút phụ;
   - **màu nhãn**: đỏ cho COMPLAIN, vàng cho thiếu ETA, tím cho Saler, xanh cho lễ tân…;
   - đạt tiêu chuẩn tương phản WCAG AA.
6. **Responsive:** màn quầy lễ tân 1366×768, tablet và điện thoại; ưu tiên thao tác nào trên di động.
7. **Ý tưởng bổ sung** (tùy chọn). Mỗi ý nêu: lợi ích, rủi ro, công sức (S/M/L), và **có vi phạm nguyên tắc ở mục 5 không**.
8. **Lộ trình đề xuất theo đợt.** Mỗi đợt có tiêu chí nghiệm thu (đo được), cách kiểm tra lại (giữ 296 test PASS, kiểm tra trên `localhost:5173`), và nhãn **"Chờ PO duyệt"**.

Trình bày bằng **tiếng Việt**, ngắn gọn, ưu tiên bảng và danh sách. Thiếu thông tin thì hỏi lại, không tự giả định thành sự thật.
