# Lễ tân & vận hành — bản local riêng

> Bản tích hợp (18/10/2026): dùng http://localhost:5173 trong CRABS-Claude, nhánh integration/claude-travis. Địa chỉ cổng 5188 dưới đây là bản riêng của Travis với database riêng. Xem docs/INTEGRATED_LOCAL.md.

Ngày bàn giao: 18/10/2026. Nhánh `travis/daily-operation`, nền mã `0ca901b`.

Mở **http://127.0.0.1:5188/#reception**. Mặc định là Daily Operation → Hôm nay, ngày Việt Nam, cơ sở 75 Phạm Hồng Thái và nguồn email OTA.

## Cua dùng thế nào?

| Màn hình | Việc lễ tân làm được |
|---|---|
| Hôm nay | Xem công việc đến hạn, quá hạn, chưa hẹn hoặc có nguồn mới; xem khách dự kiến đến/đi theo ngày lưu trú. Mỗi phiếu ghi bước tiếp theo và người phụ trách. |
| Lịch dịch vụ | Xem ngày, giờ thực hiện/đón khách và trạng thái xác nhận; tìm các phiếu chưa có ngày để bổ sung. |
| Hồ sơ khách | Tìm tên/mã booking, chọn đúng cơ sở và nguồn, đọc yêu cầu cùng lời khách gốc, mở hội thoại liên quan và tạo công việc. |
| Bàn giao ca | Xem việc còn mở; ghi ca nhận, người nhận và nội dung; lưu thời điểm bàn giao và ghi nhận tiếp nhận. |

### Thử một công việc

1. Vào **Hồ sơ khách**, chọn cơ sở, tìm booking rồi bấm vào khách.
2. Đọc tóm tắt và **Đọc lời khách / hội thoại nguồn**. Các câu xin nhận phòng sớm là yêu cầu chưa xác nhận đáp ứng.
3. Bấm **Tạo việc**. Chọn xe đón, xe tiễn, tour, spa, yêu cầu phòng hoặc việc lưu trú; ghi người phụ trách, hạn xử lý, ngày/giờ thực hiện.
4. Ghi riêng lựa chọn của khách và xác nhận của nhà cung cấp/bộ phận phòng, kèm căn cứ. Duyệt nháp trả lời không được coi là khách đã đặt dịch vụ.
5. Bấm **Lưu công việc**. Phiếu này được dùng chung tại Hôm nay, Lịch dịch vụ, Hồ sơ khách và Bàn giao ca.
6. Khi thực hiện xong, mở phiếu, ghi kết quả rồi đổi trạng thái. Dịch vụ xe/tour/spa cần khách đồng ý và nhà cung cấp xác nhận; yêu cầu phòng cần bộ phận phòng xác nhận. Hoàn tất việc không đồng nghĩa đã thu tiền.
7. Cuối ca mở **Bàn giao ca**, ghi phần cần tiếp tục rồi lưu. Nhãn người nhận hiện chỉ là thông tin ghi chú; chưa gửi thông báo hoặc giao quyền tài khoản.

Trên màn hình hẹp, chọn khách/việc sẽ cuộn đến phần chi tiết. Nút **Về danh sách** đưa về danh sách đang xem.

**Khi khách trả lời thêm:** bấm **Tải lại vận hành** để đọc nguồn trong database của bản này. Phiếu liên quan có nhãn **Có tin mới**; đọc lại lời khách và đánh dấu đã đối chiếu trước khi lưu. Khi thay đổi lịch hoặc có nguồn mới, không thể giữ nguyên căn cứ nhà cung cấp rồi coi là đã xác nhận lại. Không tự tạo phiếu thứ hai, sửa nháp OTA hoặc gửi tin.

## Dữ liệu và giới hạn

- Bản sao tĩnh được nhập từ bộ 803 email đã ẩn danh được Cua cho phép trước đó: 215 luồng hội thoại, 383 phiên bản nháp, 89 lượt duyệt, 0 ghi nhận gửi. Giữ nguyên liên kết booking/cơ sở/lịch sử. Các số này không phải số khách độc nhất hoặc số việc lễ tân cần làm.
- Tại lần kiểm tra: nguồn OTA có 55 hồ sơ luồng tại 75PHT và 160 tại Suites; 4 email cần đối chiếu chưa đưa vào lịch khách. Ngày đến/đi là lịch dự kiến từ nguồn, không phải trạng thái phòng hoặc check-in/out thực tế.
- Hồ sơ Sheets/mẫu đọc từ nguồn riêng. Chưa tự gộp OTA và Sheets thành một khách; không ghép chỉ theo tên. Yêu cầu lễ tân cũ vẫn mở được ở hồ sơ nguồn, không tự nhân đôi thành phiếu vận hành.
- Dữ liệu này không tự nhận thư mới từ Make hoặc từ localhost của Claude. Không có khóa AI trong luồng vận hành mới; tóm tắt được đọc theo quy tắc hiện có và giữ lời khách để đối chiếu.
- Chưa có tài khoản/phân quyền nhân viên, xác nhận điện tử của nhà cung cấp, gửi thông báo, thanh toán/hoàn tiền, tự chuyển báo giá được khách chấp nhận thành đơn dịch vụ hoặc đồng bộ Hotel Link/PMS.
- Hiện có một phiếu và một bàn giao mang nhãn **Kiểm thử local** để Cua xem cách hoạt động; không phải chỉ thị thực hiện ở khách sạn.

