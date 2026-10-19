// Replaces the real first name left in the anonymized OTA corpus (booking 8800000150, event
// anonmail00000661, "<Name>'s birthday") with "Guest" in the LIVE local DB:
// ota_events.guest_text, ota_events.full_text and the cached guest profile.
// It finds the name itself, so the name never appears in commands, logs or Git.
//   node scripts/sanitize-remaining-pii.mjs --dry-run   # count only, no backup, no write
//   node scripts/sanitize-remaining-pii.mjs             # backup to private-data/backups, then write
// Local DB only. Safe to re-run: when nothing is left it changes nothing.
import {DatabaseSync} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';

const DB='.wrangler/state/v3/d1/miniflare-D1DatabaseObject/faaf2b0445ab934c3aac48ddf0cdfade8f9bac050be98993748742cdd2cb05fb.sqlite';
const EVENT='anonmail00000661';
const dry=process.argv.includes('--dry-run');
if(!existsSync(DB))throw new Error('Live local DB not found. Run from the CRABS-Claude folder.');

const db=new DatabaseSync(DB,{readOnly:dry});
const source=db.prepare('SELECT guest_text FROM ota_events WHERE id=?').get(EVENT);
if(!source)throw new Error(`Event ${EVENT} not found.`);
const name=source.guest_text.match(/\b([A-Z][a-z]+)'s birthday/)?.[1];
if(!name||name==='Guest'){console.log('Nothing to sanitize: the name is already replaced.');process.exit(0);}

const re=new RegExp(`(?<![A-Za-z])${name}(?![A-Za-z])`,'g');
const targets=[['ota_events','id',['guest_text','full_text']],['ota_guest_profiles','rowid',['payload']]];
const found=[];
for(const [table,key,cols] of targets)for(const col of cols)
 for(const row of db.prepare(`SELECT ${key} AS k, ${col} AS v FROM ${table} WHERE ${col} GLOB ?`).all(`*${name}*`))
  if(row.v.replace(re,'Guest')!==row.v)found.push({table,key,col,k:row.k,v:row.v.replace(re,'Guest')});
console.log(`Cells containing the name: ${found.length} (${found.map(f=>`${f.table}.${f.col}`).join(', ')||'none'})`);
if(dry||!found.length){console.log(dry?'Dry run: nothing written.':'Nothing to write.');process.exit(0);}

mkdirSync('private-data/backups',{recursive:true});
const backup=`private-data/backups/live-before-pii-${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}.sqlite`;
db.exec(`VACUUM INTO '${backup}'`);
console.log('Backup:',backup);

db.exec('BEGIN');
try{for(const f of found)db.prepare(`UPDATE ${f.table} SET ${f.col}=? WHERE ${f.key}=?`).run(f.v,f.k);db.exec('COMMIT');}
catch(e){db.exec('ROLLBACK');throw e;}
const left=db.prepare('SELECT COUNT(*) AS n FROM ota_events WHERE guest_text GLOB ? OR full_text GLOB ?').get(`*${name}*`,`*${name}*`).n;
const total=db.prepare('SELECT COUNT(*) AS n FROM ota_events').get().n;
console.log(`Updated ${found.length} cells. Remaining in ota_events: ${left}. OTA events total: ${total}.`);
