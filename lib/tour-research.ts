import data from './tour-research-data.json';

export type TourResearch = {
 id:string; title:string; sheetPrice:number|null; url:string; outcome:string;
 variants:{label:string;amount:number;scope:string}[];
 route:string; includes:string; excludes:string; children:string; notes:string[]; gaps:string[];
 checkedAt:string; status:string; currency:string; effectiveFrom:null; effectiveUntil:null; advisoryUrl?:string;
 approvedHotelPrice:null; contractCost:null; commission:null;
};
export const tourResearch=data;
export const tourObservations=data.observations as TourResearch[];
export const findTourResearch=(id:string)=>tourObservations.find(r=>r.id===id);
export function tourResearchSnapshot(id:string):TourResearch|undefined {
 const item=findTourResearch(id);
 return item?structuredClone(item):undefined;
}
