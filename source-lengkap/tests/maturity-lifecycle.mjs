import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PDFDocument, StandardFonts } = require('pdf-lib');
const UPNG = require('@pdf-lib/upng').default;
import worker from '../backend/src/index.js';
import { withTestSession, testSessionCookie } from './helpers/test-session.mjs';
import { terbilang, cropSignature } from '../backend/src/contract-pdf.js';
import { agreementRules } from '../backend/src/contract-rules.js';
import { RESET_ID, RESET_CUTOFF } from '../backend/src/reset-demo.js';
globalThis.STATIC_ASSETS = {
  '/assets/kspps-logo-color-web.png': {
    body: readFileSync('./public/assets/kspps-logo-color-web.png').toString('base64'),
  },
};
globalThis.PDF_CONTRACT_TEMPLATE = readFileSync(
  './backend/templates/contract-original-layout.pdf',
).toString('base64');
globalThis.PDF_FONT_REGULAR = readFileSync(
  './backend/templates/fonts/LiberationSans-Regular.ttf',
).toString('base64');
globalThis.PDF_FONT_BOLD = readFileSync(
  './backend/templates/fonts/LiberationSans-Bold.ttf',
).toString('base64');
const database = new DatabaseSync(':memory:');
for (const file of readdirSync('./backend/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  database.exec(readFileSync('./backend/migrations/' + file, 'utf8'));
const storage = new Map();
const env = {
  DB: {
    batch(statements) {
      database.exec('BEGIN');
      try {
        const results = statements.map((s) => s.execute());
        database.exec('COMMIT');
        return Promise.resolve(results);
      } catch (error) {
        database.exec('ROLLBACK');
        throw error;
      }
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            execute() {
              return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } };
            },
            async first() {
              return database.prepare(sql).get(...args) || null;
            },
            async all() {
              return { results: database.prepare(sql).all(...args) };
            },
            async run() {
              return { meta: { changes: Number(database.prepare(sql).run(...args).changes) } };
            },
          };
        },
      };
    },
  },
  BUCKET: {
    async put(key, bytes) {
      storage.set(key, new Uint8Array(bytes));
    },
    async get(key) {
      const bytes = storage.get(key);
      return bytes ? { body: bytes } : null;
    },
    async delete(key) {
      for (const k of Array.isArray(key) ? key : [key]) storage.delete(k);
    },
    async list({ prefix }) {
      return {
        objects: [...storage.keys()]
          .filter((k) => k.startsWith(prefix))
          .map((key) => ({ key, uploaded: new Date() })),
        truncated: false,
      };
    },
  },
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
const sig = new Uint8Array(UPNG.encode([rgba.buffer], 1000, 340, 0));
const profile = {
  name: 'ANGGOTA UJI SYIRKAH KEBAIKAN',
  identityType: 'KTP',
  identityNumber: '0000000000000000',
  identityAddress: 'Jl. Pengujian No. 123 RT 001/RW 002',
  address: 'Jalan Contoh 123 Makassar',
  village: 'Maricaya',
  district: 'Makassar',
  city: 'Kota Makassar',
  province: 'Sulawesi Selatan',
  bankName: 'Bank Syariah Indonesia',
  bankAccount: '0000000000',
  phone: '081200000000',
  email: 'anggota@example.com',
  birthplace: 'Makassar',
  birthdate: '1995-01-15',
  gender: 'Laki-laki',
  job: 'Karyawan Swasta',
  education: 'Sarjana',
  marital: 'Menikah',
  mother: 'IBU CONTOH',
  heir: 'AHLI WARIS CONTOH',
  heirPhone: '081200000001',
  office: 'Kantor KSPPS Makassar',
  religion: 'Islam',
  basic: 100000,
  monthly: 10000,
  transactionSaving: 50000,
  specialAmount: 0,
  installments: 1,
  admin: 30000,
  consent: true,
  signatureConsent: true,
};
import { renewalDates } from '../backend/src/maturity.js';
import { snapshot, hash } from '../backend/src/membership.js';
import { buildMembershipLetter } from '../backend/src/membership-letter.js';
globalThis.PDF_MEMBERSHIP_TEMPLATE = readFileSync(
  './backend/templates/membership-letter-base.pdf',
).toString('base64');
// Use the synthetic PNG fixture above; tests must not depend on a private signature.
globalThis.PDF_MEMBERSHIP_SIGNATURE = Buffer.from(sig).toString('base64');
const RealDate = Date;
let clock = '2026-09-01T02:00:00.000Z';
globalThis.Date = class extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [clock]));
  }
  static now() {
    return new RealDate(clock).getTime();
  }
};
database.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID, clock);
database.prepare("INSERT INTO staff_bootstrap VALUES ('primary','manager',?)").run(clock);
for (const role of ['manager', 'admin', 'finance'])
  database
    .prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?)')
    .run(role, role, role, role + '@example.test', 'fixture', clock, clock);
