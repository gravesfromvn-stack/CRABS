# Bảng nguồn giá và phần cần Cua xác nhận

Đọc ngày 18/10/2026. Áp dụng cho bản local riêng tại http://127.0.0.1:5188/#quotes/demo-01. Đây là dữ liệu tham khảo từ hệ thống 75PHT; chưa có mức nào được chứng minh là bảng giá hiện hành đã duyệt. Ngày cập nhật file/ngày đọc không phải ngày hiệu lực.

## Cách dùng trong CRM

1. Mở Báo giá → Kho giá & điều kiện 75PHT.
2. Chọn nhóm nguồn, tìm dịch vụ, mở “Xem nội dung, nguồn & phần còn thiếu”.
3. Bấm “Đưa vào nháp”. Dùng lại ngày/số người đã biết trong hồ sơ. Giá bán, vốn và hoa hồng chưa xác nhận để trống, không biến thành 0đ.
4. Lưu nháp: giữ bản chụp nguồn, ngày đọc, đơn vị, tiền tệ, mức tiền gốc và phần còn thiếu theo phiên bản.
5. Cua xác nhận các mục bên dưới trước khi chuyển thành bảng giá áp dụng. Hiện chưa có màn hình phê duyệt danh mục giá; ô kiểm tra trên báo giá không mở khóa nguồn chưa xác nhận. Duyệt/copy bị chặn ở cả giao diện và máy chủ.

## Nguồn đã đưa vào

| Nhóm | Số mục | Ý nghĩa |
|---|---:|---|
| Giao dịch tour/xe liên tỉnh tháng 10 |17| Có mức bán và giá HĐ trong dòng ghi sổ, không chứng minh đã thu tiền/hoàn thành |
| Mức xe sân bay tháng 9–10 |10| Giữ riêng chiều, loại xe và mức tiền; không suy ra giá chuẩn |
| Lịch trình đề xuất |28| Draft, giá VND/nhà cung cấp đang trống |
| Sản phẩm TheSinhTour lưu trong Sheets |161|159 có số tiền; TST-028 và TST-036 chưa có giá; tất cả cần xác minh |
| Giá từ USD trong mẫu WhatsApp |7|Giữ USD, “from” và “++”; không quy đổi hoặc áp combo |

Tổng 223 mục tham khảo, không phải 223 sản phẩm đã duyệt hay 223 giá khác nhau. Có 22 lưu ý tư vấn Draft và 5 dòng ngoại lệ xe không đưa thành mức giá. Không nhập tên khách, số điện thoại hoặc mã booking vào kho giá.

## Các mức xe sân bay tìm thấy

