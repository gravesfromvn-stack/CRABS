import {suggestedDraft} from './ota';
import {followupDraft,ruleProfileWithHistory,normalize,type GuestProfile} from './ota-profile';
import {tourAdvice,applyTourAdvice,tourParagraph,guestDraftProblems} from './tour-advice';
import {placesIn} from './rate-catalog';
import {serviceReply,applyServiceReply} from './service-replies';
import {approvedAmounts} from './hotel-policy-config';
import {guestContact} from './guest-contact';
import {planReply,type Template} from './ota-templates';
import type {Stay} from './ota-stay';

// Turn-by-turn reply simulation for one conversation: after each guest message, the reply the
// system would prepare with only what was known at that moment, treating earlier simulated
// replies as sent. Nothing is saved or sent; Cua reads it as a rehearsal.
export type ChatTurn={role:'guest'|'hotel';text:string;at:string;kind:'guest'|'simulated';source?:'template'|'rules'|'fallback';template?:string;notes:string[];eventId?:string};
type Ev={id:string;guest_text:string;received:string;kind:string;guest_name?:string;full_text?:string};
const vietnamese=(s:string)=>/[ăâđêôơư]|\b(toi|minh|ban|khach san|san bay)\b/i.test(s);
const later=(iso:string,minutes:number)=>new Date(Date.parse(iso)+minutes*60000).toISOString();

export function simulateConversation(input:{thread:{id:string;property_id:string;channel:string;booking_id:string};events:Ev[];stay?:Stay;templates:Template[]}):ChatTurn[]{
 const guest=input.events.filter(e=>e.kind==='guest'&&e.guest_text).sort((a,b)=>a.received.localeCompare(b.received));
 const turns:ChatTurn[]=[];const sent:{body:string;created:string}[]=[];
 // Messages sent a few minutes apart are one turn: the hotel answers them together.
 const groups:Ev[][]=[];
 for(const e of guest){const g=groups.at(-1);if(g&&Date.parse(e.received)-Date.parse(g.at(-1)!.received)<=15*60000)g.push(e);else groups.push([e]);}
 let seen=0;
 for(const group of groups){
  for(const e of group)turns.push({role:'guest',text:e.guest_text,at:e.received,kind:'guest',notes:[],eventId:e.id});
  seen+=group.length;
  const e=group.at(-1)!,prior=guest.slice(0,seen),text=group.map(x=>x.guest_text).join('\n'),vi=vietnamese(text);
  const history=guest.slice(0,seen-group.length).map(x=>x.guest_text).join('\n');
  const facts=ruleProfileWithHistory(prior).facts;
  const profile:GuestProfile={facts,method:'rules',updated:'',sourceKey:'simulation',warning:''};
  const advice=tourAdvice({propertyId:input.thread.property_id,facts,text:prior.map(x=>x.guest_text).join('\n'),latestText:text,lastOutgoing:sent.at(-1)?.body||'',stayStart:input.stay?.checkIn});
  // Tour content only when this message talks about a trip; earlier tour interest is not repeated.
  const tourNow=advice.status==='interested'&&(placesIn(text).length>0||/\btour|trip|sightsee|excursion|cruise|tham quan|lich trinh/.test(normalize(text)));
  const contact=guestContact(prior.map(x=>x.guest_text));
  const service=serviceReply({propertyId:input.thread.property_id,text,facts,vi,tourInterested:tourNow,hasContact:Boolean(contact),tourPlaces:advice.destinations.map(d=>d.label.vi),history});
  const plan=planReply({thread:input.thread,events:prior,sent,stay:input.stay,profile,tourParagraph:tourNow?tourParagraph(advice,vi):'',serviceInfo:service.paragraphs.join('\n\n')},input.templates);
  let body='',source:ChatTurn['source']='rules';const notes:string[]=[];
  if(plan.template&&plan.body){body=plan.body;source='template';}
  else{
   const r=followupDraft(suggestedDraft(text),profile,text,sent);
   body=applyServiceReply(tourNow?applyTourAdvice(r.body,advice,vi):r.body,service);
   // applyServiceReply adds the greeting when the reply is made only of service paragraphs.
   notes.push(...plan.reasons.slice(0,3));
  }
  if(!body){body=vi?'Cảm ơn bạn đã nhắn tin. Lễ tân sẽ kiểm tra và phản hồi bạn sớm.':'Thank you for your message. Our reception team will check and get back to you shortly.';source='fallback';notes.push('Chưa có quy tắc/mẫu cho nội dung này: Cua soạn câu trả lời thật.');}
  notes.push(...service.internal);
  for(const p of guestDraftProblems(body,{facts,advice,allowedAmounts:approvedAmounts(input.thread.property_id)}))notes.push((p.hard?'Chặn duyệt: ':'Lưu ý: ')+p.text);
  const at=later(e.received,15);
  turns.push({role:'hotel',text:body,at,kind:'simulated',source,template:plan.template?.title,notes:[...new Set(notes)]});
  sent.push({body,created:at});
 }
 return turns;
}