const base = 'https://kspps.test';
async function call(
  path = '',
  {
    user = 'member-a',
    body,
    member,
    staff = false,
    origin = base,
    method = body ? 'POST' : 'GET',
  } = {},
) {
  const headers = {};
  if (user) headers.Cookie = testSessionCookie;
  if (method !== 'GET') headers.origin = origin;
  if (member) headers['x-kspps-member'] = member;
  if (staff) headers['x-kspps-portal'] = 'staff';
  if (body && !(body instanceof FormData)) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const r = await worker.fetch(
    new Request(base + '/api/workflow' + path, { method, headers, body }),
    withTestSession(env, user),
  );
  return {
    status: r.status,
    data: r.headers.get('content-type')?.includes('application/json')
      ? await r.json()
      : new Uint8Array(await r.arrayBuffer()),
    headers: r.headers,
  };
}
const ok = (r, status = 200) => {
  assert.equal(r.status, status, JSON.stringify(r.data));
  return r.data;
};
const ids = {};
for (const owner of ['member-a', 'member-b']) {
  const id = crypto.randomUUID();
  ids[owner] = id;
  const data = {
    ...profile,
    name: owner === 'member-a' ? 'ANGGOTA UJI SYIRKAH KEBAIKAN' : 'ANGGOTA UJI KEDUA',
    paymentOption: 'Tahunan',
  };
  const f = new FormData();
  f.set('id', id);
  f.set('data', JSON.stringify(data));
  for (const name of ['signature', 'proof', 'ktp'])
    f.set(name, new File([sig], name + '.png', { type: 'image/png' }));
  ok(await call('/profile', { user: owner, body: f }), 201);
}
assert.equal((await call('/profile/letter')).status, 409, 'no letter before reconciliation');
const q = ok(await call('/finance/reconciliations', { user: 'finance' }));
assert.equal(q.items.length, 2, 'Finance sees both members without selecting');
const ap = ok(await call('', { user: 'admin', staff: true }));
assert.equal(ap.profiles.length, 2);
assert.equal(ap.profile, null);
assert(ap.profiles.every((p) => p.ktpUrl.includes('/member/' + p.id + '/')));
const fn = ok(await call('', { user: 'finance', staff: true }));
assert.deepEqual(fn.profiles, []);
assert.deepEqual(fn.items, []);
assert.equal((await call('', { user: 'finance', member: ids['member-a'] })).data.profile, null);
for (const row of q.items) {
  const result = await call('/finance/reconcile', {
    user: 'finance',
    body: {
      kind: 'registration',
      id: row.id,
      sourceVersion: row.sourceVersion,
      version: 0,
      receivedAmount: row.amount,
      transferDate: '2026-09-01',
      reference: 'REG-' + row.id,
      decision: 'approve',
      confirm: true,
    },
  });
  ok(result);
}
const letter = ok(await call()).profile.letter;
assert(letter);
assert.match(letter.filename, /^SPA SKI-2026-0001 a.n ANGGOTA UJI/);
assert.equal(letter.effectiveDate, '2026-09-01');
let pdf = await call('/profile/letter?download=1');
ok(pdf);
assert.equal((await PDFDocument.load(pdf.data)).getPageCount(), 1);
assert(pdf.headers.get('content-disposition').includes('SPA SKI-2026-0001'));
writeFileSync('/tmp/kspps-membership-letter-test.pdf', pdf.data);
assert.equal(
  (await call('/member/' + ids['member-a'] + '/profile/letter', { user: 'member-b' })).status,
  403,
);
assert.equal(
  (await call('/member/' + ids['member-a'] + '/profile/letter', { user: 'finance' })).status,
  403,
);
for (let i = 0; i < 3; i++) await call();
ok(await call('', { user: 'member-b' }));
assert.equal(
  database.prepare("SELECT seq FROM sqlite_sequence WHERE name='membership_letters'").get().seq,
  2,
  'refresh does not consume letter serials',
);
for (const owner of ['member-a', 'member-b'])
  ok(
    await call('/profile/review', {
      user: 'admin',
      member: ids[owner],
      body: {
        version: 1,
        action: 'approve',
        checks: { identity: true, signature: true, ktp: true },
      },
    }),
  );
