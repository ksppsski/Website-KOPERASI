import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../backend/src/index.js';
import { withTestSession, testSessionCookie } from './helpers/test-session.mjs';
import {
  allocation,
  assignmentAt,
  summarizeAvalistFees,
  monthlyAvalistFees,
} from '../backend/src/avalist.js';
import { makassarToday, scheduledDate } from '../backend/src/finance.js';
import { RESET_ID } from '../backend/src/reset-demo.js';
// Fee totals distinguish due entitlement from future periods and payment preparation.
const feeDay = '2026-10-04';
const feeItems = [
  { date: '2026-09-04', avalist: 200000, status: 'paid' },
  { date: feeDay, avalist: 100000, status: 'prepared' },
  { date: '2026-11-04', avalist: 900000, status: 'pending' },
];
const feePayments = [
  { kind: 'regular', status: 'paid', amount: 200000, due_date: '2026-09-04' },
  { kind: 'adjustment', status: 'paid', amount: -20000, due_date: '2026-09-04' },
  { kind: 'regular', status: 'prepared', amount: 100000, due_date: feeDay },
  { kind: 'adjustment', status: 'prepared', amount: 40000, due_date: feeDay },
  { kind: 'adjustment', status: 'needs_review', amount: -10000, due_date: feeDay },
  { kind: 'adjustment', status: 'prepared', amount: 50000, due_date: '2026-11-04' },
];
assert.deepEqual(summarizeAvalistFees(feeItems, feePayments, feeDay), {
  asOf: feeDay,
  total: 310000,
  paid: 180000,
  pending: 130000,
  scheduledDue: 100000,
  pendingAdjustments: 30000,
});
assert.equal(
  summarizeAvalistFees(
    feeItems,
    feePayments.map((p, i) => (i === 3 ? { ...p, status: 'paid' } : p)),
    feeDay,
  ).total,
  310000,
  'Paying an approved adjustment moves balance without changing earned total',
);
assert.equal(
  summarizeAvalistFees([], [feePayments[0]], feeDay).total,
  200000,
  'Archived contract payment history is retained',
);
assert.deepEqual(summarizeAvalistFees([], [], feeDay), {
  asOf: feeDay,
  total: 0,
  paid: 0,
  pending: 0,
  scheduledDue: 0,
  pendingAdjustments: 0,
});
// Monthly entitlement and cash settlement deliberately use different months.
const monthlyItems = [
  { date: '2026-09-30', avalist: 200000, status: 'paid' },
  { date: '2026-10-04', avalist: 100000, status: 'prepared' },
  { date: '2026-10-25', avalist: 50000, status: 'pending' },
  { date: '2026-11-04', avalist: 900000, status: 'pending' },
];
const monthlyPayments = [
  {
    kind: 'regular',
    status: 'paid',
    amount: 200000,
    due_date: '2026-09-30',
    transfer_date: '2026-10-01',
    paid_at: '2026-11-01T16:01:00Z',
  },
  {
    kind: 'adjustment',
    status: 'paid',
    amount: -20000,
    due_date: '2026-09-30',
    transfer_date: '2026-10-02',
  },
  { kind: 'regular', status: 'prepared', amount: 100000, due_date: '2026-10-04' },
  { kind: 'adjustment', status: 'prepared', amount: 40000, due_date: '2026-10-04' },
  { kind: 'adjustment', status: 'needs_review', amount: -10000, due_date: '2026-10-04' },
  {
    kind: 'regular',
    status: 'paid',
    amount: 70000,
    due_date: '2025-12-31',
    transfer_date: '2026-01-01',
  },
];
const monthlyRows = monthlyAvalistFees(monthlyItems, monthlyPayments, feeDay);
assert.deepEqual(
  monthlyRows.find((x) => x.month === '2026-10'),
  {
    month: '2026-10',
    total: 180000,
    paid: 180000,
    paidForPeriod: 0,
    pending: 180000,
    notDueYet: 50000,
  },
);
assert.deepEqual(
  monthlyRows.find((x) => x.month === '2026-09'),
  {
    month: '2026-09',
    total: 180000,
    paid: 0,
    paidForPeriod: 180000,
    pending: 0,
    notDueYet: 0,
  },
);
assert.equal(
  monthlyRows.find((x) => x.month === '2026-01').paid,
  70000,
  'Use transfer date across the year boundary',
);
assert.equal(
  monthlyRows.find((x) => x.month === '2025-12').total,
  70000,
  'Include immutable paid history even when a contract is no longer scheduled',
);
assert.equal(
  monthlyRows.find((x) => x.month === '2026-11').paid,
  0,
  'Do not use the date Finance entered the payment',
);
assert.equal(monthlyRows.find((x) => x.month === '2026-11').total, 900000);
assert.deepEqual(monthlyAvalistFees([], [], feeDay), [
  { month: '2026-10', total: 0, paid: 0, paidForPeriod: 0, pending: 0, notDueYet: 0 },
]);
const afterSettlement = monthlyAvalistFees(
  monthlyItems,
  monthlyPayments.map((p, i) =>
    i === 3 ? { ...p, status: 'paid', transfer_date: '2026-10-04' } : p,
  ),
  feeDay,
).find((x) => x.month === '2026-10');
assert.equal(afterSettlement.total, 180000);
assert.equal(afterSettlement.pending, 140000);
assert.equal(
  afterSettlement.paid,
  220000,
  'Cash includes the older month settlement plus the current correction',
);
const db = new DatabaseSync(':memory:');
for (const f of readdirSync('backend/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  db.exec(readFileSync('backend/migrations/' + f, 'utf8'));
let concurrent = null;
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
        if (concurrent) {
          const f = concurrent;
          concurrent = null;
          f();
        }
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
  today = makassarToday(),
  at = new Date(today + 'T12:00:00Z');
at.setUTCDate(1);
at.setUTCMonth(at.getUTCMonth() - 4);
const start = at.toISOString().slice(0, 10),
  due = scheduledDate(start, 1),
  next = scheduledDate(start, 2),
  third = scheduledDate(start, 3),
  end = scheduledDate(start, 12);
db.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID, now);
for (const role of ['admin', 'finance', 'manager', 'avalist-a', 'avalist-b']) {
  db.prepare('INSERT INTO staff_accounts VALUES(?,?,?,?,?,?,?)').run(
    role,
    role.startsWith('avalist') ? 'avalist' : role,
    role,
    role + '@example.test',
    'fixture',
    now,
    now,
  );
}
db.prepare("INSERT INTO staff_bootstrap VALUES('primary','manager',?)").run(now);
async function call(
  path = '',
  {
    user = 'manager',
    body,
    staff = false,
    member,
    email,
    emailVerified = !!email,
    origin = 'https://kspps.test',
  } = {},
) {
  const headers = {};
  if (user) headers.Cookie = testSessionCookie;
  if (staff) headers['x-kspps-portal'] = 'staff';
  if (member) headers['x-kspps-member'] = member;
  if (body) {
    headers.origin = origin;
    if (!(body instanceof FormData)) {
      headers['content-type'] = 'application/json';
      body = JSON.stringify(body);
    }
  }
  const r = await worker.fetch(
    new Request('https://kspps.test/api/workflow' + path, {
      method: body ? 'POST' : 'GET',
      headers,
      body,
    }),
    withTestSession(env, user && { id: user, name: user, email: email || '', emailVerified }),
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
const personBody = (name) => ({
  userId: 'avalist-' + name,
  name: 'Avalist ' + name,
  bankName: 'BSI',
  bankAccount: name === 'a' ? '111111' : '222222',
  accountName: 'PENERIMA ' + name,
  reason: 'Pendaftaran avalist internal',
});
for (const user of ['member', 'admin', 'finance', 'avalist-a'])
  assert.equal((await call('/avalist/people', { user, body: personBody('a') })).status, 403);
const a = ok(await call('/avalist/people', { body: personBody('a') })).id,
  b = ok(await call('/avalist/people', { body: personBody('b') })).id;
const memberId = crypto.randomUUID();
db.prepare(
  "INSERT INTO member_profiles(owner,id,member_number,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,status,consent_at,created_at,updated_at) VALUES('member',?,'SKI-UJI',?,'signature','sha','proof','proof.png','image/png','approved',?,?,?)",
).run(
  memberId,
  JSON.stringify({
    name: 'ANGGOTA UJI',
    identityNumber: 'SECRET-NIK',
    bankAccount: 'SECRET-MEMBER-BANK',
    bankName: 'BSI',
  }),
  now,
  now,
  now,
);
const defaultBody = {
  memberId,
  scope: 'new',
  personId: a,
  rate: 2,
  reason: 'Penetapan awal avalist',
};
assert.equal(
  (await call('/avalist/assignments', { user: 'admin', body: defaultBody })).status,
  403,
);
const prop = ok(await call('/avalist/proposals', { user: 'admin', body: defaultBody })).id;
assert.equal(
  db.prepare('SELECT count(*) AS n FROM avalist_events').get().n,
  0,
  'Proposal must not change entitlements',
);
ok(await call('/avalist/proposals/' + prop + '/approve', { body: {} }));
assert.equal((await call('/avalist/proposals/' + prop + '/approve', { body: {} })).status, 409);
const createContract = (reconciled = true) => {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO workflow_requests(id,owner,kind,member_name,amount,status,proof_key,contract_number,contract_data,member_snapshot,created_at,updated_at) VALUES(?,'member','capital','ANGGOTA UJI',10000000,'signed',?,?,?,?,?,?)",
  ).run(
    id,
    id,
    'AKAD-' + id.slice(0, 6),
    JSON.stringify({ effectiveDate: start, endDate: end, agreementDate: start }),
    JSON.stringify({
      id: memberId,
      memberNumber: 'SKI-UJI',
      data: { name: 'ANGGOTA UJI', bankName: 'BSI', bankAccount: 'SECRET-MEMBER-BANK' },
    }),
    now,
    now,
  );
  if (reconciled)
    db.prepare(
      "INSERT INTO finance_reconciliations(id,owner,target_kind,target_id,proof_key,expected_amount,received_amount,transfer_date,reference,status,checked_by,checked_at) VALUES(?,'member','capital',?,?,10000000,10000000,?,'TEST','approved','finance',?)",
    ).run(crypto.randomUUID(), id, id, start, now);
  return id;
};
const contract = createContract(),
  unfunded = createContract(false);
const view = async (date = due, user = 'finance') =>
  ok(await call('/avalist?date=' + date, { user }));
let v = await view();
assert.equal(v.items.length, 1);
assert.equal(v.items[0].personId, a);
assert.deepEqual(
  [v.items[0].member, v.items[0].cooperative, v.items[0].avalist],
  [500000, 300000, 200000],
);
for (const principal of [1, 15, 25, 101, 10000001])
  for (const rate of [1, 2]) {
    const x = allocation(principal, rate);
    assert.equal(x.member + x.cooperative + x.avalist, x.total);
  }
// Profile default applies only to new applications, including renewals; old contracts retain assignment.
ok(
  await call('/avalist/assignments', {
    body: {
      ...defaultBody,
      personId: b,
      rate: 1,
      reason: 'Avalist bawaan untuk pengajuan berikutnya',
    },
  }),
);
assert.equal((await view()).items[0].personId, a);
const newer = createContract();
assert.equal((await view()).items.find((x) => x.contractId === newer).personId, b);
// An unrelated member or unassigned account cannot access staff/private avalist endpoints.
assert.equal((await call('/avalist', { user: 'member' })).status, 403);
for (const path of [
  '/staff/members',
  '/finance/payouts',
  '/reports',
  '/profile/ktp',
  '/member/' + memberId + '/profile',
  '/manager/withdrawals',
])
  assert.equal((await call(path, { user: 'avalist-a' })).status, 403, path);
const root = ok(await call('', { user: 'avalist-a', staff: true }));
assert.deepEqual(root.profiles, []);
assert.deepEqual(root.items, []);
assert.equal(
  (await call('/staff/role', { user: 'avalist-a', body: { role: 'manager' } })).status,
  403,
);
const prepared = ok(
  await call('/avalist/prepare', { user: 'finance', body: { contractId: contract, date: due } }),
).id;
let payment = (await view()).history.find((x) => x.id === prepared);
const proofForm = (p) => {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    version: p.version,
    amount: Math.abs(p.amount),
    transferDate: due,
    reference: 'BANK-REF-' + crypto.randomUUID(),
    confirm: 'yes',
  }))
    f.set(k, String(v));
  f.set(
    'proof',
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])], 'bukti.png', {
      type: 'image/png',
    }),
  );
  return f;
};
assert.equal(
  (
    await call('/avalist/payments/' + prepared + '/pay', {
      user: 'admin',
      body: proofForm(payment),
    })
  ).status,
  403,
);
// Concurrent source change aborts the whole recording and removes orphan proof; no payment is falsely completed.
const before = blobs.size;
concurrent = () =>
  db.prepare('UPDATE workflow_requests SET version=version+1 WHERE id=?').run(contract);
