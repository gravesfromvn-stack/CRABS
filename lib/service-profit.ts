import data from './analysis-data.json';

// Service revenue and gross profit from the historical hotel service sheets (lib/analysis-data.json,
// read 15/10/2026). Amounts are the listed sale and cost in the sheets, not reconciled accounting.
// Gross profit = listed sale − listed cost; staff commission is not recorded in the sources.
// A month counts in the headline only when every financial row of tour and spa has a cost.
type ServiceRow={kind:string;period:string;financialRows:number;costedRows:number;historicalListedAmount:number|null;historicalListedCost:number|null};
export type ProfitCell={kind:string;month:string;revenue:number;cost:number|null;profit:number|null;rows:number;costedRows:number;complete:boolean};

const MONTH=/(?:Tháng\s*)?(\d{1,2})\.(\d{4})/;
const monthKey=(period:string)=>{const m=period.match(MONTH);return m?`${m[2]}-${m[1].padStart(2,'0')}`:'';};
export const monthLabel=(key:string)=>`${key.slice(5)}/${key.slice(0,4)}`;
export const PROFIT_KINDS=['Tour','Spa'] as const;

export const profitCells:ProfitCell[]=(data.services as ServiceRow[]).filter(s=>s.historicalListedAmount!==null&&monthKey(s.period)).map(s=>{
 const complete=s.costedRows>0&&s.costedRows===s.financialRows&&s.historicalListedCost!==null;
 const cost=s.historicalListedCost;
 return {kind:s.kind,month:monthKey(s.period),revenue:s.historicalListedAmount!,cost,profit:cost===null?null:s.historicalListedAmount!-cost,rows:s.financialRows,costedRows:s.costedRows,complete};
});

const sum=(xs:number[])=>xs.reduce((a,b)=>a+b,0);
export function profitSummary(cells=profitCells){
 const profitable=cells.filter(c=>(PROFIT_KINDS as readonly string[]).includes(c.kind));
 const months=[...new Set(profitable.map(c=>c.month))].sort();
 // Headline months: every tour and spa row has a cost.
 const completeMonths=months.filter(m=>PROFIT_KINDS.every(k=>profitable.some(c=>c.month===m&&c.kind===k&&c.complete)));
 const head=profitable.filter(c=>completeMonths.includes(c.month));
 const revenue=sum(head.map(c=>c.revenue)),cost=sum(head.map(c=>c.cost!)),profit=revenue-cost;
 const byKind=PROFIT_KINDS.map(k=>{const xs=head.filter(c=>c.kind===k);const r=sum(xs.map(c=>c.revenue)),co=sum(xs.map(c=>c.cost!));return {kind:k,revenue:r,cost:co,profit:r-co,margin:r?(r-co)/r:0};});
 const partial=profitable.filter(c=>!completeMonths.includes(c.month)&&c.cost!==null).map(c=>({...c,note:c.complete?'':`${c.rows-c.costedRows}/${c.rows} dòng chưa có giá vốn; lãi là ước tính`}));
 const revenueOnly=cells.filter(c=>!(PROFIT_KINDS as readonly string[]).includes(c.kind)||c.cost===null);
 return {months,completeMonths,revenue,cost,profit,margin:revenue?profit/revenue:0,byKind,partial,
  revenueOnly:[...new Set(revenueOnly.map(c=>c.kind))].map(k=>({kind:k,revenue:sum(revenueOnly.filter(c=>c.kind===k).map(c=>c.revenue)),months:revenueOnly.filter(c=>c.kind===k).map(c=>c.month).sort()})),
  readAt:data.readAt,disclaimer:data.disclaimer};
}
