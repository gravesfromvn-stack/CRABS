// WhatsApp/phone number a guest wrote in their own messages. Read from guest text only (never
// from OTA footers), and only international or clearly labelled numbers, to avoid booking ids.
export type GuestContact={whatsapp:string;display:string;quote:string}|null;
const labelled=/(?:whats\s?app|\bwa\b|zalo|viber|phone|mobile|cell|tel|sđt|số điện thoại|so dien thoai|call me|contact me)[^\d+\n]{0,25}(\+?\d[\d\s().-]{7,18}\d)/i;
const international=/(?:^|[^\w])(\+\d[\d\s().-]{7,18}\d)/;
export function guestContact(texts:string[]):GuestContact{
 for(const text of [...texts].reverse()){
  const m=text.match(labelled)||text.match(international);if(!m)continue;
  const digits=m[1].replace(/[^\d+]/g,'');const plain=digits.replace(/^\+/,'');
  if(plain.length<9||plain.length>15)continue;
  // Vietnamese local numbers (0xxxxxxxxx) become +84 for WhatsApp links.
  const whatsapp=digits.startsWith('+')?plain:plain.startsWith('0')&&plain.length===10?'84'+plain.slice(1):plain;
  return {whatsapp,display:m[1].trim(),quote:m[0].trim().slice(0,120)};
 }
 return null;
}
export function whatsappLink(c:NonNullable<GuestContact>,message:string){return `https://wa.me/${c.whatsapp}?text=${encodeURIComponent(message)}`;}