// Historical signed capital fixtures; reconciliation and ownership remain real.
function seed(owner, amount = 10000000, end = '2026-09-20') {
  const id = crypto.randomUUID(),
    p = database.prepare('SELECT * FROM member_profiles WHERE owner=?').get(owner);
  database
    .prepare(
      "INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,status,note,created_at,updated_at,version,member_snapshot,project_code,contract_number,contract_data,generated_at) VALUES (?,?,'capital',?,?,?,?,'signed','',?,?,1,?,'OLD-PROJECT',?,?,?)",
    )
    .run(
      id,
      owner,
      JSON.parse(p.data).name,
      amount,
      'proof-' + id,
      'proof.png',
      clock,
      clock,
      snapshot(p),
      id.slice(0, 8) + '/SPK-SKI-MRBH-9/IX/2025',
      JSON.stringify({ agreementDate: '2025-09-10', effectiveDate: '2025-09-20', endDate: end }),
      clock,
    );
  database
    .prepare(
      "INSERT INTO finance_reconciliations VALUES (?,?, 'capital',?,?,?,?,?,?,'approved','','finance',?,1)",
    )
    .run(
      crypto.randomUUID(),
      owner,
      id,
      'proof-' + id,
      amount,
      amount,
      '2025-09-10',
      'PAID-' + id,
      clock,
    );
  return id;
}
const original = seed('member-a'),
  returned = seed('member-b', 20000000),
  undecided = seed('member-a', 30000000),
  early = seed('member-a', 40000000, '2026-10-02');
