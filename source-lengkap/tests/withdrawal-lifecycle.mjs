import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import UPNGModule from '@pdf-lib/upng';
import worker from '../backend/src/index.js';
import { withTestSession, testSessionCookie } from './helpers/test-session.mjs';
import { RESET_ID } from '../backend/src/reset-demo.js';
import { localDate } from '../backend/src/savings.js';
import { activityState } from '../backend/src/activity.js';
const UPNG = UPNGModule.default || UPNGModule,
  db = new DatabaseSync(':memory:');
for (const f of readdirSync('backend/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  db.exec(readFileSync('backend/migrations/' + f, 'utf8'));
const blobs = new Map(),
  env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              execute() {
                return { meta: { changes: Number(db.prepare(sql).run(...args).changes) } };
              },
              async run() {
                return this.execute();
              },
              async first() {
                return db.prepare(sql).get(...args) || null;
              },
              async all() {
                return { results: db.prepare(sql).all(...args) };
              },
            };
          },
        };
      },
      async batch(xs) {
        db.exec('BEGIN');
        try {
          const r = xs.map((x) => x.execute());
          db.exec('COMMIT');
          return r;
        } catch (e) {
          db.exec('ROLLBACK');
          throw e;
        }
      },
    },
    BUCKET: {
      async put(k, v) {
        blobs.set(k, new Uint8Array(v));
      },
      async get(k) {
        return blobs.has(k) ? { body: blobs.get(k) } : null;
      },
      async delete(k) {
        blobs.delete(k);
      },
    },
  };
const now = new Date().toISOString(),
  today = localDate();
db.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID, now);
for (const role of ['admin', 'finance', 'manager']) {
  db.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?)').run(
    role,
    role,
    role,
    role + '@example.test',
    'fixture',
    now,
    now,
  );
  db.prepare('INSERT INTO staff_workspaces VALUES (?,?,?)').run(role, role, now);
}
async function call(
  path = '',
  {
    user = 'member',
    body,
    member,
    staff = false,
    origin = 'https://kspps.test',
    method = body ? 'POST' : 'GET',
  } = {},
) {
  const headers = {};
  if (user) headers.Cookie = testSessionCookie;
  if (method !== 'GET') headers.origin = origin;
  if (staff) headers['x-kspps-portal'] = 'staff';
  if (member) headers['x-kspps-member'] = member;
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const r = await worker.fetch(
    new Request('https://kspps.test/api/workflow' + path, { method, headers, body }),
    withTestSession(env, user),
  );
  return {
    status: r.status,
    data: r.headers.get('content-type')?.includes('application/json')
      ? await r.json()
      : new Uint8Array(await r.arrayBuffer()),
  };
}
const ok = (r, status = 200) => {
  assert.equal(r.status, status, JSON.stringify(r.data));
  return r.data;
};
const rgba = new Uint8Array(1000 * 340 * 4);
for (let x = 100; x < 750; x++)
  for (let y = 0; y < 5; y++) {
    const i = ((100 + (Math.floor(x / 8) % 100) + y) * 1000 + x) * 4;
    rgba[i] = 30;
    rgba[i + 1] = 60;
    rgba[i + 2] = 120;
    rgba[i + 3] = 255;
  }
const png = new Uint8Array(UPNG.encode([rgba.buffer], 1000, 340, 0));
const data = {
  name: 'ANGGOTA PENGUJIAN',
  identityType: 'KTP',
  identityNumber: '0000000000000000',
  identityAddress: 'Jalan Uji 123',
  address: 'Jalan Uji 123',
  village: 'Maricaya',
  district: 'Makassar',
  city: 'Makassar',
  province: 'Sulawesi Selatan',
  bankName: 'Bank Syariah Indonesia',
  bankAccount: '1234567890',
  phone: '081234567890',
  email: 'anggota@example.test',
  birthplace: 'Makassar',
  birthdate: '1995-01-15',
  gender: 'Laki-laki',
  job: 'Wiraswasta',
  education: 'Sarjana',
  marital: 'Menikah',
  mother: 'Ibu Contoh',
  heir: 'Ahli Waris',
  heirPhone: '081234567891',
  basic: 100000,
  monthly: 10000,
  paymentOption: 'Tahunan',
  consent: true,
  signatureConsent: true,
};
const file = () => new File([png], 'bukti.png', { type: 'image/png' });
function registration(id = crypto.randomUUID()) {
  const f = new FormData();
  for (const [k, v] of Object.entries({ id, version: '0', data: JSON.stringify(data) }))
    f.set(k, v);
  f.set('signature', file());
  f.set('ktp', file());
  f.set('proof', file());
  return f;
}
async function approveRegistration(p) {
  let q = ok(await call('/finance/reconciliations', { user: 'finance' })).items.find(
    (x) => x.id === p.id,
  );
  ok(
    await call('/finance/reconcile', {
      user: 'finance',
      body: {
        kind: 'registration',
        id: p.id,
        sourceVersion: q.sourceVersion,
        version: q.reconciliation.version,
        receivedAmount: q.amount,
        transferDate: today,
        reference: 'REG-' + p.id,
        decision: 'approve',
        confirm: true,
      },
    }),
  );
  return ok(
    await call('/profile/review', {
      user: 'admin',
      member: p.id,
      body: {
        version: p.version,
        action: 'approve',
        checks: { identity: true, ktp: true, signature: true },
      },
    }),
  ).profile;
}
let profile = ok(await call('/profile', { body: registration() }), 201).profile;
profile = await approveRegistration(profile);
const oldNumber = profile.memberNumber,
  oldId = profile.id;