assert.equal(
  (
    await call('/avalist/payments/' + prepared + '/pay', {
      user: 'finance',
      body: proofForm(payment),
    })
  ).status,
  409,
);
assert.equal(blobs.size, before);
assert.equal(
  db.prepare('SELECT status FROM avalist_payments WHERE id=?').get(prepared).status,
  'prepared',
);
ok(
  await call('/avalist/payments/' + prepared + '/pay', {
    user: 'finance',
    body: proofForm(payment),
  }),
);
assert.equal(
  (
    await call('/avalist/payments/' + prepared + '/pay', {
      user: 'finance',
      body: proofForm(payment),
    })
  ).status,
  409,
);
const paidRaw = db.prepare('SELECT * FROM avalist_payments WHERE id=?').get(prepared);
assert.throws(
  () => db.prepare('UPDATE avalist_payments SET amount=1 WHERE id=?').run(prepared),
  /IMMUTABLE/,
);
assert.throws(
  () => db.prepare('DELETE FROM avalist_payments WHERE id=?').run(prepared),
  /IMMUTABLE/,
);
assert.throws(() => db.exec('UPDATE avalist_events SET rate=1'), /IMMUTABLE/);
// Prepare the following period, then change only the person for running contracts.
const nextId = ok(
  await call('/avalist/prepare', { user: 'finance', body: { contractId: contract, date: next } }),
).id;
const stale = (await view(next)).history.find((p) => p.id === nextId);
const change = {
  memberId,
  scope: 'selected',
  contractIds: [contract],
  effectiveDate: next,
  personId: b,
  reason: 'Pengalihan penanganan mulai periode kedua',
};
ok(await call('/avalist/assignments', { body: change }));
assert.equal(
  (await view(next)).items.find((x) => x.contractId === contract).rate,
  2,
  'Person change must preserve rate',
);
assert.equal(
  (await view()).items.find((x) => x.contractId === contract).personId,
  a,
  'Paid earlier period stays with old avalist',
);
assert.equal(
  (await view(next)).items.find((x) => x.contractId === contract).status,
  'needs_review',
);
const staleForm = proofForm(stale);
staleForm.set('transferDate', next);
assert.equal(
  (await call('/avalist/payments/' + nextId + '/pay', { user: 'finance', body: staleForm })).status,
  409,
);
// Rate change is independent; unallocated 1% goes to cooperative.
ok(
  await call('/avalist/assignments', {
    body: {
      ...change,
      personId: null,
      rate: 1,
      reason: 'Penyesuaian bagian avalist menjadi satu persen',
    },
  }),
);
v = await view(next);
const x = v.items.find((x) => x.contractId === contract);
assert.deepEqual(
  [x.personId, x.rate, x.member, x.cooperative, x.avalist],
  [b, 1, 500000, 400000, 100000],
);
ok(await call('/avalist/prepare', { user: 'finance', body: { contractId: contract, date: next } }));
// Retroactive assignment affects unpaid periods, never the completed bank record.
ok(
  await call('/avalist/assignments', {
    body: {
      ...change,
      effectiveDate: due,
      rate: 1,
      reason: 'Pergantian pada akad lama untuk periode belum dibayar',
    },
  }),
);
assert.deepEqual(db.prepare('SELECT * FROM avalist_payments WHERE id=?').get(prepared), paidRaw);
const ownA = ok(await call('/avalist?view=personal', { user: 'avalist-a' })),
  ownB = ok(await call('/avalist?view=personal', { user: 'avalist-b' }));
