import {normalize,type GuestFact} from './ota-profile';
import {findQuoteSource,sourceRules,sourceReadAt,type SourceItem} from './quote-sources';
import {findTourResearch,tourResearch,type TourResearch} from './tour-research';

// Picks at most two sourced tour options for one conversation and turns them into guest-facing
// content that never states a price. Source texts (email, Sheets, websites) are data only.
// The catalog is a 75PHT source: other properties get internal suggestions only until Cua confirms.
export const TOUR_SOURCE_PROPERTY='luxe-75pht';

type Line={en:string;vi:string;evidence:string[]};
// Faithful EN/VI renderings of the researched fields; evidence = phrases that must exist in the source record.
const sourced:Record<string,{name:Line;facts:Line[];considerations:Line[]}>={
 'R75-TST-021':{name:{en:'Hoa Lu – Trang An – Mua Cave day tour',vi:'tour trong ngày Hoa Lư – Tràng An – Hang Múa',evidence:['Hoa Lư','Tràng An','Hang Múa']},
  facts:[{en:'It visits Hoa Lu with a bicycle ride, lunch, a boat trip in Trang An and Mua Cave, with pick-up in the Old Quarter around 07:00–07:45 and return around 19:30.',vi:'Lịch trình gồm Hoa Lư, đạp xe, ăn trưa, đi thuyền Tràng An và Hang Múa; đón tại Phố Cổ khoảng 07:00–07:45 và về khoảng 19:30.',evidence:['Hoa Lư','đạp xe','thuyền Tràng An','Hang Múa','07:00–07:45','19:30']},
   {en:'The listed inclusions are transport, entrance tickets per the itinerary, bicycles, a guide, lunch and water.',vi:'Phần bao gồm được liệt kê: xe, vé theo lịch trình, xe đạp, hướng dẫn viên, bữa trưa và nước.',evidence:['Xe','vé theo lịch','xe đạp','hướng dẫn','trưa','nước']}],
  considerations:[{en:'Mua Cave involves many steps.',vi:'Hang Múa có nhiều bậc thang.',evidence:['Hang Múa có nhiều bậc']}]},
 'R75-TST-028':{name:{en:'Thung Ui (Ninh Binh) day tour',vi:'tour trong ngày Thung Ui (Ninh Bình)',evidence:['Thung Ui']},
  facts:[{en:'It includes Hoa Lu ancient town with a choice of either the ancient capital or Am Tien, lunch and Thung Ui, with pick-up in Hanoi around 07:00–07:30 and return around 19:00–19:30.',vi:'Lịch trình gồm phố cổ Hoa Lư, chọn Cố đô hoặc Am Tiên, ăn trưa và Thung Ui; đón tại Hà Nội khoảng 07:00–07:30, về khoảng 19:00–19:30.',evidence:['Phố cổ Hoa Lư','Cố đô hoặc Am Tiên','Thung Ui','07:00–07:30','19:00–19:30']},
   {en:'Boats and rafts at Thung Ui are charged separately.',vi:'Thuyền và bè tại Thung Ui tính riêng.',evidence:['thuyền và bè tại Thung Ui tính riêng']}],
  considerations:[{en:'Hoa Lu and Am Tien are alternatives, not both.',vi:'Hoa Lư và Am Tiên là hai lựa chọn, không gồm cả hai.',evidence:['Hoa Lư và Am Tiên là lựa chọn']}]},
 'R75-TST-046':{name:{en:'Dragon King Ha Long Bay day cruise',vi:'du thuyền trong ngày Dragon King trên vịnh Hạ Long',evidence:['Dragon King']},
  facts:[{en:'The cruise visits Sung Sot Cave, Luon Cave and Ti Top Island; the listed inclusions are the boat, lunch, entrance tickets, kayaking or bamboo boat, afternoon tea and a guide.',vi:'Tàu ghé hang Sửng Sốt, Hang Luồn và đảo Titop; phần bao gồm được liệt kê: tàu, bữa trưa, vé, kayak hoặc thuyền nan, trà chiều và hướng dẫn viên.',evidence:['Sửng Sốt','Hang Luồn','Titop','Tàu','trưa','kayak/thuyền nan','trà chiều']},
   {en:'It is offered either starting at the Ha Long pier or with transport from Hanoi (return to Hanoi around 20:30–21:00); transport is only included in the version with transport.',vi:'Có hai gói: bắt đầu tại bến Hạ Long, hoặc có xe từ Hà Nội (về Hà Nội khoảng 20:30–21:00); xe chỉ có trong gói có xe.',evidence:['20:30–21:00','xe chỉ trong gói có xe']}],
  considerations:[]},
 'R75-TST-003':{name:{en:'Hanoi full-day city tour',vi:'tour Hà Nội cả ngày',evidence:['Hà Nội 1 ngày']},
  facts:[{en:'It covers Tran Quoc Pagoda, the Ho Chi Minh complex, a museum, the Temple of Literature and Hoa Lo Prison, with pick-up in the Old Quarter around 07:30–08:30 and return around 16:45.',vi:'Lịch trình gồm chùa Trấn Quốc, khu Hồ Chí Minh, bảo tàng, Văn Miếu và Hỏa Lò; đón tại Phố Cổ khoảng 07:30–08:30, về khoảng 16:45.',evidence:['Trấn Quốc','khu Hồ Chí Minh','bảo tàng','Văn Miếu','Hỏa Lò','07:30–08:30','16:45']},
   {en:'The listed inclusions are transport, a Vietnamese/English-speaking guide, entrance tickets per the itinerary, lunch and water.',vi:'Phần bao gồm được liệt kê: xe, hướng dẫn tiếng Việt/Anh, vé theo lịch trình, bữa trưa và nước.',evidence:['Xe','hướng dẫn Việt/Anh','vé theo lịch','bữa trưa','nước']}],
  considerations:[]},
 'R75-TST-036':{name:{en:'Ninh Binh – Ha Long 3-day package with one night on a cruise',vi:'gói 3 ngày 2 đêm Ninh Bình – Hạ Long với 1 đêm trên du thuyền',evidence:['Ninh Bình – Hạ Long 3N2Đ']},
  facts:[{en:'Day 1 is in Ninh Binh with an overnight stay there, day 2 transfers to the cruise, and day 3 returns to Hanoi.',vi:'Ngày 1 tham quan Ninh Bình và nghỉ tại Ninh Bình, ngày 2 chuyển ra tàu, ngày 3 trở lại Hà Nội.',evidence:['Ngày 1 Ninh Bình','ngày 2 chuyển ra tàu','ngày 3 trở lại Hà Nội']}],
  considerations:[{en:'Inclusions depend on the hotel, boat and cabin chosen.',vi:'Quyền lợi phụ thuộc hạng lưu trú, tàu và cabin được chọn.',evidence:['Quyền lợi theo hạng lưu trú, tàu và cabin']}]},
};
export const sourcedLines=sourced;