assert.equal((await call('/profile/restart', { body: { confirm: true } })).status, 409);
const withdraw = () => ({
  id: crypto.randomUUID(),
  reason: 'Mengundurkan diri atas permintaan sendiri.',
  consent: true,
});
// Running, future and unfinished capital contracts block resignation; ended contracts do not.
const capitalId = crypto.randomUUID();
db.prepare(
  "INSERT INTO workflow_requests (id,owner,kind,member_name,amount,status,note,contract_data,created_at,updated_at) VALUES (?,'member','capital',?,5000000,'signed','',?,?,?)",
).run(capitalId, data.name, JSON.stringify({ endDate: '2099-12-31' }), now, now);
assert.equal((await call('/withdrawal', { body: withdraw() })).status, 409);
assert.equal(ok(await call('/withdrawal/eligibility')).blockers[0].kind, 'capital');
db.prepare('UPDATE workflow_requests SET contract_data=? WHERE id=?').run(
  JSON.stringify({ endDate: today }),
  capitalId,
);
assert.equal(
  ok(await call('/withdrawal/eligibility')).eligible,
  false,
  'ended capital still requires a recorded disposition',
);
db.prepare(
  "INSERT INTO maturity_decisions (request_id,owner,choice,amount,due_date,confirmed_at,confirmed_by) VALUES (?,'member','return',5000000,?,?,'member')",
).run(capitalId, today, now);
db.prepare(
  "INSERT INTO capital_returns (request_id,owner,amount,due_date,bank_name,bank_account,account_name) VALUES (?,'member',5000000,?,?,?,?)",
).run(capitalId, today, data.bankName, data.bankAccount, data.name);
assert.equal(
  ok(await call('/withdrawal/eligibility')).eligible,
  false,
  'unpaid capital cannot be stranded by account closure',
);
db.prepare('UPDATE capital_returns SET paid_at=? WHERE request_id=?').run(now, capitalId);
assert.equal(ok(await call('/withdrawal/eligibility')).eligible, true);
// An overdue financing contract remains running until explicitly settled by Admin.
const financing = {
  profileId: oldId,
  number: 'PB-001',
  purpose: 'Pengadaan barang',
  amount: 1000000,
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  confirm: true,
};
for (const user of ['member', 'finance'])
  assert.equal((await call('/staff/financing', { user, body: financing })).status, 403);
ok(await call('/staff/financing', { user: 'admin', body: financing }), 201);
const fc = ok(await call('/financing')).items[0];
assert.equal(fc.status, 'Lewat jatuh tempo');
assert.equal((await call('/withdrawal', { body: withdraw() })).status, 409);
assert.equal(
  (
    await call('/staff/financing/' + fc.id + '/settle', {
      user: 'finance',
      body: { note: 'Bukti lunas diperiksa.', confirm: true },
    })
  ).status,
  403,
);
ok(
  await call('/staff/financing/' + fc.id + '/settle', {
    user: 'admin',
    body: { note: 'Bukti lunas diperiksa.', confirm: true },
  }),
);
let w = withdraw(),
  item = ok(await call('/withdrawal', { body: w }), 201).item;
assert.equal(item.status, 'pending');
assert.equal((await call('/withdrawal', { body: withdraw() })).status, 409);
for (const user of ['member', 'finance'])
  assert.equal(
    (
      await call('/' + w.id + '/review', {
        user,
        member: user === 'finance' ? oldId : undefined,
        body: { version: 1, action: 'approve' },
      })
    ).status,
    403,
  );
