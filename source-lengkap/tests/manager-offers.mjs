import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import worker from '../worker/index.js';
import {reportWindow,inReportWindow,reportSummary} from '../worker/manager.js';
import {RESET_ID} from '../worker/reset-demo.js';

const db=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
const storage=new Map(),env={DB:{prepare(sql){return {bind(...args){return {execute(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}},async run(){return this.execute()},async all(){return {results:db.prepare(sql).all(...args)}},async first(){return db.prepare(sql).get(...args)||null}}}}},async batch(statements){db.exec('BEGIN');try{const out=statements.map(s=>s.execute());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}},BUCKET:{async put(k,b){storage.set(k,b)},async delete(k){storage.delete(k)}}};
const stamp=new Date().toISOString();
db.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID,stamp);
for(const owner of ['a','b']){
 db.prepare("INSERT INTO member_profiles (owner,id,member_number,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,status,note,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'image/png','approved','',?,?,?)").run(owner,'member-'+owner,'SKI-2026-000'+owner,JSON.stringify({name:'Member '+owner,basic:100000,monthly:10000}),owner+'-signature','hash',owner+'-proof','bukti.png',stamp,stamp,stamp);
 db.prepare("INSERT INTO savings_credits VALUES (?,'registration',?,100000,120000,0,?)").run(owner,'member-'+owner,stamp);
}
async function call(path='',body,owner='a'){
 const headers={'oai-authenticated-user-id':owner,origin:'https://kspps.test'};
 if(body&&!(body instanceof FormData)){headers['content-type']='application/json';body=JSON.stringify(body);}
 const res=await worker.fetch(new Request('https://kspps.test/api/workflow'+path,{method:body?'POST':'GET',body,headers}),env);
 return {status:res.status,data:await res.json()};
}
const role=(value,owner='a')=>{const at=new Date().toISOString();db.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role').run(owner,value,owner,owner+'@example.test','fixture',at,at);return call('/staff/role',{role:value},owner);};
await role('admin');
const offerBody=(code='MRBH-2026-09-01',quota=100)=>({id:crypto.randomUUID(),title:'Pengadaan barang Mitra',projectCode:code,quota});
function capital(offerId,amount,id=crypto.randomUUID(),version=0){const f=new FormData();for(const [k,v] of Object.entries({offerId,amount,id,version,signatureConsent:'true'}))f.set(k,String(v));f.set('proof',new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'bukti.png',{type:'image/png'}));return f;}
assert.equal((await call('/offers',offerBody())).status,403);
assert.equal((await call('/staff/activity')).status,403);
await role('finance');assert.equal((await call('/offers',offerBody())).status,403);assert.equal((await call('/staff/activity')).status,403);
await role('manager');assert.equal((await call('/staff/tasks')).status,403);
assert.equal((await call('/profile/review',{})).status,409);
assert.equal((await call('/finance/reconcile',{})).status,400);
for(const body of [{...offerBody(),projectCode:''},{...offerBody(),title:''},offerBody('BAD',0),offerBody('BAD',1.5),offerBody('BAD',1e12+1)])assert.equal((await call('/offers',body)).status,400);
const body=offerBody(),created=await call('/offers',body);assert.equal(created.status,201);const offer=created.data.offer;
assert.equal(offer.remaining,100);assert.equal(offer.status,'open');
assert.equal((await call('/offers',body)).data.offer.id,offer.id,'retry does not create another offer');
assert.equal((await call('/offers',offerBody('  mrbh-2026-09-01  '))).status,409,'project codes are unique ignoring case and outer whitespace');
assert.deepEqual((await call('/offers',undefined,'b')).data.offers,[],'offers remain inside the current concept workspace');
assert.equal((await call('/capital',capital(offer.id,1), 'b')).status,409,'other account cannot use an offer');
assert.equal((await call('/capital',capital('',1))).status,409,'new applications require an offer');
assert.equal((await call('/capital',capital(offer.id,101))).status,409);
assert.equal(storage.size,0,'failed reservation cleans up its uploaded proof');

// Both requests read the same available capacity, then compete at the SQL insert.
const ids=[crypto.randomUUID(),crypto.randomUUID()];
const raced=await Promise.all(ids.map(id=>call('/capital',capital(offer.id,60,id))));
assert.deepEqual(raced.map(x=>x.status).sort(),[201,409]);
const accepted=raced.find(x=>x.status===201).data.item;
assert.equal(accepted.projectCode,body.projectCode);assert.equal(accepted.offerTitle,body.title);assert.equal(accepted.offerId,offer.id);
assert.equal((await call('/offers')).data.offers[0].remaining,40);
assert.equal((await call('/capital',capital(offer.id,60,accepted.id))).status,200);
assert.equal((await call('/offers')).data.offers[0].reserved,60,'retry cannot reserve twice');
assert.equal(storage.size,1);
const second=await call('/capital',capital(offer.id,40));assert.equal(second.status,201);
assert.equal((await call('/offers')).data.offers[0].status,'full');
assert.equal((await call('/capital',capital(offer.id,1))).status,409);

