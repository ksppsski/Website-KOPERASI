import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import worker from '../backend/src/index.js';
import { withTestSession, testSessionCookie } from './helpers/test-session.mjs';
import { RESET_ID } from '../backend/src/reset-demo.js';
import { hash } from '../backend/src/membership.js';
import {
  memberDirectory,
  selectedOwner,
  cooperativeOwner,
  staffContext,
} from '../backend/src/access.js';
import { reportList } from '../backend/src/reports.js';
import { staffPayload } from '../backend/src/features/workflow/records.js';
import { allStaffTasks, startStaffTask } from '../backend/src/staff-queue.js';
import { avalistView } from '../backend/src/features/avalist/queries.js';
import { paymentProof } from '../backend/src/features/avalist/payments.js';
const db = new DatabaseSync(':memory:');
for (const f of readdirSync('backend/migrations')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  db.exec(readFileSync('backend/migrations/' + f, 'utf8'));
const bytes = new Map(),
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
        bytes.set(k, new Uint8Array(v));
      },
      async get(k) {
        return bytes.has(k) ? { body: bytes.get(k) } : null;
      },
      async delete(k) {
        bytes.delete(k);
      },
    },
  };
const now = new Date().toISOString(),
  token = 'a'.repeat(64);
env.KSPPS_MANAGER_SETUP = JSON.stringify({
  hash: await hash(new TextEncoder().encode(token)),
  expires: new Date(Date.now() + 3600000).toISOString(),
});
db.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID, now);
async function call(
  path = '',
  {
    user = 'manager',
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
    withTestSession(
      env,
      user && {
        id: user,
        name: 'Petugas ' + user,
        email: user + '@example.test',
        emailVerified: true,
      },
    ),
  );
  return {
    status: r.status,
    data: r.headers.get('content-type')?.includes('application/json')
      ? await r.json()
      : new Uint8Array(await r.arrayBuffer()),
    headers: r.headers,
  };
}
const switchRole = (role, user = 'manager') => call('/staff/role', { user, body: { role } });
for (const path of ['/reports', '/staff/access', '/staff/accounts', '/staff/activity'])
  assert.equal((await call(path, { user: null })).status, 401);
// A legacy UI choice is explicitly not an entitlement.
db.prepare('INSERT INTO staff_workspaces VALUES (?,?,?)').run('stranger', 'manager', now);
assert.equal((await switchRole('manager', 'stranger')).status, 403);
assert.equal((await call('/reports', { user: 'stranger', body: {} })).status, 403);
assert.equal(
  (await call('/staff/activate', { user: 'stranger', body: { token: 'wrong', confirm: true } }))
    .status,
  403,
);
assert.equal(db.prepare('SELECT count(*) n FROM staff_accounts').get().n, 0);
assert.equal((await call('/staff/activate', { body: { token, confirm: true } })).status, 200);
assert.equal(
  (await call('/staff/activate', { user: 'stranger', body: { token, confirm: true } })).status,
  409,
);
for (const r of ['admin', 'finance', 'customer_relation', 'manager'])
  assert.equal((await switchRole(r)).status, 200, 'manager can open ' + r);
for (const user of ['admin', 'finance']) {
  const request = await call('/staff/access-request', { user, body: {} });
  assert.equal(request.status, 200);
  assert.equal(
    (await call('/staff/accounts', { user, body: { code: request.data.request.code, role: user } }))
      .status,
    403,
    'cannot self-approve',
  );
  assert.equal(
    (await call('/staff/accounts', { body: { code: request.data.request.code, role: user } }))
      .status,
    200,
  );
  assert.equal((await switchRole(user, user)).status, 200);
  assert.equal((await switchRole(user === 'admin' ? 'finance' : 'admin', user)).status, 403);
  assert.equal((await switchRole('manager', user)).status, 403);
  assert.equal((await call('/staff/activity', { user })).status, 403);
  assert.equal((await call('/reports', { user, body: {} })).status, 403);
}
assert.equal((await call('/finance/reconcile', { user: 'admin', body: {} })).status, 403);
assert.equal((await call('/profile/review', { user: 'finance', body: {} })).status, 403);
const p1 = crypto.randomUUID(),
  p2 = crypto.randomUUID();
