'use client';
import {TrendingUp} from 'lucide-react';
import {profitSummary,profitCells,monthLabel,PROFIT_KINDS} from '../lib/service-profit';

const vnd=(n:number)=>new Intl.NumberFormat('vi-VN').format(Math.round(n))+'đ';
const million=(n:number)=>(n/1e6).toLocaleString('vi-VN',{maximumFractionDigits:1})+' tr';
const pct=(x:number)=>(x*100).toLocaleString('vi-VN',{maximumFractionDigits:1})+'%';
const COLORS:Record<string,string>={Tour:'#c9a24a',Spa:'#5fa38a','Xe sân bay':'#6d8fb5','Giặt là':'#8c8c8c'};

// Real service results from the hotel sheets (Aug–Oct 2026), not simulated data.
export default function ServiceProfitDashboard({compact=false}:{compact?:boolean}){
 const s=profitSummary();
 const months=s.months;
 const max=Math.max(...months.map(m=>profitCells.filter(c=>c.month===m&&(PROFIT_KINDS as readonly string[]).includes(c.kind)).reduce((a,c)=>a+c.revenue,0)));
 const kpis=<div className="pf-kpis">
  <div><small>Doanh thu Tour + Spa</small><strong>{million(s.revenue)}</strong><span>{vnd(s.revenue)}</span></div>
  <div><small>Giá vốn nhà cung cấp</small><strong>{million(s.cost)}</strong><span>{vnd(s.cost)}</span></div>
  <div className="hl"><small>Lãi gộp</small><strong>{million(s.profit)}</strong><span>{vnd(s.profit)}</span></div>
  <div className="hl"><small>Biên lãi gộp</small><strong>{pct(s.margin)}</strong><span>{s.completeMonths.map(monthLabel).join(' + ')}</span></div>
 </div>;
 if(compact)return <section className="panel pf-compact" aria-label="Hiệu quả dịch vụ thực tế"><div className="pf-head"><TrendingUp size={16}/><strong>Hiệu quả dịch vụ thực tế · {s.completeMonths.map(monthLabel).join(' + ')}</strong><a className="text-button" href="#profit">Xem chi tiết →</a></div>{kpis}<p className="muted">Số liệu ghi nhận trong Sheets dịch vụ của khách sạn, chưa đối soát kế toán. Lãi gộp chưa trừ hoa hồng nhân viên (nguồn không ghi).</p></section>;
 return <section className="page pf-page">
  <div className="page-heading compact"><div><span className="eyebrow">SỐ LIỆU THỰC TẾ · SHEETS DỊCH VỤ KHÁCH SẠN · ĐỌC {new Date(s.readAt).toLocaleDateString('vi-VN')}</span><h1>Hiệu quả dịch vụ</h1><p>Doanh thu, giá vốn và lãi gộp của Tour và Spa trong các tháng có đủ giá vốn cho mọi giao dịch.</p></div></div>
  {kpis}
  <div className="pf-grid">
   <article className="panel"><h2>Doanh thu theo tháng · Tour + Spa</h2>
    <div className="pf-bars">{months.map(m=>{const cells=profitCells.filter(c=>c.month===m&&(PROFIT_KINDS as readonly string[]).includes(c.kind));const rev=cells.reduce((a,c)=>a+c.revenue,0),cost=cells.reduce((a,c)=>a+(c.cost??0),0),full=s.completeMonths.includes(m);
     return <div className="pf-bar" key={m}><div className="pf-col" style={{height:`${Math.round(rev/max*100)}%`}}><span className="pf-profit" style={{height:`${Math.round((rev-cost)/rev*100)}%`}} title={`Lãi gộp ${vnd(rev-cost)}`}/></div><b>{million(rev)}</b><small>{monthLabel(m)}{full?'':' · ước tính'}</small></div>;})}</div>
    <p className="pf-legend"><i className="c-rev"/>Doanh thu <i className="c-profit"/>Phần lãi gộp</p></article>
   <article className="panel"><h2>Cơ cấu lãi gộp · {s.completeMonths.map(monthLabel).join(' + ')}</h2>
    <div className="pf-donut" style={{background:`conic-gradient(${COLORS.Tour} 0 ${s.byKind[0].profit/s.profit*100}%, ${COLORS.Spa} 0 100%)`}}><div><strong>{million(s.profit)}</strong><small>lãi gộp</small></div></div>
    <ul className="pf-mix">{s.byKind.map(k=><li key={k.kind}><i style={{background:COLORS[k.kind]}}/><b>{k.kind}</b> {million(k.profit)} · {pct(k.profit/s.profit)} tổng lãi · biên {pct(k.margin)}</li>)}</ul></article>
  </div>
  <article className="panel table-wrap"><h2>Chi tiết theo tháng</h2><table><thead><tr><th>Tháng</th><th>Dịch vụ</th><th>Giao dịch</th><th>Doanh thu</th><th>Giá vốn</th><th>Lãi gộp</th><th>Biên</th><th>Ghi chú</th></tr></thead>
   <tbody>{profitCells.filter(c=>(PROFIT_KINDS as readonly string[]).includes(c.kind)).sort((a,b)=>a.month.localeCompare(b.month)||a.kind.localeCompare(b.kind)).map(c=><tr key={c.kind+c.month}><td>{monthLabel(c.month)}</td><td>{c.kind}</td><td>{c.rows}</td><td>{vnd(c.revenue)}</td><td>{c.cost===null?'—':vnd(c.cost)}</td><td>{c.profit===null?'—':vnd(c.profit)}</td><td>{c.profit===null?'—':pct(c.profit/c.revenue)}</td><td>{c.complete?'Đủ giá vốn':`${c.rows-c.costedRows}/${c.rows} dòng chưa có giá vốn · ước tính, không tính vào tổng`}</td></tr>)}</tbody></table></article>
  <article className="panel"><h2>Dịch vụ có doanh thu nhưng chưa có giá vốn</h2><ul>{s.revenueOnly.map(r=><li key={r.kind}><b>{r.kind}</b>: {vnd(r.revenue)} ({r.months.map(monthLabel).join(', ')}). Chưa có giá vốn trong nguồn nên không tính lãi.</li>)}</ul></article>
  <p className="tk-boundary">{s.disclaimer} Lãi gộp = doanh thu ghi nhận − giá vốn ghi nhận; chưa trừ hoa hồng nhân viên vì nguồn không ghi. Từ nay, các dịch vụ bán qua CRABS ghi đủ giá bán, giá vốn và hoa hồng trong Kho dịch vụ & giá, nên lãi sau hoa hồng sẽ tính được chính xác.</p>
 </section>;
}
