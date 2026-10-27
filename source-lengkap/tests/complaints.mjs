import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import worker from '../backend/src/index.js';
import { RESET_ID } from '../backend/src/reset-demo.js';
import { testSessionCookie, withTestSession } from './helpers/test-session.mjs';

const db = new DatabaseSync(':memory:');
for (const file of readdirSync('backend/migrations')
  .filter((name) => name.endsWith('.sql'))
  .sort())
  db.exec(readFileSync('backend/migrations/' + file, 'utf8'));
const env = {
  DB: {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            execute: () => ({ meta: { changes: Number(db.prepare(sql).run(...args).changes) } }),
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
    async batch(statements) {
      db.exec('BEGIN');
      try {
        const result = statements.map((statement) => statement.execute());
        db.exec('COMMIT');
        return result;
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  },
  BUCKET: {},
};
const now = new Date().toISOString();
db.prepare('INSERT INTO maintenance_tasks VALUES (?,?)').run(RESET_ID, now);
for (const [id, role] of [
  ['admin', 'admin'],
  ['finance', 'finance'],
  ['manager', 'manager'],
  ['avalist', 'avalist'],
])
  db.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?)').run(
    id,
    role,
    'Petugas ' + id,
    id + '@private.test',
    'manager',
    now,
    now,
  );

