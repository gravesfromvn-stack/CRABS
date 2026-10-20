// Places a guest is coming FROM ("arriving from Halong Bay directly", "after Ninh Binh") are their
// previous stop, not a tour request. Works on normalized text (lowercase, no diacritics).
const PLACE='(?:ha ?long(?: bay)?|halong(?: bay)?|lan ha(?: bay)?|cat ba(?: island)?|ninh binh|trang an|tam coc|sa ?pa|ha giang|cao bang|mai chau|pu luong|hue|hoi an|da nang|phong nha|ho chi minh(?: city)?|saigon|nha trang|phu quoc|da lat|luang prabang|bangkok|thanh hoa|hai phong|vinh|nghe an|quang ninh|moc chau|tam dao|ha noi|hanoi)';
const ORIGIN=[
 new RegExp(`\\b(?:(?:coming|arriving|travel+ing|returning|driving|transferring|heading|back|straight|directly)\\s+(?:back\\s+|directly\\s+|straight\\s+)?)?from\\s+(?:the\\s+)?(${PLACE})`,'g'),
 new RegExp(`\\bafter\\s+(?:our\\s+|the\\s+|a\\s+)?(?:(?:trip|tour|cruise|stay|night|visit|days?)\\s+(?:to|in|at|on)\\s+)?(${PLACE})`,'g'),
 new RegExp(`\\btu\\s+(${PLACE})\\s+(?:ve|den|toi|sang|qua)\\b`,'g'),
 // Where the guest is now, before travelling to the hotel ("I am in Sapa now", "currently in Cat Ba").
 new RegExp(`\\b(?:i am|i'm|we are|we're|am|are|currently|still|now)\\s+(?:currently\\s+|still\\s+|now\\s+)?(?:in|at)\\s+(${PLACE})`,'g'),
 new RegExp(`\\btu\\s+(${PLACE})\\s+ra\\b`,'g'),
 new RegExp(`\\b(?:spent|stayed|been)\\s+(?:\\w+\\s+){0,3}(?:in|on|at)\\s+(${PLACE})`,'g'),
 // A night/stay already had there ("we had a terrible noisy night in Cat Ba").
 new RegExp(`\\b(?:had|spent|after)\\s+(?:\\w+\\s+){0,4}(?:night|nights|stay|days?|time|trip)\\s+(?:in|on|at)\\s+(${PLACE})`,'g'),
 // Vietnamese: "một đêm rất ồn ào ở Cát Bà", "vừa ở Sa Pa về".
 new RegExp(`\\b(?:dem|may ngay|vua)\\b(?:\\s+\\S+){0,4}?\\s+o\\s+(${PLACE})`,'g'),
 // Flight routes into Hanoi ("Route: Da Nang → Hanoi").
 new RegExp(`(${PLACE})\\s*(?:→|->|=>|–|-|to)\\s*(?:ha ?noi|noi bai)\\b`,'g'),
];
// A "from X" phrase is a place to visit when it is part of a tour/trip offer ("day trip from Hanoi to Ha Long").
const offer=/\b(?:tour|trip|excursion|cruise)\s+from\b/;

export function travelOrigins(n:string):string[]{
 const out=new Set<string>();
 for(const sentence of n.split(/(?<=[.!?\n])\s*/)){if(offer.test(sentence))continue;for(const re of ORIGIN)for(const m of sentence.matchAll(re))out.add(m[1].replace(/\s+/g,' ').trim());}
 return [...out];
}
// The text with origin phrases removed, for destination/tour-interest detection.
export function withoutOrigins(n:string):string{
 return n.split(/(?<=[.!?\n])\s*/).map(sentence=>offer.test(sentence)?sentence:ORIGIN.reduce((s,re)=>s.replace(re,' '),sentence)).join(' ');
}