for (const [owner, id, status] of [
  ['member-a', p1, 'approved'],
  ['member-b', p2, 'pending'],
]) {
  db.prepare(
    "INSERT INTO member_profiles (owner,id,member_number,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,ktp_key,ktp_name,ktp_type,status,note,consent_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'',?,?,?)",
  ).run(
    owner,
    id,
    'SKI-2026-' + id.slice(0, 4),
    JSON.stringify({ name: owner, basic: 100000, monthly: 10000, identityNumber: 'private-nik' }),
    owner + '-sig',
    'digest',
    owner + '-proof',
    'proof.png',
    'image/png',
    owner + '-ktp',
    'ktp.png',
    'image/png',
    status,
    now,
    now,
    now,
  );
  db.prepare("INSERT INTO savings_credits VALUES (?,'registration',?,100000,120000,0,?)").run(
    owner,
    id,
    now,
  );
  bytes.set(owner + '-ktp', new Uint8Array([1, 2, 3]));
  bytes.set(owner + '-proof', new Uint8Array([1, 2, 3]));
}
assert.equal((await call('', { user: 'stranger', staff: true })).status, 403);
assert.equal(
  (await call('', { user: 'member-a', member: p2 })).status,
  403,
  'a member cannot select someone else',
);
const adminData = await call('', { user: 'admin', member: p1, staff: true });
assert.equal(adminData.status, 200);
assert.equal(adminData.data.profiles.find((p) => p.id === p1).data.name, 'member-a');
assert.equal(adminData.data.staff.accountRole, 'admin');
assert(adminData.data.profiles.some((m) => m.id === p2));
assert.equal(
  (await call('', { user: 'finance', member: p1 })).data.profile,
  null,
  'omitting the staff view header cannot expose member identity to Finance',
);
const financeData = await call('', { user: 'finance', member: p1, staff: true });
assert.equal(financeData.status, 200);
assert.equal(financeData.data.profile, null, 'finance does not receive identity snapshots');
assert.deepEqual(financeData.data.items, []);
assert.equal((await call('/member/' + p1 + '/profile/ktp', { user: 'finance' })).status, 403);
assert.equal((await call('/member/' + p1 + '/profile/ktp', { user: 'admin' })).status, 200);
assert.equal((await call('/member/' + p1 + '/profile/proof', { user: 'finance' })).status, 200);
assert.equal((await call('/member/' + p1 + '/profile/ktp', { user: 'member-b' })).status, 403);
assert.equal(
  (await call('/profile', { user: 'admin', member: p1, body: {} })).status,
  403,
  'staff cannot impersonate member submissions',
);
const q = await call('/finance/reconciliations', { user: 'finance', member: p2, staff: true });
assert.equal(q.status, 200);
const pending = q.data.items.find((x) => x.id === p2);
const approved = await call('/finance/reconcile', {
  user: 'finance',
  member: p2,
  body: {
    kind: 'registration',
    id: p2,
    sourceVersion: pending.sourceVersion,
    version: pending.reconciliation.version,
    receivedAmount: 110000,
    transferDate: now.slice(0, 10),
    reference: 'REGISTRATION-TEST',
    decision: 'approve',
    confirm: true,
  },
});
assert.equal(approved.status, 200, JSON.stringify(approved.data));
assert.equal(
  db.prepare('SELECT checked_by FROM finance_reconciliations WHERE target_id=?').get(p2).checked_by,
  'finance',
  'actor is staff, not member',
);
assert.equal(
  (
    await call('/profile/review', {
      user: 'admin',
      member: p2,
      body: {
        version: 1,
        action: 'approve',
        checks: { identity: true, signature: true, ktp: true },
      },
    })
  ).status,
  200,
);
assert.equal(
  db.prepare('SELECT ktp_checked_by FROM member_profiles WHERE id=?').get(p2).ktp_checked_by,
  'admin',
);
assert.equal((await call('/staff/activity')).status, 200);
// Reports are shared with approved members, while metadata and bytes are private.
const pdf = await PDFDocument.create();
pdf.addPage();
const pdfBytes = await pdf.save();
function report({
  id = crypto.randomUUID(),
  category = 'financial',
  projectCode = '',
  file = new File([pdfBytes], 'laporan.pdf', { type: 'application/pdf' }),
} = {}) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    id,
    category,
    title: 'Laporan September 2026',
    period: '2026-09',
    projectCode,
    confirm: 'true',
  }))
    f.set(k, v);
  f.set('file', file);
  return f;
}
const reportId = crypto.randomUUID();
let r = await call('/reports', { body: report({ id: reportId }) });
assert.equal(r.status, 201, JSON.stringify(r.data));
assert.equal((await call('/reports', { body: report({ id: reportId }) })).data.report.id, reportId);
assert.equal(db.prepare('SELECT count(*) n FROM member_reports').get().n, 1);
assert.equal((await call('/reports', { user: 'member-a' })).data.reports[0].id, reportId);
assert.equal((await call('/reports', { user: 'stranger' })).status, 403);
for (const user of [null, 'stranger'])
  assert([401, 403].includes((await call('/reports/' + reportId + '/file', { user })).status));
