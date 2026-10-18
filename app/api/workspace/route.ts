import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { seedContacts, products, suppliers, sources } from '../../../lib/demo-data';
import { command, sameOrigin } from '../../../lib/validation';
import { readReception, provenance } from '../../../lib/reception';
import { snapshot } from '../../../lib/source-cases';
export const dynamic='force-dynamic';
const fields=['name','segment','source','status','assignee','due','service_date','adults','children','budget','interest','note','stay'] as const;
function database(){if(!env.DB)throw Error('Database unavailable');return env.DB;}
function response(data:unknown,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
function initialStatements(owner:string){
 const db=database();const entries=seedContacts();
 return [
 ...entries.map(c=>db.prepare(`INSERT OR IGNORE INTO contacts (owner,id,${fields.join(',')},version,updated) VALUES (${Array(17).fill('?').join(',')})`).bind(owner,c.id,...fields.map(f=>c[f]),c.version,c.updated)),
 ...entries.map(c=>db.prepare('INSERT OR IGNORE INTO messages (owner,id,contact_id,direction,body,created) VALUES (?,?,?,?,?,?)').bind(owner,`seed-${c.id}`,c.id,'in',c.message,c.updated)),
 db.prepare('INSERT OR IGNORE INTO activity (owner,id,contact_id,detail,created) VALUES (?,?,?,?,?)').bind(owner,'seed','', 'Đã tạo bộ demo: 20 khách và hội thoại giả lập.',new Date().toISOString()),
 db.prepare('INSERT OR IGNORE INTO settings (owner,seed_version) VALUES (?,1)').bind(owner),
 ];
}
async function ensureSeed(owner:string){
 const db=database();const exists=await db.prepare('SELECT seed_version FROM settings WHERE owner=?').bind(owner).first<{seed_version:number}>();
 if(!exists)await db.batch(initialStatements(owner));
 if((exists?.seed_version||1)<2){
  const statements=snapshot.cases.flatMap(s=>{
   const c=s.contact;
   return [db.prepare(`INSERT OR IGNORE INTO contacts (owner,id,${fields.join(',')},version,updated,reception) VALUES (${Array(18).fill('?').join(',')})`).bind(owner,c.id,...fields.map(f=>c[f]),1,c.updated,JSON.stringify(c.reception)),
   ...(s.customerText?[db.prepare('INSERT OR IGNORE INTO messages (owner,id,contact_id,direction,body,created) VALUES (?,?,?,?,?,?)').bind(owner,'source-'+s.id,s.id,'in',s.customerText,snapshot.capturedAt)]:[])];
  });
  for(let i=0;i<statements.length;i+=60)await db.batch(statements.slice(i,i+60));
  await db.batch([db.prepare('INSERT OR IGNORE INTO activity (owner,id,contact_id,detail,created) VALUES (?,?,?,?,?)').bind(owner,snapshot.version,'',`Đã liên kết ${snapshot.cases.length} hồ sơ nguồn ẩn danh và ${snapshot.coverage.withConversation} hội thoại từ Sheets. Không ghi ngược nguồn.`,snapshot.capturedAt),db.prepare('UPDATE settings SET seed_version=2 WHERE owner=?').bind(owner)]);
 }
}
export async function GET(){
 const user=await getChatGPTUser();if(!user)return response({error:'Vui lòng đăng nhập.'},401);
 try{await ensureSeed(user.userId);const db=database();const [contacts,messages,activity,drafts]=await Promise.all([
 db.prepare(`SELECT id,${fields.join(',')},version,updated,reception FROM contacts WHERE owner=? ORDER BY updated DESC`).bind(user.userId).all(),
 db.prepare('SELECT id,contact_id,direction,body,created FROM messages WHERE owner=? ORDER BY created,id').bind(user.userId).all(),
 db.prepare('SELECT id,contact_id,detail,created FROM activity WHERE owner=? ORDER BY created DESC LIMIT 100').bind(user.userId).all(),
 db.prepare('SELECT contact_id,revision,body,status,context_key,source_ids,created,approved_at FROM reply_drafts WHERE owner=? ORDER BY contact_id,revision').bind(user.userId).all(),
 ]);return response({replyDrafts:drafts.results,contacts:contacts.results.map(c=>({...c,reception:readReception(c.reception)})),provenance,messages:messages.results,activity:activity.results,products,suppliers,sources,mode:'simulation',seedVersion:2,sourceSnapshot:{version:snapshot.version,capturedAt:snapshot.capturedAt,coverage:snapshot.coverage}});
 }catch(e){console.error('Workspace read failed',e instanceof Error?e.message:'unknown');return response({error:'Chưa đọc được dữ liệu. Vui lòng thử lại.'},500);}
}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return response({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return response({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const raw=await request.text();if(raw.length>32000)return response({error:'Nội dung quá dài.'},413);
 let parsed;try{parsed=command.safeParse(JSON.parse(raw));}catch{return response({error:'Dữ liệu không hợp lệ.'},400);}
 if(!parsed.success)return response({error:'Kiểm tra tên, ngày, số người, ngân sách và nội dung bắt buộc.'},400);
 const input=parsed.data,owner=user.userId,db=database(),now=new Date().toISOString();
 const audit=(id:string,contact:string,detail:string)=>db.prepare('INSERT OR IGNORE INTO activity (owner,id,contact_id,detail,created) VALUES (?,?,?,?,?)').bind(owner,id,contact,detail,now);
 try{
 if(input.action==='reset'){
  await db.batch([
   db.prepare('DELETE FROM reply_drafts WHERE owner=?').bind(owner),db.prepare('DELETE FROM messages WHERE owner=?').bind(owner),db.prepare('DELETE FROM contacts WHERE owner=?').bind(owner),
   db.prepare('DELETE FROM activity WHERE owner=?').bind(owner),db.prepare('DELETE FROM settings WHERE owner=?').bind(owner),...initialStatements(owner),
  ]);return response({ok:true});
 }
 await ensureSeed(owner);
 if(input.action==='create'){
  await db.batch([
   db.prepare(`INSERT OR IGNORE INTO contacts (owner,id,${fields.join(',')},version,updated) VALUES (${Array(17).fill('?').join(',')})`).bind(owner,input.id,...fields.map(f=>input.contact[f]),1,now),
   audit('create-'+input.id,input.id,`Tạo khách mẫu: ${input.contact.name}`),
  ]);return response({ok:true,id:input.id});
 }
 const id=input.action==='message'?input.contactId:input.id;
 const c=await db.prepare('SELECT id,version FROM contacts WHERE owner=? AND id=?').bind(owner,id).first<{id:string;version:number}>();
 if(!c)return response({error:'Không tìm thấy hồ sơ.'},404);
 if(input.action==='reception'){
  if(input.contact.children&&!/^(?:[0-9]|1[0-7])(?:\s*,\s*(?:[0-9]|1[0-7]))*$/.test(input.contact.children))return response({error:'Tuổi trẻ dùng số 0–17, phân cách bằng dấu phẩy; chưa biết để trống.'},400);
  const result=await db.prepare(`UPDATE contacts SET ${fields.map(f=>`${f}=?`).join(',')},reception=?,version=version+1,updated=? WHERE owner=? AND id=? AND version=? RETURNING id`).bind(...fields.map(f=>input.contact[f]),JSON.stringify(input.reception),now,owner,id,input.version).first();
  if(!result)return response({error:'Hồ sơ đã đổi. Tải lại trước khi lưu lễ tân.'},409);
  await audit(crypto.randomUUID(),id,`Lễ tân cập nhật hồ sơ chung · ${input.reception.requests.filter(r=>r.status==='handoff').length} yêu cầu bàn giao sales · cần rà lại báo giá đã duyệt.`).run();
  return response({ok:true});
 }
 if(input.action==='update'){
  const result=await db.prepare(`UPDATE contacts SET ${fields.map(f=>`${f}=?`).join(',')},version=version+1,updated=? WHERE owner=? AND id=? AND version=? RETURNING id`).bind(...fields.map(f=>input.contact[f]),now,owner,id,input.version).first();
  if(!result)return response({error:'Hồ sơ đã thay đổi ở nơi khác. Tải lại trước khi sửa.'},409);
  await audit(crypto.randomUUID(),id,`Cập nhật hồ sơ · người phụ trách: ${input.contact.assignee} · ngày dịch vụ: ${input.contact.service_date||'chưa có'} · ghi chú: ${input.contact.note||'chưa có'}`).run();
  return response({ok:true});
 }
 await db.batch([
  db.prepare('INSERT OR IGNORE INTO messages (owner,id,contact_id,direction,body,created) VALUES (?,?,?,?,?,?)').bind(owner,input.id,id,input.direction,input.body,now),
  db.prepare('UPDATE contacts SET updated=? WHERE owner=? AND id=?').bind(now,owner,id),
  audit('message-'+input.id,id,input.direction==='in'?'Thêm tin khách mô phỏng.':'Ghi phản hồi mô phỏng · không gửi WhatsApp.'),
 ]);return response({ok:true});
 }catch(e){console.error('Workspace write failed',e instanceof Error?e.message:'unknown');return response({error:'Không lưu được thay đổi. Vui lòng thử lại.'},500);}
}
