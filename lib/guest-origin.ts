// Places a guest is coming FROM ("arriving from Halong Bay directly", "after Ninh Binh") are their
// previous stop, not a tour request. Works on normalized text (lowercase, no diacritics).
const PLACE='(?:ha ?long(?: bay)?|halong(?: bay)?|lan ha(?: bay)?|cat ba(?: island)?|ninh binh|trang an|tam coc|sa ?pa|ha giang|cao bang|mai chau|pu luong|hue|hoi an|da nang|phong nha|ho chi minh(?: city)?|saigon|nha trang|phu quoc|da lat|luang prabang|bangkok)';
const ORIGIN=[
 new RegExp(`\\b(?:(?:coming|arriving|travel+ing|returning|driving|transferring|heading|back|straight|directly)\\s+(?:back\\s+|directly\\s+|straight\\s+)?)?from\\s+(?:the\\s+)?(${PLACE})`,'g'),
 new RegExp(`\\bafter\\s+(?:our\\s+|the\\s+|a\\s+)?(?:(?:trip|tour|cruise|stay|night|visit|days?)\\s+(?:to|in|at|on)\\s+)?(${PLACE})`,'g'),
 new RegExp(`\\btu\\s+(${PLACE})\\s+(?:ve|den|toi|sang|qua)\\b`,'g'),
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
