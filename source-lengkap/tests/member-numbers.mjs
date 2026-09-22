import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {getProfile,profileDTO,snapshot} from '../worker/membership.js';
const db=new DatabaseSync(':memory:');
for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())db.exec(readFileSync('drizzle/'+file,'utf8'));
const env={DB:{
 prepare(sql){return {bind(...args){return {
  async first(){return db.prepare(sql).get(...args)||null},
  execute(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}
 }}}},
 batch(statements){db.exec('BEGIN');try{const results=statements.map(x=>x.execute());db.exec('COMMIT');return Promise.resolve(results)}catch(e){db.exec('ROLLBACK');throw e}}
}};
function register(id,date){db.prepare('INSERT INTO member_profiles (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id,id,JSON.stringify({name:'TEST '+id}),'signatures/'+id,'hash','registration/'+id,'proof.png','image/png',date,date,date)}
// Insert out of order, then read concurrently. The original timestamp sets both
// ordering and year, including the WITA new-year boundary, not the current year.
register('later','2025-12-31T16:00:00.000Z');register('earlier','2025-12-31T15:59:59.000Z');
const results=await Promise.all([getProfile(env,'later'),getProfile(env,'earlier'),getProfile(env,'later')]);
assert.equal(results[0].member_number,'SKI-2026-0002');assert.equal(results[1].member_number,'SKI-2025-0001');assert.equal(results[2].member_number,results[0].member_number);
assert.equal(db.prepare('SELECT count(*) n FROM member_numbers').get().n,2);
register('new','2027-01-02T00:00:00.000Z');const newest=await getProfile(env,'new');assert.equal(newest.member_number,'SKI-2027-0003');
assert.equal(profileDTO(newest).id,'new');assert.equal(profileDTO(newest).memberNumber,newest.member_number);assert.equal(JSON.parse(snapshot(newest)).memberNumber,newest.member_number);
db.prepare('UPDATE member_profiles SET status = ?, updated_at = ? WHERE owner = ?').run('approved','2028-01-01','later');assert.equal((await getProfile(env,'later')).member_number,'SKI-2026-0002');
assert.equal(await getProfile(env,'missing'),null);
assert.throws(()=>db.prepare('UPDATE member_profiles SET member_number = ? WHERE owner = ?').run('SKI-2026-0002','new'),/UNIQUE/);
// Serial width grows naturally rather than colliding after 9999 registrations.
db.prepare('UPDATE sqlite_sequence SET seq = 9999 WHERE name = ?').run('member_numbers');register('large','2027-01-03T00:00:00.000Z');assert.equal((await getProfile(env,'large')).member_number,'SKI-2027-10000');
console.log('PASS: chronological backfill, WITA registration year, concurrent/repeated allocation, persistent member numbers, uniqueness and serial overflow.');
