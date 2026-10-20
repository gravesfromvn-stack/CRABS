import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {sameOrigin} from '../../../lib/validation';
import {translateInput,aiTranslate} from '../../../lib/translate';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});

// AI translation for reading only. Without OPENAI_API_KEY it answers 501 so the screen can offer
// the next option (browser translator or Google Translate opened by Cua).
export async function POST(request:Request){
 const user=await getChatGPTUser();if(!user)return reply({error:'Vui lòng đăng nhập.'},401);
 if(!sameOrigin(request))return reply({error:'Nguồn yêu cầu không hợp lệ.'},403);
 let input;try{const raw=await request.text();if(raw.length>14000)return reply({error:'Nội dung quá dài.'},413);const parsed=translateInput.safeParse(JSON.parse(raw));if(!parsed.success)return reply({error:'Dữ liệu dịch không hợp lệ.'},400);input=parsed.data;}catch{return reply({error:'Dữ liệu không hợp lệ.'},400);}
 const key=(env as unknown as Record<string,string|undefined>).OPENAI_API_KEY;
 if(!key)return reply({error:'Chưa cấu hình AI dịch (OPENAI_API_KEY).',fallback:true},501);
 try{return reply({translation:await aiTranslate(key,input.text,input.target),method:'ai'});}
 catch(e){console.error('Translate failed',e instanceof Error?e.message:'unknown');return reply({error:'AI dịch chưa phản hồi. Thử lại hoặc mở Google Dịch.',fallback:true},502);}
}
