import {CARE} from './reply-language-care';
// Short replies in the guest's own language for the common case: the guest gives an arrival time
// (or arrives late at night). Longer requests stay in English and Cua uses the translate button.
// Placeholders: {time}, {checkIn}. Cua reviews every draft before sending.
type Phrases={hello:string;arrival:string;early:string;reception:string;held:string;closing:string};
const P:Record<string,Phrases>={
 he:{hello:'שלום, תודה על ההודעה.',arrival:'תודה שעדכנת אותנו בשעת ההגעה. רשמנו את שעת ההגעה המשוערת: בסביבות {time}. הצ\'ק-אין הרגיל מתחיל בשעה {checkIn}.',early:'אם החדר יהיה מוכן בהגעתך, נשמח לאפשר צ\'ק-אין מוקדם; אם לא, ניתן להשאיר את המזוודות בקבלה ללא תשלום ולהתרענן בשירותי הלובי בזמן ההמתנה.',reception:'הקבלה שלנו פתוחה 24/7 ותשמח לקבל את פניך בכל שעה.',held:'החדר שמור עבורך לפי ההזמנה, וניתן לבצע צ\'ק-אין מיד עם ההגעה בסביבות {time}.',closing:'נשמח לארח אותך.\nבברכה,\nצוות הקבלה'},
 ru:{hello:'Здравствуйте, спасибо за ваше сообщение.',arrival:'Спасибо, что сообщили время прибытия. Мы отметили, что вы приедете около {time}; стандартное время заселения — с {checkIn}.',early:'Если номер будет готов к вашему приезду, мы с радостью заселим вас раньше; если нет, вы можете бесплатно оставить багаж на стойке регистрации и освежиться в туалетной комнате в лобби, пока ждёте.',reception:'Наша стойка регистрации работает круглосуточно и будет рада встретить вас в любое время.',held:'Ваш номер забронирован за вами, поэтому вы сможете заселиться сразу по прибытии около {time}.',closing:'Будем рады вас видеть.\nС уважением,\nслужба приёма'},
 fr:{hello:'Bonjour, merci pour votre message.',arrival:'Merci de nous avoir indiqué votre heure d\'arrivée. Nous avons bien noté votre arrivée vers {time} ; l\'enregistrement se fait à partir de {checkIn}.',early:'Si votre chambre est prête à votre arrivée, nous vous l\'attribuerons volontiers plus tôt ; sinon, vous pouvez déposer gratuitement vos bagages à la réception et vous rafraîchir dans les toilettes du hall en attendant.',reception:'Notre réception est ouverte 24h/24 et vous accueillera à toute heure.',held:'Votre chambre vous est réservée, vous pourrez donc vous enregistrer dès votre arrivée vers {time}.',closing:'Au plaisir de vous accueillir.\nCordialement,\nL\'équipe de la réception'},
 es:{hello:'Hola, gracias por su mensaje.',arrival:'Gracias por indicarnos su hora de llegada. Hemos anotado su llegada sobre las {time}; el check-in estándar es a partir de las {checkIn}.',early:'Si su habitación está lista cuando llegue, con gusto le haremos el check-in antes; si no, puede dejar su equipaje gratis en recepción y refrescarse en el baño del vestíbulo mientras espera.',reception:'Nuestra recepción está abierta las 24 horas y le recibirá a cualquier hora.',held:'Su habitación está reservada para usted, así que podrá hacer el check-in en cuanto llegue, sobre las {time}.',closing:'Será un placer recibirle.\nSaludos cordiales,\nEquipo de recepción'},
 de:{hello:'Hallo, vielen Dank für Ihre Nachricht.',arrival:'Danke, dass Sie uns Ihre Ankunftszeit mitgeteilt haben. Wir haben Ihre Ankunft gegen {time} Uhr notiert; der Check-in ist regulär ab {checkIn} Uhr möglich.',early:'Wenn Ihr Zimmer bei Ihrer Ankunft bereit ist, checken wir Sie gerne früher ein; andernfalls können Sie Ihr Gepäck kostenlos an der Rezeption abgeben und sich während der Wartezeit in der Toilette in der Lobby frisch machen.',reception:'Unsere Rezeption ist rund um die Uhr geöffnet und empfängt Sie zu jeder Zeit.',held:'Ihr Zimmer ist für Sie reserviert, Sie können also gleich bei Ihrer Ankunft gegen {time} Uhr einchecken.',closing:'Wir freuen uns auf Ihren Besuch.\nMit freundlichen Grüßen\nIhr Rezeptionsteam'},
 zh:{hello:'您好，感谢您的留言。',arrival:'感谢您告知抵达时间。我们已记录您预计约{time}抵达；标准入住时间为{checkIn}起。',early:'如果您抵达时房间已准备好，我们很乐意为您提前办理入住；如尚未准备好，您可以将行李免费寄存在前台，并在大堂洗手间稍作整理休息。',reception:'我们的前台24小时开放，随时欢迎您的到来。',held:'您的房间已按预订为您保留，约{time}抵达后即可办理入住。',closing:'期待您的光临。\n前台团队敬上'},
 ja:{hello:'こんにちは。メッセージをありがとうございます。',arrival:'到着時間をお知らせいただきありがとうございます。{time}頃のご到着として承りました。通常のチェックインは{checkIn}からです。',early:'ご到着時にお部屋の準備ができていれば、喜んでアーリーチェックインのご案内をいたします。準備が整っていない場合は、フロントでお荷物を無料でお預かりし、お待ちの間ロビーの化粧室をご利用いただけます。',reception:'フロントは24時間営業しておりますので、何時でもお迎えいたします。',held:'ご予約どおりお部屋をご用意しておりますので、{time}頃のご到着後すぐにチェックインいただけます。',closing:'お会いできるのを楽しみにしております。\nフロントスタッフ一同'},
 ko:{hello:'안녕하세요, 메시지 감사합니다.',arrival:'도착 시간을 알려 주셔서 감사합니다. {time}경 도착하시는 것으로 기록해 두었습니다. 기본 체크인 시간은 {checkIn}부터입니다.',early:'도착하실 때 객실이 준비되어 있으면 기꺼이 얼리 체크인을 도와드리겠습니다. 준비되지 않은 경우 프런트에 짐을 무료로 맡기시고 기다리시는 동안 로비 화장실에서 편히 정리하실 수 있습니다.',reception:'프런트는 24시간 운영되며 언제든지 환영합니다.',held:'예약에 따라 객실이 준비되어 있으니 {time}경 도착하시면 바로 체크인하실 수 있습니다.',closing:'곧 뵙기를 기대합니다.\n프런트 팀 드림'},
};
export const localizedLanguages=Object.keys(P);
// Supported needs for a reply fully in the guest's language; anything else stays in English.
const LOCAL_NEEDS=['arrival','reception_24h','thanks','contact','care','spa_recovery','tour_upsell','excited','anxious'];
export type LocalMeta={sleepy:boolean;origin:string;places:string[];overland:boolean;whatsapp:string};
export function localizedFromNeeds(lang:string,needs:string[],o:{time:string;checkIn:string;night:boolean;meta?:LocalMeta}){
 const p=P[lang],c=CARE[lang];
 if(!p||!c||!needs.length||!needs.every(x=>LOCAL_NEEDS.includes(x)))return null;
 const m=o.meta||{sleepy:false,origin:'',places:[],overland:false,whatsapp:''},v={time:o.time,checkIn:o.checkIn};
 const parts:string[]=[p.hello];
 if(needs.includes('anxious'))parts.push(fill(c.anxious,{whatsapp:m.whatsapp,pickup:m.overland?'':c.pickup}));
 if(needs.includes('reception_24h')&&o.time)parts.push(p.reception+' '+fill(p.held,v));
 else if(needs.includes('arrival')&&o.time)parts.push(fill(p.arrival,v)+(o.time<o.checkIn?' '+p.early:''));
 if(needs.includes('care'))parts.push(fill(m.sleepy?c.empathySleepy:c.empathyTiring,{from:m.origin?fill(c.from,{o:m.origin}):''})+' '+c.quiet);
 if(needs.includes('spa_recovery'))parts.push(c.spa);
 if(needs.includes('excited'))parts.push(c.excited);
 if(needs.includes('tour_upsell')&&m.places.length)parts.push(fill(c.tour,{places:c.join(m.places.map(k=>c.places[k]||k)),transfers:m.overland?c.transfers:''}));
 if(parts.length===1)return null;
 return [...parts,p.closing].join('\n\n');
}
const fill=(s:string,v:Record<string,string>)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');

// Arrival-only reply in the guest's language; null when the language or the situation is not covered.
export function localizedArrivalReply(lang:string,o:{time:string;checkIn:string;kind:'arrival'|'night'|'sameDayLate'}):string|null{
 const p=P[lang];if(!p||!o.time)return null;const v={time:o.time,checkIn:o.checkIn};
 const middle=o.kind==='arrival'?[fill(p.arrival,v)+(o.time<o.checkIn?' '+p.early:'')]:[p.reception+' '+fill(p.held,v)];
 return [p.hello,...middle,p.closing].join('\n\n');
}
