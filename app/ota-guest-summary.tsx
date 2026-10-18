'use client';
import {profileCategories,profileLabels,profileStatuses,type GuestProfile} from '../lib/ota-profile';
export function GuestSummary({profile,source}:{profile:GuestProfile;source:(id:string)=>string}){
 return <section className="ota-guest-profile" aria-label="Hồ sơ nhu cầu khách"><div className="ota-profile-title"><strong>Nhu cầu đã ghi nhận</strong><span>Đã lưu trong CRM</span></div><div className="ota-profile-grid">{profileCategories.map(category=>{
  const facts=profile.facts.filter(f=>f.category===category);
  if(!facts.length&&['departure','stay'].includes(category))return null;
  return <div key={category} className={'ota-profile-field '+(category==='room'||category==='stay'?'wide':'')}><h3>{profileLabels[category]}</h3>{facts.length?facts.map((f,i)=><div key={i}><p>{f.summary}</p><span className={'ota-profile-status '+f.status}>{profileStatuses[f.status]}</span><details><summary>Lời khách làm nguồn</summary>{f.sources.map((s,j)=><blockquote key={j}>{s.quote} <a href={source(s.eventId)} target="_blank" rel="noopener noreferrer">Email nguồn ↗</a></blockquote>)}</details></div>):<p className="ota-profile-unknown">{category==='room'?'Chưa thấy yêu cầu đặc biệt':category==='arrival'?'Chưa có giờ đến':'Chưa xác nhận'}</p>}</div>;
 })}</div><small className="ota-profile-help">{profile.warning||'Tóm tắt AI từ lời khách · cập nhật khi nhận tin mới.'} Yêu cầu đã ghi nhận chưa phải xác nhận đặt phòng hoặc dịch vụ.</small></section>;
}
