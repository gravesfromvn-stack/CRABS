export const OTA_MAILBOX='paradisesuitespht@gmail.com';
export const properties=[{id:'luxe-75pht',name:'Luxe Paradise · 75 Phạm Hồng Thái'},{id:'luxe-suites',name:'Luxe Paradise Suites Hotel & Spa'}];
export const channels=['booking','agoda','expedia','trip'] as const;
export type Channel=typeof channels[number]|'unknown';
export type GmailPart={mimeType?:string;mime_type?:string;filename?:string;headers?:{name:string;value:string}[];body?:{data?:string;content?:string;size?:number;attachmentId?:string};parts?:GmailPart[]};
export type GmailMail={id:string;threadId?:string;thread_id?:string;internalDate?:string;internal_date?:string;payload:GmailPart};
export type ParsedMail={id:string;gmailThread:string;subject:string;sender:string;received:string;fullText:string;guestText:string;channel:Channel;bookingId:string;propertyId:string;propertyLabel:string;guestName:string;kind:string;reason:string;authenticated:boolean;internetId:string};
export const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\s+/g,' ').trim();
export async function hash(s:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,'0')).join('');}
function entities(s:string){const named:Record<string,string>={nbsp:' ',amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"};return s.replace(/&#(x[\da-f]+|\d+);/gi,(_,n:string)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return v>0&&v<=0x10ffff?String.fromCodePoint(v):'';}).replace(/&(nbsp|amp|lt|gt|quot|apos);/gi,(_,n:string)=>named[n.toLowerCase()]||'');}
export function plainHtml(s:string){return entities(s.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi,'').replace(/<!--[^]*?-->/g,'').replace(/<(?:br|\/p|\/div|\/tr|\/td|\/li|\/h[1-6])\b[^>]*>/gi,'\n').replace(/<[^>]*>/g,' ')).replace(/[ \t\r]+/g,' ').split('\n').map(l=>l.trim()).filter(Boolean).join('\n');}
function decode(s:string){try{return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0)));}catch{return '';}}
function content(p:GmailPart):{text:string;html:string;attachment:boolean}{let text='',html='',attachment=false;const mime=p.mimeType||p.mime_type||'';const value=p.body?.content||decode(p.body?.data||'');if(!p.filename){if(mime==='text/plain')text=value;if(mime==='text/html')html=value;}if(p.filename||p.body?.attachmentId)attachment=true;for(const child of p.parts||[]){const c=content(child);text+=c.text?'\n'+c.text:'';html+=c.html?'\n'+c.html:'';attachment=attachment||c.attachment;}return {text,html,attachment};}
function field(text:string,label:RegExp){const m=text.match(label);return m?.[1]?.trim()||'';}
function guestSection(text:string,start:RegExp,end:RegExp){const m=start.exec(text);if(!m)return '';const rest=text.slice(m.index+m[0].length);return rest.split(end)[0].trim().slice(0,12000);}
export function parseMail(m:GmailMail):ParsedMail{
 const headers=m.payload?.headers||[],header=(n:string)=>headers.find(h=>h.name.toLowerCase()===n)?.value||'';
 const subject=header('subject'),sender=header('from'),email=(sender.match(/<([^>]+)>/)?.[1]||sender).trim().toLowerCase(),domain=email.split('@').at(-1)||'';
 const domainIs=(s:string)=>domain===s||domain.endsWith('.'+s);
 const channel:Channel=domainIs('booking.com')?'booking':domainIs('agoda.com')||domainIs('agoda-messaging.com')?'agoda':domainIs('expedia.com')||domainIs('expediapartnercentral.com')?'expedia':domainIs('trip.com')||domainIs('ctrip.com')?'trip':'unknown';
 const authentication=headers.filter(h=>h.name.toLowerCase()==='authentication-results').map(h=>h.value).filter(v=>/^mx\.google\.com;/i.test(v.trim())).join(' ');
 // Only Google's received authentication verdict is evidence; guest text never is.
 const alignedDomain=authentication.match(/dmarc=pass\b[^;]*?header\.from=([^\s;]+)/i)?.[1]?.toLowerCase()||'';
 const authenticated=Boolean(alignedDomain&&(domain===alignedDomain||domain.endsWith('.'+alignedDomain))&&channel!=='unknown');
 const c=content(m.payload),fullText=(c.text.trim()||plainHtml(c.html)).split('\n').map(l=>l.trim()).join('\n').replace(/\n{3,}/g,'\n\n').slice(0,120000);
 const lines=fullText.split('\n').filter(Boolean),n=norm(fullText),s=norm(subject);
 let kind='system',guestText='',guestName='',bookingId='',propertyId='',propertyLabel='',reason='Thông báo hệ thống; không tạo phản hồi cho khách.';
 if(channel==='booking'){
  bookingId=field(fullText,/(?:Confirmation number|Booking number|Reservation number|Mã xác nhận|Số đặt phòng)\s*[:#]?\s*(\d{6,20})/i);
  propertyLabel=field(fullText,/(?:Property name|Tên chỗ nghỉ|Tên chỗ nghỉ của bạn)\s*:\s*([^\n]+)/i);
  guestName=field(fullText,/Guest name\s*:\s*([^\n]+)/i);
  if(/we received this message|new message|tin nhan.*khach/.test(s)||/You have a new message from a guest/i.test(fullText)){kind='guest';guestText=guestSection(fullText,/[^\n]+\s+said:\s*\n/i,/\n\s*(?:Reply|Reservation details|Trả lời)\s*(?:\n|$)/i);}
 }else if(channel==='agoda'){
  bookingId=field(subject,/(?:Booking ID|Booking No\.?|Reservation)\s*[:#]?\s*(\d{6,20})/i)||field(fullText,/Booking ID\s*[:#]?\s*(\d{6,20})/i);
  propertyLabel=field(fullText,/Dear\s+(Luxe Paradise[^\n,]+)/i)||lines.find(l=>/^Luxe Paradise/i.test(l))||'';
  guestName=field(fullText,/New message from\s+([^\n]+)/i);
  if(/new message|special request|tin nhan|yeu cau dac biet/.test(s)||/New message from/i.test(fullText)){kind='guest';guestText=guestSection(fullText,/Dear[^\n]+\n/i,/(?:Please confirm below|Google translate|\n\s*(?:Accepted|Reply through YCS|Booking details|Did you know\?))/i);if(!guestText)guestText=guestSection(fullText,/Message from guest:\s*/i,/(?:Reply through YCS|Booking details|Did you know\?)/i);}
 }else if(channel==='expedia'){
  bookingId=field(subject+'\n'+fullText,/(?:Itinerary(?: number)?|Reservation(?: ID| number)?|Booking(?: ID| number)?|Mã hành trình|Mã đặt phòng)\s*[:#]?\s*(\d{6,20})/i);
  propertyLabel=lines.find(l=>/^Luxe Paradise[^\n]{0,100}$/i.test(l))||'';
  if(/message|tin nhan/.test(s)){kind='guest';guestText=field(fullText,/"([^]*?)"\s*(?:\n|$)/);}
 }else if(channel==='trip'){
  bookingId=field(subject,/(?:booking no\.?|reservation no\.?)\s*[:#]?\s*#?(\d{6,20})/i)||field(fullText,/(?:Booking No\.?|reservation no\.?)\s*[:#]?\s*(\d{6,20})/i);
  propertyLabel=field(fullText,/\nHotel\s*\n([^\n]+)/i);
  guestName=field(fullText,/Guest Name\s*\n([^\n]+)/i);
  if(/new special request|new message|action required.*special request/.test(s)){kind='guest';guestText=guestSection(fullText,/Message from guest:\s*/i,/(?:Select a button|Please update|\[Original\]|\n·|Order Info)/i);}
 }
 if(/reminder|nhac nho|guest informed|response to|reply to your|you replied|da tra loi/.test(s)){kind='system';guestText='';}
 // Narrow property aliases. Generic "Premium Hotel" is deliberately unresolved across OTAs.
 const p=norm(propertyLabel);
 if(/luxe paradise premium.*pham hong thai/.test(p))propertyId='luxe-75pht';
 else if(/^luxe paradise suites hotel(?: & spa)?$/.test(p))propertyId='luxe-suites';
 // These Booking identities were cross-checked against 75PHT Guest Master and
 // FO _BookingData. Read identifiers only from Booking URL links in the envelope,
 // not numbers or property names typed inside a guest's message.
 if(channel==='booking'){
  const envelope=fullText.replace(guestText,'').replace(/\n/g,'');
  const ids=[...new Set([...envelope.matchAll(/https:\/\/admin\.booking\.com\/[^\s]*?[?&](?:amp;)?hotel_id=(\d+)/g)].map(m=>m[1]))];
  if(ids.length===1&&ids[0]==='16856467'&&p==='lp hotel & spa pham hong thai')propertyId='luxe-75pht';
  if(ids.length>1||(ids[0]==='16856467'&&propertyId==='luxe-suites')||(ids[0]==='13953882'&&propertyId==='luxe-75pht'))propertyId='';
  guestText=guestText.split(/\n\s*Accept for free\s*\n/i)[0].trim();
  if(/new message from booking\.com/i.test(subject)&&/You've just received a new message from Booking\.com/i.test(fullText)){kind='system';guestText='';}
 }
 if(!propertyLabel&&n.includes('luxe paradise'))propertyLabel='Tên cơ sở chưa tách được';
 const matches=[...fullText.matchAll(/(?:Confirmation number|Booking number|Booking ID)\s*[:#]?\s*(\d{6,20})/gi)].map(x=>x[1]);
 if(new Set(matches).size>1){bookingId='';reason='Thư chứa nhiều mã booking. Cần đối chiếu trước khi ghép.';}
 if(kind==='guest')reason=!authenticated?'Chưa xác minh được người gửi OTA từ dấu xác thực của Gmail.':!propertyId?'Cần xác nhận đúng cơ sở; không suy từ tên khách.':!bookingId?'Thiếu hoặc mâu thuẫn mã booking trong thư.':!guestText?'Email không có phần lời khách tách được; mở nguồn để bổ sung.':'';
 if(c.attachment&&kind==='guest')reason+=(reason?' ':'')+'Thư có tệp đính kèm; chưa nhập nội dung tệp.';
 const timestamp=Number(m.internalDate||m.internal_date);const received=Number.isFinite(timestamp)&&timestamp>0?new Date(timestamp).toISOString():'';
 return {id:m.id,gmailThread:m.threadId||m.thread_id||'',subject,sender,received,fullText,guestText:guestText.slice(0,12000),channel,bookingId,propertyId,propertyLabel,guestName,kind,reason,authenticated,internetId:header('message-id').slice(0,500)};
}
export function suggestedDraft(text:string):{body:string;notes:string;kind:string}{
 const n=norm(text),vi=/[ăâđêôơư]|\b(toi|minh|ban|khach san|san bay)\b/i.test(text),intro=vi?'Chào bạn, cảm ơn bạn đã nhắn tin.':'Hello, thank you for your message.';
 const notes='Nháp theo quy tắc, chưa được duyệt. Đối chiếu toàn bộ lời khách và lịch sử trước khi gửi; không cam kết phòng, giá hoặc dịch vụ chưa xác nhận.';
 let body='',kind='Cần nhân viên soạn';
 const sections:string[]=[], kinds:string[]=[];
 const declinedTransfer=/(?:no|not|don't|do not).{0,25}(?:need|require|want|book).{0,20}(?:transfer|pick.?up|taxi)|(?:khong can|khong muon).{0,20}(?:xe|don|tien)|(?:transfer|pick.?up).{0,15}(?:not needed|not required)/.test(n);
 const add=()=>{if(body){sections.push(body);kinds.push(kind);body='';}};
 if(/cancel|refund|complaint|huy|hoan tien|khieu nai/.test(n)){kind='Thay đổi / hủy';body=vi?'Mình đã ghi nhận yêu cầu của bạn. Mình sẽ kiểm tra điều kiện của đặt phòng và giải thích các phương án, cùng phí hoặc điều kiện hoàn tiền nếu có, trước khi bạn quyết định.':'I have noted your request. I will check the conditions of your booking and explain the available options, including any applicable charges or refund conditions, before you decide.';}
 else if(/prefer.*(?:arrival|arrive)|discuss.*(?:arrival|arrive)|den.*trao doi/.test(n)){kind='Trao đổi khi đến';body=vi?'Mình đã ghi nhận thông tin bạn gửi và mong muốn trao đổi về dịch vụ khi đến khách sạn. Mình sẽ hỗ trợ giới thiệu các phương án khi bạn sẵn sàng.':'I have noted the details you provided and your preference to discuss the available services when you arrive. We can go through the options when you are ready.';}
 if(body)return {body:intro+'\n\n'+body,notes,kind};
 if(declinedTransfer){kind='Không cần xe';body=vi?'Mình đã ghi nhận bạn không cần xe đưa đón.':'I have noted that you do not need an airport transfer.';add();}
 if(/quiet|higher floor|high floor|large bed|king bed|twin beds|non.smoking|yen tinh|tang cao|giuong|connecting room|pintu terhubung/.test(n)){kind='Yêu cầu phòng';body=vi?'Mình đã ghi nhận yêu cầu về phòng bạn gửi. Khách sạn sẽ kiểm tra khả năng bố trí theo đặt phòng; hiện chưa xác nhận yêu cầu đã được đáp ứng.':'I have noted your room preferences. We will check the available arrangements for your booking; these requests are not yet confirmed.';}
 add();
 if(!declinedTransfer&&/airport|transfer|pick.?up|san bay|xe don|xe tien/.test(n)){kind='Xe sân bay';body=vi?'Về xe sân bay, mình có thể kiểm tra phương án xe riêng phù hợp với nhóm và hành lý của bạn. Mình sẽ dùng các thông tin bạn đã gửi để đối chiếu loại xe, điểm đón và quyền lợi đi kèm, rồi gửi phương án cùng báo giá để bạn duyệt trước khi đặt.':'For your airport transfer, I can check a private vehicle suitable for your party and luggage. I will use the details you have already provided to check the vehicle, meeting point and inclusions, then share the option and final quotation for your approval before booking.';}
 add();
 if(/ninh binh|trang an|hoa lu|mua cave/.test(n)){kind='Tour Ninh Bình';body=vi?'Về Ninh Bình, phương án tham khảo Hoa Lư – Tràng An – Hang Múa kết hợp tìm hiểu văn hóa, đi thuyền ngắm cảnh và điểm nhìn từ núi. Hang Múa có nhiều bậc thang nên cần cân nhắc nhịp di chuyển phù hợp. Mình sẽ đối chiếu lịch trình, xe đưa đón, hướng dẫn viên, vé và bữa ăn của chương trình cụ thể, rồi gửi quyền lợi và giá cuối cùng trước khi bạn quyết định.':'For Ninh Binh, a Hoa Lu – Trang An – Mua Cave itinerary combines cultural visits, a scenic boat ride and a mountain viewpoint. Mua Cave involves many steps, so the walking pace should suit your group. I will check the specific itinerary, transport, guide, tickets and meals, then share the confirmed inclusions and final price before you decide.';}
 add();
 if(/arriv|check.?in|den khach san|nhan phong/.test(n)){kind='Giờ đến / nhận phòng';body=vi?'Mình đã ghi nhận thông tin về việc đến khách sạn bạn cung cấp. Thời điểm có thể nhận phòng cần được kiểm tra theo đặt phòng và tình trạng phòng; mình chưa xác nhận nhận phòng sớm.':'I have noted the arrival details you provided. Room availability at that time needs to be checked against your booking; early check-in is not yet confirmed.';}
 add();
 return {body:sections.length?intro+'\n\n'+sections.join('\n\n'):'',notes:notes+(vi?'':' Nháp tiếng Anh; kiểm tra ngôn ngữ khách trước khi dùng.'),kind:kinds.join(' · ')||kind};
}
