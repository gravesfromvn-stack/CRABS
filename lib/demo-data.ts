export const statuses = {new:'Mới tiếp nhận',advising:'Đang tư vấn',waiting:'Chờ phản hồi',closed:'Đã kết thúc'};
export const assignees = ['Chưa phân công','Minh · tư vấn mẫu','An · điều phối mẫu'];
export const sources = ['Trực tiếp','Khách lưu trú mẫu','Đại lý Sen Travel (mẫu)','Đối tác Horizon (mẫu)','Google Sheets · hồ sơ ẩn danh'];
export const suppliers = ['Lotus Experiences (mẫu)','Bay Journeys (mẫu)','CityRide (mẫu)'];
export const products = [
 {id:'T01',title:'Hà Nội · Một ngày khám phá',region:'Hà Nội',duration:'1 ngày',kind:'tour',supplier:suppliers[0],price:950000,cost:720000,commission:50000,unit:'khách lớn',description:'Văn Miếu, phố cổ và trải nghiệm ẩm thực. Lịch trình minh họa cho khách lần đầu đến Hà Nội.',includes:'Xe theo lịch trình, hướng dẫn viên, bữa trưa mẫu',excludes:'Chi tiêu cá nhân, đồ uống ngoài chương trình',theme:'city'},
 {id:'T02',title:'Ninh Bình · Tràng An & Hang Múa',region:'Ninh Bình',duration:'1 ngày',kind:'tour',supplier:suppliers[0],price:1250000,cost:960000,commission:70000,unit:'khách lớn',description:'Đi thuyền giữa núi đá vôi, tham quan và chụp ảnh. Cần hỏi khả năng vận động trước khi tư vấn.',includes:'Xe, hướng dẫn viên, vé và bữa trưa mẫu',excludes:'Đồ uống, phụ thu ngoài lịch trình',theme:'mountain'},
 {id:'T03',title:'Hạ Long · Hành trình trên vịnh',region:'Quảng Ninh',duration:'1 ngày',kind:'tour',supplier:suppliers[1],price:1750000,cost:1380000,commission:90000,unit:'khách lớn',description:'Du thuyền trong ngày với bữa trưa và hoạt động tham quan. Chỗ và thời tiết cần được xác nhận.',includes:'Xe, tàu, bữa trưa và vé theo chương trình mẫu',excludes:'Đồ uống, phụ thu ngày đặc biệt',theme:'bay'},
 {id:'T04',title:'Sa Pa · Bản làng & sườn núi',region:'Lào Cai',duration:'2 ngày 1 đêm',kind:'tour',supplier:suppliers[0],price:2650000,cost:2140000,commission:140000,unit:'khách lớn',description:'Chương trình văn hóa và đi bộ nhẹ; tư vấn theo thể lực, thời gian và nhu cầu phòng.',includes:'Di chuyển, phòng ghép đôi, hướng dẫn và bữa ăn mẫu',excludes:'Phụ thu phòng đơn, cáp treo',theme:'terrace'},
 {id:'T05',title:'Hà Nội · Ẩm thực phố cổ',region:'Hà Nội',duration:'3 giờ',kind:'tour',supplier:suppliers[0],price:650000,cost:430000,commission:40000,unit:'khách lớn',description:'Khám phá món ăn địa phương. Cần hỏi dị ứng, chế độ ăn và khung giờ mong muốn.',includes:'Hướng dẫn và phần ăn theo chương trình mẫu',excludes:'Món gọi thêm, chi tiêu cá nhân',theme:'food'},
 {id:'X01',title:'Nội Bài → trung tâm · Xe 4 chỗ',region:'Hà Nội',duration:'Một chiều',kind:'transfer',supplier:suppliers[2],price:350000,cost:260000,commission:20000,unit:'xe / chiều',description:'Đón sân bay cho tối đa 3 khách theo giả định demo. Cần kiểm tra số kiện hành lý.',includes:'Một chiều, phí đường và 60 phút chờ mẫu',excludes:'Chờ thêm, điểm dừng thêm',theme:'car'},
 {id:'X02',title:'Trung tâm → Nội Bài · Xe 7 chỗ',region:'Hà Nội',duration:'Một chiều',kind:'transfer',supplier:suppliers[2],price:450000,cost:340000,commission:25000,unit:'xe / chiều',description:'Tiễn sân bay theo giả định tối đa 5 khách. Giờ đón cần xác nhận cùng khách và nhà xe.',includes:'Một chiều và phí đường mẫu',excludes:'Điểm dừng thêm, chờ thêm',theme:'car'},
].map(p=>({...p,validUntil:'2026-10-31',availability:'Chưa kiểm tra chỗ',conditions:'Giá và điều kiện hoàn toàn giả lập; chưa có cam kết đặt dịch vụ. Giá trẻ em và điều kiện hủy cần xác nhận riêng trước khi báo giá.'}));
const names=['Linh Nguyễn','Gia đình Mai Anh','Daniel Park','Alex Morgan','Thu Hà','Sofia Rossi','Minh Hoàng','Emma Wilson','Hải Nam','Chloe Martin','Ngọc Anh','David Lee','Bảo Trâm','Lucas Silva','Khánh An','Yuki Sato','Hồng Nhung','Oliver Brown','Tuấn Phong','Mia Chen'];
const requests=[
 'Tôi đến Hà Nội ngày 22/10 lúc 12:30, chuyến bay DEMO-101. Cần xe đón và muốn đi Ninh Bình vào ngày hôm sau.',
 'Gia đình mình có 2 người lớn, bé 6 tuổi và bé 10 tuổi. Ngày 24/10 muốn đi Hạ Long hoặc Ninh Bình. Ngân sách khoảng 5 triệu, nhờ tư vấn.',
 'I would like to move our Ha Long day trip from 25 October to 26 October. Please check the availability before confirming.',
 'We would like a food tour in the Old Quarter. One guest is vegetarian. What do you recommend?',
 'Mình cần xe tiễn sân bay cho 4 người, có 3 vali lớn. Chuyến bay ngày 25/10.',
];
export function seedContacts(){return names.map((name,i)=>({
 id:`demo-${String(i+1).padStart(2,'0')}`,name:name+' · mẫu',segment:i===0||(i>2&&i%4===1)?'Khách lưu trú':'Khách ngoài khách sạn',
 source:i===0?sources[1]:i===1?sources[2]:sources[i%4],status:(['new','advising','waiting','closed'] as const)[i<3?i:i%4],
 assignee:i===0?'Chưa phân công':assignees[1+i%2],due:i===0?'2026-10-14T10:30':i<5?'2026-10-14T15:00':'2026-10-15T09:00',
 service_date:i===0?'2026-10-23':i===1?'2026-10-24':i<=4?'2026-10-25':`2026-10-${22+i%7}`,
 adults:i===4?4:2,children:i===1?'6, 10':'',budget:i===1?5000000:i%3===0?0:3000000,
 interest:i===0?'Xe đón + Ninh Bình':i===1?'Hạ Long / Ninh Bình':i===2?'Hạ Long · đổi ngày':i===3?'Ẩm thực phố cổ':i===4?'Xe tiễn sân bay':products[i%7].title,
 note:i===0?'Đã biết giờ đến và chuyến bay DEMO-101. Cần hỏi số hành lý.':i===1?'Đại lý yêu cầu hai phương án; cần kiểm tra giá trẻ em.':i===2?'Khách yêu cầu đổi ngày. Chưa có xác nhận của nhà cung cấp.':'Cơ hội bán giả lập; cần xác minh nhu cầu trước khi báo giá.',
 stay:i===0?'Cơ sở Demo Riverside · 22–25/10':i>2&&i%4===1?'Cơ sở Demo Riverside':'',version:1,updated:`2026-10-14T${String(2+Math.floor(i/6)).padStart(2,'0')}:${String(i*3%60).padStart(2,'0')}:00.000Z`,
 message:i<5?requests[i]:`Tôi muốn được tư vấn ${products[i%7].title}. Nhờ kiểm tra lịch trình và giá phù hợp.`,
}));}
export const scenarios=[
 {id:'01',title:'Bán thêm cho khách lưu trú',contact:'demo-01',tag:'Xe sân bay + tour',goal:'Nắm thông tin đã có, hỏi phần còn thiếu và theo dõi một cơ hội bán thêm.',steps:['Mở Linh Nguyễn và đọc yêu cầu xe + Ninh Bình.','Phân công Minh, ghi hạn chăm sóc và số hành lý cần hỏi.','Thêm tin khách mô phỏng rồi ghi phản hồi tư vấn.','Đối chiếu tour Ninh Bình và xe đón trong danh mục.'],next:'Bước sau: lập báo giá, khách đồng ý và xác nhận nhà cung cấp.'},
 {id:'02',title:'Phân phối qua đại lý',contact:'demo-02',tag:'Khách chưa có booking',goal:'Tiếp nhận khách bên ngoài, giữ nguồn giới thiệu và chuẩn bị hai phương án.',steps:['Mở Gia đình Mai Anh; hồ sơ không cần booking phòng.','Kiểm tra ngày đi, ngân sách và tuổi trẻ em.','Xem Hạ Long / Ninh Bình cùng giá vốn và hoa hồng mẫu.','Ghi điều cần hỏi thêm và chuyển sang Chờ phản hồi.'],next:'Bước sau: hai phương án báo giá, chính sách trẻ em và theo dõi hoa hồng.'},
 {id:'03',title:'Kiểm soát khi khách đổi ngày',contact:'demo-03',tag:'Ngoại lệ bán hàng',goal:'Giữ lịch sử yêu cầu, giao người xử lý và tránh hứa chỗ chưa được kiểm tra.',steps:['Mở Daniel Park và đọc tin yêu cầu đổi ngày.','Sửa ngày dự kiến sang 26/10, ghi lý do thay đổi.','Soạn phản hồi mô phỏng rằng đang kiểm tra nhà cung cấp.','Xem nhật ký cập nhật và tải lại trang để kiểm tra dữ liệu.'],next:'Bước sau: vô hiệu báo giá/nháp cũ và buộc xác nhận lại nhà cung cấp.'},
];