assert(ownA.history.some((p) => p.id === prepared));
assert(!ownB.history.some((p) => p.id === prepared));
assert.equal(ownA.feeSummary.paid, 200000);
assert.equal(ownB.feeSummary.paid, 0, 'A different recipient cannot include the original paid fee');
assert.equal(ownA.monthlyFees.find((row) => row.month === due.slice(0, 7)).paid, 200000);
assert(ownB.monthlyFees.every((row) => row.paid === 0));
assert.equal(ownA.feeSummary.total, 200000);
assert(
  ownA.items.every((x) => x.date < next),
  'Former avalist cannot see later entitlements',
);
assert(!JSON.stringify(ownA).includes('SECRET'));
assert(!JSON.stringify(ownA).includes('Avalist b'));
assert.equal(
  (await call('/avalist/payments/' + prepared + '/proof', { user: 'avalist-b' })).status,
  403,
);
ok(await call('/avalist/payments/' + prepared + '/proof', { user: 'avalist-a' }));
// Separate manager-approved correction, with negative amount recorded as a recovery.
const adjustmentBody = {
  id: crypto.randomUUID(),
  originalId: prepared,
  personId: a,
  amount: -100000,
  reason: 'Koreksi bagian avalist pada periode yang sudah dibayar',
};
assert.equal(
  (await call('/avalist/adjustments', { user: 'finance', body: adjustmentBody })).status,
  403,
);
const adj = ok(await call('/avalist/adjustments', { body: adjustmentBody })).id;
assert.equal((await call('/avalist/adjustments', { body: adjustmentBody })).status, 409);
let correction = (await view()).history.find((p) => p.id === adj);
assert.equal(correction.amount, -100000);
const unpaidCorrectionFees = ok(
  await call('/avalist?view=personal', { user: 'avalist-a' }),
).feeSummary;
assert.equal(unpaidCorrectionFees.pendingAdjustments, -100000);
assert.equal(unpaidCorrectionFees.pending, -100000);
assert.equal(unpaidCorrectionFees.total, 100000);

