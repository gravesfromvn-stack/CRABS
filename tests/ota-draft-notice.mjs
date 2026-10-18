import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare} from 'miniflare';
import {readFileSync,readdirSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests',{recursive:true});
const plugin={name:'notice-test',setup(b){b.onResolve({filter:/^cloudflare:workers$/},()=>({path:'env',namespace:'stub'}));b.onResolve({filter:/chatgpt-auth$/},()=>({path:'auth',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='env'?'export const env=globalThis.otaEnv;':'export async function getChatGPTUser(){return globalThis.otaUser;}',loader:'js'}));}};
for(const [name,path] of [['store','lib/ota-store.ts'],['api','app/api/ota/route.ts'],['notice','lib/ota-draft-notice.ts']])await build({entryPoints:[path],outfile:'.quote-tests/notice-'+name+'.mjs',bundle:true,platform:'node',format:'esm',plugins:[plugin]});
const {ingestMail,threadState}=await import('../.quote-tests/notice-store.mjs');
const {draftNotice}=await import('../.quote-tests/notice-notice.mjs');
const at=h=>new Date(Date.now()-h*3600000).toISOString();
// Synthetic Booking.com notification; no real guest or booking.
function mail(id,message,received){const text='Confirmation number: 5900000101\nYou have a new message from a guest\nExample Guest said:\n'+message+'\nReply\nReservation details\nGuest name:\nExample Guest\nProperty name:\nLuxe Paradise Premium Pham Hong Thai Hotel & Spa\nBooking number:\n5900000101';return {id,threadId:'gmail-'+id,internalDate:String(Date.parse(received)),payload:{mimeType:'text/plain',headers:[{name:'From',value:'Guest <notification@guest.booking.com>'},{name:'Subject',value:'We received this message from Example Guest'},{name:'Authentication-Results',value:'mx.google.com; dmarc=pass header.from=guest.booking.com'},{name:'Message-ID',value:'<'+id+'@guest.booking.com>'}],body:{data:Buffer.from(text).toString('base64url')}}};}
const pendingPrompt=/cần duyệt phiên bản này|chưa được duyệt/;
const shown=d=>{const n=draftNotice(d);return n.status+'\n'+n.note;};
let count=0;async function check(name,fn){await fn();console.log('PASS '+name);count++;}
const mf=new Miniflare({modules:true,script:'export default {fetch(){return new Response("test")}}',compatibilityDate:'2026-05-15',d1Databases:['DB']});
try{
 const db=await mf.getD1Database('DB');globalThis.otaEnv={DB:db};globalThis.otaUser={userId:'owner-one'};
 for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())for(const sql of readFileSync('drizzle/'+f,'utf8').split('--> statement-breakpoint').map(x=>x.trim()).filter(Boolean))await db.prepare(sql).run();
 const api=await import('../.quote-tests/notice-api.mjs');
 const post=async payload=>{const r=await api.POST(new Request('https://crabs.example/api/ota',{method:'POST',headers:{Origin:'https://crabs.example','Content-Type':'application/json'},body:JSON.stringify(payload)}));return r.status;};
 assert.equal(await post({action:'connect'}),200);
 const id=(await ingestMail(db,mail('notice0001','We will arrive at 14:00.',at(6)))).threadId;
 const state=()=>threadState(db,'owner-one',id);
 const rev=(s,n)=>s.drafts.find(d=>d.revision===n);
 await check('Pending rule draft still asks for approval',async()=>{const s=await state();assert.equal(s.drafts[0].status,'pending');assert.match(shown(s.drafts[0]),pendingPrompt);});
 const edited='Thank you. We have noted your arrival at 14:00. [synthetic edit]';
 await check('Manual edit is a new pending version that asks for approval',async()=>{const s=await state();assert.equal(await post({action:'save',id,revision:s.drafts[0].revision,contextKey:s.contextKey,body:edited,operationId:crypto.randomUUID()}),200);const d=(await state()).drafts[0];assert.equal(d.revision,2);assert.equal(d.status,'pending');assert.match(shown(d),/cần duyệt phiên bản này/);});
 await check('Approved draft no longer shows the approval prompt; stored notes and history kept',async()=>{let s=await state();const before=rev(s,2).notes;assert.equal(await post({action:'approve',id,revision:2,contextKey:s.contextKey}),200);s=await state();const d=rev(s,2);assert.equal(d.status,'approved');assert.doesNotMatch(shown(d),pendingPrompt);assert.match(draftNotice(d).status,/đã duyệt/i);assert.match(draftNotice(d).status,/chưa ghi nhận gửi/);assert.equal(d.notes,before);assert.equal(d.body,edited);assert.equal(rev(s,1).status,'pending');assert.equal(s.sent.length,0);});
 let staleKey;
 await check('New guest message invalidates the approval and the panel says to re-approve',async()=>{staleKey=(await state()).contextKey;await ingestMail(db,mail('notice0002','Our arrival changes to 18:00.',at(3)));const s=await state();assert.notEqual(s.contextKey,staleKey);const old=rev(s,2);assert.equal(old.status,'approved');assert.equal(old.stale,true);assert.match(draftNotice(old).status,/duyệt lại/);assert.doesNotMatch(draftNotice(old).status,/đã duyệt; chưa ghi nhận/i);assert.equal(old.body,edited);assert.equal(await post({action:'approve',id,revision:s.drafts[0].revision,contextKey:staleKey}),409);});
 await check('Recorded manual send replaces the approval prompt with the sent status',async()=>{let s=await state();const r=s.drafts[0].revision+1;assert.equal(await post({action:'save',id,revision:s.drafts[0].revision,contextKey:s.contextKey,body:'Thank you. Your 18:00 arrival is noted. [synthetic edit]',operationId:crypto.randomUUID()}),200);s=await state();assert.match(shown(rev(s,r)),/cần duyệt phiên bản này/);assert.equal(await post({action:'approve',id,revision:r,contextKey:s.contextKey}),200);s=await state();assert.equal(await post({action:'sent',id,revision:r,contextKey:s.contextKey,body:rev(s,r).body,operationId:crypto.randomUUID(),confirmed:true}),200);s=await state();const d=rev(s,r);assert.equal(d.status,'sent');assert.doesNotMatch(shown(d),pendingPrompt);assert.match(draftNotice(d).status,/ghi nhận gửi/);assert.match(d.notes,/cần duyệt phiên bản này/);assert.equal(s.sent.length,1);assert.equal(rev(s,2).body,edited);assert.equal(rev(s,1).revision,1);});
 console.log('Draft notice checks passed: '+count);
}finally{await mf.dispose();}
