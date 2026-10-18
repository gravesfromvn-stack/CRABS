import data from './quote-source-data.json';
import {products as demoProducts} from './demo-data';

export type PriceSource={title:string;sheet:string;range:string;url:string};
export type SourceItem={id:string;category:string;kind:string;title:string;unit:string;supplier:string;duration:string;currency:string;sourcePrice:number|null;sourceCost:number|null;priceText:string;priceMeaning:string;summary:string;conditions:string;gaps:string[];sources:PriceSource[];direction:string|null;status:string;providerUrl?:string};
export const sourceCatalog=data.items as SourceItem[];
export const sourceCoverage=data.coverage;
export const sourceExceptions=data.excluded;
export const sourceRules=data.rules;
export const sourceReadAt=data.readAt;
export const findQuoteSource=(id:string)=>sourceCatalog.find(p=>p.id===id);
export const isSourceProduct=(id:string)=>id.startsWith('R75-');
export type QuoteSourceSnapshot=Pick<SourceItem,'id'|'currency'|'sourcePrice'|'sourceCost'|'priceText'|'priceMeaning'|'gaps'|'sources'|'conditions'> & {readAt:string;status:'pending'};
export function quoteSourceSnapshot(id:string):QuoteSourceSnapshot|undefined {
 const p=findQuoteSource(id);if(!p)return;
 return structuredClone({id:p.id,currency:p.currency,sourcePrice:p.sourcePrice,sourceCost:p.sourceCost,priceText:p.priceText,priceMeaning:p.priceMeaning,gaps:p.gaps,sources:p.sources,conditions:p.conditions,readAt:sourceReadAt,status:'pending'});
}
export const quoteProducts=[...demoProducts,...sourceCatalog.map(p=>({
 id:p.id,title:p.title,kind:p.kind,unit:p.unit,supplier:p.supplier,duration:p.duration,
 price:null,cost:null,commission:null,validUntil:'',description:p.summary,
 includes:'Chưa xác nhận quyền lợi trong giá',excludes:'Chưa xác nhận',
}))];
export function referenceAmount(amount:number|null,currency='VND'){
 return amount===null?'Chưa có':new Intl.NumberFormat('vi-VN',{style:'currency',currency,maximumFractionDigits:0}).format(amount);
}