let items = ok(await call()).items;
assert(items.find((x) => x.id === original).maturity.needsDecision);
assert(!items.find((x) => x.id === early).maturity.needsDecision);
assert.equal(
  (await call('/' + early + '/maturity', { body: { choice: 'return', confirm: true } })).status,
  409,
  'H-31 cannot choose',
);
assert.equal(
  (
    await call('/' + original + '/maturity', {
      user: 'member-b',
      body: { choice: 'return', confirm: true },
    })
  ).status,
  404,
);
assert.equal(
  (
    await call('/' + original + '/maturity', {
      user: 'admin',
      member: ids['member-a'],
      body: { choice: 'return', confirm: true },
    })
  ).status,
  403,
);
assert.equal(
  (await call('/' + original + '/maturity', { body: { choice: 'return', confirm: false } })).status,
  400,
);
const offer = ok(
  await call('/offers', {
    user: 'manager',
    body: {
      id: crypto.randomUUID(),
      title: 'Project Baru',
      projectCode: 'NEW-2026',
      quota: 10000000,
    },
  }),
  201,
).offer;
const extend = { choice: 'extend', offerId: offer.id, signatureConsent: true, confirm: true };
let r = ok(await call('/' + original + '/maturity', { body: extend }));
const renewal = r.renewalId;
assert.equal(r.effectiveDate, '2026-09-20');
assert.equal(r.dueDate, '2026-09-20');
assert.equal(
  (await call('/' + original + '/maturity', { body: { choice: 'return', confirm: true } })).status,
  409,
  'choice cannot change',
);
assert.equal(
  (await call('/' + undecided + '/maturity', { body: extend })).status,
  409,
  'quota is reserved by renewal',
);
assert.equal(ok(await call('/offers')).offers.find((o) => o.id === offer.id).remaining, 0);
const newItem = ok(await call()).items.find((x) => x.id === renewal);
assert.equal(
  ok(await call('/offers')).offers.find((o) => o.id === offer.id).fulfilledAt,
  newItem.createdAt,
  'renewal reserves quota and records fulfillment atomically',
);
assert.equal(newItem.amount, 10000000);
assert.equal(newItem.finance.status, 'approved');
assert.equal(newItem.proofUrl, null);
assert(
  !ok(await call('/finance/reconciliations', { user: 'finance' })).items.some(
    (x) => x.id === renewal,
  ),
  'renewal does not request another transfer',
);
const adminTasks = ok(await call('/staff/tasks', { user: 'admin' })).tasks;
assert(adminTasks.some((t) => t.targetId === renewal && t.stage === 'capital'));
assert.equal(
  (
    await call('/' + renewal + '/review', {
      user: 'admin',
      member: ids['member-a'],
      body: { version: 1, action: 'return', note: 'Change choice' },
    })
  ).status,
  409,
);
let ready = ok(
  await call('/' + renewal + '/review', {
    user: 'admin',
    member: ids['member-a'],
    body: { version: 1, action: 'approve', checks: { identity: true, amount: true } },
  }),
).item;
let generated = ok(
  await call('/' + renewal + '/generate', {
    user: 'admin',
    member: ids['member-a'],
    body: {
      version: ready.version,
      agreementDate: '2026-09-01',
      confirm: true,
      effectiveDate: '2030-01-01',
    },
  }),
).item;
assert.equal(generated.contractData.effectiveDate, '2026-09-20');
assert.equal(generated.contractData.endDate, '2027-09-20');
assert(generated.documentName.startsWith('SPK NEW-2026 / '));
assert(generated.documentName.endsWith(' a.n ' + profile.name));
assert(!generated.documentFilename.includes('/'));
pdf = await call('/' + renewal + '/contract?download=1');
ok(pdf);
assert.equal((await PDFDocument.load(pdf.data)).getPageCount(), 2);
assert(pdf.headers.get('content-disposition').includes('SPK NEW-2026'));
// Choice made 19 days early; contract and payout stay alive until H.
ok(
  await call('/' + returned + '/maturity', {
    user: 'member-b',
    body: { choice: 'return', confirm: true },
  }),
);
assert.equal(
  ok(await call('', { user: 'member-b' })).items.find((x) => x.id === returned).maturity.ended,
  false,
);
let returns = ok(await call('/finance/returns', { user: 'finance' }));
assert.equal(returns.items.length, 1);
assert.equal(returns.totalScheduled, 20000000);
assert.equal(returns.totalDue, 0);
const returnTask = ok(await call('/staff/tasks', { user: 'finance' })).tasks.find(
  (t) => t.targetId === returned && t.stage === 'principal-return',
);
assert(returnTask);
assert.equal(
  (await call('/staff/activity/start', { user: 'finance', body: { taskId: returnTask.id } }))
    .status,
  409,
);
function payment(amount = 20000000, date = '2026-09-20') {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    amount,
    transferDate: date,
    reference: 'RETURN-0001',
    confirm: 'true',
  }))
    f.set(k, String(v));
  f.set('proof', new File([sig], 'pengembalian.png', { type: 'image/png' }));
  return f;
}
assert.equal(
  (await call('/finance/returns/' + returned + '/complete', { user: 'finance', body: payment() }))
    .status,
  409,
);
let report = ok(await call('/maturity/report?from=2026-09-01&to=2026-09-30', { user: 'manager' }));
assert.equal(report.total.amount, 60000000);
assert.equal(report.extended.amount, 10000000);
assert.equal(report.returned.amount, 20000000);
assert.equal(report.pending.amount, 30000000);
assert.equal(report.total.memberCount, 2);
for (const user of ['member-a', 'admin', 'finance'])
  assert.equal((await call('/maturity/report', { user })).status, 403);