export type Destination='ninh_binh'|'ha_long'|'hanoi_city'|'other';
const destinations:{key:Destination;label:{en:string;vi:string};re:RegExp}[]=[
 {key:'ninh_binh',label:{en:'Ninh Binh',vi:'Ninh Bình'},re:/ninh binh|hoa lu|trang an|tam coc|mua cave|hang mua|bai dinh|thung ui|van long|am tien/},
 {key:'ha_long',label:{en:'Ha Long Bay',vi:'vịnh Hạ Long'},re:/ha ?long|lan ha|bai tu long|dragon king|bay cruise|\bcruise\b/},
 {key:'hanoi_city',label:{en:'Hanoi city tour',vi:'tour Hà Nội'},re:/city tour|hanoi tour|tour (?:of|around) hanoi|hanoi city|sightseeing in hanoi|mausoleum|lang bac|temple of literature|van mieu|tham quan ha noi/},
];
// Other places only have draft itineraries without supplier or price.
const otherDrafts:[RegExp,string][]=[[/sa ?pa/,'R75-SP04'],[/ha giang/,'R75-HG04'],[/mai chau|pu luong/,'R75-MCPL03'],[/cao bang|ban gioc/,'R75-CB04'],[/phong nha/,'R75-PN04'],[/\bhue\b/,'R75-HUE03'],[/hoi an|da nang/,'R75-HA04'],[/bat trang/,'R75-HN04'],[/duong lam/,'R75-HN05'],[/food tour|street food|am thuc/,'R75-HN02']];

