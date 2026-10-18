import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {sameOrigin} from '../../../../lib/validation';
import {channels,properties} from '../../../../lib/ota';
import {situationCodes,situationLabels} from '../../../../lib/ota-templates';
import {allTemplates,approvedReplies,saveTemplate,retireTemplate,TemplateError} from '../../../../lib/ota-template-store';
import {refreshDrafts} from '../../../../lib/ota-store';
export const dynamic='force-dynamic';
const res=(d:unknown,status=200)=>Response.json(d,{status,headers:{'Cache-Control':'no-store'}});
const mutations=z.discriminatedUnion('action',[
 // confirmed:true is Cua's explicit permission to reuse this text for other guests in the chosen scope.
 z.object({action:z.literal('save'),operationId:z.string().uuid(),templateId:z.string().min(1).max(60).optional(),title:z.string().trim().min(3).max(120),body:z.string().trim().min(20).max(6000),situations:z.array(z.enum(situationCodes)).min(1).max(situationCodes.length),properties:z.array(z.string()).min(1).max(properties.length),channels:z.array(z.enum(channels)).max(channels.length),sourceThread:z.string().max(100).optional(),sourceRevision:z.number().int().positive().optional(),confirmed:z.literal(true)}),
 z.object({action:z.literal('retire'),templateId:z.string().min(1).max(60),confirmed:z.literal(true)})
]);
export async function GET(){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);
 try{const db=env.DB!;return res({templates:await allTemplates(db,u.userId),approved:await approvedReplies(db,u.userId),situations:situationCodes.map(code=>({code,label:situationLabels[code]})),properties,channels});}
 catch{console.error('Template read failed');return res({error:'Chưa đọc được mẫu phản hồi.'},500);}
}
export async function POST(request:Request){
 const u=await getChatGPTUser();if(!u)return res({error:'Vui lòng đăng nhập.'},401);if(!sameOrigin(request))return res({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let v;try{const raw=await request.text();if(raw.length>30000)return res({error:'Nội dung quá dài.'},413);v=mutations.parse(JSON.parse(raw));}catch{return res({error:'Kiểm tra nội dung mẫu và mục xác nhận cho phép dùng lại.'},400);}
 const db=env.DB!;
 try{
  if(v.action==='retire'){const changed=await retireTemplate(db,u.userId,v.templateId);return changed?res({ok:true}):res({error:'Mẫu không tồn tại hoặc đã ngừng dùng.'},404);}
  const saved=await saveTemplate(db,u.userId,v);
  // A newly allowed template is offered to open conversations; approved, sent and Cua-written drafts are untouched.
  const summary=saved.duplicate?{}:await refreshDrafts(db,u.userId);
  return res({ok:true,...saved,refresh:summary});
 }catch(e){if(e instanceof TemplateError)return res({error:e.message,problems:e.problems},e.status);console.error('Template write failed');return res({error:'Chưa lưu được mẫu. Tải lại và thử tiếp.'},500);}
}