async function call(
  path = '',
  {
    user = 'member',
    body,
    method = body === undefined ? 'GET' : 'POST',
    headers = {},
    origin = 'https://kspps.test',
  } = {},
) {
  const requestHeaders = { ...headers };
  if (user) requestHeaders.Cookie = testSessionCookie;
  if (method !== 'GET') requestHeaders.Origin = origin;
  if (body !== undefined) requestHeaders['Content-Type'] = 'application/json';
  const response = await worker.fetch(
    new Request('https://kspps.test/api/workflow' + path, {
      method,
      headers: requestHeaders,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
    withTestSession(
      env,
      user && { id: user, name: 'Akun ' + user, email: '', emailVerified: false },
    ),
  );
  return { status: response.status, data: await response.json() };
}
const base = '/complaints';
const createBody = () => ({
  id: crypto.randomUUID(),
  subject: 'Saldo belum sesuai',
  description: 'Setoran sudah masuk tetapi saldo belum sesuai.',
});
const body = createBody();
const realDate = Date;
globalThis.Date = class extends realDate {
  constructor(...args) {
    super(...(args.length ? args : ['2026-12-31T17:00:00.000Z']));
  }
  static now() {
    return realDate.parse('2026-12-31T17:00:00.000Z');
  }
};
const first = await call(base, {
  body: { ...body, createdAt: '2001-01-01', number: 'forged', owner: 'other' },
});
globalThis.Date = realDate;
assert.equal(first.status, 201);
assert.equal(
  first.data.item.number,
  'KLH-2027-000001',
  'server time uses WITA year at the UTC year boundary',
);
assert.equal(first.data.item.createdAt, '2026-12-31T17:00:00.000Z');
assert.equal(first.data.item.memberName, 'Akun member');
assert.equal(first.data.item.status, 'new');
assert.equal(first.data.item.version, 1);
const id = first.data.item.id;
const path = base + '/' + id;
const eventsCount = () =>
  db.prepare('SELECT count(*) count FROM complaint_events WHERE complaint_id=?').get(id).count;
assert.equal((await call(base, { body })).data.item.number, first.data.item.number);
assert.equal(eventsCount(), 1, 'retries do not add duplicate case history');
assert.equal((await call(base, { body: { ...body, subject: 'Isi berbeda' } })).status, 409);
assert.equal((await call(base, { user: 'other', body })).status, 404);
assert.equal((await call(path, { user: 'other' })).status, 404);
assert.deepEqual((await call(base, { user: 'other' })).data.items, []);
assert.equal((await call(path, { user: 'finance' })).status, 404);
assert.equal((await call(base + '?view=staff')).status, 403);
assert.equal((await call(base + '?view=staff', { user: 'finance' })).data.items.length, 0);
assert.equal((await call(base + '?view=staff', { user: 'admin' })).data.items.length, 1);
const directory = (await call(base + '?view=staff', { user: 'manager' })).data.assignees;
assert.deepEqual(directory.map((entry) => entry.role).sort(), ['admin', 'finance', 'manager']);
assert(!JSON.stringify(directory).includes('@private.test'), 'staff email is never exposed');
for (const user of [null, 'avalist']) {
  const status = user ? 403 : 401;
  assert.equal((await call(base, { user })).status, status);
  assert.equal((await call(path, { user })).status, status);
  assert.equal((await call(base, { user, body: createBody() })).status, status);
}
for (const requestPath of [base + '?member=member', '/member/' + crypto.randomUUID() + base])
  assert.equal((await call(requestPath, { user: 'manager' })).status, 403);
assert.equal(
  (await call(path, { user: 'manager', headers: { 'x-kspps-member': crypto.randomUUID() } }))
    .status,
  403,
);
assert.equal((await call(base, { body: createBody(), origin: 'https://other.test' })).status, 403);
assert.equal((await call(base, { body: null })).status, 400);
assert.equal((await call(base, { body: { ...createBody(), subject: 'abc' } })).status, 400);
assert.equal((await call(base, { body: { ...createBody(), description: 'pendek' } })).status, 400);

let detail = (await call(path)).data;
assert.equal(detail.canReply, true, 'an owner may add information before a PIC is assigned');
assert.equal(detail.canReplyAsStaff, false);
assert.equal(detail.canResolve, false);
assert.equal(
  (await call(path + '/reply', { body: { version: 1, message: 'Mohon diperiksa.' } })).status,
  200,
);
assert.equal(
  (await call(path + '/reply', { user: 'admin', body: { version: 2, message: 'Kami periksa.' } }))
    .status,
  403,
);
assert.equal(
  (await call(path + '/status', { user: 'admin', body: { version: 2, status: 'in_progress' } }))
    .status,
  409,
);
const assignment = {
  version: 2,
  assigneeId: 'finance',
  division: 'finance',
  dueAt: new Date(Date.now() + 86400000).toISOString(),
};
for (const user of ['member', 'finance'])
  assert.equal((await call(path + '/assign', { user, body: assignment })).status, 403);
for (const patch of [
  { assigneeId: 'unknown' },
  { assigneeId: 'avalist' },
  { division: 'admin' },
  { division: 'manager' },
  { assigneeId: 'manager' },
  { dueAt: new Date(Date.now() - 1).toISOString() },
  { dueAt: '2030-02-31T12:00:00Z' },
  { dueAt: '2030-05-02' },
])
  assert.equal(
    (await call(path + '/assign', { user: 'admin', body: { ...assignment, ...patch } })).status,
    400,
  );
detail = (await call(path + '/assign', { user: 'admin', body: assignment })).data;
assert.equal(detail.item.assignee.name, 'Petugas finance');
assert.equal(detail.item.division, 'finance');
assert.equal(detail.item.version, 3);
assert.equal((await call(path, { user: 'finance' })).data.canReply, true);
assert.equal((await call(base + '?view=staff', { user: 'finance' })).data.items.length, 1);
assert.equal(
  (
    await call(path + '/assign', {
      user: 'manager',
      body: { ...assignment, version: 3, dueAt: new Date(Date.now() + 172800000).toISOString() },
    })
  ).status,
  400,
);
assert.equal(
  (
    await call(path + '/status', {
      user: 'finance',
      body: { version: 3, status: 'resolved', resolution: 'Sudah dilakukan pemeriksaan.' },
    })
  ).status,
  409,
);
assert.equal(
  (await call(path + '/status', { user: 'finance', body: { version: 3, status: 'closed' } }))
    .status,
  403,
);
detail = (
  await call(path + '/status', { user: 'finance', body: { version: 3, status: 'in_progress' } })
).data;
assert.equal(detail.item.status, 'in_progress');
assert.equal(detail.canResolve, true);
assert.equal(
  (
    await call(path + '/status', {
      user: 'member',
      body: { version: 4, status: 'resolved', resolution: 'Saya menyatakan telah selesai.' },
    })
  ).status,
  403,
);
assert.equal(
  (
    await call(path + '/status', {
      user: 'finance',
      body: { version: 4, status: 'resolved', resolution: 'ok' },
    })
  ).status,
  400,
);
assert.equal(
  (await call(path + '/status', { user: 'admin', body: { version: 4, status: 'closed' } })).status,
  409,
);
detail = (
  await call(path + '/reply', {
    user: 'finance',
    body: {
      version: 4,
      message: 'Mohon lampirkan nomor setoran pada tanggapan.',
      status: 'waiting_member',
    },
  })
).data;
assert.equal(detail.item.status, 'waiting_member');
detail = (
  await call(path + '/reply', {
    body: { version: 5, message: 'Nomor setoran saya adalah SET-001.' },
  })
).data;
assert.equal(
  detail.item.status,
  'in_progress',
  'owner reply resumes a case waiting for information',
);
detail = (
  await call(path + '/status', {
    user: 'finance',
    body: {
      version: 6,
      status: 'resolved',
      resolution: 'Saldo sudah diperiksa dan disesuaikan berdasarkan bukti.',
    },
  })
).data;
assert.equal(detail.item.status, 'resolved');
assert.equal(detail.item.overdue, false);
assert.equal((await call(path, { user: 'admin' })).data.canClose, true);
assert.equal(
  (
    await call(path + '/assign', {
      user: 'admin',
      body: { ...assignment, version: 7, reason: 'Perlu dialihkan.' },
    })
  ).status,
  409,
);
detail = (
  await call(path + '/reply', {
    body: { version: 7, message: 'Ada satu setoran lain yang belum terhitung.' },
  })
).data;
assert.equal(detail.item.status, 'in_progress');
assert.equal(detail.item.resolution, null, 'reopening requires a fresh resolution');
assert(
  detail.events.some((event) => event.message.includes('Saldo sudah diperiksa dan disesuaikan')),
  'previous resolution stays in history',
);

const beforeConcurrent = eventsCount();
const concurrent = await Promise.all([
  call(path + '/reply', { body: { version: 8, message: 'Tanggapan bersamaan A.' } }),
  call(path + '/reply', { body: { version: 8, message: 'Tanggapan bersamaan B.' } }),
]);
assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 409]);
assert.equal(
  eventsCount(),
  beforeConcurrent + 1,
  'a failed optimistic update never leaves a history event',
);
assert.equal((await call(path)).data.item.version, 9);
const beforeRollback = eventsCount();
db.exec(
  "CREATE TRIGGER complaint_test_failure BEFORE INSERT ON complaint_events WHEN NEW.message='Gagal atomik' BEGIN SELECT RAISE(ABORT,'TEST_ATOMIC'); END",
);
const originalError = console.error;
console.error = () => {};
const rolledBack = await call(path + '/reply', { body: { version: 9, message: 'Gagal atomik' } });
console.error = originalError;
db.exec('DROP TRIGGER complaint_test_failure');
assert.equal(rolledBack.status, 503);
assert.equal(eventsCount(), beforeRollback);
assert.equal(
  (await call(path)).data.item.version,
  9,
  'an audit failure rolls back the case update',
);
detail = (
  await call(path + '/assign', {
    user: 'manager',
    body: {
      version: 9,
      assigneeId: 'admin',
      division: 'admin',
      dueAt: new Date(Date.now() + 86400000).toISOString(),
      reason: 'Dilanjutkan pemeriksaan administrasi.',
    },
  })
).data;
assert.equal(detail.item.version, 10);
assert.equal(
  (await call(path, { user: 'finance' })).status,
  404,
  'the previous PIC loses access after reassignment',
);
assert.equal((await call(base + '?view=staff', { user: 'finance' })).data.items.length, 0);
db.prepare('UPDATE complaints SET due_at=? WHERE id=?').run(
  new Date(Date.now() - 60000).toISOString(),
  id,
);
assert.equal((await call(path)).data.item.overdue, true, 'overdue is derived for open cases');
detail = (
  await call(path + '/status', {
    user: 'admin',
    body: {
      version: 10,
      status: 'resolved',
      resolution: 'Seluruh setoran sudah diperiksa dan saldo telah sesuai.',
    },
  })
).data;
assert.equal(detail.item.overdue, false);
detail = (
  await call(path + '/status', { user: 'manager', body: { version: 11, status: 'closed' } })
).data;
assert.equal(detail.item.status, 'closed');
assert(detail.item.resolution);
assert(detail.item.closedAt);
assert.equal(detail.canReply, false);
assert.equal(detail.canReplyAsStaff, false);
assert.equal(detail.canClose, false);
const closedCount = eventsCount();
for (const [action, data] of [
  ['reply', { message: 'Perubahan setelah ditutup.' }],
  ['assign', assignment],
  ['status', { status: 'in_progress' }],
])
  assert.equal(
    (await call(path + '/' + action, { user: 'admin', body: { ...data, version: 12 } })).status,
    409,
  );
