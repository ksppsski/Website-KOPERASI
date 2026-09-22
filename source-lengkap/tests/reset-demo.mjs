import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {resetPreviousDemo,RESET_ID,RESET_CUTOFF} from '../worker/reset-demo.js';
const db=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+f,'utf8'));
const old='2026-09-17T00:00:00.000Z',recent='2026-09-21T23:59:00.000Z';
for(const [id,time] of [['old',old],['new',recent]]){
 db.prepare('INSERT INTO workflow_requests (id,owner,kind,member_name,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(id,id,'capital','Test',time,time);
 db.prepare('INSERT INTO member_profiles (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,id,'{}','signatures/'+id,'hash','registration/'+id,'proof','image/png',time,time,time);
}
const files=new Map();for(const prefix of ['proof/','contracts/','signed/','signatures/','registration/'])for(const [id,time] of [['old',old],['new',recent]])files.set(prefix+id,{uploaded:new Date(time)});
files.set('assets/keep',{uploaded:new Date(old)});
let fail=true,listCalls=0;
const env={
 DB:{prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args)},
  async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}
 }}}}},
 BUCKET:{async list({prefix}){listCalls++;return {objects:[...files].filter(([k])=>k.startsWith(prefix)).map(([key,x])=>({key,...x})),truncated:false}},async delete(keys){if(fail){fail=false;throw Error('Transient storage error')}for(const k of keys)files.delete(k)}}
};
await assert.rejects(resetPreviousDemo(env),/Transient/);
assert.equal(db.prepare('SELECT count(*) n FROM maintenance_tasks').get().n,0);
assert.equal(db.prepare('SELECT count(*) n FROM member_profiles').get().n,2);
await resetPreviousDemo(env);
assert.deepEqual(db.prepare('SELECT id FROM member_profiles').all().map(x=>x.id),['new']);
assert.deepEqual(db.prepare('SELECT id FROM workflow_requests').all().map(x=>x.id),['new']);
assert.equal(files.size,6);assert([...files.keys()].every(x=>!x.endsWith('old')));
assert(db.prepare('SELECT completed_at FROM maintenance_tasks WHERE id = ?').get(RESET_ID));
const before=listCalls;files.set('proof/late',{uploaded:new Date(old)});
await resetPreviousDemo(env);assert.equal(listCalls,before,'completed reset never reruns');assert(files.has('proof/late'));
assert(old<RESET_CUTOFF&&recent>RESET_CUTOFF);
console.log('PASS: one-time reset removes historical rows/files, preserves new rows/files, retries safely, and never repeats after completion.');
