'use client';
import {useEffect,useState} from 'react';
import {PRESENTATION_KEY,presentationOn,maskText} from '../lib/hotel-policy-config';

// Presentation mode (neutral demo names on screen). Stored per browser; stored data is unchanged.
const EVENT='crabs-presentation';
// Switching reloads the page so every screen starts from a clean render in the chosen mode.
export function setPresentation(on:boolean){try{window.localStorage.setItem(PRESENTATION_KEY,on?'1':'0');}catch{}window.dispatchEvent(new Event(EVENT));window.location.reload();}
export function usePresentation(){
 const [on,setOn]=useState(false);
 useEffect(()=>{const read=()=>setOn(presentationOn());read();window.addEventListener(EVENT,read);window.addEventListener('storage',read);return()=>{window.removeEventListener(EVENT,read);window.removeEventListener('storage',read);};},[]);
 return on;
}
// Display-only safety net for screens with fixed historical labels: masks visible text nodes.
// Inputs and textareas are skipped, so nothing masked can be saved back.
export function usePresentationMasker(on:boolean){
 useEffect(()=>{
  if(!on)return;
  const skip=(n:Node)=>{const p=n.parentElement;return !p||/^(TEXTAREA|INPUT|SCRIPT|STYLE)$/.test(p.tagName)||p.isContentEditable;};
  const fix=(n:Node)=>{if(n.nodeType===3){if(skip(n))return;const v=n.nodeValue||'',m=maskText(v,true);if(m!==v)n.nodeValue=m;return;}const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let t:Node|null;while((t=w.nextNode()))fix(t);};
  fix(document.body);
  const o=new MutationObserver(list=>{for(const r of list){if(r.type==='characterData')fix(r.target);else r.addedNodes.forEach(fix);}});
  o.observe(document.body,{subtree:true,childList:true,characterData:true});
  const title=document.title;document.title=maskText(title,true);
  return()=>{o.disconnect();document.title=title;};
 },[on]);
}
