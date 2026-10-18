import {normalize} from './ota-profile';

// What the latest guest message is doing. Detected from the guest's words only; an inference
// is labelled as such and never becomes a booking, a confirmation or an approved price.
export const intentLabels={info:'Hỏi thông tin',compare:'So sánh phương án',price:'Hỏi giá',interest:'Bày tỏ quan tâm',book:'Muốn đặt',confirm:'Xác nhận lựa chọn',change:'Đổi / hủy',decline:'Từ chối',later:'Để sau'} as const;
export type Intent=keyof typeof intentLabels;
export type IntentRead={intents:Intent[];confirms:{target:string;known:boolean}|null;notes:string[]};

const shortYes=/^(?:yes|yeah|yep|ok(?:ay)?|sure|sounds (?:good|great)|great|perfect|deal|let'?s do (?:it|that)|that works|dong y|ok luon|duoc|vang|co)\b[\s!.,]*(?:please|thanks?|thank you|cam on)?[\s!.,]*$/;
// The last thing the hotel asked, from what was actually sent (or approved) before this message.
function lastQuestion(outgoing:string){
 const qs=outgoing.split(/(?<=[.!?])\s+|\n+/).map(s=>s.trim()).filter(s=>/\?\s*$/.test(s));
 return qs.at(-1)||'';
}
export function readIntent(latest:string,lastOutgoing=''):IntentRead{
 const n=normalize(latest),intents=new Set<Intent>(),notes:string[]=[];
 if(/how much|price|cost|rate|fee|bao nhieu|\bgia\b(?! dinh| han)/.test(n))intents.add('price');
 if(/compare|difference|which (?:one|option|is better)|or (?:the )?(?:other|second)|khac nhau|so sanh|nen chon/.test(n))intents.add('compare');
 if(/(?:want|would like|'d like|wish|ready) to book|please book|book (?:it|this|that|the)|reserve|we(?:'ll| will) take|dat (?:tour|xe|giup)|chot/.test(n))intents.add('book');
 if(/cancel|change (?:the |my |our )?(?:date|booking|time)|(?:change|move|switch) (?:it )?to|instead of|reschedule|move (?:it|the)|huy|doi (?:ngay|sang|qua)/.test(n))intents.add('change');
 if(/(?:no|not|don'?t|do not) (?:need|want)|no thanks|not interested|khong can|khong muon/.test(n))intents.add('decline');
 if(/later|when we arrive|upon arrival|after (?:we )?arriv|another time|de sau|trao doi sau|khi den/.test(n))intents.add('later');
 if(/interested|would love|keen|thinking (?:of|about)|maybe|might|quan tam|muon di/.test(n))intents.add('interest');
 if(/\?|could you (?:tell|share|let)|what (?:is|are|time)|is there|do you have|can you|co .* khong/.test(n))intents.add('info');
 let confirms:IntentRead['confirms']=null;
 if(shortYes.test(n)){
  intents.add('confirm');const q=lastQuestion(lastOutgoing);
  confirms={target:q,known:Boolean(q)};
  notes.push(q?`Khách trả lời "${latest.trim().slice(0,40)}" cho câu: "${q.slice(0,200)}". Chỉ xác nhận đúng nội dung câu đó; các dịch vụ khác chưa được khách xác nhận.`:`Khách trả lời "${latest.trim().slice(0,40)}" nhưng không có câu hỏi gần nhất đã gửi để đối chiếu: Cua kiểm tra khách đồng ý điều gì.`);
 }
 if(/\b(?:maybe|might|possibly|perhaps|co the)\b/.test(n))notes.push('Khách dùng từ như "maybe/có thể": ghi nhận là quan tâm, chưa phải quyết định.');
 if(intents.has('book'))notes.push('Khách muốn đặt: CRABS chưa đặt, giữ chỗ hay xác nhận nhà cung cấp. Cua kiểm tra đúng gói, ngày và giá đã duyệt; tạo việc Lễ tân khi khách đồng ý có căn cứ.');
 return {intents:[...intents],confirms,notes};
}
