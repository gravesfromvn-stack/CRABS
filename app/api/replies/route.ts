import { env } from 'cloudflare:workers';
import { z } from 'zod';
import { getChatGPTUser } from '../../chatgpt-auth';
import { sameOrigin,type Contact,type Message } from '../../../lib/validation';
import { readReception } from '../../../lib/reception';
import { suggestReply,contextKey } from '../../../lib/replies';
import { snapshot,sourceCase,sourceReviewPlan } from '../../../lib/source-cases';
export const dynamic='force-dynamic';
function database(){if(!env.DB)throw Error('Database unavailable');return env.DB;}
const res=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('prepareSources'),contactIds:z.array(z.string().min(1).max(100)).min(1).max(8).refine(ids=>new Set(ids).size===ids.length)}),
 z.object({action:z.literal('save'),contactId:z.string().min(1).max(100),operationId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),contextKey:z.string().length(64),body:z.string().trim().min(1).max(4000)}),
 z.object({action:z.literal('approve'),contactId:z.string().min(1).max(100),revision:z.number().int().positive(),contextKey:z.string().length(64)})
]);
async function state(owner:string,id:string){
 const raw=await database().prepare('SELECT * FROM contacts WHERE owner=? AND id=?').bind(owner,id).first<Contact>();
 if(!raw)return null;
 const {owner:ignored,...contact}=raw as Contact&{owner:string};void ignored;
 const c={...contact,reception:readReception(raw.reception)};
 const m=await database().prepare('SELECT id,contact_id,direction,body,created FROM messages WHERE owner=? AND contact_id=? ORDER BY created,id').bind(owner,id).all<Message>();
 return {c,m:m.results,key:await contextKey(c,m.results)};
}
async function reviewQueue(owner:string){
 const [contacts,messages,drafts]=await Promise.all([
  database().prepare('SELECT * FROM contacts WHERE owner=?').bind(owner).all<Contact>(),
  database().prepare('SELECT id,contact_id,direction,body,created FROM messages WHERE owner=? ORDER BY created,id').bind(owner).all<Message>(),
  database().prepare('SELECT contact_id,revision,status,context_key FROM reply_drafts WHERE owner=? ORDER BY revision DESC').bind(owner).all<{contact_id:string;revision:number;status:string;context_key:string}>()
 ]);
 const items=await Promise.all(snapshot.cases.filter(s=>s.customerText).map(async source=>{
  const raw=contacts.results.find(c=>c.id===source.id),plan=sourceReviewPlan(source.id)!;
  if(!raw)return {id:source.id,name:source.contact.name,...plan,status:'not_imported',revision:0};
  const {owner:ignored,...contact}=raw as Contact&{owner:string};void ignored;
  const c={...contact,reception:readReception(raw.reception)},m=messages.results.filter(x=>x.contact_id===c.id);
  const latest=drafts.results.find(d=>d.contact_id===c.id);
  const status=latest?(latest.context_key!==await contextKey(c,m)?'stale':latest.status):suggestReply(c,m).body?'missing':'needs_review';
  return {id:c.id,name:c.name,...plan,status,revision:latest?.revision||0};
 }));
 return {items,counts:{total:items.length,pending:items.filter(x=>x.status==='pending').length,approved:items.filter(x=>x.status==='approved').length,missing:items.filter(x=>x.status==='missing').length,needsReview:items.filter(x=>['stale','needs_review','not_imported'].includes(x.status)).length}};
}
async function prepareSources(owner:string,ids:string[],now:string){
 if(ids.some(id=>!sourceCase(id)?.customerText))return res({error:'Chỉ chuẩn bị các hội thoại có lời khách trong bản đọc Sheets.'},400);
 const results=[];
 for(const id of ids){
  const existing=await database().prepare('SELECT revision FROM reply_drafts WHERE owner=? AND contact_id=? LIMIT 1').bind(owner,id).first();
  if(existing){results.push({id,status:'preserved'});continue;}
  const s=await state(owner,id);
  if(!s){results.push({id,status:'not_imported'});continue;}
  const suggestion=suggestReply(s.c,s.m);
  if(!suggestion.body){results.push({id,status:'needs_review'});continue;}
  const saved=await database().prepare(`INSERT OR IGNORE INTO reply_drafts (owner,contact_id,revision,operation_id,body,status,context_key,source_ids,created) SELECT ?,?,1,?,?,'pending',?,?,? WHERE NOT EXISTS(SELECT 1 FROM reply_drafts WHERE owner=? AND contact_id=?) AND EXISTS(SELECT 1 FROM contacts WHERE owner=? AND id=? AND version=? AND updated=?) AND (SELECT COUNT(*) FROM messages WHERE owner=? AND contact_id=?)=? RETURNING revision`).bind(owner,id,`source-review-2026-10-15-${id}`,suggestion.body,s.key,JSON.stringify(suggestion.sources),now,owner,id,owner,id,s.c.version,s.c.updated,owner,id,s.m.length).first();
  results.push({id,status:saved?'created':'changed'});
  if(saved)await database().prepare('INSERT OR IGNORE INTO activity (owner,id,contact_id,detail,created) VALUES (?,?,?,?,?)').bind(owner,`reply-${id}-1-save`,id,'Lưu nháp chờ Cua duyệt v1 từ hội thoại Sheets · chưa gửi khách.',now).run();
 }
 return res({ok:true,results});
}
export async function GET(request:Request){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);
 try{const params=new URL(request.url).searchParams;if(params.get('queue')==='source')return res(await reviewQueue(u.userId));const id=params.get('contactId')||'';const s=await state(u.userId,id);if(!s)return res({error:'Không tìm thấy hồ sơ.'},404);
 const drafts=await database().prepare('SELECT contact_id,revision,body,status,context_key,source_ids,created,approved_at FROM reply_drafts WHERE owner=? AND contact_id=? ORDER BY revision DESC').bind(u.userId,id).all();
 return res({suggestion:suggestReply(s.c,s.m),contextKey:s.key,drafts:drafts.results.map(d=>({...d,stale:d.context_key!==s.key}))});
 }catch{return res({error:'Chưa đọc được bản nháp.'},500);}
}
export async function POST(request:Request){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return res({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let p;try{const raw=await request.text();if(raw.length>18000)return res({error:'Nội dung quá dài.'},413);p=input.safeParse(JSON.parse(raw));}catch{return res({error:'Dữ liệu không hợp lệ.'},400);}
 if(!p.success)return res({error:'Kiểm tra nội dung và phiên bản bản nháp.'},400);
 const v=p.data,owner=u.userId,now=new Date().toISOString();
 try{
 if(v.action==='prepareSources')return await prepareSources(owner,v.contactIds,now);
 const id=v.contactId;
 if(v.action==='save'){
 const prior=await database().prepare('SELECT contact_id,revision,body FROM reply_drafts WHERE owner=? AND operation_id=?').bind(owner,v.operationId).first<{contact_id:string;revision:number;body:string}>();
 if(prior)return prior.contact_id===id&&prior.body===v.body?res({ok:true,revision:prior.revision}):res({error:'Mã thao tác đã dùng cho nội dung khác.'},409);
 }
 const s=await state(owner,id);if(!s)return res({error:'Không tìm thấy hồ sơ.'},404);
 if(s.key!==v.contextKey)return res({error:'Khách hoặc hồ sơ vừa thay đổi. Tải lại, xem lại dữ kiện rồi tạo phiên bản mới.'},409);
 const guard=`EXISTS(SELECT 1 FROM contacts WHERE owner=? AND id=? AND version=? AND updated=?) AND (SELECT COUNT(*) FROM messages WHERE owner=? AND contact_id=?)=?`;
 const args=[owner,id,s.c.version,s.c.updated,owner,id,s.m.length];
 let revision:number;
 if(v.action==='save'){
 revision=v.expectedRevision+1;
 const saved=await database().prepare(`INSERT OR IGNORE INTO reply_drafts (owner,contact_id,revision,operation_id,body,status,context_key,source_ids,created) SELECT ?,?,?,?,?,?,?,?,? WHERE COALESCE((SELECT MAX(revision) FROM reply_drafts WHERE owner=? AND contact_id=?),0)=? AND ${guard} RETURNING revision`).bind(owner,id,revision,v.operationId,v.body,'pending',s.key,JSON.stringify(suggestReply(s.c,s.m).sources),now,owner,id,v.expectedRevision,...args).first();
 if(!saved)return res({error:'Có thay đổi đồng thời. Tải lại bản nháp mới nhất; nội dung bạn sửa vẫn giữ trên màn hình.'},409);
 }else{
 revision=v.revision;
 const approved=await database().prepare(`UPDATE reply_drafts SET status='approved',approved_at=COALESCE(approved_at,?) WHERE owner=? AND contact_id=? AND revision=? AND context_key=? AND revision=(SELECT MAX(revision) FROM reply_drafts WHERE owner=? AND contact_id=?) AND ${guard} RETURNING revision`).bind(now,owner,id,revision,s.key,owner,id,...args).first();
 if(!approved)return res({error:'Chỉ duyệt bản mới nhất khi dữ kiện khách vẫn khớp. Hãy tải lại.'},409);
 }
 await database().prepare('INSERT OR IGNORE INTO activity (owner,id,contact_id,detail,created) VALUES (?,?,?,?,?)').bind(owner,`reply-${id}-${revision}-${v.action}`,id,`${v.action==='approve'?'Đã duyệt':'Lưu nháp chờ duyệt'} phản hồi v${revision} · chưa gửi khách.`,now).run();
 return res({ok:true,revision});
 }catch{return res({error:'Chưa lưu được bản nháp. Tải lại và thử tiếp.'},500);}
}