ok(
  await call('/avalist/payments/' + adj + '/pay', { user: 'finance', body: proofForm(correction) }),
);
assert.deepEqual(db.prepare('SELECT * FROM avalist_payments WHERE id=?').get(prepared), paidRaw);
const settledCorrectionFees = ok(
  await call('/avalist?view=personal', { user: 'avalist-a' }),
).feeSummary;
assert.equal(settledCorrectionFees.paid, 100000);
assert.equal(settledCorrectionFees.pending, 0);
assert.equal(settledCorrectionFees.total, unpaidCorrectionFees.total);
// Changing bank details invalidates prepared records and retains paid bank snapshots.
let profile = (await view()).people.find((p) => p.id === b);
ok(
  await call('/avalist/people', {
    body: {
      ...personBody('b'),
      bankAccount: '333333',
      version: profile.version,
      reason: 'Perubahan rekening avalist',
    },
  }),
);
assert.equal((await view(next)).history.find((p) => p.id === nextId).status, 'needs_review');
assert.equal(JSON.parse(paidRaw.snapshot).bankAccount, '111111');
// Cross-member selections and late dates are rejected.
assert.equal(
  (await call('/avalist/assignments', { body: { ...change, contractIds: [crypto.randomUUID()] } }))
    .status,
  400,
);
assert.equal(
  (
    await call('/avalist/assignments', {
      body: { ...change, effectiveDate: scheduledDate(start, 13) },
    })
  ).status,
  400,
);
assert.equal((await call('/avalist/assignments', { body: { ...change, rate: 3 } })).status, 400);
// Incomplete initial proposals are rejected before they reach Manager. Existing
// pending proposals can be completed explicitly without touching other assignments.
const legacyMember = crypto.randomUUID();
db.prepare(
  "INSERT INTO member_profiles(owner,id,member_number,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,status,consent_at,created_at,updated_at) VALUES('legacy',?,'SKI-LEGACY',?,'s','sha','p','p.png','image/png','approved',?,?,?)",
).run(legacyMember, JSON.stringify({ name: 'ANGGOTA LAMA' }), now, now, now);
function legacyContract(label) {
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO workflow_requests(id,owner,kind,member_name,amount,status,contract_number,contract_data,member_snapshot,created_at,updated_at) VALUES(?,'legacy','capital','ANGGOTA LAMA',10000000,'signed',?,?,?,?,?)",
  ).run(
    id,
    label,
    JSON.stringify({ effectiveDate: start, endDate: end, agreementDate: start }),
    JSON.stringify({
      id: legacyMember,
      memberNumber: 'SKI-LEGACY',
      data: { name: 'ANGGOTA LAMA' },
    }),
    now,
    now,
  );
  return id;
}
const legacyOne = legacyContract('LEGACY-ONE'),
  legacyTwo = legacyContract('LEGACY-TWO');