await role('admin');
const returned=await call('/'+accepted.id+'/review',{action:'return',version:accepted.version,note:'Perbaiki bukti transfer.'});assert.equal(returned.status,200);
assert.equal((await call('/offers')).data.offers[0].remaining,0,'correction keeps the reservation');
assert.equal((await call('/'+accepted.id+'/revise',capital(offer.id,61,accepted.id,returned.data.item.version))).status,409,'revision cannot exceed remaining quota');
let revised=await call('/'+accepted.id+'/revise',capital('forged-other-project',60,accepted.id,returned.data.item.version));assert.equal(revised.status,200,'existing reservation may be corrected while full');assert.equal(revised.data.item.offerId,offer.id,'revision cannot switch projects');
await call('/'+accepted.id+'/review',{action:'return',version:revised.data.item.version,note:'Sesuaikan nominal setoran.'});
revised=await call('/'+accepted.id+'/revise',capital(offer.id,50,accepted.id,revised.data.item.version+1));assert.equal(revised.status,200);
assert.equal((await call('/offers')).data.offers[0].remaining,10);
const rejected=await call('/'+second.data.item.id+'/review',{action:'reject',version:1,note:'Pengajuan dibatalkan setelah pemeriksaan.'});assert.equal(rejected.status,200);
assert.equal((await call('/offers')).data.offers[0].remaining,50,'rejection releases capacity');
assert.equal((await call('/staff/activity')).status,403);
const operational=await call('/staff/tasks');assert(operational.data.tasks.every(t=>t.role==='admin'));assert(operational.data.tasks.every(t=>!('processingSeconds' in t)&&!('receivedAt' in t)));
await role('finance');const financeTasks=(await call('/staff/tasks')).data.tasks;assert(financeTasks.every(t=>t.role==='finance'));
const queue=(await call('/finance/reconciliations')).data.items;assert.equal(queue.find(x=>x.id===accepted.id).projectCode,body.projectCode);
await role('manager');
assert.equal((await call('/staff/activity/start',{taskId:operational.data.tasks[0].id})).status,403,'manager monitors without starting staff tasks');
const report=await call('/staff/activity');assert.equal(report.status,200);assert(report.data.tasks.some(t=>t.role==='admin'));assert(report.data.tasks.some(t=>t.role==='finance'));
await role('finance','b');assert.equal((await call('/staff/activity',undefined,'b')).status,403);

// WITA midnight, inclusive seven-day lookback, date validation, old arrivals.
const range=reportWindow(null,null,new Date('2026-09-21T16:00:00Z'));
assert.deepEqual(range,{from:'2026-09-22',to:'2026-09-22',earliest:'2026-09-15',latest:'2026-09-22'});
assert.equal(reportWindow('2026-09-15','2026-09-22',new Date('2026-09-22T00:00:00Z')).from,'2026-09-15');
for(const [from,to] of [['2026-09-14','2026-09-22'],['2026-09-15','2026-09-23'],['2026-09-22','2026-09-15'],['2026-02-31','2026-09-22']])assert.throws(()=>reportWindow(from,to,new Date('2026-09-22T00:00:00Z')));
assert(inReportWindow({receivedAt:'2026-08-01T00:00:00Z',startedAt:'2026-09-20T00:00:00Z',completedAt:'2026-09-21T16:01:00Z'},range));
assert(inReportWindow({receivedAt:'2026-08-01T00:00:00Z',startedAt:'2026-09-20T00:00:00Z'},range),'ongoing work overlaps selected day');
assert(!inReportWindow({receivedAt:'2026-08-01T00:00:00Z',completedAt:'2026-09-21T15:59:59Z'},range));
const past=reportWindow('2026-09-21','2026-09-21',new Date('2026-09-22T00:00:00Z'));
const metrics=reportSummary([{receivedAt:'2026-09-21T00:00:00Z',startedAt:'2026-09-21T01:00:00Z',completedAt:'2026-09-22T01:00:00Z',responseSeconds:3600,processingSeconds:86400}],past);assert.equal(metrics.completed,0);assert.equal(metrics.responseSamples,1);assert.equal(metrics.processingSamples,0,'a task finished today must not count as finished yesterday');
assert.equal((await call('/staff/activity?from=2000-01-01&to=2099-01-01')).status,400,'server enforces report range');

console.log('PASS: Manager permissions, mandatory unique project codes, scoped offers, atomic quota races, idempotency, full-state rejection, correction/rejection reservations, private operational tasks, Manager-only reports and inclusive WITA date window.');
