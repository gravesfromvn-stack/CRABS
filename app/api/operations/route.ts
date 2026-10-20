import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {sameOrigin} from '../../../lib/validation';
import {operationsCommand,managerAlerts,type OperationInput} from '../../../lib/operations';
import {operationsSources,operationsState,readFlags,tourSalesAllowed,type TaskRow} from '../../../lib/operations-store';
import {hash} from '../../../lib/ota';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// ?view=alerts: only the manager escalation list (banner on every screen).
export async function GET(request?:Request){const user=await getChatGPTUser();if(!user)return response({error:'Vui lòng đăng nhập.'},401);try{if(!env.DB)throw Error('DB');const view=request?new URL(request.url).searchParams.get('view'):'';
 // ?view=settings: switches only (top bar), without reading every conversation.
 if(view==='settings')return response({settings:{allowReceptionistTourSales:tourSalesAllowed(await readFlags(env.DB,user.userId))}});
 const s=await operationsState(env.DB,user.userId);if(request&&new URL(request.url).searchParams.get('view')==='alerts')return response({alerts:managerAlerts(s.sources,s.handoffs,s.flags),settings:s.settings});return response(s);}catch(e){console.error('Operations read failed',e instanceof Error?e.message:'unknown');return response({error:'Chưa đọc được vận hành. Kiểm tra database local đã áp dụng migration 0010.'},500);}}
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return response({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return response({error:'Nguồn yêu cầu không hợp lệ.'},403);
 const raw=await request.text();if(raw.length>24000)return response({error:'Nội dung quá dài.'},413);
 let parsed;try{parsed=operationsCommand.safeParse(JSON.parse(raw));}catch{return response({error:'Dữ liệu không hợp lệ.'},400);}
 if(!parsed.success)return response({error:parsed.error.issues.map(i=>i.message).join(' ')},400);
 const c=parsed.data,db=env.DB;if(!db)return response({error:'Database chưa sẵn sàng.'},503);
 const owner=user.userId,now=new Date().toISOString(),actor='Chủ tài khoản',commandHash=await hash(JSON.stringify(c));
 try{
 const replay=await db.prepare('SELECT command_hash FROM ops_history WHERE owner=? AND operation_id=?').bind(owner,c.operationId).first<{command_hash:string}>();
 if(replay)return replay.command_hash===commandHash?response({ok:true,replayed:true,id:'id' in c?c.id:c.key}):response({error:'Mã thao tác đã dùng cho nội dung khác.'},409);
 if(c.action==='save'){
 const source=(await operationsSources(db,owner)).find(s=>s.kind===c.sourceKind&&s.id===c.sourceId);if(!source)return response({error:'Không tìm thấy đúng hồ sơ nguồn.'},404);
 if(source.propertyId==='unverified'&&(c.task.state==='done'||c.task.supplierStatus==='confirmed'))return response({error:'Cần đối chiếu cơ sở trước khi xác nhận hoặc hoàn tất dịch vụ.'},409);
 const old=await db.prepare('SELECT * FROM ops_tasks WHERE owner=? AND id=?').bind(owner,c.id).first<TaskRow>();
 if(old&&(old.source_kind!==c.sourceKind||old.source_id!==c.sourceId))return response({error:'Không chuyển công việc sang booking khác.'},409);
 if((old?.version||0)!==c.version)return response({error:'Công việc đã đổi. Tải lại trước khi lưu.'},409);
 if(c.task.reviewedSourceKey!==source.sourceKey)return response({error:'Nguồn có thay đổi. Đọc lại tin khách và đánh dấu đã đối chiếu trước khi lưu.'},409);
 const prev=old?JSON.parse(old.payload) as OperationInput:null;
 if(prev&&prev.reviewedSourceKey!==source.sourceKey&&c.task.supplierStatus==='confirmed'&&c.task.supplierEvidence===prev.supplierEvidence)return response({error:'Tin khách đã đổi. Ghi căn cứ xác nhận mới hoặc đưa nhà cung cấp về chờ kiểm tra.'},409);
 const scheduleChanged=prev&&(prev.serviceDate!==c.task.serviceDate||prev.serviceTime!==c.task.serviceTime||prev.kind!==c.task.kind);
 if(scheduleChanged&&c.task.supplierStatus==='confirmed'&&c.task.supplierEvidence===prev?.supplierEvidence)return response({error:'Lịch hoặc dịch vụ đã đổi; cần xác nhận lại nhà cung cấp.'},409);
 if(prev&&prev.state!==c.task.state&&['done','cancelled'].includes(prev.state)&&!c.task.note)return response({error:'Ghi lý do mở lại công việc.'},400);
 const payload=JSON.stringify(c.task);
 const write=old?db.prepare('UPDATE ops_tasks SET payload=?,version=version+1,updated=?,last_operation=? WHERE owner=? AND id=? AND version=?').bind(payload,now,c.operationId,owner,c.id,c.version):db.prepare('INSERT OR IGNORE INTO ops_tasks(owner,id,source_kind,source_id,version,payload,updated,last_operation) VALUES(?,?,?,?,1,?,?,?)').bind(owner,c.id,c.sourceKind,c.sourceId,payload,now,c.operationId);
 const detail=(old?'Cập nhật':'Tạo việc')+' · '+c.task.title+' · '+c.task.state;
 const result=await db.batch([write,db.prepare('INSERT OR IGNORE INTO ops_history(owner,operation_id,task_id,actor,detail,payload,command_hash,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ops_tasks WHERE owner=? AND id=? AND last_operation=?)').bind(owner,c.operationId,c.id,actor,detail,payload,commandHash,now,owner,c.id,c.operationId)]);
 if(!result[0].meta.changes)return response({error:'Công việc đã được lưu ở lượt khác; tải lại để kiểm tra.'},409);
 return response({ok:true,id:c.id});
 }
 if(c.action==='handoff'){
 const result=await db.batch([db.prepare('INSERT OR IGNORE INTO ops_handoffs(owner,id,property_id,day,shift,recipient,body,actor,created,last_operation,room,booking_ref,stage,category,author) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(owner,c.id,c.propertyId,c.day,c.shift,c.recipient,c.body,actor,now,c.operationId,c.room,c.bookingRef,c.stage,c.category,c.author),db.prepare('INSERT OR IGNORE INTO ops_history(owner,operation_id,task_id,actor,detail,payload,command_hash,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ops_handoffs WHERE owner=? AND id=? AND last_operation=?)').bind(owner,c.operationId,c.id,actor,'Bàn giao ca · '+c.shift,JSON.stringify(c),commandHash,now,owner,c.id,c.operationId)]);
 if(!result[0].meta.changes)return response({error:'Bàn giao đã tồn tại; tải lại để kiểm tra.'},409);return response({ok:true,id:c.id});
 }
 if(c.action==='flag'){
 const detail=c.key.startsWith('setting:')?`Cài đặt ${c.key.slice(8)} = ${c.value}`:c.key.startsWith('room:')?`Trạng thái phòng · ${c.value}`:c.key.startsWith('complaint:')?(c.value==='resolved'?'Đã giải quyết phàn nàn':'Mở lại phàn nàn'):`Checklist ca · ${c.value||'bỏ đánh dấu'}`;
 await db.batch([db.prepare('INSERT INTO ops_flags(owner,key,value,actor,updated,last_operation) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,key) DO UPDATE SET value=excluded.value,actor=excluded.actor,updated=excluded.updated,last_operation=excluded.last_operation').bind(owner,c.key,c.value,actor,now,c.operationId),db.prepare('INSERT OR IGNORE INTO ops_history(owner,operation_id,task_id,actor,detail,payload,command_hash,created) VALUES(?,?,?,?,?,?,?,?)').bind(owner,c.operationId,c.key,actor,detail,JSON.stringify(c),commandHash,now)]);
 return response({ok:true,key:c.key});
 }
 const result=await db.batch([db.prepare('UPDATE ops_handoffs SET received_at=?,received_by=?,last_operation=? WHERE owner=? AND id=? AND received_at=?').bind(now,actor,c.operationId,owner,c.id,''),db.prepare('INSERT OR IGNORE INTO ops_history(owner,operation_id,task_id,actor,detail,payload,command_hash,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM ops_handoffs WHERE owner=? AND id=? AND last_operation=?)').bind(owner,c.operationId,c.id,actor,'Đã tiếp nhận bàn giao',JSON.stringify(c),commandHash,now,owner,c.id,c.operationId)]);
 return result[0].meta.changes?response({ok:true}):response({error:'Bàn giao không tồn tại hoặc đã được tiếp nhận.'},409);
 }catch(e){console.error('Operations write failed',e instanceof Error?e.message:'unknown');return response({error:'Chưa lưu được. Tải lại để kiểm tra kết quả trước khi thử lại.'},500);}
}