const incomplete = {
  memberId: legacyMember,
  scope: 'all',
  contractIds: [legacyOne, legacyTwo],
  personId: null,
  rate: 2,
  effectiveDate: due,
  reason: 'Usulan lama sebelum validasi kelengkapan',
};
let blockedProposal = await call('/avalist/proposals', { user: 'admin', body: incomplete });
assert.equal(blockedProposal.status, 400);
assert.match(blockedProposal.data.error, /LEGACY-ONE: nama avalist/);
assert.match(blockedProposal.data.error, /LEGACY-TWO: nama avalist/);
const legacyProposal = crypto.randomUUID();
db.prepare(
  "INSERT INTO avalist_proposals(id,payload,submitted_by,created_at) VALUES(?,?,'admin',?)",
).run(legacyProposal, JSON.stringify(incomplete), now);
let pendingProposal = (await view()).proposals.find((p) => p.id === legacyProposal);
assert.deepEqual(pendingProposal.completionNeeded, [
  { contractId: legacyOne, needsPerson: true, needsRate: false },
  { contractId: legacyTwo, needsPerson: true, needsRate: false },
]);
assert.equal(
  (await call('/avalist/proposals/' + legacyProposal + '/approve', { body: {} })).status,
  400,
);
assert.equal(
  (
    await call('/avalist/proposals/' + legacyProposal + '/approve', {
      user: 'admin',
      body: { completion: { personId: b } },
    })
  ).status,
  403,
);
assert.equal(
  (
    await call('/avalist/proposals/' + legacyProposal + '/approve', {
      body: { completion: { personId: 'not-a-person' } },
    })
  ).status,
  400,
);
assert.equal(
  db.prepare('SELECT status FROM avalist_proposals WHERE id=?').get(legacyProposal).status,
  'pending',
);
ok(
  await call('/avalist/proposals/' + legacyProposal + '/approve', {
    body: { completion: { personId: b } },
  }),
);
let legacyEvents = db.prepare('SELECT * FROM avalist_events WHERE member_id=?').all(legacyMember);
assert.deepEqual(assignmentAt(legacyEvents, legacyOne, due), { personId: b, rate: 2 });
assert.deepEqual(assignmentAt(legacyEvents, legacyTwo, due), { personId: b, rate: 2 });
assert.equal(
  legacyEvents.filter((e) => e.contract_id === null).length,
  0,
  'Completing running contracts must not assign future applications',
);
const savedProposal = db.prepare('SELECT * FROM avalist_proposals WHERE id=?').get(legacyProposal);
assert.equal(
  savedProposal.payload,
  JSON.stringify(incomplete),
  'Original submitted proposal remains traceable',
);
assert.match(savedProposal.decision_note, /avalist Avalist b/);
assert.equal(
  (
    await call('/avalist/proposals/' + legacyProposal + '/approve', {
      body: { completion: { personId: b } },
    })
  ).status,
  409,
);
// Filling a missing initial rate must not overwrite a different rate on another contract.
const existingRate = legacyContract('KEEP-TWO-PERCENT'),
  missingRate = legacyContract('NEEDS-INITIAL-RATE');
