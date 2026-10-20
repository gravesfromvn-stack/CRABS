'use client';
import type {CatalogEntry} from '../lib/service-catalog';

// Supplier photos, timed itinerary and policies of a catalog entry (read-only).
export function EntryMedia({entry:e,compact=false}:{entry:Pick<CatalogEntry,'images'|'itinerary'|'policies'|'title'>;compact?:boolean}){
 const days=[...new Set((e.itinerary||[]).map(s=>s.day))];
 return <div className="entry-media">
  {!!e.images?.length&&<div className="em-images">{e.images.slice(0,compact?2:6).map(img=><figure key={img.src}><a href={img.src} target="_blank" rel="noopener noreferrer"><img src={img.src} alt={img.caption} loading="lazy" referrerPolicy="no-referrer"/></a><figcaption>{img.caption}</figcaption></figure>)}</div>}
  {!!e.itinerary?.length&&<div className="em-itinerary"><strong>Lịch trình theo giờ (theo tài liệu nhà cung cấp)</strong>{days.map(d=><div key={d} className="em-day">{days.length>1&&<b>Ngày {d}</b>}<ol>{e.itinerary!.filter(s=>s.day===d).map((s,i)=><li key={i}><time>{s.time}</time><span>{s.text}{s.meal?<em> · {s.meal}</em>:''}</span></li>)}</ol></div>)}</div>}
  {!compact&&!!e.policies?.length&&<ul className="em-policies">{e.policies.map(p=><li key={p}>{p}</li>)}</ul>}
 </div>;
}
