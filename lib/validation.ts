import { receptionInput, type Reception } from './reception';
import { z } from 'zod';
import { assignees, sources } from './demo-data';
const date=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),'Ngày không hợp lệ');
const due=z.string().refine(v=>v===''||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)&&!isNaN(Date.parse(v+'+07:00'))),'Hạn chăm sóc không hợp lệ');
export const contactInput=z.object({
 name:z.string().trim().min(2).max(100),segment:z.enum(['Khách lưu trú','Khách ngoài khách sạn']),
 source:z.string().refine(v=>sources.includes(v)),status:z.enum(['new','advising','waiting','closed']),
 assignee:z.string().refine(v=>assignees.includes(v)),due,service_date:date,
 adults:z.number().int().min(0).max(100),children:z.string().trim().max(100),budget:z.number().int().min(0).max(1000000000),
 interest:z.string().trim().max(300),note:z.string().trim().max(3000),stay:z.string().trim().max(200),
});
export const command=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),id:z.string().uuid(),contact:contactInput}),
 z.object({action:z.literal('update'),id:z.string().min(1).max(100),version:z.number().int().positive(),contact:contactInput}),
 z.object({action:z.literal('reception'),id:z.string().min(1).max(100),version:z.number().int().positive(),contact:contactInput,reception:receptionInput}),
 z.object({action:z.literal('message'),id:z.string().uuid(),contactId:z.string().min(1).max(100),direction:z.enum(['in','out']),body:z.string().trim().min(1).max(4000)}),
 z.object({action:z.literal('reset'),confirmation:z.literal('RESET DEMO')}),
]);
export type Contact=z.infer<typeof contactInput>&{id:string;version:number;updated:string;reception?:Reception};
export type Message={id:string;contact_id:string;direction:'in'|'out';body:string;created:string};
export type Activity={id:string;contact_id:string;detail:string;created:string};
export function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
