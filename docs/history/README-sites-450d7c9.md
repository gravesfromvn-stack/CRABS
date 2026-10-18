## Bản 0.11 — The Crabs / Hộp thư OTA

Logo gốc do Cua cung cấp; giao diện mực đen, trắng và nền giấy, nhóm chức năng Vận hành / Kiến thức / Dữ liệu demo. Hộp thư OTA là trang mặc định. Các màn hình luyện tập và dữ liệu ẩn danh từ Sheets vẫn riêng biệt.

### Luồng nhận thư

Make scenario 6661902 (https://us2.make.com/2880792/scenarios/6661902): Gmail Watch → đọc toàn bộ MIME bằng Gmail API → JSON → POST /api/ota/ingest. Hộp thư paradisesuitespht@gmail.com đã xác minh bằng Gmail profile của kết nối hiện có. Bộ lọc giới hạn 30 ngày gần nhất từ domain Booking.com, Agoda, Expedia, Trip/Ctrip; không đánh dấu đã đọc. Lịch cấu hình mỗi 15 phút. Luồng theo dõi cần lưu điểm bắt đầu From now trong Make. API cấu hình đã trả về cursor nhưng đọc lại không giữ giá trị; đã sửa bằng cách lưu From now on trực tiếp trên giao diện Make, bật lại và kiểm tra một lượt không lấy lại lịch sử. UI chỉ báo bật khi biến CRABS_POLLING_ENABLED=true được đặt sau kiểm chứng. Đợt lịch sử dùng scenario 6662351 với danh sách Gmail API đã phân trang, nhập qua scenario riêng theo yêu cầu, không dựa vào All của polling trigger. Crabs kiểm tra lại cửa sổ 30 ngày và domain OTA ở đầu nhận, độc lập với Make. Migration 0005 hoàn tác các bản sao ngoài phạm vi của lần thử polling đầu tiên.

Đích Site giữ quyền riêng tư chỉ chủ sở hữu. Make gửi service bearer qua OAI-Sites-Authorization và khóa riêng qua X-Crabs-Ingest-Key. Biến bí mật CRABS_INGEST_TOKEN đặt trong Sites; không lưu giá trị trong mã. POST /api/ota connect lấy owner từ danh tính đăng nhập để gắn hộp thư; intake không nhận owner từ payload. Make giữ execution lỗi và thử HTTP lại tối đa 3 lần, cách 2 phút; chạy tuần tự. Cần xử lý execution lỗi tồn đọng nếu nó chặn lượt sau. Không có module gửi trả lời khách.

### Ghép và duyệt

Migration 0004 thêm 5 bảng ota_* độc lập với dữ liệu demo. Khóa hội thoại gồm cơ sở + OTA + mã booking. Không ghép bằng tên khách, không ghép với hồ sơ demo ẩn danh. Mỗi Gmail ID chỉ nhập một lần; gửi lại cùng payload an toàn. Lưu thư gốc dạng chữ và phần lời khách riêng; không chạy HTML. Dấu xác thực DMARC phù hợp domain từ Gmail bắt buộc để tự ghép. Generic Premium Hotel chưa đủ bằng chứng là 75PHT. Thiếu mã, cơ sở, nội dung hoặc dấu xác thực đưa vào danh sách đối chiếu; nhân viên phải xác nhận nguồn và booking trước khi ghép. Thông báo hệ thống và nhắc việc không tự tạo nháp.

Nháp mới dùng các quy tắc hạn chế cho yêu cầu phòng, giờ đến, xe sân bay, Ninh Bình, thay đổi/hủy và mong muốn trao đổi khi đến. Không dùng mô hình AI ở bước này; không suy diễn rằng mọi tình huống đều hiểu được. Nhu cầu chưa nhận diện để nháp trống cần người soạn. Chưa đọc file đính kèm và chưa tra tồn phòng/giá nhà cung cấp. Người duyệt xem toàn bộ lịch sử và lời khách gốc. Mẫu không hỏi lại thông tin; không tự xác nhận giá, phòng, tour, xe. Tin mới làm bản duyệt cũ hết hiệu lực. Mỗi lần sửa giữ phiên bản trước. Duyệt → sao chép → tự gửi ở OTA; chỉ ghi nhận đã gửi khi Cua xác nhận và lưu nội dung thực tế. Sao chép không đồng nghĩa đã gửi.

### Kiểm chứng

25 kiểm thử parser/API/D1 bao phủ MIME, ghép cơ sở, tin giả/thiếu thông tin, nhập trùng, cách ly tài khoản, duyệt, lịch sử phiên bản, tin mới và xác nhận gửi thủ công. Đã đối chiếu parser với 6 email thực tế được đọc trước đó, không đưa fixture riêng tư vào repository. Fixture giao diện chỉ dùng khách kiểm thử trên máy. Cần phân biệt số email nhập, hội thoại và nháp; không cộng các số này thành số khách.

Hotel Link chưa kết nối; Sheets chưa đồng bộ hai chiều. Việc email chứa thiếu nội dung vẫn cần mở OTA để đọc. Các phần bên dưới mô tả lịch sử các phiên bản trước.

---

# Crabs CRM — tên trước đây: TourFlow

## Bản 0.10 — tên Crabs và sao chép phản hồi đã duyệt · 17/10/2026

Tên ứng dụng, tiêu đề trình duyệt và tên tệp xuất đổi sang Crabs. Giữ nguyên URL, project ID, database, khóa nhận diện dữ liệu và tài liệu bàn giao lịch sử. Hộp thư có nút sao chép phiên bản đã duyệt; trước khi sao chép, đọc lại trạng thái từ máy chủ và kiểm tra phiên bản/nội dung/dữ kiện còn khớp. Không tự ghi nhận đã gửi, không gọi API gửi tin ra OTA.

Hướng vận hành đã chọn: dữ liệu đặt phòng qua Hotel Link khi được cấp quyền; lời khách từ email OTA có nội dung; nhân viên rà nháp và tự gửi trong OTA. Kết nối Hotel Link, nhập email liên tục, mô hình AI và xác nhận gửi bên ngoài chưa được triển khai ở bản này. Nội dung thiếu hoặc chỉ có thông báo cần mở OTA để bổ sung; không đoán lời khách. Ghép hồ sơ cần cơ sở + OTA + mã booking; không ghép theo tên đơn thuần. Mẫu email đọc để khảo sát không được thêm vào dữ liệu demo phát hành.

## Hiện hành: hồ sơ và hội thoại từ Sheets · 15/10/2026

Mặc định mở **Hồ sơ từ Sheets**, với 151 booking đã ẩn danh, 58 hồ sơ có nội dung trao đổi và 76 dòng dịch vụ tháng 10 (32 xe, 16 tour, 20 spa, 8 giặt là). Đây là bản đọc từ sáu nguồn, chưa có đồng bộ tự động hoặc ghi ngược Google Sheets. Dữ liệu có nhiều cơ sở: không coi 151 booking là khách xác định thuộc 75PHT.

Mỗi hồ sơ có trích hội thoại đã ẩn danh, nháp lịch sử, tóm tắt AI cũ có nhãn chưa kiểm chứng, đường dẫn đúng dòng nguồn và các điểm cần đối chiếu. Bốn dòng xe khớp mã booking được liên kết; các dịch vụ thiếu khóa giữ độc lập. Ô trống và giá vốn chưa biết không được đổi thành số 0. Giá giao dịch lịch sử không tự thành bảng giá bán mới.

Chín tình huống đã có đề xuất rà soát: Hà Giang 3D2N, xe đón, xe tiễn, khách rút yêu cầu xe, cũi/phòng gần nhau, đến lúc 03:00 với đêm trước đã đặt, hồ sơ lẫn trả lời khách khác, booking nâng hạng/bể bơi, và ngày đến mâu thuẫn. Đề xuất đưa nội dung/quyền lợi trước, xác nhận phương án sau và giá cuối. Các hồ sơ khác dùng lời khách cùng nháp nguồn để nhân viên soạn; chưa tự động hiểu mọi tình huống. Khi có tin mới hoặc sửa hồ sơ, đề xuất chuẩn bị sẵn được để trống để rà lại.

Import chỉ thêm hồ sơ/tin còn thiếu, không ghi đè chỉnh sửa hoặc nháp có sẵn. Nháp mới được lưu riêng, chưa duyệt và không gửi khách. Tên, liên hệ, mã booking gốc không được đưa vào dữ liệu phát hành. Nguồn thô ở thư mục work bị Git bỏ qua; chỉ snapshot đã xử lý được đưa vào ứng dụng. Build không cần quyền truy cập Sheets.

Hai mươi hồ sơ luyện tập, kho tham chiếu tổng hợp cũ và bảy sản phẩm báo giá minh họa vẫn giữ riêng, không biến thành giao dịch thật. Các phần bên dưới ghi lại lịch sử phiên bản.

## Lịch sử bản nền 0.1

Dự án cá nhân chuẩn bị thuyết trình ứng tuyển kinh doanh/phân phối tour ngày 21/10/2026. Mọi hồ sơ, giá, đối tác và tin nhắn đều giả lập.

## Phạm vi đã xây

- 20 khách độc lập với booking; tạo và sửa hồ sơ, nguồn giới thiệu, người phụ trách mẫu, hạn chăm sóc.
- Hộp thư mô phỏng: thêm tin khách hoặc phản hồi, tìm kiếm và lịch sử. Không gửi WhatsApp.
- D1 riêng lưu hồ sơ, tin nhắn, nhật ký; dữ liệu tách theo danh tính Sites.
- Danh mục cố định gồm 5 tour, 2 chiều xe, 3 nhà cung cấp và 2 nguồn đối tác.
- Giá bán, giá vốn, hoa hồng và điều kiện mẫu; chi tiết ghi rõ chỗ chưa kiểm tra.
- Ba kịch bản thực hành, xuất JSON và khôi phục dữ liệu demo có xác nhận.

## Chưa triển khai

Báo giá có phiên bản, đơn dịch vụ, xác nhận nhà cung cấp, tiền thu, AI, WhatsApp Cloud API, Make, đồng bộ bảng tính và phân quyền nhiều nhân viên. Tên người phụ trách chỉ là dữ liệu minh họa. Đây chưa phải sản phẩm đủ dùng trong vận hành thực tế.

## Quyết định nghiệp vụ cần người dùng rà soát

1. Ba vấn đề đề xuất: bỏ sót khách; báo giá không nhất quán; hứa dịch vụ trước khi nhà cung cấp xác nhận.
2. Năm tour mẫu: Hà Nội, Ninh Bình, Hạ Long, Sa Pa, ẩm thực phố cổ; hai dịch vụ xe một chiều.
3. Giá trên mỗi khách lớn hoặc mỗi xe/chiều; trẻ em hỏi giá riêng. Giá minh họa không lấy từ thị trường hay hợp đồng khách sạn.
4. Lãi minh họa = giá bán - giá vốn - hoa hồng, chưa có các chi phí khác.

## Phát triển

Node 22.13+, starter Vinext và Sites. Chạy installer/build theo plugin Sites. Schema `db/schema.ts`, migration Drizzle. Dữ liệu mẫu `lib/demo-data.ts`, API `app/api/workspace/route.ts`.

GET/POST yêu cầu danh tính ChatGPT. POST kiểm tra Origin và dữ liệu bằng Zod. Cập nhật hồ sơ có phiên bản để phát hiện sửa đồng thời. Tin nhắn có ID chống tạo trùng khi gửi lại cùng yêu cầu. Bản đầu chỉ dùng trong Site riêng tư.

Không cấu hình các biến Make/AI cũ hoặc đọc dữ liệu khách sạn cũ. Không cần API key để chạy bản nền.

## Tiêu chí nghiệm thu bước nền

- Tạo khách không có booking, nhập tin, sửa phân công và hạn chăm sóc; tải lại vẫn còn.
- Yêu cầu không đăng nhập / khác origin / đầu vào sai bị từ chối.
- Cập nhật phiên bản cũ bị từ chối; cùng ID tin chỉ lưu một lần.
- Khôi phục trả về 20 khách, không ảnh hưởng database khác.
- Danh mục có đúng 5 tour, 2 xe; các tình huống gắn đúng hồ sơ mẫu.

Tình trạng chạy kiểm thử thực tế được ghi ở `VALIDATION.md` sau khi hoàn tất.


## Reference library — 14 October 2026

The reference library retains 151 synthetic profiles generated from aggregate OTA/channel and booking-status counts (141 confirmed, 10 cancelled). No individual guest mapping, names, contact details, booking codes, original messages or real stay dates are retained. Room categories, family sizes, dates and needs are newly generated demo assumptions.

28 itinerary proposals and 161 historical website listings are retained as draft references, including source dates and URLs when present. Historical listed prices are not approved selling prices, supplier net costs or confirmed availability.

The 0.3 audit reads cell values across all 57 tabs of eight primary workbooks. lib/source-audit.json records finite ranges, non-empty row counts, 18 discovered backup/QA files, nine inspected Make structures and limits. Source counts overlap: 151 Guest Master bookings, 362 OTA events, 43 visible FO bookings, 22 review rows and 450 multi-property stored records must not be added together. FO contains both real Gmail-derived booking views and explicitly synthetic operational/SOP screens. No raw guest or transaction records are retained in the audit JSON.

lib/knowledge-data.json adds 28 duration outlines, 63 itinerary-day records for the 14/21/28-day programs, 22 historical advisory rules, 48 source links, six rewritten message templates, three sample SOP descriptions and summaries of two PDF brochures. Search/filter, template copying, itinerary selection and expandable source inventories are available in the reference screen. Export combines all three JSON files. These remain historical references requiring approval and revalidation before real sales; no source website or supplier availability was revalidated in this audit.

Selecting a reference profile creates a synthetic CRM contact using the existing authenticated owner-scoped API. Existing contacts and messages remain unchanged on deployment. The original 20-contact reset dataset and seven practice products are unchanged. No Make or WhatsApp connection is added.

## Bản 0.4 — Báo giá có phiên bản & phân tích 75PHT

Hộp thư → hồ sơ khách → **Lập báo giá tour & xe**, hoặc mục **Báo giá**. Thêm nhiều dòng từ 7 dịch vụ giả lập. Tour theo khách lớn, xe theo xe/chiều, mỗi dòng có ngày riêng. Chi phí bổ sung/giảm giá tính toàn dòng; giá bán, vốn và hoa hồng tính theo đơn vị. Lưu nháp → kiểm tra → chủ tài khoản duyệt demo. Mỗi lần sửa tạo phiên bản tiếp theo, kể cả nháp, giữ nguyên bản trước. Hồ sơ đổi phiên bản thì chặn duyệt và yêu cầu xem lại. Duyệt không xác nhận chỗ, không ghi doanh thu hay thu tiền. Trẻ em cần ghi cách tính riêng, không tự lấy giá người lớn.

D1 migration 0001 chỉ thêm `quotes` và `quote_versions`. Không thay/xóa bảng khách. Các API đều dùng danh tính Site và khóa owner. Các thao tác ghi có điều kiện phiên bản trong batch, chống ghi đè và lưu lặp.

**Phân tích 75PHT** hiển thị ảnh chụp lịch sử đã tổng hợp, không có hồ sơ khách thật: lọc cơ sở theo mã/nhãn đã đối chiếu; hợp nhất mã booking theo kênh và mã thay thế; tách sự kiện OTA, booking, dịch vụ, backup, nhóm chưa rõ. Số booking là số khóa trong các nguồn đã đọc, không phải số người. Tổng tiền chỉ là tổng ô số trên sổ, chưa đối soát thu tiền; tổng nhóm dưới 5 dòng được ẩn. Không dùng giá lịch sử để tạo báo giá. Xuất JSON phân tích/kiểm kê ngay trong giao diện; export tham chiếu có cả phần phân tích. Dữ liệu CRM và báo giá đang có được giữ riêng trong database theo tài khoản.

`lib/analysis-data.json` chứa số liệu nhóm và kiểm kê đã khử nhận diện; không chứa mã booking gốc, điện thoại, email, khách thật, hội thoại thật hay ánh xạ. Phần kiểm kê gốc 0.3 được giữ và gắn nhãn lịch sử, phần Phân tích là nguồn kiểm kê mới nhất. Kho 151 hồ sơ luyện tập cũ là dựng mẫu theo nguồn đa cơ sở, không phải 151 khách xác định thuộc 75PHT.

## Bản 0.5 — Khoảng trống nguồn được đối chiếu

Mở **Phân tích 75PHT → Rà soát 15/10** (tab mặc định). JSON xuất bao gồm kiểm kê từng nguồn, cửa sổ Gmail, đếm nhóm thư và khớp sự kiện, lý do không đọc thêm revision/ảnh Welcome, và phần PDF/ảnh chưa kiểm chứng. Nội dung thuyết trình không có danh tính, mã thư, mã booking thật, chứng từ hay thư gốc. Không đổi bảng DB; không chạy Make hoặc gửi tin.

Phân tích dùng quy tắc cơ sở chặt hơn 0.4. Nhãn Premium/Premier thiếu mã/địa chỉ chỉ là ứng viên, dù Cua từng xác nhận thương hiệu tại 75PHT; từng dòng vẫn cần bằng chứng cơ sở. Số khóa đủ bằng chứng 47 thay cho 80 ở 0.4 là điều chỉnh phạm vi, không xóa dữ liệu CRM. Tổng hợp tài chính cũ vẫn chỉ là số ghi trên sổ, không lấy PDF preview để bổ sung tiền thu. Kiểm kê 26 bảng/212 tab giữ mốc đọc 14/10; phần 15/10 ghi các vùng thực sự đọc lại, không tuyên bố quét lại toàn bộ.


## Bản 0.7 — Luxe Paradise, tư vấn chủ động và duyệt nháp

Theo chỉ đạo 15/10, bối cảnh mặc định là Luxe Paradise / 75PHT; thông tin Theodore giữ làm tài liệu tham khảo, không áp chính sách đó cho Luxe. Không đổi các hồ sơ hiện có hoặc nguồn gốc dữ liệu.

Hộp thư có đề xuất theo kho mẫu: nội dung tour → quyền lợi dự kiến → chọn/xác nhận phương án → bổ sung dữ kiện còn thiếu → báo giá. Các nhánh đang có: 5 tour, xe đón/tiễn, gia đình, yêu cầu ăn uống, đổi lịch, hủy/hoàn và khiếu nại. Đây là ghép nội dung theo quy tắc, chưa phải mô hình AI hiểu mọi cách diễn đạt. Kho gốc gồm 83 mẫu gửi khách và 1 mẫu nội bộ có thể tra cứu; không tự coi toàn bộ mẫu là đã được duyệt hoặc tự điền được mọi tình huống.

Bản nháp có nguồn mẫu, dữ kiện đã biết, cảnh báo duyệt, lịch sử phiên bản. Lưu tạo phiên bản mới; duyệt chỉ đánh dấu nội dung, không tạo tin gửi đi, xác nhận nhà cung cấp, đơn hoặc thu tiền. Thay đổi hồ sơ/tin làm cảnh báo bản cũ; máy chủ từ chối duyệt khi dữ kiện thay đổi. Migrations 0003 chỉ thêm bảng reply_drafts; không sửa/xóa dữ liệu cũ. Export workspace gồm lịch sử nháp; reset demo được xác nhận riêng sẽ xóa nháp trong phạm vi tài khoản như hội thoại.

Kho trả lời & nguồn (#templates) chứa tóm tắt nguồn đã đọc và danh sách cần bổ sung. Giá/ưu đãi/chính sách lịch sử được gắn nhãn cần duyệt; nội dung quyền lợi trong đề xuất là phương án minh họa, không phải hợp đồng nhà cung cấp.


## OTA reconciliation

`/ota-review` retains per-email evidence, previous matching state and candidate replies. Authenticated same-origin imports can only resolve held emails with unchanged source, preserve the original email, and never approve or send. Holds keep their candidate draft outside booking threads. Thread draft import requires the exact reviewed event set and preserves staff edits. Operation IDs make retries idempotent. Private reconciliation payloads stay in ignored `work/`; customer data is not bundled in source. Booking property 16856467 is mapped to 75PHT only with the matching LP property label and Booking envelope link; ambiguous Premium labels remain held.
