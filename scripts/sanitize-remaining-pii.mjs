// Replaces real names left in the anonymized OTA corpus with "Guest" in the LIVE local DB, in every
// text column of every app table (events, drafts, sent replies, profiles, tasks…). Each rule names the
// event and a pattern that captures the name, so the names never appear in commands, logs or Git.
//  · anonmail00000661 (booking 8800000150): "<Name>'s birthday"
//  · anonmail00000366 (booking 8800000172): "Passenger: Guest 0161 & <First Last>"
//   node scripts/sanitize-remaining-pii.mjs --dry-run   # count only, no backup, no write
//   node scripts/sanitize-remaining-pii.mjs             # backup to private-data/backups, then write
// Local DB only. Safe to re-run: names already replaced are skipped.
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';

const DB='.wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite';
const RULES=[
 {event:'anonmail00000661',find:/\b([A-Z][a-z]+)'s birthday/},
 {event:'anonmail00000366',find:/Passenger:\s*Guest \d+\s*&\s*([A-Z][a-z]+(?: [A-Z][a-z]+)+)/},
];
const dry=process.argv.includes('--dry-run');
if(!existsSync(DB))throw new Error('Live local DB not found. Run from the CRABS-Claude folder.');
const db=new DatabaseSync(DB,{readOnly:dry});

const names=[];
for(const r of RULES){const row=db.prepare('SELECT guest_text FROM ota_events WHERE id=?').get(r.event);const name=row?.guest_text.match(r.find)?.[1];if(name&&!/^Guest\b/.test(name))names.push(name);}
if(!names.length){console.log('Nothing to sanitize: the names are already replaced.');process.exit(0);}

const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name).filter(n=>!n.startsWith('_')&&!['sqlite_sequence','d1_migrations'].includes(n));
const found=[];
for(const table of tables){const cols=db.prepare(`PRAGMA table_info(${table})`).all().filter(c=>/TEXT/i.test(c.type)).map(c=>c.name);
 for(const col of cols)for(const name of names){const re=new RegExp(`(?<![A-Za-z])${name.replace(/ /g,'\\s+')}(?![A-Za-z])`,'g');
  for(const row of db.prepare(`SELECT rowid AS k, ${col} AS v FROM ${table} WHERE ${col} GLOB ?`).all(`*${name.split(' ')[0]}*`)){
   const prev=found.find(f=>f.table===table&&f.col===col&&f.k===row.k),base=prev?prev.v:row.v,v=base.replace(re,'Guest');
   if(v!==base){if(prev)prev.v=v;else found.push({table,col,k:row.k,v});}}}}
console.log(`Names found: ${names.length}. Cells to update: ${found.length} (${[...new Set(found.map(f=>`${f.table}.${f.col}`))].join(', ')||'none'})`);
if(dry||!found.length){console.log(dry?'Dry run: nothing written.':'Nothing to write.');process.exit(0);}

mkdirSync('private-data/backups',{recursive:true});
const backup=`private-data/backups/live-before-pii-${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}.sqlite`;
db.exec(`VACUUM INTO '${backup}'`);
console.log('Backup:',backup);
db.exec('BEGIN');
try{for(const f of found)db.prepare(`UPDATE ${f.table} SET ${f.col}=? WHERE rowid=?`).run(f.v,f.k);db.exec('COMMIT');}
catch(e){db.exec('ROLLBACK');throw e;}
const left=names.reduce((n,name)=>n+db.prepare('SELECT COUNT(*) AS n FROM ota_events WHERE guest_text GLOB ? OR full_text GLOB ?').get(`*${name}*`,`*${name}*`).n,0);
console.log(`Updated ${found.length} cells. Remaining in ota_events: ${left}. OTA events total: ${db.prepare('SELECT COUNT(*) AS n FROM ota_events').get().n}.`);