ok(
  await call('/avalist/assignments', {
    body: { ...incomplete, scope: 'selected', contractIds: [existingRate], personId: b, rate: 2 },
  }),
);
const mixed = { ...incomplete, contractIds: [existingRate, missingRate], personId: b, rate: null };
const mixedId = crypto.randomUUID();
db.prepare(
  "INSERT INTO avalist_proposals(id,payload,submitted_by,created_at) VALUES(?,?,'admin',?)",
).run(mixedId, JSON.stringify(mixed), now);
const needs = (await view()).proposals.find((p) => p.id === mixedId).completionNeeded;
assert.deepEqual(needs, [{ contractId: missingRate, needsPerson: false, needsRate: true }]);
ok(await call('/avalist/proposals/' + mixedId + '/approve', { body: { completion: { rate: 1 } } }));
legacyEvents = db.prepare('SELECT * FROM avalist_events WHERE member_id=?').all(legacyMember);
assert.equal(assignmentAt(legacyEvents, existingRate, due).rate, 2);
assert.equal(assignmentAt(legacyEvents, missingRate, due).rate, 1);
assert.deepEqual(
  db.prepare('SELECT * FROM avalist_payments WHERE id=?').get(prepared),
  paidRaw,
  'Approvals never rewrite a paid transfer',
);

// Revocation prevents personal access and payment, while history remains stored.
db.prepare('DELETE FROM staff_accounts WHERE user_id=?').run('avalist-a');
assert.equal((await call('/avalist?view=personal', { user: 'avalist-a' })).status, 403);
assert(db.prepare('SELECT id FROM avalist_payments WHERE id=?').get(prepared));
assert.equal(
  (await call('/avalist/assignments', { body: change, origin: 'https://other.test' })).status,
  403,
);
console.log(
  'Avalist lifecycle: permissions, default inheritance, independent period changes, splits, privacy, stale/racing payments, immutable history, corrections and revocation passed.',
);

// An Avalist can be registered by email before having any staff account.
const emailAddress = 'referral@example.test';
for (const user of ['member', 'admin', 'finance', 'avalist-b'])
  assert.equal(
    (await call('/avalist/people', { user, body: { email: emailAddress } })).status,
    403,
  );
for (const email of [
  '',
  'invalid',
  'a@b',
  'a @example.test',
  'a@example.test\nBcc:other@example.test',
])
  assert.equal((await call('/avalist/people', { body: { email } })).status, 400);
