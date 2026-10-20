import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,mkdirSync} from 'node:fs';
mkdirSync('.quote-tests/profit',{recursive:true});
await build({entryPoints:['lib/service-profit.ts'],outfile:'.quote-tests/profit/service-profit.mjs',bundle:true,platform:'node',format:'esm'});
const p=await import('../.quote-tests/profit/service-profit.mjs');
const raw=JSON.parse(readFileSync('lib/analysis-data.json','utf8')).services;
let passed=0;const check=(name,fn)=>{fn();console.log('PASS '+name);passed++;};

check('Headline uses only months where every tour and spa row has a cost (Aug + Sep 2026)',()=>{
 const s=p.profitSummary();
 assert.deepEqual(s.completeMonths,['2026-08','2026-09']);
 assert.equal(s.revenue,341049000);assert.equal(s.cost,237698600);assert.equal(s.profit,103350400);
 assert.equal(Math.round(s.margin*1000)/10,30.3);
});
check('Totals equal the source rows, independently summed',()=>{
 const pick=(k,period)=>raw.find(r=>r.kind===k&&r.period===period);
 const rows=['Tháng 8.2026','Tháng 9.2026'].flatMap(m=>['Tour','Spa'].map(k=>pick(k,m)));
 for(const r of rows)assert.equal(r.costedRows,r.financialRows,'fully costed '+r.kind+' '+r.period);
 const rev=rows.reduce((a,r)=>a+r.historicalListedAmount,0),cost=rows.reduce((a,r)=>a+r.historicalListedCost,0);
 const s=p.profitSummary();assert.equal(s.revenue,rev);assert.equal(s.cost,cost);
 assert.deepEqual(s.byKind.map(k=>[k.kind,k.profit]),[['Tour',68535400],['Spa',34815000]]);
});
check('Partly costed October is shown as an estimate, never in the headline',()=>{
 const s=p.profitSummary();
 assert.deepEqual(s.partial.map(c=>[c.kind,c.month]),[['Tour','2026-10'],['Spa','2026-10']]);
 for(const c of s.partial)assert.match(c.note,/chưa có giá vốn; lãi là ước tính/);
});
check('Services without cost show revenue only, no profit',()=>{
 const s=p.profitSummary();
 assert.deepEqual(s.revenueOnly.map(r=>r.kind).sort(),['Giặt là','Xe sân bay']);
 for(const c of p.profitCells.filter(c=>['Xe sân bay','Giặt là'].includes(c.kind)))assert.equal(c.profit,null);
});
console.log(JSON.stringify({passed,scope:'service profit from real sheet totals: complete-month headline, estimates and revenue-only services'}));
