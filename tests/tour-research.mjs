import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdirSync,readFileSync} from 'node:fs';
mkdirSync('.quote-tests/tour',{recursive:true});
await build({entryPoints:['lib/quote-sources.ts','lib/tour-research.ts','lib/quotes.ts','lib/quote-presentation.ts'],outdir:'.quote-tests/tour',bundle:true,platform:'node',format:'esm',outExtension:{'.js':'.mjs'}});
const source=await import('../.quote-tests/tour/quote-sources.mjs');
const research=await import('../.quote-tests/tour/tour-research.mjs');
const {initialQuoteLine}=await import('../.quote-tests/tour/quote-presentation.mjs');
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log('PASS '+name)};
check('Program evidence points to real rows, including previously broken first/last programs',()=>{
 for(const p of source.sourceCatalog)for(const s of p.sources.filter(s=>s.url.includes('/spreadsheets/'))){
  assert.match(s.range,/^[A-Z]+[1-9][0-9]*:[A-Z]+[1-9][0-9]*$/);
  assert.equal(new URLSearchParams(s.url.split('#')[1]).get('range'),s.range);
 }
 assert.equal(source.findQuoteSource('R75-HN01').sources.find(s=>s.sheet==='Tour Program Details').range,'A2:H2');
 assert.equal(source.findQuoteSource('R75-PKG28').sources.find(s=>s.sheet==='Tour Program Details').range,'A29:H29');
});
check('Five researched products map by exact ID, not shared destination; historical price stays unchanged',()=>{
 assert.equal(research.tourObservations.length,5);
 assert.equal(source.sourceCatalog.filter(p=>p.websiteReview).length,5);
 for(const r of research.tourObservations)assert.equal(source.findQuoteSource(r.id).sourcePrice,r.sheetPrice);
 assert.equal(source.findQuoteSource('R75-TST-046').sourcePrice,900000);
 assert.equal(source.findQuoteSource('R75-BAY01').websiteReview,undefined);
 assert.deepEqual(research.findTourResearch('R75-TST-046').variants.map(v=>v.amount),[850000,1050000]);
 assert.match(research.findTourResearch('R75-TST-046').variants[0].label,/không xe Hà Nội/);
});
check('Unquoted/composite products do not become complete priced packages',()=>{
 assert.equal(research.findTourResearch('R75-TST-028').variants.length,0);
 const composite=research.findTourResearch('R75-TST-036');
 assert.equal(composite.sheetPrice,null);
 assert.ok(composite.variants.every(v=>v.scope.includes('CHƯA gồm')));
 for(const r of research.tourObservations){
  assert.equal(r.approvedHotelPrice,null);assert.equal(r.contractCost,null);assert.equal(r.effectiveUntil,null);
  const line=initialQuoteLine({adults:2,children:'',service_date:'2026-10-23',reception:{}},r.id);
  assert.equal(line.price,null);assert.equal(line.cost,null);assert.equal(line.commission,null);
 }
});
check('Quote evidence freezes the researched version independently of future catalog edits',()=>{
 const a=source.quoteSourceSnapshot('R75-TST-046'),b=source.quoteSourceSnapshot('R75-TST-046');
 assert.equal(a.websiteReview.checkedAt,'2026-10-18');
 a.websiteReview.variants[0].amount=1;
 assert.equal(b.websiteReview.variants[0].amount,850000);
 assert.equal(source.findQuoteSource('R75-TST-046').websiteReview.variants[0].amount,850000);
 // Legacy JSON snapshots stay as stored; the renderer receives evidence, not an ID lookup.
 const old=JSON.parse('{"id":"R75-TST-046","status":"pending","sourcePrice":900000}');
 assert.equal(old.websiteReview,undefined);
 const component=readFileSync('app/tour-research-note.tsx','utf8');
 assert.ok(component.includes('if(!review)return null'));
});
check('Authority/date and partial website verification remain explicit',()=>{
 assert.equal(research.tourResearch.policy.effectiveUntil,'2026-11-02');
 assert.ok(research.tourResearch.policy.url.startsWith('https://xaydungchinhsach.chinhphu.vn/'));
 assert.match(research.tourResearch.scope,/156/);
 assert.equal(research.tourResearch.coverage.find(c=>c.sheet==='Tour Itinerary Days').records,63);
 assert.equal(research.tourResearch.coverage.find(c=>c.sheet==='Tour Catalog').records,28);
});
console.log(JSON.stringify({passed,scope:'Price provenance, package boundaries, exact sheet rows, immutable quote evidence'}));
