# Cua dùng trang Báo giá để làm gì?

Bản local: http://127.0.0.1:5188/#quotes/demo-01

Báo giá dùng khi khách đang cân nhắc mua tour hoặc xe: mình trình bày phương án, quyền lợi, giá và điều kiện; kiểm tra lãi dự kiến; giữ lại đúng nội dung từng lần đã đề xuất. Câu hỏi nhận phòng, yêu cầu phòng yên tĩnh hoặc giờ đến không cần lập báo giá dịch vụ.

## Ví dụ cụ thể

Giả sử khách hỏi xe sân bay. Đây là **số minh họa**, không phải bảng giá đã được Luxe Paradise duyệt:

| Khoản | Số tiền | Ý nghĩa |
|---|---:|---|
| Giá khách trả | 350.000đ | Giá bán cho một xe/một chiều |
| Giá vốn | 260.000đ | Chi phí trả nhà xe |
| Hoa hồng | 20.000đ | Chi phí hoa hồng của giao dịch |
| Phí bổ sung | 10.000đ | Chi phí chưa nằm trong giá vốn |
| Lãi dự kiến | 60.000đ | 350.000 − 260.000 − 20.000 − 10.000 |

Khách xem phương án và tổng giá. Cua xem thêm các khoản nội bộ để quyết định giá đó có phù hợp không. Khi giảm giá 20.000đ, lãi dự kiến của ví dụ còn 40.000đ. Đây chưa phải lợi nhuận kế toán hoặc tiền đã thu.

## Cách dùng ngay trên localhost

1. Chọn đúng **hồ sơ Sheets/mẫu**; danh sách có tên, nhãn cơ sở và ngày đã ghi. Đọc nhu cầu và ghi chú trước khi hỏi thêm. Nếu thiếu số khách, bấm **Mở hồ sơ để đối chiếu / bổ sung**.
2. Bấm **Lập báo giá mới**, chọn tour/xe theo tên. Có thể ghép cả hai trong một báo giá. Kiểm tra ngày, số lượng, hành khách, nội dung/quyền lợi và điều kiện. Với xe, ngày đi/đến và giờ bay/giờ đón là các thông tin khác nhau.
3. Kiểm tra giá bán, vốn, hoa hồng, giảm giá, phí thêm. Giá/vốn/hoa hồng tính theo đơn vị; giảm giá và phí bổ sung tính cho toàn dòng. Không tính lại khoản đã nằm trong giá vốn.
4. Ghi phần còn thiếu nếu có, kiểm tra điều kiện và bấm **Lưu phiên bản nháp**. Nháp còn thiếu được giữ để tiếp tục; điều kiện duyệt sẽ báo những chỗ cần sửa.
5. Xem **Bản trình bày cho khách**: nội dung và quyền lợi trước, giá ở cuối. Mở phần **Giá vốn, hoa hồng & lãi dự kiến** để kiểm tra nội bộ, rồi bấm **Duyệt nội bộ bản mẫu**.
6. Nút **Copy bản mẫu đã duyệt** chỉ hoạt động với bản mới nhất, đã duyệt, còn hiệu lực và khớp phiên bản hồ sơ. Trước khi copy, ứng dụng đọc lại dữ liệu để kiểm tra. Bản copy luôn có nhãn **GIÁ GIẢ LẬP**, hiện dùng tiếng Việt; chưa tự dịch hoặc gửi cho khách.
7. Khách muốn đổi: bấm **Sửa → tạo phiên bản mới**. Nội dung phiên bản trước được giữ. Khách đồng ý: ghi rõ phương án/phiên bản đã đồng ý, kiểm tra nhà cung cấp và tạo việc trong **Lễ tân & vận hành** trên đúng hồ sơ nguồn. Bước chuyển này hiện làm thủ công.

Duyệt nội bộ ≠ khách đồng ý ≠ nhà cung cấp xác nhận ≠ đã thu tiền ≠ đã thực hiện. Hiện trang chỉ lưu trạng thái nháp/đã duyệt, không lưu đầy đủ các trạng thái còn lại. Bản trình bày được ghép từ phiên bản đã lưu, không phải một câu trả lời do AI vừa tạo.