assert.equal((await call(path, { user: 'admin', method: 'DELETE' })).status, 405);
assert.equal(eventsCount(), closedCount);
assert.equal((await call(path)).data.item.resolution, detail.item.resolution);
assert(!JSON.stringify(detail).includes('mutation_token'));
assert(!JSON.stringify(detail).includes('@private.test'));

// Closed or not-yet-approved membership does not prevent account-owned help.
const profileId = crypto.randomUUID();
db.prepare(
  `INSERT INTO member_profiles
  (owner,id,member_number,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,status,note,consent_at,created_at,updated_at)
  VALUES (?,?,?,?,?,?,?,?,?,'closed','',?,?,?)`,
).run(
  'archive-workspace',
  profileId,
  'SKI-2026-9001',
  JSON.stringify({ name: 'Anggota Arsip' }),
  'sig',
  'sha',
  'proof',
  'proof.png',
  'image/png',
  now,
  now,
  now,
);
db.prepare('INSERT INTO membership_accounts VALUES (?,?,?)').run(
  'archived-account',
  'archive-workspace',
  now,
);
const archived = await call(base, { user: 'archived-account', body: createBody() });
assert.equal(archived.status, 201);
assert.equal(archived.data.item.memberNumber, 'SKI-2026-9001');
assert.equal(archived.data.item.memberName, 'Anggota Arsip');
assert.equal((await call(base, { user: 'archived-account' })).data.items.length, 1);
assert.equal(
  (await call(base + '/' + archived.data.item.id, { user: 'archive-workspace' })).status,
  404,
);
const createdConcurrently = createBody();
const repeats = await Promise.all([
  call(base, { body: createdConcurrently }),
  call(base, { body: createdConcurrently }),
]);
assert(repeats.every((result) => result.status === 201));
assert.equal(repeats[0].data.item.number, repeats[1].data.item.number);
assert.equal(
  db
    .prepare('SELECT count(*) count FROM complaint_events WHERE complaint_id=?')
    .get(createdConcurrently.id).count,
  1,
);
const numbers = db.prepare('SELECT serial FROM complaint_numbers ORDER BY serial').all();
assert(numbers.every((entry, index) => !index || entry.serial > numbers[index - 1].serial));