r = await call('/reports/' + reportId + '/file?download=1', { user: 'member-b' });
assert.equal(r.status, 200);
assert.deepEqual(r.data, pdfBytes);
assert.equal(r.headers.get('cache-control'), 'private, no-store');
assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
assert.match(r.headers.get('content-disposition'), /^attachment/);
assert.equal((await call('/reports', { body: report({ category: 'utilization' }) })).status, 400);
r = await call('/reports', {
  body: report({ category: 'utilization', projectCode: 'MRBH-2026-09-01' }),
});
assert.equal(r.status, 201);
assert.equal(r.data.report.projectCode, 'MRBH-2026-09-01');
assert.equal(
  (
    await call('/reports', {
      body: report({
        file: new File(['<script>bad</script>'], 'fake.pdf', { type: 'application/pdf' }),
      }),
    })
  ).status,
  400,
);
assert.equal(
  (await call('/reports', { body: report(), origin: 'https://other.test' })).status,
  403,
);
// Shared quota still belongs to the offer; an application's member owner is retained.
const offer = (
  await call('/offers', {
    body: { id: crypto.randomUUID(), title: 'Mitra', projectCode: 'MRBH-NEW', quota: 100 },
  })
).data.offer;
assert((await call('', { user: 'member-a' })).data.offers.some((o) => o.id === offer.id));
function capital(amount) {
  const f = new FormData();
  for (const [k, v] of Object.entries({
    id: crypto.randomUUID(),
    offerId: offer.id,
    amount,
    signatureConsent: 'true',
  }))
    f.set(k, String(v));
  f.set(
    'proof',
    new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'proof.png', {
      type: 'image/png',
    }),
  );
  return f;
}
assert.equal((await call('/capital', { user: 'member-a', body: capital(60) })).status, 201);
assert.equal((await call('/capital', { user: 'member-b', body: capital(60) })).status, 409);
assert.equal((await call('/capital', { user: 'member-b', body: capital(40) })).status, 201);
assert.equal((await call('/offers', { user: 'member-a' })).data.offers[0].status, 'full');
// Active capital submissions also prevent starting the resignation lifecycle.
assert.equal(
  (
    await call('/withdrawal', {
      user: 'member-a',
      body: { id: crypto.randomUUID(), reason: 'Permohonan pengunduran diri.', consent: true },
    })
  ).status,
  409,
);
const directory = (await call('/staff/accounts')).data.accounts,
  finance = directory.find((x) => x.role === 'finance');
