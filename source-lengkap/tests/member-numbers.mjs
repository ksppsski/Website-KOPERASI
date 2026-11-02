import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import {
  assignMemberNumbers,
  getProfile,
  profileDTO,
  snapshot,
} from '../backend/src/membership.js';
const db = new DatabaseSync(':memory:');
for (const file of readdirSync('backend/migrations')
  .filter((x) => x.endsWith('.sql'))
  .sort())
  db.exec(readFileSync('backend/migrations/' + file, 'utf8'));
const env = {
  DB: {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() {
              return db.prepare(sql).get(...args) || null;
            },
            execute() {
              return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } };
            },
          };
        },
      };
    },
    batch(statements) {
      db.exec('BEGIN');
      try {
        const results = statements.map((x) => x.execute());
        db.exec('COMMIT');
        return Promise.resolve(results);
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  },
};
function register(id, date) {
  db.prepare(
    'INSERT INTO member_profiles (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  ).run(
    id,
    id,
    JSON.stringify({ name: 'TEST ' + id }),
    'signatures/' + id,
    'hash',
    'registration/' + id,
    'proof.png',
    'image/png',
    date,
    date,
    date,
  );
}
// Insert out of order, then read concurrently. The original timestamp sets both
// ordering, year and Roman month, including the WITA new-year boundary.
register('later', '2025-12-31T16:00:00.000Z');
register('earlier', '2025-12-31T15:59:59.000Z');
const results = await Promise.all([
  getProfile(env, 'later'),
  getProfile(env, 'earlier'),
  getProfile(env, 'later'),
]);
assert.equal(results[0].member_number, 'SKI-2026-I-0002');
assert.equal(results[1].member_number, 'SKI-2025-XII-0001');
assert.equal(results[2].member_number, results[0].member_number);
assert.equal(db.prepare('SELECT count(*) n FROM member_numbers').get().n, 2);
register('new', '2027-01-02T00:00:00.000Z');
const newest = await getProfile(env, 'new');
assert.equal(newest.member_number, 'SKI-2027-I-0003');
assert.equal(profileDTO(newest).id, 'new');
assert.equal(profileDTO(newest).memberNumber, newest.member_number);
assert.equal(JSON.parse(snapshot(newest)).memberNumber, newest.member_number);
db.prepare('UPDATE member_profiles SET status = ?, updated_at = ? WHERE owner = ?').run(
  'approved',
  '2028-01-01',
  'later',
);
assert.equal((await getProfile(env, 'later')).member_number, 'SKI-2026-I-0002');
assert.equal(await getProfile(env, 'missing'), null);
assert.throws(
  () =>
    db
      .prepare('UPDATE member_profiles SET member_number = ? WHERE owner = ?')
      .run('SKI-2026-I-0002', 'new'),
  /UNIQUE/,
);

// Previously issued identities keep their original spelling and reserved serial.
register('legacy', '2024-07-10T00:00:00.000Z');
db.prepare('INSERT INTO member_numbers (profile_id) VALUES (?)').run('legacy');
db.prepare('UPDATE member_profiles SET member_number=? WHERE owner=?').run(
  'SKI-2024-0004',
  'legacy',
);
await assignMemberNumbers(env);
const legacy = await getProfile(env, 'legacy');
assert.equal(legacy.member_number, 'SKI-2024-0004');
assert.equal(JSON.parse(snapshot(legacy)).memberNumber, 'SKI-2024-0004');
assert.equal(db.prepare('SELECT count(*) n FROM member_numbers').get().n, 4);

// The calendar switches at WITA midnight; serials never reset with the month.
register('november', '2026-10-31T16:00:00.000Z');
register('october', '2026-10-31T15:59:59.000Z');
const monthBoundary = await Promise.all([getProfile(env, 'november'), getProfile(env, 'october')]);
assert.equal(monthBoundary[0].member_number, 'SKI-2026-XI-0006');
assert.equal(monthBoundary[1].member_number, 'SKI-2026-X-0005');

// Each of the twelve calendar months has its own Roman spelling. A backfill
// orders all pending profiles chronologically even when read in reverse order.
const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
for (let month = 12; month >= 1; month--)
  register('month-' + month, `2028-${String(month).padStart(2, '0')}-01T00:00:00.000Z`);
const monthly = await Promise.all(
  Array.from({ length: 12 }, (_, index) => getProfile(env, 'month-' + (12 - index))),
);
for (let index = 0; index < monthly.length; index++) {
  const month = 12 - index;
  assert.equal(
    monthly[index].member_number,
    `SKI-2028-${romanMonths[month - 1]}-${String(6 + month).padStart(4, '0')}`,
  );
}
const beforeRepeatedBackfill = db.prepare('SELECT count(*) n FROM member_numbers').get().n;
await Promise.all([assignMemberNumbers(env), assignMemberNumbers(env)]);
assert.equal(db.prepare('SELECT count(*) n FROM member_numbers').get().n, beforeRepeatedBackfill);
assert.equal((await getProfile(env, 'legacy')).member_number, 'SKI-2024-0004');

// Serial width grows naturally rather than colliding after 9999 registrations.
db.prepare('UPDATE sqlite_sequence SET seq = 9999 WHERE name = ?').run('member_numbers');
register('large', '2027-01-03T00:00:00.000Z');
assert.equal((await getProfile(env, 'large')).member_number, 'SKI-2027-I-10000');
console.log(
  'PASS: chronological backfill, WITA year/month boundaries, all twelve Roman months, global serials, concurrent/repeated allocation, legacy identities, uniqueness and serial overflow.',
);
