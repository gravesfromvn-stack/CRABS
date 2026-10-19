import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {sameOrigin} from '../../../lib/validation';
import {catalogCommand,seedVersion,type CatalogEntry} from '../../../lib/service-catalog';
import {loadCatalog,saveEntry,applyEdit,describeChange,catalogHistory} from '../../../lib/service-catalog-store';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export async function GET(){
 const user=await getChatGPTUser();if(!user)return reply({error:'Vui lòng đăng nhập.'},401);
 try{const db=env.DB!;return reply({entries:await loadCatalog(db,user.userId),history:await catalogHistory(db,user.userId),seedVersion});}
 catch(e){console.error('Catalog read failed',e instanceof Error?e.message:'unknown');return reply({error:'Chưa đọc được kho dịch vụ. Kiểm tra database local đã áp dụng migration 0011.'},500);}
}

export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let input;try{const raw=await request.text();if(raw.length>20000)return reply({error:'Nội dung quá dài.'},413);const parsed=catalogCommand.safeParse(JSON.parse(raw));
  if(!parsed.success)return reply({error:parsed.error.issues.map(i=>i.message).join(' ')||'Dữ liệu không hợp lệ.'},400);input=parsed.data;}catch{return reply({error:'Dữ liệu không hợp lệ.'},400);}
 const db=env.DB!,owner=user.userId,actor=user.userId;
 try{
  const entries=await loadCatalog(db,owner);
  if(input.action==='create'){
   const id='SV-'+input.operationId.slice(0,8).toUpperCase();
   const base:CatalogEntry={id,crmCode:null,sourceIds:[],highlights:[],place:'',sourceNote:'Thêm trên ứng dụng.',sourceUrl:'',approvedBy:'',approvedAt:'',...input.entry};
   const entry=applyEdit({...base,status:'REFERENCE_ONLY'},input.entry,actor,today());
   const r=await saveEntry(db,owner,{operationId:input.operationId,id,version:0,entry,detail:describeChange(null,entry),actor});
   return r.ok?reply({ok:true,id}):reply({error:'Mã dịch vụ đã tồn tại.'},409);
  }
  const prev=entries.find(e=>e.id===input.id);if(!prev)return reply({error:'Không tìm thấy dịch vụ.'},404);
  const {version:_v,updated:_u,...prevEntry}=prev;
  const entry=applyEdit(prevEntry,input.entry,actor,today());
  const r=await saveEntry(db,owner,{operationId:input.operationId,id:input.id,version:input.version,entry,detail:describeChange(prevEntry,entry),actor});
  return r.ok?reply({ok:true,id:input.id}):reply({error:'Dịch vụ vừa được sửa ở nơi khác. Tải lại rồi sửa tiếp.'},409);
 }catch(e){console.error('Catalog write failed',e instanceof Error?e.message:'unknown');return reply({error:'Không lưu được dịch vụ.'},500);}
}