const emailPerson = ok(
  await call('/avalist/people', { body: { email: '  REFERRAL@EXAMPLE.TEST  ' } }),
).id;
assert.equal((await call('/avalist/people', { body: { email: emailAddress } })).status, 409);
let registered = (await view()).people.find((p) => p.id === emailPerson);
assert.equal(registered.email, emailAddress);
assert.equal(registered.userId, null);
assert.equal(registered.pending, true);
assert.equal(registered.available, true);
assert.equal(registered.bankAccount, '');
assert.equal(
  db.prepare('SELECT user_id FROM staff_accounts WHERE email=?').get(emailAddress),
  undefined,
);
// A pending recipient is selectable; their missing bank details block payment.
ok(
  await call('/avalist/assignments', {
    body: {
      memberId,
      scope: 'selected',
      contractIds: [newer],
      effectiveDate: due,
      personId: emailPerson,
      rate: 1,
      reason: 'Penetapan avalist melalui email sebelum login',
    },
  }),
);
let emailItem = (await view()).items.find((p) => p.contractId === newer);
assert.equal(emailItem.personId, emailPerson);
assert.equal(emailItem.blocked, 'Rekening avalist belum lengkap');
assert.equal(
  (await call('/avalist/prepare', { user: 'finance', body: { contractId: newer, date: due } }))
    .status,
  409,
);
assert.equal(
  ok(await call('/staff/access', { user: 'new-referral', email: 'someone@example.test' })).staff
    .accountRole,
  null,
);
assert.equal(ok(await call('/staff/access', { user: 'new-referral' })).staff.accountRole, null);
assert.equal(
  ok(
    await call('/staff/access', {
      user: 'new-referral',
      email: emailAddress,
      emailVerified: false,
    }),
  ).staff.accountRole,
  null,
  'An unverified session email cannot claim an Avalist entitlement',
);
assert.equal(
  db.prepare('SELECT bound_user_id FROM avalist_email_access WHERE email=?').get(emailAddress)
    .bound_user_id,
  null,
);
assert.equal(
  (
    await call('/staff/role', {
      user: 'new-referral',
      body: { role: 'avalist', email: emailAddress },
    })
  ).status,
  403,
);
// First authenticated login receives Avalist only, with no operational data.
let access = ok(
  await call('/staff/access', { user: 'new-referral', email: 'Referral@Example.Test' }),
);
assert.equal(access.staff.accountRole, 'avalist');
assert.deepEqual(access.staff.allowedRoles, ['avalist']);
const personal = ok(
  await call('/avalist?view=personal', { user: 'new-referral', email: emailAddress }),
);
assert.equal(personal.person.id, emailPerson);
assert(!JSON.stringify(personal).includes('SECRET-NIK'));
assert(!JSON.stringify(personal).includes('SECRET-MEMBER-BANK'));
for (const path of ['/staff/members', '/finance/payouts', '/reports', '/manager/withdrawals'])
  assert.equal((await call(path, { user: 'new-referral', email: emailAddress })).status, 403, path);