// A staff account may report its own case and still act as the assigned PIC.
const staffCase = (await call(base, { user: 'finance', body: createBody() })).data.item;
const staffPath = base + '/' + staffCase.id;
assert.equal((await call(staffPath, { user: 'finance' })).data.canReplyAsStaff, false);
assert.equal(
  (
    await call(staffPath + '/reply', {
      user: 'finance',
      body: { version: 1, message: 'Tanggapan sebagai pelapor.', status: 'in_progress' },
    })
  ).status,
  400,
  'an unassigned owner cannot choose a staff status',
);
await call(staffPath + '/assign', {
  user: 'admin',
  body: {
    version: 1,
    assigneeId: 'finance',
    division: 'finance',
    dueAt: new Date(Date.now() + 86400000).toISOString(),
  },
});
assert.equal((await call(staffPath, { user: 'finance' })).data.canReplyAsStaff, true);
let ownCase = await call(staffPath + '/reply', {
  user: 'finance',
  body: { version: 2, message: 'Penanganan dimulai oleh PIC.', status: 'in_progress' },
});
assert.equal(ownCase.status, 200);
assert.equal(ownCase.data.item.status, 'in_progress');
ownCase = await call(staffPath + '/status', {
  user: 'finance',
  body: {
    version: 3,
    status: 'resolved',
    resolution: 'Hasil pemeriksaan awal sudah dicatat lengkap.',
  },
});
assert.equal(ownCase.status, 200);
ownCase = await call(staffPath + '/reply', {
  user: 'finance',
  body: { version: 4, message: 'Diperlukan dokumen tambahan.', status: 'waiting_member' },
});
assert.equal(ownCase.status, 200, 'a PIC can reopen its own resolved case as staff');
assert.equal(ownCase.data.item.status, 'waiting_member');
assert.equal(ownCase.data.item.resolution, null);
assert(ownCase.data.events.some((event) => event.message.includes('Hasil pemeriksaan awal')));
ownCase = await call(staffPath + '/reply', {
  user: 'finance',
  body: { version: 5, message: 'Dokumen tambahan sudah tersedia dari pelapor.' },
});
assert.equal(
  ownCase.data.item.status,
  'in_progress',
  'owner reply without a staff status resumes handling',
);
db.prepare('DELETE FROM staff_accounts WHERE user_id=?').run('finance');
assert.equal(
  (await call(staffPath, { user: 'finance' })).data.canReplyAsStaff,
  false,
  'revoked staff keep only their ownership access',
);
assert.equal(
  (
    await call(staffPath + '/reply', {
      user: 'finance',
      body: { version: 6, message: 'Mencoba kewenangan lama.', status: 'waiting_member' },
    })
  ).status,
  400,
);
// Customer Relation is a complaint PIC role, with no unassigned or ownership bypass.
const beforeCrGrant = (await call(base, { user: 'cr-one', body: createBody() })).data.item;
for (const user of ['cr-one', 'cr-two'])
  db.prepare('INSERT INTO staff_accounts VALUES (?,?,?,?,?,?,?)').run(
    user,
    'customer_relation',
    'Customer Relation ' + user,
    user + '@private.test',
    'manager',
    now,
    now,
  );