assert.equal(
  (
    await call('/' + w.id + '/review', {
      user: 'admin',
      member: oldId,
      body: { version: 1, action: 'reject' },
    })
  ).status,
  400,
);
ok(
  await call('/' + w.id + '/review', {
    user: 'admin',
    member: oldId,
    body: { version: 1, action: 'reject', note: 'Alasan belum sesuai.' },
  }),
);
assert.equal(ok(await call()).items.find((x) => x.id === w.id).note, 'Alasan belum sesuai.');
// Cancellation and rejected requests allow a new submission.
w = withdraw();
ok(await call('/withdrawal', { body: w }), 201);
ok(await call('/' + w.id + '/cancel', { body: {} }));
w = withdraw();
item = ok(await call('/withdrawal', { body: w }), 201).item;
assert.equal(
  (
    await call('/manager/withdrawals/' + w.id + '/close', {
      user: 'manager',
      body: { version: 1, confirm: true },
    })
  ).status,
  409,
);
assert.equal((await call('/eligibility')).status, 409);
assert.equal(
  (await call('/staff/financing', { user: 'admin', body: { ...financing, number: 'PB-002' } }))
    .status,
  409,
);
assert.throws(
  () =>
    db
      .prepare(
        "INSERT INTO workflow_requests (id,owner,kind,member_name,amount,status,created_at,updated_at) VALUES (?,'member','capital',?,1,'pending',?,?)",
      )
      .run(crypto.randomUUID(), data.name, now, now),
  /MEMBERSHIP_LOCKED/,
  'transaction guard blocks concurrent new contract',
);
item = ok(
  await call('/' + w.id + '/review', {
    user: 'admin',
    member: oldId,
    body: { version: 1, action: 'approve' },
  }),
).item;
assert.equal(item.status, 'finance_pending');
assert.equal(item.settlement.amount, 100000);
assert.equal(ok(await call()).profile.status, 'approved', 'Admin approval does not close account');
assert.equal(
  ok(await call('/manager/withdrawals', { user: 'manager' })).items.length,
  0,
  'not yet handed to manager',
);
assert.equal(
  ok(await call('/finance/withdrawals', { user: 'finance' })).items[0].settlement.bankAccount,
  data.bankAccount,
);
assert.equal((await call('/finance/withdrawals', { user: 'admin' })).status, 403);
function pay(amount = 100000) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    amount,
    transferDate: today,
    reference: 'RETURN-001',
    confirm: 'true',
    version: item.version,
  }))
    f.set(k, String(v));
  f.set('proof', file());
  return f;
}
assert.equal(
  (await call('/finance/withdrawals/' + w.id + '/pay', { user: 'admin', body: pay() })).status,
  403,
);
assert.equal(
  (await call('/finance/withdrawals/' + w.id + '/pay', { user: 'finance', body: pay(99999) }))
    .status,
  400,
);
const missing = pay();
missing.delete('proof');
assert.equal(
  (await call('/finance/withdrawals/' + w.id + '/pay', { user: 'finance', body: missing })).status,
  400,
);
const task = ok(await call('/staff/tasks', { user: 'finance' })).tasks.find(
  (x) => x.targetId === w.id && x.stage === 'withdrawal-return',
);
ok(await call('/staff/activity/start', { user: 'finance', body: { taskId: task.id } }));
const before = blobs.size,
  responses = await Promise.all(
    [1, 2].map(() =>
      call('/finance/withdrawals/' + w.id + '/pay', { user: 'finance', body: pay() }),
    ),
  );
assert.deepEqual(responses.map((r) => r.status).sort(), [200, 409]);
assert.equal(blobs.size, before + 1, 'one transfer proof retained after concurrent retries');
item = ok(await call()).items.find((x) => x.id === w.id);
assert.equal(item.status, 'manager_pending');
assert.equal(
  ok(await call()).profile.status,
  'approved',
  'Finance approval does not close account',
);
assert.equal(ok(await call()).profile.savings.basic, 0);
const managerItem = ok(await call('/manager/withdrawals', { user: 'manager' })).items[0];
assert.equal(managerItem.id, w.id);
assert(managerItem.settlement.paidAt);
assert.equal(
  (await call(managerItem.settlement.proofUrl.replace('/api/workflow', ''), { user: 'manager' }))
    .status,
  200,
);
assert.equal((await call('/withdrawals/' + w.id + '/proof', { user: 'stranger' })).status, 404);
for (const user of ['admin', 'finance', 'member'])
  assert.equal(
    (
      await call('/manager/withdrawals/' + w.id + '/close', {
        user,
        body: { version: item.version, confirm: true },
      })
    ).status,
    403,
  );