## Chạy và lưu trữ

Thư mục riêng trên máy Cua:

```text
C:\Users\Captain Cua\.codex\.chatgpt-projects\g-p-6aba58c2fcd8819193ce49060c093363\work\crabs-daily-operation
```

Mở terminal tại đúng thư mục trên, dùng Node 22 x64 đã cài:

```powershell
node scripts/dev-operations.mjs
```

Nếu `node` chưa có trong PATH của terminal:

```powershell
& "$env:LOCALAPPDATA\Programs\nodejs\node-v22.23.3-win-x64\node.exe" scripts/dev-operations.mjs
```

Đóng terminal/dừng tiến trình sẽ dừng trang; dữ liệu vẫn nằm tại `.wrangler/state`. Migrations local đã được áp dụng cho bản này. Với bản sao mới, `npm run db:local:migrate` phải chạy tại đúng thư mục, dùng cấu hình placeholder local; không dùng database sản xuất. Không chạy lại script nhập 803 email vào database đã có dữ liệu.

## Bàn giao kỹ thuật cho Claude / Travis

- Checkout riêng, branch riêng, node_modules riêng, local D1 riêng, cổng 5188; không sửa cây làm việc `Documents/CRABS-Claude` đang ở nhánh `claude/local-setup`/cổng 5173.
- Base chỉ gồm commit `0ca901b`; không chứa các thay đổi mẫu trả lời chưa commit của Claude. Không push, merge, triển khai Sites, đổi Make hoặc di chuyển database nguồn trong lượt này.
- Module riêng: `app/operations-workspace.tsx`, `app/operations.css`, `lib/operations.ts`, `lib/operations-store.ts`, `app/api/operations/route.ts`, `db/operations-schema.ts`, `drizzle/0010_daily_operations.sql`.
- Điểm tích hợp: `app/workspace.tsx` đổi nhãn/màn hình reception và mặc định; `drizzle.config.ts` thêm schema riêng. Không sửa `lib/ota-profile.ts`, `lib/ota-store.ts`, `db/schema.ts`, routes OTA hay templates của Claude.
- Migration 0010 tạo `ops_tasks`, `ops_history`, `ops_handoffs`; không thay bảng hiện có. Cố ý để trống 0008/0009 cho công việc song song. Wrangler đã áp dụng SQL local; chưa bổ sung metadata snapshot/journal cho Drizzle generate. Khi hợp nhất cần rà chuỗi migration và metadata trước khi generate hoặc migrate, không chạy generate mù trên nhánh này.
- GET operations chỉ đọc. POST dùng owner + same-origin, kiểm tra version, khóa nguồn theo booking/cơ sở, mã thao tác chống lặp và batch atomic cho phiếu/lịch sử. Lưu lịch sử payload; UI hiện danh sách lượt thay đổi, chưa có màn hình so sánh/khôi phục từng phiên bản.
- Kiểm tra nguồn thay đổi hiện dùng nội dung/số tin nguồn, không có cập nhật thời gian thực hoặc xử lý mất liên kết tự động. Phiếu phải được tạo có chủ đích từ hồ sơ; chưa tự tạo dịch vụ từ câu khách đồng ý.
- Snapshot đã ẩn danh vẫn là dữ liệu riêng tư: database, `private-data/`, `work/`, environment và caches đều bị Git ignore. Không đưa corpus hoặc database lên GitHub.

## Kiểm chứng đã chạy

Môi trường: Windows ARM64, Node 22.23.3 x64; Miniflare D1 tạm cho tests và database riêng cho UI. Không thử trên bản online.

- `node tests/operations.mjs`: **15 kiểm tra đạt** — phân biệt cơ sở/booking, GET chỉ đọc, yêu cầu nhận phòng, auth/origin, lặp thao tác, cập nhật đồng thời, sửa lịch/nguồn cần đối chiếu, xác nhận, hoàn tất, bàn giao và cô lập chủ sở hữu.
- `node tests/reception.mjs`: **6 kiểm tra đạt** — tương thích nghiệp vụ lễ tân cũ.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: đạt.
- `node scripts/run-framework.mjs build`: đạt; cảnh báo gói client vượt 500 kB còn tồn tại.
- UI: bốn tab, lọc cơ sở, đọc nguồn, tạo/sửa phiếu, nhập ngày, hiển thị cùng phiếu trong lịch, lưu/tiếp nhận bàn giao, tải lại trang vẫn giữ phiếu và bàn giao; đã kiểm tra tại chiều rộng cửa sổ hẹp.
- Chưa chạy lại toàn bộ suite nền hoặc `tests/local-flow.mjs`; chưa UAT với nhân viên, AI thật, nhiều tài khoản hoặc dữ liệu live. Các kết quả cũ 131 checks không phải kết quả mới của nhánh này.

Khi hợp nhất sau review: lấy commit/patch mã và migration có kiểm soát; không chép đè database hoặc cây làm việc Claude. Rà xung đột ở workspace/router, schema/migrations và phần nguồn tóm tắt, rồi chạy lại các bộ test liên quan trên database thử mới.
