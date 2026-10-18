import {env} from 'cloudflare:workers';
import {ingestMail} from '../../../../lib/ota-store';
import {hash,parseMail,type GmailMail} from '../../../../lib/ota';
export const dynamic='force-dynamic';
// Private Sites dispatch requires its service header first. This key narrows that
// service caller to intake; no owner id or destination is accepted from the body.
export async function POST(request:Request){
 const token=(env as unknown as Record<string,string>).CRABS_INGEST_TOKEN;
 const supplied=request.headers.get('X-Crabs-Ingest-Key')||'';
 if(!token||await hash(token)!==await hash(supplied))return Response.json({error:'Unauthorized'},{status:401});
 if(Number(request.headers.get('content-length')||0)>1800000)return Response.json({error:'Email too large'},{status:413});
 try{
  const raw=await request.text();if(raw.length>1800000)return Response.json({error:'Email too large'},{status:413});
  const m=JSON.parse(raw) as GmailMail;
  if(!m||!m.payload||!Array.isArray(m.payload.headers)||!/^\w{8,100}$/.test(m.id||''))return Response.json({error:'Expected full Gmail message'},{status:400});
  const parsed=parseMail(m),received=Date.parse(parsed.received);
  if(!Number.isFinite(received))return Response.json({error:'Invalid Gmail receipt date'},{status:400});
  // Enforce the requested scope independently of Make's polling cursor/search.
  if(received<Date.now()-30*86400000||received>Date.now()+86400000||parsed.channel==='unknown')return Response.json({ok:true,ignored:true,id:m.id,reason:parsed.channel==='unknown'?'not_an_ota_sender':'outside_30_day_window'},{headers:{'Cache-Control':'no-store'}});
  const result=await ingestMail(env.DB!,m,(env as unknown as Record<string,string>).OPENAI_API_KEY);return Response.json({ok:true,...result},{headers:{'Cache-Control':'no-store'}});
 }catch(e){const reason=e instanceof Error?e.message:'';console.error('OTA intake failed',reason==='MAILBOX_NOT_CONNECTED'?'mailbox not connected':'processing error');return Response.json({error:reason==='MAILBOX_NOT_CONNECTED'?'Connect mailbox in Crabs first':'Intake failed; retry safely'},{status:reason==='MAILBOX_NOT_CONNECTED'?409:500});}
}
