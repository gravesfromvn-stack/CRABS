'use client';
import {useEffect,useState} from 'react';
import {Languages,ExternalLink} from 'lucide-react';
import {detectLanguage,langLabels,googleTranslateUrl} from '../lib/translate';

// Translation for Cua to read a message or draft. Tries, in order: the browser's on-device
// translator (no data leaves the computer), the AI translator if configured, then a Google
// Translate link Cua opens by hand. The translation is never saved or sent to the guest.
type BrowserTranslator={translate:(text:string)=>Promise<string>};
type TranslatorApi={availability:(o:{sourceLanguage:string;targetLanguage:string})=>Promise<string>;create:(o:{sourceLanguage:string;targetLanguage:string})=>Promise<BrowserTranslator>};
const cache=new Map<string,{text:string;method:string}>();

// The browser API can wait indefinitely (model download, background tab): give up and fall back.
const within=<T,>(p:Promise<T>,ms:number)=>Promise.race([p,new Promise<never>((_,no)=>setTimeout(()=>no(Error('timeout')),ms))]);
// A click may download the language pack once (Chrome/Edge need a user click for that).
async function onDevice(text:string,source:string,target:string,allowDownload:boolean){
 const api=(globalThis as unknown as {Translator?:TranslatorApi}).Translator;if(!api)return null;
 try{const a=await within(api.availability({sourceLanguage:source,targetLanguage:target}),4000);if(a!=='available'&&!(allowDownload&&(a==='downloadable'||a==='downloading')))return null;
  const t=await within(api.create({sourceLanguage:source,targetLanguage:target}),a==='available'?8000:60000);return await within(t.translate(text),15000);}catch{return null;}
}

export function TranslateText({text,auto,compact=false}:{text:string;auto?:'vi'|'en'|null;compact?:boolean}){
 const source=detectLanguage(text);
 const [result,setResult]=useState<{target:'vi'|'en';text:string;method:string}|null>(null),[busy,setBusy]=useState(false),[fallback,setFallback]=useState<'vi'|'en'|null>(null),[error,setError]=useState('');
 useEffect(()=>{setResult(null);setFallback(null);setError('');},[text]);
 async function run(target:'vi'|'en',manual=true){
  if(source===target){setResult({target,text:'',method:`Nội dung đã là ${langLabels[target]}.`});return;}
  const key=target+'|'+text,hit=cache.get(key);if(hit){setResult({target,...hit});return;}
  setBusy(true);setError('');setFallback(null);
  try{
   let out=await onDevice(text,source,target,manual),method='Dịch trên máy (trình duyệt)';
   if(out===null){
    const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text.slice(0,6000),target})});
    const d=await r.json() as {translation?:string;error?:string;fallback?:boolean};
    if(r.ok&&d.translation){out=d.translation;method='Dịch bằng AI';}
    else{if(manual)setFallback(target);if(!d.fallback)setError(d.error||'Chưa dịch được.');return;}
   }
   cache.set(key,{text:out,method});setResult({target,text:out,method});
  }catch{if(manual)setFallback(target);}finally{setBusy(false);}
 }
 // "Dịch cả hội thoại": translate automatically only with a method that needs no extra click.
 useEffect(()=>{if(auto&&!result&&source!==auto)run(auto,false);},[auto,text]);// eslint-disable-line react-hooks/exhaustive-deps
 return <div className={'translate'+(compact?' compact':'')}>
  <div className="translate-bar"><Languages size={13}/><span>{langLabels[source]}</span>
   {(['vi','en'] as const).filter(t=>t!==source).map(t=><button key={t} type="button" className="text-button" disabled={busy} onClick={()=>run(t)}>{busy?'Đang dịch… (lần đầu có thể tải bộ dịch)':`Dịch sang ${langLabels[t]}`}</button>)}
  </div>
  {result&&<div className="translate-out" lang={result.target}>{result.text&&<p>{result.text}</p>}<small>{result.method}{result.text?' · bản dịch để Cua đọc, không gửi khách':''}</small></div>}
  {fallback&&<p className="translate-out"><small>Trình duyệt chưa có bộ dịch trên máy và chưa cấu hình AI dịch. </small><a className="text-button" href={googleTranslateUrl(text,fallback)} target="_blank" rel="noopener noreferrer">Mở Google Dịch <ExternalLink size={12}/></a><small> (nội dung sẽ gửi sang Google)</small></p>}
  {error&&<p className="translate-out error"><small>{error}</small></p>}
 </div>;
}