assert.equal((await call(base, { user: 'cr-one', body: createBody() })).status, 403);
assert.equal(
  (await call(base + '/' + beforeCrGrant.id, { user: 'cr-one' })).status,
  404,
  'owning a historical complaint does not bypass the CR assignment boundary',
);
for (const suffix of ['', '?view=staff'])
  assert.deepEqual((await call(base + suffix, { user: 'cr-one' })).data.items, []);
const crDirectory = (await call(base + '?view=staff', { user: 'admin' })).data.assignees;
assert.equal(crDirectory.find((person) => person.id === 'cr-one').role, 'customer_relation');
assert(!JSON.stringify(crDirectory).includes('@private.test'));
const crCase = (await call(base, { user: 'cr-reporter', body: createBody() })).data.item;
const crPath = base + '/' + crCase.id;
const crAssignment = {
  version: 1,
  assigneeId: 'cr-one',
  division: 'customer_relation',
  dueAt: new Date(Date.now() + 86400000).toISOString(),
};
assert.equal((await call(crPath, { user: 'cr-one' })).status, 404);
assert.equal(
  (
    await call(crPath + '/assign', {
      user: 'admin',
      body: { ...crAssignment, division: 'admin' },
    })
  ).status,
  400,
);
assert.equal(
  (
    await call(crPath + '/assign', {
      user: 'admin',
      body: { ...crAssignment, assigneeId: 'admin' },
    })
  ).status,
  400,
);
const assignedCr = await call(crPath + '/assign', { user: 'admin', body: crAssignment });
assert.equal(assignedCr.status, 200);
assert.equal(assignedCr.data.item.division, 'customer_relation');
assert(assignedCr.data.events.at(-1).message.includes('Divisi: Customer Relation.'));
for (const suffix of ['', '?view=staff']) {
  const crList = await call(base + suffix, { user: 'cr-one' });
  assert.deepEqual(
    crList.data.items.map((item) => item.id),
    [crCase.id],
  );
  assert.deepEqual(crList.data.assignees, []);
  assert.equal(crList.data.canManage, false);
}
let crDetail = (await call(crPath, { user: 'cr-one' })).data;
assert.equal(crDetail.canReply, true);
assert.equal(crDetail.canReplyAsStaff, true);
assert.equal(crDetail.canManage, false);
assert.equal(crDetail.canResolve, false);
assert.equal((await call(crPath, { user: 'cr-two' })).status, 404);
assert.equal((await call(crPath, { user: 'other' })).status, 404);
assert.equal((await call(crPath + '/assign', { user: 'cr-one', body: crAssignment })).status, 403);
assert.equal(
  (
    await call(crPath + '/status', {
      user: 'cr-one',
      body: { version: 2, status: 'closed' },
    })
  ).status,
  403,
);
crDetail = (
  await call(crPath + '/status', {
    user: 'cr-one',
    body: { version: 2, status: 'in_progress' },
  })
).data;
assert.equal(crDetail.canResolve, true);
crDetail = (
  await call(crPath + '/reply', {
    user: 'cr-one',
    body: {
      version: 3,
      message: 'Mohon berikan nomor setoran yang dimaksud.',
      status: 'waiting_member',
    },
  })
).data;
assert.equal(crDetail.item.status, 'waiting_member');
assert.equal(crDetail.events.at(-2).actorRole, 'customer_relation');
crDetail = (
  await call(crPath + '/reply', {
    user: 'cr-reporter',
    body: { version: 4, message: 'Nomor setoran adalah CR-001.' },
  })
).data;
assert.equal(crDetail.item.status, 'in_progress');
assert.equal(
  (
    await call(crPath + '/status', {
      user: 'cr-one',
      body: { version: 5, status: 'resolved', resolution: 'ok' },
    })
  ).status,
  400,
);
crDetail = (
  await call(crPath + '/status', {
    user: 'cr-one',
    body: {
      version: 5,
      status: 'resolved',
      resolution: 'Setoran sudah diperiksa bersama petugas terkait dan hasilnya sesuai.',
    },
  })
).data;
assert.equal(crDetail.item.status, 'resolved');
assert.equal(crDetail.canClose, false);
assert.equal(
  (
    await call(crPath + '/status', {
      user: 'cr-one',
      body: { version: 6, status: 'closed' },
    })
  ).status,
  403,
);
assert.equal(
  (
    await call(crPath + '/status', {
      user: 'manager',
      body: { version: 6, status: 'closed' },
    })
  ).status,
  200,
);
assert.equal(
  (
    await call(crPath + '/reply', {
      user: 'cr-one',
      body: { version: 7, message: 'Tidak boleh mengubah kasus yang ditutup.' },
    })
  ).status,
  409,
);
const transferCase = (await call(base, { user: 'cr-reporter', body: createBody() })).data.item;
const transferPath = base + '/' + transferCase.id;
assert.equal(
  (
    await call(transferPath + '/assign', {
      user: 'manager',
      body: crAssignment,
    })
  ).status,
  200,
);
assert.equal(
  (
    await call(transferPath + '/assign', {
      user: 'manager',
      body: {
        ...crAssignment,
        version: 2,
        assigneeId: 'admin',
        division: 'admin',
        reason: 'Dialihkan untuk pemeriksaan administrasi.',
      },
    })
  ).status,
  200,
);
assert.equal((await call(transferPath, { user: 'cr-one' })).status, 404);
const revokeCase = (await call(base, { user: 'cr-reporter', body: createBody() })).data.item;
const revokePath = base + '/' + revokeCase.id;
assert.equal(
  (
    await call(revokePath + '/assign', {
      user: 'admin',
      body: crAssignment,
    })
  ).status,
  200,
);
db.prepare('DELETE FROM staff_accounts WHERE user_id=?').run('cr-one');
assert.equal((await call(revokePath, { user: 'cr-one' })).status, 404);
assert.equal(
  (
    await call(revokePath + '/reply', {
      user: 'cr-one',
      body: { version: 2, message: 'Percobaan dengan akses yang dicabut.' },
    })
  ).status,
  404,
);
assert.equal((await call(base + '?view=staff', { user: 'cr-one' })).status, 403);
db.close();
console.log(
  'PASS: complaint numbering, account privacy, PIC/division/deadline checks, complete case history, resolution, closure and atomic optimistic updates.',
);