export type Constraints={children:boolean;childAges:number[];mobility:string;date:string;party:string;multiDay:boolean;mentions:string[]};
const monthRe='jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|thang \\d{1,2}';
export function constraintsOf(text:string):Constraints{
 const n=normalize(text);
 const children=/\b(?:child(?:ren)?|kids?|son|daughter|baby|toddler|infant|tre em|be\b|con (?:trai|gai|nho))/.test(n);
 const childAges=[...n.matchAll(/(?:aged?|ages?)\s*(\d{1,2})(?:\s*(?:and|,|&)\s*(\d{1,2}))?|(\d{1,2})\s*(?:-|\s)?(?:years?[ -]old|yo\b|y\/o|tuoi)/g)].flatMap(m=>[m[1],m[2],m[3]].filter(Boolean).map(Number)).filter(a=>a<18);
 const mobility=(n.match(/(?:knee|hip|back) (?:problem|issue|injur\w*|pain)|bad knees?|wheelchair|walking stick|limited mobility|can(?:'|no)t (?:walk|climb)|cannot (?:walk|climb)|not (?:able|fit) to (?:walk|climb)|difficult(?:y)? (?:walking|climbing)|elderly|old parents|pregnan\w*|dau (?:goi|lung)|nguoi gia|khong leo|xe lan|mang thai/)||[''])[0];
 const date=(n.match(new RegExp(`\\b(?:on |for )?(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(?:${monthRe})\\b|\\b(?:${monthRe})\\s+\\d{1,2}(?:st|nd|rd|th)?\\b|\\b\\d{1,2}[/.]\\d{1,2}(?![.\\d])|\\b(?:tomorrow|ngay mai)\\b`))||[''])[0].trim().replace(/^(?:on|for)\s+/,'');
 const party=(n.match(/\b(\d{1,2}|two|three|four|five|six)\s+(?:adults?|people|persons|pax|guests|travell?ers|of us|nguoi(?: lon)?)\b/)||[''])[0];
 const multiDay=/\b(?:2|3|two|three)\s*(?:days?|d)\b|overnight|2d1n|3d2n|night on (?:the|a) (?:boat|cruise)|ngu dem|2 ngay|3 ngay/.test(n);
 return {children,childAges,mobility,date,party,multiDay,mentions:destinations.filter(d=>d.re.test(n)).map(d=>d.label.en)};
}

export type TourOption={id:string;title:string;guestName:Line|null;kind:'researched'|'draft';readAt:string;verification:string;why:string;guestFacts:Line[];considerations:Line[];internal:{prices:{label:string;amount:number|null;currency:string;scope:string}[];priceStatus:string;gaps:string[];notes:string[];sourceUrl:string;sheetRange:string}};
export type TourAdvice={destinations:{key:Destination;label:{en:string;vi:string}}[];status:'none'|'interested'|'deferred'|'declined';constraints:Constraints;options:TourOption[];guestAllowed:boolean;questions:Line[];rules:{id:string;title:string;text:string}[];internal:string[]};

function researched(id:string,why:string):TourOption|null{
 const r=findTourResearch(id) as TourResearch|undefined,s=findQuoteSource(id) as (SourceItem&{websiteReview?:unknown})|undefined,l=sourced[id];
 if(!r||!l)return null;
 return {id,title:r.title,guestName:l.name,kind:'researched',readAt:r.checkedAt,verification:`Đã đối chiếu website ${r.checkedAt}; trạng thái ${r.status} (chỉ tham khảo)`,why,guestFacts:l.facts,considerations:l.considerations,
  internal:{prices:r.variants.length?r.variants.map(v=>({label:v.label,amount:v.amount,currency:r.currency,scope:v.scope})):[{label:'Giá Sheets',amount:r.sheetPrice,currency:r.currency,scope:'chưa có giá số'}],priceStatus:'Tham khảo, chưa duyệt: không dùng làm giá bán, giá vốn hay hoa hồng; ngày đọc không phải ngày hiệu lực.',gaps:r.gaps,notes:r.notes,sourceUrl:r.url,sheetRange:s?.sources?.[0]?.range||''}};
}
function draftItinerary(id:string,why:string):TourOption|null{
 const s=findQuoteSource(id);if(!s)return null;
 return {id,title:s.title,guestName:null,kind:'draft',readAt:'',verification:'Lịch trình Draft từ Sheets; chưa có nhà cung cấp, giá hay điều kiện xác nhận',why,guestFacts:[],considerations:[],
  internal:{prices:[{label:s.priceText,amount:s.sourcePrice,currency:s.currency,scope:s.priceMeaning}],priceStatus:'Chưa có giá; không báo giá cho khách.',gaps:s.gaps||[],notes:[String(s.conditions||'')].filter(Boolean),sourceUrl:s.sources?.[0]?.url||'',sheetRange:s.sources?.[0]?.range||''}};
}

// facts: current guest profile; text: all guest messages of this conversation (latest last).
export function tourAdvice(input:{propertyId:string;facts:GuestFact[];text:string;stayStart?:string}):TourAdvice{
 const itinerary=input.facts.filter(f=>f.category==='itinerary');
 const status:TourAdvice['status']=!itinerary.length?'none':itinerary.some(f=>f.status==='interested')?'interested':itinerary.some(f=>f.status==='deferred')?'deferred':'declined';
 const n=normalize(input.text),c=constraintsOf(input.text);
 const found=destinations.filter(d=>d.re.test(n));
 const advice:TourAdvice={destinations:found.map(d=>({key:d.key,label:d.label})),status,constraints:c,options:[],guestAllowed:input.propertyId===TOUR_SOURCE_PROPERTY,questions:[],rules:[],internal:[]};
 if(status!=='interested')return advice;
 const add=(o:TourOption|null)=>{if(o&&advice.options.length<2&&!advice.options.some(x=>x.id===o.id))advice.options.push(o);};
 const nb=found.some(d=>d.key==='ninh_binh'),hl=found.some(d=>d.key==='ha_long');
 if(nb&&hl&&c.multiDay)add(researched('R75-TST-036','Khách nêu cả Ninh Bình và Hạ Long, đi nhiều ngày'));
 if(nb){
  if(/thung ui|am tien/.test(n))add(researched('R75-TST-028','Khách nêu Thung Ui / Am Tiên'));
  if(c.multiDay&&!hl)add(draftItinerary('R75-NB02','Khách muốn ở Ninh Bình qua đêm'));
  add(researched('R75-TST-021','Chương trình Ninh Bình phổ biến đã đối chiếu nguồn: Hoa Lư, Tràng An, Hang Múa'));
 }
 if(hl){if(c.multiDay&&!nb)add(draftItinerary('R75-BAY03','Khách muốn ngủ đêm trên vịnh'));else add(researched('R75-TST-046','Khách quan tâm Hạ Long trong ngày'));}
 if(found.some(d=>d.key==='hanoi_city'))add(researched('R75-TST-003','Khách quan tâm tour Hà Nội'));
 for(const [re,id] of otherDrafts)if(re.test(n))add(draftItinerary(id,'Khách nêu điểm đến này; chỉ có lịch Draft'));
 const ids=advice.options.map(o=>o.id);
 // Advisory rules that matter for the selected options.
 const wanted=['AI04','AI05','AI21',...(c.children||c.mobility?['AI17']:[]),...(hl?['AI11']:[]),...(ids.includes('R75-TST-003')?['AI09']:[]),...(c.multiDay?['AI06']:[])];
 advice.rules=(sourceRules as {id:string;title:string;text:string}[]).filter(r=>wanted.includes(r.id)).map(r=>({id:r.id,title:r.title,text:r.text}));
 // At most one question, only if it changes the choice and the guest has not answered it.
 if(c.children&&!c.childAges.length)advice.questions.push({en:'Could you let us know the children’s ages? Child conditions differ by age.',vi:'Bạn cho mình biết tuổi của các bé nhé? Điều kiện cho trẻ em khác nhau theo độ tuổi.',evidence:[]});
 else if(advice.options.length&&(!c.date||!c.party))advice.questions.push({en:`Could you let us know ${!c.date&&!c.party?'your preferred date and how many people will join':!c.date?'your preferred date':'how many people will join'}?`,vi:`Bạn cho mình biết ${!c.date&&!c.party?'ngày dự kiến đi và số người tham gia':!c.date?'ngày dự kiến đi':'số người tham gia'} nhé?`,evidence:[]});
 if(ids.includes('R75-TST-021')&&c.mobility)advice.internal.push(`Khách nêu hạn chế vận động ("${c.mobility}"): Hang Múa nhiều bậc. Cua/NCC kiểm tra phương án bỏ chặng leo trước khi tư vấn chắc chắn.`);
 if(ids.includes('R75-TST-046'))advice.internal.push('Dragon King: giá tại bến KHÔNG áp dụng cho gói có xe từ Hà Nội; chọn đúng gói trước khi báo giá.');
 if(ids.includes('R75-TST-036'))advice.internal.push('Ninh Bình–Hạ Long 3N2Đ: mức tiền hiện có chỉ là phần Ninh Bình, CHƯA gồm du thuyền; không dùng làm tổng.');
 if(ids.includes('R75-TST-028'))advice.internal.push('Thung Ui: chưa có giá số; mốc tuổi trẻ em trong nguồn chưa rõ.');
 if(!advice.guestAllowed&&advice.options.length)advice.internal.push('Kho tour là nguồn 75PHT; chưa có căn cứ cơ sở này bán các gói trên. Phương án chỉ hiển thị nội bộ, Cua xác nhận trước khi giới thiệu cho khách.');
 if(found.length&&!advice.options.length)advice.internal.push('Không tìm thấy chương trình có nguồn phù hợp với điểm đến khách nêu. Cua soạn hoặc bổ sung nguồn; không tự viết chương trình.');
 return advice;
}

// Guest-facing paragraph from sourced lines only. No amounts, no supplier codes, no links.
export function tourParagraph(a:TourAdvice,vi:boolean):string{
 if(!a.guestAllowed||!a.options.length)return '';
 const k=vi?'vi':'en',known:string[]=[];
 if(a.constraints.date)known.push(vi?`ngày ${a.constraints.date}`:`your date (${a.constraints.date})`);
 if(a.constraints.party)known.push(vi?`số người bạn đã cho (${a.constraints.party})`:`your group (${a.constraints.party})`);
 const parts:string[]=[];
 for(const o of a.options){
  if(o.kind==='researched'&&o.guestName){
   parts.push((vi?`Với ${o.guestName.vi}: `:`For the ${o.guestName.en}: `)+o.guestFacts.map(f=>f[k]).join(' ')+(o.considerations.length?' '+o.considerations.map(f=>f[k]).join(' '):''));
   if(o.id==='R75-TST-021'&&a.constraints.mobility)parts.push(vi?'Vì bạn có nhắc đến việc hạn chế đi lại, mình sẽ kiểm tra trước phương án phù hợp với chặng leo Hang Múa rồi báo lại để bạn quyết định.':'As you mentioned limited mobility, we will check a suitable arrangement for the Mua Cave climb first and let you decide.');
  }else parts.push(vi?`Mình có thể gửi bạn một lịch trình gợi ý cho ${o.title}; nhà cung cấp, quyền lợi và giá cụ thể sẽ được kiểm tra trước khi bạn quyết định.`:`We can share a suggested itinerary for this destination; the operator, inclusions and price will be checked before you decide.`);
 }
 parts.push(vi?`Mình sẽ kiểm tra ${known.length?known.join(' và ')+', ':''}hạng xe, điểm đón từ khách sạn, quyền lợi cụ thể và giá cuối cùng trước khi bạn quyết định.`:`We will check ${known.length?known.join(' and ')+', ':''}the vehicle class, pick-up from the hotel, the exact inclusions and the final price before you decide.`);
 if(a.questions[0])parts.push(a.questions[0][k]);
 return parts.join('\n\n');
}

// Pre-save checks on any guest-facing draft (rules, template or AI). hard=true blocks approval.
export type DraftProblem={hard:boolean;text:string};
const negated=/\b(?:not (?:yet )?(?:confirmed|guaranteed|booked|reserved)|cannot (?:be )?(?:confirmed|guaranteed)|unconfirmed|before (?:it is )?confirmed|until (?:it is )?confirmed)\b|chưa (?:được )?(?:xác nhận|đặt|bố trí|đảm bảo)/gi;
export function guestDraftProblems(body:string,ctx:{facts:GuestFact[];advice?:TourAdvice;known?:{date?:boolean;party?:boolean}}):DraftProblem[]{
 const out:DraftProblem[]=[],n=normalize(body);
 const money=body.match(/(?:\$|€|£|usd|vnd|vnđ)\s?\d[\d.,]*|\d[\d.,]*\s?(?:usd|vnd|vnđ|đồng|dong|₫|k\b|nghìn|triệu)|\d{1,3}(?:[.,]\d{3}){1,3}(?:\s?(?:đ|d)\b)?/i);
 if(money)out.push({hard:true,text:`Nội dung gửi khách có số tiền ("${money[0]}") trong khi chưa có giá được Cua duyệt. Xóa giá hoặc dùng báo giá đã duyệt.`});
 const leak=body.match(/R75-[A-Z0-9-]+|TST-\d+|docs\.google|spreadsheets|giá vốn|hoa hồng|commission|contract (?:cost|price)|markup|\+\s?1[05]%|\+\s?20%|nguồn nội bộ|reference only|tham khảo nội bộ/i);
 if(leak)out.push({hard:true,text:`Nội dung gửi khách lộ thông tin nội bộ ("${leak[0]}").`});
 const promise=body.replace(negated,' ').match(/\b(?:confirmed|guaranteed|we have booked|is booked|has been booked|reserved for you|has been arranged|we have arranged)\b|đã (?:xác nhận|đặt chỗ|bố trí|sắp xếp xong)|đảm bảo/i);
 if(promise)out.push({hard:false,text:`Có câu như đã xác nhận/đặt ("${promise[0]}"): kiểm tra căn cứ trước khi duyệt.`});
 const asks=body.split(/(?<=[.!?])\s+|\n+/).map(normalize).filter(x=>/\?$/.test(x)||/(?:could|can|would) you (?:please )?(?:let us know|share|tell)|please (?:let us know|share|tell)|cho (?:minh|toi|chung toi) biet/.test(x));
 const has=(c:GuestFact['category'])=>ctx.facts.some(f=>f.category===c);
 if(has('arrival')&&asks.some(x=>/what time|arrival time|when (?:will|do) you (?:arrive|reach)|may gio|gio (?:den|toi)/.test(x)))out.push({hard:false,text:'Nháp hỏi lại giờ đến khách đã cung cấp.'});
 if(ctx.known?.date&&asks.some(x=>/which date|what date|preferred date|when would you like|ngay (?:nao|du kien)/.test(x)))out.push({hard:false,text:'Nháp hỏi lại ngày khách đã cung cấp.'});
 if(ctx.known?.party&&asks.some(x=>/how many (?:people|persons|guests|adults)|so nguoi/.test(x)))out.push({hard:false,text:'Nháp hỏi lại số người khách đã cung cấp.'});
 const destinationsKnown=ctx.advice?.destinations.length||ctx.facts.some(f=>f.category==='itinerary'&&f.status!=='interested');
 if(destinationsKnown&&asks.some(x=>/places you would like to visit|plans for your time|what (?:are your|would you like to do)|ke hoach|du dinh|lich trinh di dau/.test(x)))out.push({hard:false,text:'Nháp hỏi chung chung về kế hoạch dù khách đã nêu điểm đến hoặc muốn bàn sau.'});
 // The main destination the guest asked about must be addressed.
 for(const d of ctx.advice?.status==='interested'?ctx.advice.destinations:[])if(!normalize(body).includes(normalize(d.label.en))&&!normalize(body).includes(normalize(d.label.vi))&&!(d.key==='ha_long'&&/ha long|halong/.test(n))&&!(d.key==='hanoi_city'&&/hanoi|ha noi/.test(n)))out.push({hard:false,text:`Nháp chưa trả lời điểm đến khách hỏi (${d.label.vi}).`});
 // Activities of different packages must not be merged into one sentence.
 const marks:Record<string,RegExp>={'R75-TST-021':/mua cave|hang mua|trang an/,'R75-TST-028':/thung ui|am tien/,'R75-TST-046':/dragon king|sung sot|ti ?top|luon cave/};
 for(const s of body.split(/(?<=[.!?])\s+|\n+/).map(normalize)){const hit=Object.entries(marks).filter(([,re])=>re.test(s)).map(([id])=>id);if(hit.length>1){out.push({hard:false,text:'Một câu đang gộp hoạt động của nhiều tour khác nhau; tách theo từng gói.'});break;}}
 return out;
}

// Version of the tour sources a draft relied on; a change makes approved drafts that used them stale.
export const tourDataVersion=`${tourResearch.version}/${tourResearch.readAt}/${sourceReadAt}`;
export const tourEvidenceTag=(v=tourDataVersion)=>`[nguồn tour ${v}]`;
export function usesStaleTourData(notes:string){const m=notes.match(/\[nguồn tour ([^\]]+)\]/);return Boolean(m&&m[1]!==tourDataVersion);}
// Internal note kept with each draft version: what was used, read date, verification, unresolved items.
export function tourEvidenceNote(a:TourAdvice):string{
 if(!a.options.length&&!a.internal.length)return '';
 const lines=a.options.map(o=>`${o.id} · ${o.title} · ${o.verification}${o.internal.sheetRange?' · '+o.internal.sheetRange:''} · Giá: ${o.internal.prices.map(p=>`${p.label}=${p.amount===null?'chưa có':p.amount.toLocaleString('vi-VN')+' '+p.currency}${p.scope?' ('+p.scope+')':''}`).join('; ')} · ${o.internal.priceStatus}`);
 return ['Kiến thức tour '+tourEvidenceTag()+':',...lines,...a.internal,...a.rules.map(r=>`${r.id} ${r.title}: ${r.text}`)].join('\n');
}
// What the AI may use: the selected options only, with provenance and price status.
export function tourKnowledgeForAI(a:TourAdvice){
 return {guestAllowed:a.guestAllowed,status:a.status,destinations:a.destinations.map(d=>d.label.en),known:{date:a.constraints.date||null,party:a.constraints.party||null,children:a.constraints.children,childAges:a.constraints.childAges,mobility:a.constraints.mobility||null},
  options:a.options.map(o=>({id:o.id,name:o.guestName?.en||o.title,kind:o.kind,readAt:o.readAt,verification:o.verification,guestFacts:o.guestFacts.map(f=>f.en),considerations:o.considerations.map(f=>f.en),unresolved:[o.internal.priceStatus,...o.internal.gaps,...o.internal.notes]})),
  suggestedQuestion:a.questions[0]?.en||null,rules:a.rules.map(r=>`${r.id}: ${r.text}`),internalNotes:a.internal};
}
// Replaces the generic rule paragraph about a destination with sourced content (or a neutral line).
export function applyTourAdvice(body:string,a:TourAdvice,vi:boolean):string{
 if(a.status!=='interested'||!a.destinations.length)return body;
 const generic=/(?:For Ninh Binh,|Về Ninh Bình,)[\s\S]*?(?=\n\n|$)/;
 const paragraph=tourParagraph(a,vi)||(vi?`Cảm ơn bạn đã quan tâm ${a.destinations.map(d=>d.label.vi).join(' và ')}. Đội lễ tân sẽ gửi bạn phương án phù hợp cùng các thông tin cần kiểm tra trước khi bạn quyết định.`:`Thank you for your interest in ${a.destinations.map(d=>d.label.en).join(' and ')}. Our team will share suitable options with the details to check before you decide.`);
 if(generic.test(body))return body.replace(generic,paragraph);
 return body?body.replace(/\n\n(?=[^\n]*$)/,`\n\n${paragraph}\n\n`)||body+'\n\n'+paragraph:paragraph;
}