clock = '2026-09-19T16:00:00.000Z'; // exactly midnight 20 September WITA
assert.equal(
  ok(await call('', { user: 'member-b' })).items.find((x) => x.id === returned).statusLabel,
  'Selesai',
);
returns = ok(await call('/finance/returns', { user: 'finance' }));
assert.equal(returns.totalDue, 20000000);
ok(await call('/staff/activity/start', { user: 'finance', body: { taskId: returnTask.id } }));
assert.equal(
  (await call('/finance/returns/' + returned + '/complete', { user: 'admin', body: payment() }))
    .status,
  403,
);
assert.equal(
  (
    await call('/finance/returns/' + returned + '/complete', {
      user: 'finance',
      body: payment(100),
    })
  ).status,
  400,
);
assert.equal(
  (
    await call('/finance/returns/' + returned + '/complete', {
      user: 'finance',
      body: payment(20000000, '2026-09-19'),
    })
  ).status,
  400,
);
const payments = await Promise.all(
  [1, 2].map(() =>
    call('/finance/returns/' + returned + '/complete', { user: 'finance', body: payment() }),
  ),
);
assert.deepEqual(
  payments.map((x) => x.status).sort(),
  [200, 409],
  'concurrent payment recorded once',
);
assert.equal([...storage.keys()].filter((k) => k.startsWith('principal-returns/')).length, 1);
const returnProof = ok(await call('/finance/returns', { user: 'finance' })).items[0].proofUrl;
ok(await call(returnProof.replace('/api/workflow', ''), { user: 'finance' }));
assert.equal(
  (await call(returnProof.replace('/api/workflow', ''), { user: 'member-a' })).status,
  403,
);
assert(
  ok(await call('', { user: 'member-b' })).items.find((x) => x.id === returned).maturity
    .returnPaidAt,
);
assert.equal(
  ok(await call('/staff/tasks', { user: 'finance' })).tasks.find((t) => t.id === returnTask.id)
    .completed,
  true,
);
assert(
  ok(await call()).items.find((x) => x.id === undecided).maturity.needsDecision,
  'reminder persists after H',
);
assert.deepEqual(renewalDates('2026-10-31'), {
  effectiveDate: '2026-11-01',
  endDate: '2027-11-01',
});
clock = '2026-10-20T02:00:00Z';
const payouts = ok(await call('/finance/payouts?date=2026-10-20', { user: 'finance' }));
assert(
  payouts.items.some((x) => x.id === renewal && x.amount === 500000),
  'renewed principal participates in payouts',
);
assert(!payouts.items.some((x) => x.id === returned), 'matured principal stops future payouts');
console.log(
  'PASS: all-member role queues, gated one-page membership PDF, stable SPA serial, H-30 reminders, immutable choices, quota reservation, extension without 10-day delay, unchanged contract pages, new SPK filename, exact H return, WITA midnight, concurrent once-only payment, role/file isolation, manager totals and renewed payouts.',
);
// Concurrent extensions must not exceed the new project's quota.
const raceOffer = ok(
  await call('/offers', {
    user: 'manager',
    body: {
      id: crypto.randomUUID(),
      title: 'Kuota Terbatas',
      projectCode: 'RACE-2026',
      quota: 10000000,
    },
  }),
  201,
).offer;
const raceIds = [
  seed('member-a', 10000000, '2026-11-15'),
  seed('member-b', 10000000, '2026-11-15'),
];
const races = await Promise.all(
  raceIds.map((id, i) =>
    call('/' + id + '/maturity', {
      user: i ? 'member-b' : 'member-a',
      body: { ...extend, offerId: raceOffer.id },
    }),
  ),
);
assert.deepEqual(races.map((r) => r.status).sort(), [200, 409]);
assert.equal(
  database.prepare('SELECT sum(amount) n FROM workflow_requests WHERE offer_id=?').get(raceOffer.id)
    .n,
  10000000,
);
console.log('PASS: concurrent extension quota remains atomic.');
globalThis.Date = RealDate;
// Maximum input lengths also stay on a single page without omitting fields.
const longData = {
  ...profile,
  name: 'MUHAMMAD ABDURRAHMAN '.repeat(6).slice(0, 120),
  identityAddress: 'Jalan Pengujian Kecamatan Panakkukang Kota Makassar '.repeat(5).slice(0, 240),
  birthplace: 'Kota Makassar '.repeat(8).slice(0, 100),
};
const longPDF = await buildMembershipLetter({
  number: '0003/KSPPS-SKI/SPA/09/2026',
  filename: 'SPA long.pdf',
  reconciled_at: '2026-09-01T01:00:00Z',
  snapshot: JSON.stringify({ data: longData, memberNumber: 'SKI-2026-0003' }),
});
assert.equal((await PDFDocument.load(longPDF)).getPageCount(), 1);
writeFileSync('/tmp/kspps-membership-letter-long.pdf', longPDF);