| Chiều / xe | Số tiền trong nguồn | Nguồn mẫu |
|---|---:|---|
| Tiễn khách sạn → Nội Bài · xe 4 chỗ | 300.000 ₫ | [Tháng 10.2026 D3:G3](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1351086443&range=D3%3AG3) |
| Đón Nội Bài → khách sạn · xe 4 chỗ | 400.000 ₫ | [Tháng 10.2026 D6:G6](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1351086443&range=D6%3AG6) |
| Tiễn khách sạn → Nội Bài · xe 7 chỗ | 400.000 ₫ | [Tháng 10.2026 D17:G17](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1351086443&range=D17%3AG17) |
| Tiễn khách sạn → Nội Bài · xe 4 chỗ | 400.000 ₫ | [Tháng 10.2026 D21:G21](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1351086443&range=D21%3AG21) |
| Tiễn khách sạn → Nội Bài · xe 16 chỗ | 800.000 ₫ | [Tháng 9.2026 D4:G4](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D4%3AG4) |
| Đón Nội Bài → khách sạn · xe 7 chỗ | 500.000 ₫ | [Tháng 9.2026 D8:G8](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D8%3AG8) |
| Tiễn khách sạn → Nội Bài · xe 4 chỗ | 600.000 ₫ | [Tháng 9.2026 D19:G19](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D19%3AG19) |
| Tiễn khách sạn → Nội Bài · xe 7 chỗ | 500.000 ₫ | [Tháng 9.2026 D22:G22](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D22%3AG22) |
| Tiễn khách sạn → Nội Bài · xe 4 chỗ | 350.000 ₫ | [Tháng 9.2026 D42:G42](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D42%3AG42) |
| Tiễn khách sạn → Nội Bài · xe 5 chỗ | 300.000 ₫ | [Tháng 9.2026 D46:G46](https://docs.google.com/spreadsheets/d/117tHGxGHZ04SsiCJZnSugGRmKMgG47OvOjRKsgdNYWc/edit#gid=1550600677&range=D46%3AG46) |

Cua cần xác nhận mức áp dụng cho từng chiều/xe, lý do chênh lệch, giá vốn/hoa hồng, số khách và vali, giờ phục vụ, phí chờ/đêm/cầu đường/sân bay/điểm dừng, ghế trẻ em và hủy/no-show. Xe 16 chỗ: vùng đã đọc chỉ có tiễn 800.000đ; chưa tìm thấy giá đón 16 chỗ rõ ràng trong các vùng này. Tab 11.2026 có mức 400000 nhưng chưa rõ chiều nên không đưa thành giá.

## Các dòng tour và xe liên tỉnh tháng 10

Giữ nguyên tên viết tắt tại nguồn, không tự diễn giải HL/TC hoặc ghép sang gói khác. Cột “Giá HĐ” được lưu đúng nhãn; chưa mặc định là toàn bộ giá vốn và chưa trừ hoa hồng/chi phí khác.

| Dịch vụ tại nguồn | Đại lý tại nguồn | Bán/khách ghi sổ | Giá HĐ/khách ghi sổ | Dòng nguồn |
|---|---|---:|---:|---|
| Heritage Signature | Heritage | 2.160.000 ₫ | 1.512.000đ | [D3:K3](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D3%3AK3) |
| Jeep City | Adventure | 1.485.000 ₫ | 1.188.000đ | [D4:K4](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D4%3AK4) |
| Hoa Lư - TC - Múa | Excursion | 1.350.000 ₫ | 950.400đ | [D5:K5](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D5%3AK5) |
| HLB 2D1N Hermes cruise | Hermes Cruise | 5.014.000 ₫ | 3.450.000đ | [D6:K6](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D6%3AK6) |
| Limo Dcar HN-HL | HH Limosine | 486.000 ₫ | 243.000đ | [D7:K7](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D7%3AK7) |
| HL 1 Day | Catamaran | 2.295.000 ₫ | 1.695.600đ | [D8:K8](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D8%3AK8) |
| Limo Dcar HL-HN | HH Limosine | 486.000 ₫ | 243.000đ | [D9:K9](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D9%3AK9) |
| HL - TC - Mua | Excursion | 1.290.000 ₫ | 950.400đ | [D10:K10](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D10%3AK10) |
| HL 2D1N | Venus | 4.515.000 ₫ | 4.150.000đ | [D11:K11](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D11%3AK11) |
| Sapa 3D2N | Adventure | 5.805.000 ₫ | 5.022.000đ | [D12:K12](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D12%3AK12) |
| HL 2D1N | Velar of the seas | 4.725.000 ₫ | 4.320.000đ | [D14:K14](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D14%3AK14) |
| HL TC M | Excursion | 1.350.000 ₫ | 950.400đ | [D15:K15](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D15%3AK15) |
| Limou HN - NB | Excursion | 459.000 ₫ | 270.000đ | [D16:K16](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D16%3AK16) |
| HL 1D Lux | Heritage | 1.890.000 ₫ | 1.404.000đ | [D17:K17](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D17%3AK17) |
| HL Hercules Grand | Dragon King | 1.890.000 ₫ | 1.382.000đ | [D18:K18](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D18%3AK18) |
| HL - TC - Múa | Excursion | 1.350.000 ₫ | 950.400đ | [D19:K19](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D19%3AK19) |
| Xe riêng 7C HN-HL | Ngọc Anh | 2.000.000 ₫ | 1.515.000đ | [D20:K20](https://docs.google.com/spreadsheets/d/1Pqw-yYPbHpN2-DfuBwBXTmC491zAjE6rkAe33W_umv0/edit#gid=739808329&range=D20%3AK20) |

**Bất nhất cần kiểm tra:** dòng 7 và 9 (Limo Dcar HN-HL / HL-HN): 2 khách × 486.000đ nhưng tổng bán là 486.000đ; giá HĐ 243.000đ/khách × 2 = 486.000đ. Cần xác nhận giá theo khách hay cả nhóm, không tự sửa số nguồn.

## Điều kiện đã có và còn thiếu

- **Đã có:** lịch trình, thời lượng, lưu ý về điểm đón, thể lực/gia đình, thời tiết, tuyến tàu và thời gian dự trù. Các lịch trình vẫn là Draft. Hoạt động trong lịch trình không tự là quyền lợi bao gồm trong giá.
- **Chưa xác nhận:** đơn vị giá/người lớn-trẻ em, lịch áp dụng, đúng nhà cung cấp và cơ sở, bao gồm/chưa gồm, thuế/phí, hạng tàu/cabin/xe, phụ thu, cọc, hạn thanh toán, đổi/hủy/hoàn và chỗ trống đúng ngày.
- **TheSinhTour:** giá website lưu 01/10/2026 không phải giá vốn của khách sạn. Không dùng hai cột +15%/+20% làm chính sách giá. Cần kiểm tra đúng gói và nhà cung cấp trước khi chuyển sang giá bán.
- **Mẫu WhatsApp:** giá từ USD 25 food tour, 35++ Hà Nội, 40++ Ninh Bình, 45++ Hạ Long ngày, 99++ cruise 2N1Đ, 55++ Sa Pa 2N1Đ, 99++ Hà Giang. Cần làm rõ ++, tỷ giá/tiền thanh toán và hiệu lực.
- **Combo cũ:** từ 2 tour qua đêm có xe sân bay một chiều miễn phí, spa giảm tới 20%, nhận sớm/trả muộn tùy chỗ. Chưa xác nhận còn áp dụng, không tự đưa vào quyền lợi hoặc mức 0đ.

[Mẫu tư vấn WhatsApp](https://docs.google.com/document/d/1-tgsrPNaxdbWfAaU6GMc6fxGtPuSqQSrOXeJWhndcGo/edit). Ngày sửa tài liệu 04/10/2026 cũng không xác nhận ngày hiệu lực của giá/ưu đãi.

## Cua chỉ cần bổ sung các quyết định còn thiếu

Cho mỗi dịch vụ muốn đưa vào bán trước, xác nhận: **mã/dòng nguồn → cơ sở → nhà cung cấp/gói → đơn vị → giá bán → giá vốn → hoa hồng → từ ngày/đến ngày → bao gồm/chưa gồm → trẻ em/phụ thu → cọc/đổi/hủy → người duyệt**. Dữ liệu khách/ngày đã có tiếp tục dùng lại; chỉ hỏi khách phần thực sự còn thiếu.

Nên xác nhận xe 4/7 chỗ và một gói Ninh Bình/Hạ Long có nhà cung cấp trước. Các mức khác vẫn giữ ở kho tham khảo, không cần nhập lại toàn bộ.

## Phạm vi và giới hạn đọc

- Tour Catalog: A1:X40.
- Tour Program Details: A1:H35.
- TheSinhTour Products: A1:P180.
- Tour AI Rules: A1:J35.
- 75PHT - TOUR 2026 / Tháng 10.2026: D3:K80.
- 75PHT - XE SÂN BAY / Tháng 10.2026: D3:G80.
- 75PHT - XE SÂN BAY / Tháng 9.2026: D1:G70.
- 75PHT - XE SÂN BAY / 11.2026: D1:G25 — Có dữ liệu nhưng chưa rõ chiều đón/tiễn; không chọn thành mức giá..

Đọc theo đợt, chưa quét toàn bộ các tháng và mọi file sao lưu; chưa xác minh lại website nhà cung cấp hoặc hỏi nhà xe. Chỉ lấy dữ liệu nguồn cho bản local, không sửa Sheets, không gửi khách, không thay đổi online hoặc phần Claude ở cổng 5173. 7 sản phẩm giả lập và phiên bản báo giá cũ được giữ riêng.