// Reusing the email with a different platform identity cannot take its history.
assert.equal(
  ok(await call('/staff/access', { user: 'other-person', email: emailAddress })).staff.accountRole,
  null,
);
assert.equal(
  (await call('/avalist?view=personal', { user: 'other-person', email: emailAddress })).status,
  403,
);
// Ownership continues by stable ID after the original user's contact email changes.
assert.equal(
  ok(await call('/avalist?view=personal', { user: 'new-referral', email: 'changed@example.test' }))
    .person.id,
  emailPerson,
);
assert.equal(
  db
    .prepare('SELECT count(*) AS n FROM staff_access_audit WHERE target_user_id=?')
    .get('new-referral').n,
  1,
);
registered = (await view()).people.find((p) => p.id === emailPerson);
assert.equal(registered.pending, false);
assert.equal(registered.userId, 'new-referral');
assert.equal(
  (
    await call('/avalist/people', {
      body: {
        ...registered,
        email: 'replacement@example.test',
        reason: 'Email tidak boleh memindahkan riwayat',
      },
    })
  ).status,
  400,
);
ok(
  await call('/avalist/people', {
    body: {
      ...registered,
      name: 'Avalist Email',
      bankName: 'BSI',
      bankAccount: '444444',
      accountName: 'AVALIST EMAIL',
      reason: 'Melengkapi rekening penerima',
    },
  }),
);
emailItem = (await view()).items.find((p) => p.contractId === newer);
assert.equal(emailItem.blocked, '');
const emailPayment = ok(
  await call('/avalist/prepare', { user: 'finance', body: { contractId: newer, date: due } }),
).id;
// Manager can revoke from the ordinary access directory; login cannot regrant access.
const accessRow = ok(await call('/staff/accounts')).accounts.find((r) => r.email === emailAddress);
assert(accessRow);
ok(await call('/staff/accounts', { body: { code: accessRow.code, role: 'revoke' } }));
assert.equal(
  ok(await call('/staff/access', { user: 'new-referral', email: emailAddress })).staff.accountRole,
  null,
);
assert.equal(
  (await call('/avalist?view=personal', { user: 'new-referral', email: emailAddress })).status,
  403,
);
assert.match((await view()).items.find((p) => p.contractId === newer).blocked, /akses dicabut/);
assert.equal(
  (
    await call('/avalist/payments/' + emailPayment + '/pay', {
      user: 'finance',
      body: proofForm((await view()).history.find((p) => p.id === emailPayment)),
    })
  ).status,
  409,
);
assert.deepEqual(db.prepare('SELECT * FROM avalist_payments WHERE id=?').get(prepared), paidRaw);
// Existing Finance and Manager rights survive adding a personal Avalist role.
for (const user of ['finance', 'manager']) {
  const p = ok(await call('/avalist/people', { body: { email: user + '@example.test' } })).id;
  const result = ok(await call('/staff/access', { user, email: user + '@example.test' }));
  assert.equal(result.staff.accountRole, user);
  assert(result.staff.allowedRoles.includes('avalist'));
  assert.equal(ok(await call('/avalist?view=personal', { user })).person.id, p);
}
// Inactive pending registrations cannot claim access.
const disabledId = ok(
  await call('/avalist/people', { body: { email: 'disabled@example.test', active: false } }),
).id;
assert.equal(
  ok(await call('/staff/access', { user: 'disabled', email: 'disabled@example.test' })).staff
    .accountRole,
  null,
);
assert.equal((await view()).people.find((p) => p.id === disabledId).active, false);
// Simultaneous logins for the same email grant bind to exactly one stable identity.
const raceId = ok(await call('/avalist/people', { body: { email: 'race@example.test' } })).id;
const races = await Promise.all(
  ['race-a', 'race-b'].map((user) => call('/staff/access', { user, email: 'race@example.test' })),
);
const roles = races.map((r) => ok(r).staff.accountRole);
assert.equal(roles.filter((r) => r === 'avalist').length, 1);
const winner = roles[0] === 'avalist' ? 'race-a' : 'race-b';
assert.equal(
  db.prepare('SELECT user_id FROM avalist_people WHERE id=?').get(raceId).user_id,
  winner,
);
assert.equal(
  db
    .prepare(
      "SELECT count(*) AS n FROM staff_access_audit WHERE target_user_id IN ('race-a','race-b')",
    )
    .get().n,
  1,
);
assert.throws(
  () =>
    db
      .prepare('UPDATE avalist_email_access SET bound_user_id=? WHERE person_id=?')
      .run('thief', raceId),
  /IMMUTABLE/,
);
console.log(
  'Avalist email registration: email-only onboarding, verified identity binding, personal-only access, pending assignments, bank checks, duplicates, existing roles, concurrency and permanent revocation passed.',
);

// The separate Avalist entry exposes only its own entitlement and identity.
assert.equal((await call('/avalist/access', { user: '' })).status, 401);
for (const [user, allowed] of [
  ['avalist-b', true],
  ['finance', true],
  ['manager', true],
  ['admin', false],
  ['member', false],
  ['new-referral', false],
]) {
  const response = ok(await call('/avalist/access', { user }));
  assert.equal(response.allowed, allowed, user);
  assert.deepEqual(Object.keys(response).sort(), ['allowed', 'identity']);
}
const portalEmail = 'portal-only@example.test';
ok(await call('/avalist/people', { body: { email: portalEmail } }));
assert.equal(
  ok(await call('/avalist/access', { user: 'portal-only', email: portalEmail })).allowed,
  true,
);
assert.equal(
  db.prepare('SELECT role FROM staff_accounts WHERE user_id=?').get('portal-only').role,
  'avalist',
);
assert.equal(ok(await call('/avalist?view=personal', { user: 'portal-only' })).personal, true);
console.log(
  'Avalist portal API: anonymous rejection, minimal entitlement response, email claim, unregistered and revoked account isolation passed.',
);