assert.equal(
  (
    await call('/manager/withdrawals/' + w.id + '/close', {
      user: 'manager',
      body: { version: item.version, confirm: false },
    })
  ).status,
  400,
);
ok(
  await call('/manager/withdrawals/' + w.id + '/close', {
    user: 'manager',
    body: { version: item.version, confirm: true },
  }),
);
assert.equal(
  (
    await call('/manager/withdrawals/' + w.id + '/close', {
      user: 'manager',
      body: { version: item.version, confirm: true },
    })
  ).status,
  409,
);
const closed = ok(await call());
assert.equal(closed.profile.status, 'closed');
assert.equal(closed.profile.memberNumber, oldNumber);
assert.throws(
  () => db.prepare("UPDATE member_profiles SET status='pending' WHERE id=?").run(oldId),
  /MEMBERSHIP_LOCKED/,
);
assert.equal(closed.profile.savings.active, false);
assert(closed.profile.closedAt);
for (const path of ['/eligibility', '/profile/letter', '/profile/ktp', '/financing'])
  assert.equal((await call(path)).status, 403, path);
for (const [path, body] of [
  ['/capital', {}],
  ['/savings', {}],
  ['/withdrawal', withdraw()],
  ['/profile', registration()],
])
  assert.equal((await call(path, { body })).status, 403, path);
assert.equal((await call('/reports')).status, 403);
// New registration uses the same identity and personal data but an isolated workspace.
assert.equal((await call('/profile/restart', { body: { confirm: false } })).status, 400);
ok(await call('/profile/restart', { body: { confirm: true } }));
let fresh = ok(await call());
assert.equal(fresh.profile, null);
assert.deepEqual(fresh.items, []);
assert.deepEqual(fresh.financing, []);
assert.equal(
  (await call('/profile', { body: registration(oldId) })).status,
  409,
  'old profile identifier cannot be reused',
);
let newProfile = ok(await call('/profile', { body: registration() }), 201).profile;
assert.notEqual(newProfile.memberNumber, oldNumber);
assert.notEqual(newProfile.id, oldId);
assert.equal(newProfile.status, 'pending');
assert.equal(newProfile.savings.basic, 0);
assert.equal(newProfile.savings.paid, 0);
assert.equal(newProfile.letter, null);
assert.equal(newProfile.data.identityNumber, data.identityNumber);
assert.equal(
  db.prepare('SELECT status FROM member_profiles WHERE id=?').get(oldId).status,
  'closed',
);
assert.equal(db.prepare('SELECT count(*) n FROM member_numbers').get().n, 2);
assert.equal((await call('/member/' + oldId + '/profile/ktp')).status, 403);
const oldArchive = ok(await call('', { user: 'admin', staff: true })).profiles.find(
  (p) => p.id === oldId,
);
assert.equal(oldArchive.status, 'closed');
assert.equal(
  (await call('/member/' + oldId + '/profile/ktp', { user: 'admin' })).status,
  200,
  'archive remains accessible to Admin',
);
assert.equal(
  (await call('/eligibility')).status,
  409,
  'new registration must be approved and reconciled',
);
newProfile = await approveRegistration(newProfile);
fresh = ok(await call());
assert.equal(fresh.profile.savings.basic, 100000);
assert.equal(fresh.profile.savings.paid, 120000);
assert.equal(fresh.profile.savings.history.length, 1);
assert.equal(fresh.items.length, 0);
assert(fresh.profile.letter);
assert.equal((await call('/eligibility')).status, 200);
assert.equal((await call('/reports')).status, 200);
assert.equal(
  (await call('/' + capitalId + '/signed')).status,
  404,
  'old contract is not reassigned to new membership',
);
w = withdraw();
assert.equal(
  ok(await call('/withdrawal', { body: w }), 201).item.memberId,
  newProfile.memberNumber,
);
const tasks = (await activityState(env, 'member')).tasks,
  paid = tasks.find((t) => t.stage === 'withdrawal-return');
assert(paid.receivedAt && paid.startedAt && paid.completedAt);
assert.equal(paid.completedBy, 'finance');
assert.equal(tasks.find((t) => t.stage === 'withdrawal-final').completedBy, 'manager');
console.log(
  'PASS: active/overdue contracts, role and stage enforcement, Admin rejection/cancel/reapply, one-time Rp100.000 refund with proof, concurrent retry safety, Manager-only closure, retired number, fresh registration with identical data and isolated balances/docs, archive access and audit actors/timestamps.',
);
