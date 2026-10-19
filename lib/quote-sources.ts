import data from './quote-source-data.json';
import {products as demoProducts} from './demo-data';
import {tourResearchSnapshot,type TourResearch} from './tour-research';
import {serviceProducts,findServiceProduct} from './hotel-policy-config';
import {catalogProducts,catalogProduct,quoteReady,findEntry,type CatalogEntry} from './service-catalog';

export type PriceSource={title:string;sheet:string;range:string;url:string};
export type SourceItem={id:string;category:string;kind:string;title:string;unit:string;supplier:string;duration:string;currency:string;sourcePrice:number|null;sourceCost:number|null;priceText:string;priceMeaning:string;summary:string;conditions:string;gaps:string[];sources:PriceSource[];direction:string|null;status:string;providerUrl?:string;websiteReview?:TourResearch};
export const sourceCatalog:SourceItem[]=data.items.map(p=>({...p,websiteReview:tourResearchSnapshot(p.id)}));
export const sourceCoverage=data.coverage;
export const sourceExceptions=data.excluded;
export const sourceRules=data.rules;
export const sourceReadAt=data.readAt;
export const findQuoteSource=(id:string)=>sourceCatalog.find(p=>p.id===id);
// Reference products cannot be approved: imported sources (R75-) and hotel services whose
// configuration is not yet complete (approved + sale price + cost + commission).
// With the service catalog, an entry is a reference until it is quote-ready (approved price, cost, commission).
export const isDemoProduct=(id:string)=>demoProducts.some(p=>p.id===id);
export function isSourceProduct(id:string,catalog?:CatalogEntry[]){
 const e=findEntry(catalog,id);if(e)return !quoteReady(e);
 if(catalog&&!isDemoProduct(id))return true;
 return id.startsWith('R75-')||(id.startsWith('HS-')&&!findServiceProduct(id)?.complete);
}
export type QuoteSourceSnapshot=Pick<SourceItem,'id'|'currency'|'sourcePrice'|'sourceCost'|'priceText'|'priceMeaning'|'gaps'|'sources'|'conditions'|'websiteReview'> & {readAt:string;status:'pending'};
export function quoteSourceSnapshot(id:string):QuoteSourceSnapshot|undefined {
 const p=findQuoteSource(id);if(!p)return;
 return structuredClone({id:p.id,currency:p.currency,sourcePrice:p.sourcePrice,sourceCost:p.sourceCost,priceText:p.priceText,priceMeaning:p.priceMeaning,gaps:p.gaps,sources:p.sources,conditions:p.conditions,readAt:sourceReadAt,status:'pending',...(p.websiteReview?{websiteReview:p.websiteReview}:{})});
}
export const hotelServiceProducts=serviceProducts.map(p=>({id:p.id,title:p.title,kind:p.kind,unit:p.unit,supplier:p.supplier,duration:p.duration,price:p.price,cost:p.cost,commission:p.commission,validUntil:p.validUntil,description:p.description,includes:p.includes,excludes:p.excludes,region:p.region}));
export const quoteProducts=[...demoProducts,...hotelServiceProducts,...sourceCatalog.map(p=>({
 id:p.id,title:p.title,kind:p.kind,unit:p.unit,supplier:p.supplier,duration:p.duration,
 price:null,cost:null,commission:null,validUntil:'',description:p.summary,
 includes:'Chưa xác nhận quyền lợi trong giá',excludes:'Chưa xác nhận',
}))];
export function referenceAmount(amount:number|null,currency='VND'){
 return amount===null?'Chưa có':new Intl.NumberFormat('vi-VN',{style:'currency',currency,maximumFractionDigits:0}).format(amount);
}
// Products offered for quotes: demo practice products plus the service catalog (one price source).
// Without a catalog (static tests) the previous product list is used.
export function quoteProductsWith(catalog?:CatalogEntry[]){return catalog?[...demoProducts,...catalogProducts(catalog)]:quoteProducts;}
export const findQuoteProduct=(id:string,catalog?:CatalogEntry[])=>(quoteProductsWith(catalog).find(p=>p.id===id)??(catalog&&findEntry(catalog,id)?{...catalogProduct(findEntry(catalog,id)!),id}:undefined)) as (typeof quoteProducts[number]&{capacity?:number;direction?:'pickup'|'dropoff';currency?:string})|undefined;
