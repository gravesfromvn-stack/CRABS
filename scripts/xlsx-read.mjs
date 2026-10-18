// Minimal dependency-free XLSX reader (zip + SpreadsheetML) for local imports.
// Returns every non-empty cell with its raw value, type, displayed text and hyperlink.
import {readFileSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';

function unzip(buf){
 const files=new Map();let eocd=buf.length-22;while(eocd>=0&&buf.readUInt32LE(eocd)!==0x06054b50)eocd--;
 if(eocd<0)throw Error('Not a zip file');
 let p=buf.readUInt32LE(eocd+16);const count=buf.readUInt16LE(eocd+10);
 for(let i=0;i<count;i++){
  const method=buf.readUInt16LE(p+10),size=buf.readUInt32LE(p+20),nameLen=buf.readUInt16LE(p+28),extra=buf.readUInt16LE(p+30),comment=buf.readUInt16LE(p+32),local=buf.readUInt32LE(p+42);
  const name=buf.toString('utf8',p+46,p+46+nameLen);
  const lNameLen=buf.readUInt16LE(local+26),lExtra=buf.readUInt16LE(local+28),start=local+30+lNameLen+lExtra;
  const data=buf.subarray(start,start+size);files.set(name,method===8?inflateRawSync(data):data);
  p+=46+nameLen+extra+comment;
 }
 return files;
}
const decode=s=>s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,(m,e)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[e]??String.fromCodePoint(e[1]==='x'||e[1]==='X'?parseInt(e.slice(2),16):parseInt(e.slice(1),10))));
const textOf=xml=>decode([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map(m=>m[1]).join(''));
const colIndex=ref=>{let n=0;for(const ch of ref.match(/^[A-Z]+/)[0])n=n*26+ch.charCodeAt(0)-64;return n;};
export function readXlsx(path){
 const files=unzip(readFileSync(path)),get=n=>files.get(n)?.toString('utf8')||'';
 const shared=[...get('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m=>textOf(m[1]));
 const wb=get('xl/workbook.xml'),rels=get('xl/_rels/workbook.xml.rels');
 const sheets=[];
 for(const m of wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)){
  const target=(rels.match(new RegExp(`Id="${m[2]}"[^>]*Target="([^"]+)"`))||rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${m[2]}"`)))[1].replace(/^\/?xl\//,'');
  const file='xl/'+target,xml=get(file),srels=get(file.replace('worksheets/','worksheets/_rels/')+'.rels');
  const links=new Map();for(const h of xml.matchAll(/<hyperlink [^>]*ref="([A-Z]+\d+)"[^>]*r:id="([^"]+)"/g)){const t=srels.match(new RegExp(`Id="${h[2]}"[^>]*Target="([^"]+)"`))||srels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${h[2]}"`));if(t)links.set(h[1],decode(t[1]));}
  const rows=new Map();
  for(const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
   const [,col,row,attrs,inner='']=c,type=(attrs.match(/t="([^"]+)"/)||[])[1]||'n';
   const v=(inner.match(/<v>([\s\S]*?)<\/v>/)||[])[1],f=(inner.match(/<f[^>]*>([\s\S]*?)<\/f>/)||[])[1];
   let value=null;
   if(type==='s')value=shared[Number(v)];else if(type==='inlineStr')value=textOf(inner);else if(type==='str'||type==='e')value=v===undefined?null:decode(v);else if(type==='b')value=v==='1';else if(v!==undefined)value=Number(v);
   const ref=col+row,link=links.get(ref);
   if(value===null&&!link)continue;
   if(!rows.has(+row))rows.set(+row,{});
   rows.get(+row)[col]={value,type,...(f?{formula:decode(f)}:{}),...(link?{link}:{})};
  }
  sheets.push({name:m[1],rows:[...rows.entries()].sort((a,b)=>a[0]-b[0]).map(([row,cells])=>({row,cells}))});
 }
 return sheets;
}
export const columnOrder=ref=>colIndex(ref);
