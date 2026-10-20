'use client';
import {useEffect,useState} from 'react';
import {roleViewLabels,type RoleView} from '../lib/front-desk';

// Who is looking at the screen (Lễ tân / Saler / Quản lý / Admin). A view for the demo and for daily
// use at the desk, stored per browser; it is not a login and does not protect data on the server.
const KEY='crabs-role-view',EVENT='crabs-role-view';
const valid=(v:string|null):v is RoleView=>v==='RECEPTIONIST'||v==='SALE'||v==='MANAGER'||v==='ADMIN';
export function readRoleView():RoleView{try{const v=window.localStorage.getItem(KEY);return valid(v)?v:'ADMIN';}catch{return 'ADMIN';}}
export function setRoleView(v:RoleView){try{window.localStorage.setItem(KEY,v);}catch{}window.dispatchEvent(new Event(EVENT));}
export function useRoleView():RoleView{
 const [role,setRole]=useState<RoleView>('ADMIN');
 useEffect(()=>{const read=()=>setRole(readRoleView());read();window.addEventListener(EVENT,read);window.addEventListener('storage',read);return()=>{window.removeEventListener(EVENT,read);window.removeEventListener('storage',read);};},[]);
 return role;
}
export function RoleSwitch({compact=false}:{compact?:boolean}){
 const role=useRoleView();
 return <label className={'role-switch'+(compact?' compact':'')} title="Góc nhìn tài khoản (demo, không phải đăng nhập)"><span>Góc nhìn</span><select value={role} onChange={e=>setRoleView(e.target.value as RoleView)}>{(Object.keys(roleViewLabels) as RoleView[]).map(k=><option key={k} value={k}>{roleViewLabels[k]}</option>)}</select></label>;
}