assert.equal(
  (await call('/staff/accounts', { body: { code: finance.code, role: 'revoke' } })).status,
  200,
);
assert.equal(
  (await call('/finance/reconciliations', { user: 'finance', member: p1, staff: true })).status,
  403,
  'revocation applies even with stale client state',
);
// Customer Relation is assigned explicitly and receives only complaint duties.
const crUser = 'customer-relation';
const crRequest = await call('/staff/access-request', { user: crUser, body: {} });
assert.equal(crRequest.status, 200);
const crCode = crRequest.data.request.code;
assert.equal(
  (
    await call('/staff/accounts', {
      user: 'admin',
      body: { code: crCode, role: 'customer_relation' },
    })
  ).status,
  403,
);
assert.equal(
  (
    await call('/staff/accounts', {
      body: { code: crCode, role: 'customer_relation' },
    })
  ).status,
  200,
);
assert.equal(
  (await call('/staff/accounts')).data.accounts.find((account) => account.code === crCode).role,
  'customer_relation',
);
assert.equal((await switchRole('customer_relation', crUser)).status, 200);
for (const role of ['manager', 'admin', 'finance', 'avalist'])
  assert.equal((await switchRole(role, crUser)).status, 403, 'CR cannot elevate to ' + role);
const managerCr = await switchRole('customer_relation');
assert.equal(managerCr.status, 200);
assert.equal(managerCr.data.staff.accountRole, 'manager');
assert(managerCr.data.staff.allowedRoles.includes('customer_relation'));
assert.equal(
  (await call('/reports')).status,
  200,
  'Manager keeps original authority while viewing CR',
);
assert.deepEqual(
  (await call('', { staff: true })).data.profiles,
  [],
  'CR workspace bootstrap contains no member profiles',
);
assert.equal((await switchRole('manager')).status, 200);
// A stale or forged workspace selection cannot enlarge a CR account's authority.
db.prepare('UPDATE staff_workspaces SET active_role=? WHERE owner=?').run('manager', crUser);
const crAccess = await call('/staff/access', { user: crUser });
assert.equal(crAccess.status, 200);
assert.equal(crAccess.data.staff.role, 'customer_relation');
assert.deepEqual(crAccess.data.staff.allowedRoles, ['customer_relation']);
for (const staff of [false, true]) {
  const bootstrap = await call('', { user: crUser, staff });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.data.staff.accountRole, 'customer_relation');
  assert.equal(bootstrap.data.profile, null);
  for (const field of ['items', 'profiles', 'offers', 'members'])
    assert.deepEqual(bootstrap.data[field], []);
  assert(!JSON.stringify(bootstrap.data).includes('private-nik'));
}
const blockedCrReads = [
  '/reports',
  '/reports/' + reportId + '/file',
  '/offers',
  '/staff/accounts',
  '/staff/tasks',
  '/staff/activity',
  '/finance/reconciliations',
  '/finance/payouts',
  '/financing',
  '/withdrawal/eligibility',
  '/profile/letter',
  '/profile/ktp',
  '/profile/signature',
  '/profile/proof',
  '/avalist/access',
  '/avalist?view=personal',
  '/avalist',
  '/member/' + p1 + '/profile/ktp',
];
for (const path of blockedCrReads)
  assert.equal((await call(path, { user: crUser })).status, 403, 'CR cannot read ' + path);
for (const path of [
  '/profile',
  '/profile/restart',
  '/capital',
  '/savings',
  '/withdrawal',
  '/reports',
  '/offers',
  '/staff/accounts',
  '/staff/access-request',
  '/staff/activate',
  '/staff/activity/start',
  '/finance/reconcile',
  '/finance/payouts/complete',
  '/financing',
  '/avalist/people',
  '/avalist/assignments',
  '/avalist/prepare',
])
  assert.equal(
    (await call(path, { user: crUser, body: {} })).status,
    403,
    'CR cannot mutate ' + path,
  );
