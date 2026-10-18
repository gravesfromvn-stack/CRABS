import {referenceAmount} from '../lib/quote-sources';
import type {TourResearch} from '../lib/tour-research';
import './tour-knowledge.css';

export default function TourResearchNote({review}:{review?:TourResearch}) {
 if(!review)return null;
 return <section className="tk-research" aria-label={'Đối chiếu website '+review.id}>
  <span className="eyebrow">WEBSITE · ĐỌC {review.checkedAt} · CHƯA DUYỆT GIÁ</span>
  <h4>{review.outcome}</h4>
  <p>Sheets ghi: <b>{referenceAmount(review.sheetPrice)}</b>. Mức website dưới đây là tham khảo; chưa có hiệu lực giá bán tại khách sạn.</p>
  {review.variants.length?<ul className="tk-rates">{review.variants.map(v=><li key={v.label}><span>{v.label}<small>{v.scope}</small></span><b>{referenceAmount(v.amount,review.currency)}</b></li>)}</ul>:<p><b>Chưa công bố giá số. Cần nhà cung cấp báo giá.</b></p>}
  <dl><dt>Lịch trình</dt><dd>{review.route}</dd><dt>Bao gồm theo website</dt><dd>{review.includes}</dd><dt>Chưa bao gồm</dt><dd>{review.excludes}</dd><dt>Trẻ em</dt><dd>{review.children}</dd></dl>
  <ul>{[...review.notes,...review.gaps].map((n,i)=><li key={i}>{n}</li>)}</ul>
  <a href={review.url} target="_blank" rel="noreferrer">Mở trang sản phẩm đã đối chiếu ↗</a>
  {review.advisoryUrl&&<p><a href={review.advisoryUrl} target="_blank" rel="noreferrer">Thông báo lịch tu bổ · Báo điện tử Chính phủ ↗</a></p>}
 </section>;
}