## Cua cần bổ sung gì?

Ưu tiên chốt một nhóm nhỏ dịch vụ thật để hoàn thiện quy trình: xe đón/tiễn và một tour thường bán. Không cần nhập lại mọi dữ liệu khách đang có.

| Nhóm | Dữ liệu cần xác minh/bổ sung | Dùng để |
|---|---|---|
| Giá hiện hành | Dịch vụ, cơ sở áp dụng, đơn vị tính, giá vốn, giá bán, hoa hồng, hiệu lực, nguồn và người duyệt | Thay các giá mẫu bằng bảng giá có căn cứ |
| Nội dung & quyền lợi | Lịch trình, thời lượng, bao gồm/chưa gồm, điểm/giờ đón, giới hạn người/hành lý, trẻ em, phụ thu | Khách hiểu đúng thứ mình mua |
| Điều kiện | Đặt cọc, thời hạn xác nhận, đổi ngày, hủy, chờ thêm, hoàn tiền và trách nhiệm mỗi bên | Tránh hứa điều chưa được thống nhất |
| Nhà cung cấp & quyết định | Đầu mối xác nhận, ai được giảm giá, giới hạn giảm, ai duyệt và ai điều phối | Nhân viên biết hỏi ai và làm gì tiếp |

Bảng giá/điều kiện cũ đã đọc từ Sheets cần kiểm tra hiệu lực, không tự coi là giá đang bán. Nếu tài liệu đã có, ưu tiên đối chiếu lại đúng nguồn thay vì yêu cầu Cua soạn từ đầu.

## Giới hạn hiện tại

- 7 sản phẩm giả lập: 5 tour và 2 xe. Chưa có danh mục spa hoặc toàn bộ dịch vụ thực tế, cũng chưa có màn hình quản lý bảng giá/nhà cung cấp chính thức.
- Trang báo giá dùng `contacts` từ Sheets/mẫu. 803 email OTA của bản local nằm ở nguồn riêng; chưa nối OTA booking sang báo giá. Chưa gộp theo tên khách, chưa tự hỏi lại thông tin hoặc chép khách OTA vào hồ sơ mẫu.
- Chưa tự chuyển khách chấp nhận thành đơn dịch vụ, tạo lịch thực hiện, ghi cọc, thu/hoàn tiền hoặc đặt chỗ với nhà cung cấp.
- Bản copy loại các trường vốn/hoa hồng/lãi/nhà cung cấp và toàn bộ hồ sơ khỏi phần tự ghép. Các ô nội dung và điều kiện do người dùng nhập vẫn được đưa nguyên vào bản trình bày: cần đọc lại để tránh đặt ghi chú nội bộ vào các ô này.
- Ở localhost có một báo giá cho **Linh Nguyễn · mẫu**, nội dung ghi **KIỂM THỬ LOCAL**, để Cua xem cách lưu/duyệt/copy. Không có tin gửi ra OTA hoặc thay đổi bản online.

## Ghi chú bàn giao triển khai — 18/10/2026

Thay đổi trên nhánh riêng `travis/daily-operation`, sau commit `1bce353`; không sửa cây làm việc Claude. Chỉ UI và helper trình bày/default, không sửa API/schema/calculation hiện có. Thời hạn báo giá mới mặc định hai ngày từ ngày hiện tại; đây là giá trị để người dùng sửa, không phải chính sách kinh doanh đã được phê duyệt. Giá mẫu vẫn có hạn hiệu lực riêng, không tự gia hạn.

Đã chạy: `tests/quote-presentation.mjs` 6 checks và `tests/quotes.mjs` 14 checks trên dữ liệu thử riêng; TypeScript và build. Test helper kiểm tra ngày xe đúng chiều, kỳ hạn qua năm, nội dung trước giá, không tự lộ trường tài chính và chặn copy bản cũ/nháp/hết hạn/hồ sơ đổi. Test API xác nhận tính tiền, lịch sử và kiểm soát truy cập hiện có vẫn hoạt động. Không phải kiểm chứng thương mại, AI hoặc luồng đặt dịch vụ live.