assert.equal((await call('', { user: crUser, member: p1, staff: true })).status, 403);
assert.equal((await call('/staff/access', { user: crUser, member: p1 })).status, 403);
assert.equal((await call('?member=' + p1, { user: crUser })).status, 403);
const crEnv = { ...env, ACTOR_ID: crUser };
for (const operation of [
  () => memberDirectory(crEnv, crUser),
  () => selectedOwner(new Request('https://kspps.test/api/workflow'), crEnv, crUser),
  () => cooperativeOwner(crEnv, 'manager'),
  () => reportList(crEnv, 'member-a'),
  () => allStaffTasks(crEnv, crUser),
  () => startStaffTask(crEnv, crUser, { taskId: 'any' }),
])
  await assert.rejects(operation, (error) => error.status === 403);
assert.deepEqual(
  (await staffPayload(crEnv, crUser, { accountRole: 'customer_relation', role: 'admin' })).profiles,
  [],
);

// An existing or pending Avalist entitlement never broadens a CR assignment.
db.prepare(
  `INSERT INTO avalist_people
  (id,user_id,name,bank_name,bank_account,account_name,active,version,updated_at,updated_by)
  VALUES (?,?,?,?,?,?,1,1,?,?)`,
).run(
  'cr-avalist',
  crUser,
  'Customer Relation',
  'private-bank',
  'private-account',
  'private-name',
  now,
  'manager',
);
assert.deepEqual((await staffContext(crEnv, crUser)).allowedRoles, ['customer_relation']);
await assert.rejects(
  () => avalistView(crEnv, crUser, '2026-10-27', true),
  (error) => error.status === 403,
);
await assert.rejects(
  () => paymentProof(crEnv, crUser, crypto.randomUUID()),
  (error) => error.status === 403,
);
const pendingCr = 'cr-pending';
db.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?)').run(
  pendingCr,
  'customer_relation',
  'Customer Relation',
  pendingCr + '@example.test',
  'manager',
  now,
  now,
);
db.prepare(
  `INSERT INTO avalist_people
  (id,user_id,name,bank_name,bank_account,account_name,active,version,updated_at,updated_by)
  VALUES (?,?,?,?,?,?,1,1,?,?)`,
).run(
  'cr-pending-person',
  'pending-email:cr-pending-person',
  'Pending CR',
  '',
  '',
  '',
  now,
  'manager',
);
db.prepare(
  `INSERT INTO avalist_email_access(email,person_id,created_by,created_at)
  VALUES (?,?,?,?)`,
).run(pendingCr + '@example.test', 'cr-pending-person', 'manager', now);
assert.equal((await call('/staff/access', { user: pendingCr })).status, 200);
assert.equal(
  db
    .prepare('SELECT bound_user_id FROM avalist_email_access WHERE person_id=?')
    .get('cr-pending-person').bound_user_id,
  null,
);
assert.equal(
  db.prepare('SELECT user_id FROM avalist_people WHERE id=?').get('cr-pending-person').user_id,
  'pending-email:cr-pending-person',
);
assert.equal(
  (await call('/staff/accounts', { body: { code: crCode, role: 'revoke' } })).status,
  200,
);
assert.equal((await call('', { user: crUser, staff: true })).status, 403);
assert.equal((await switchRole('customer_relation', crUser)).status, 403);
assert.equal(
  db.prepare('SELECT count(*) n FROM staff_access_audit WHERE target_user_id=?').get(crUser).n,
  2,
);
for (const file of [
  'frontend-user/src/Landing.svelte',
  'frontend-user/src/features/member/controller.js',
])
  assert(!readFileSync(file, 'utf8').includes('petugas.html'), 'no staff links on member entry');
console.log(
  'PASS: real account roles, secure one-time Manager activation, no self-elevation, Manager inheritance, grants/revocation, staff/member boundaries, correct staff audit actors, authenticated report uploads/downloads, private PDF serving, shared project quota and removed member-facing staff links.',
);
