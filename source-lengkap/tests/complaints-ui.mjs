import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';
import { createComplaintsController } from '../shared/features/complaints/controller.js';

// An access-denied response invalidates every older read and write, even when
// those requests were already accepted before the account lost its access.
for (const pendingKind of ['detail', 'write']) {
  const pending = [];
  const app = {
    state: (initial) => initial,
    scope: { add: (cleanup) => cleanup },
    request: (url, options) => new Promise((resolve) => pending.push({ url, options, resolve })),
  };
  const controller = createComplaintsController(app, { staff: true });
  const oldItem = { id: '11111111-1111-4111-8111-111111111111', subject: 'KASUS PRIVAT LAMA' };
  controller.state.items = [oldItem];
  controller.state.assignees = [{ id: 'staff-old', name: 'PIC LAMA' }];
  const listing = controller.load();
  const lateResponse =
    pendingKind === 'detail'
      ? controller.open(oldItem.id)
      : controller.create({
          id: oldItem.id,
          subject: 'Keluhan baru',
          description: 'Isi keluhan baru.',
        });
  assert.equal(pending.length, 2);
  pending[0].resolve({
    ok: false,
    status: 403,
    json: async () => ({ error: 'Akses telah dicabut.' }),
  });
  await listing;
  pending[1].resolve({ ok: true, status: 200, json: async () => ({ item: oldItem, events: [] }) });
  await lateResponse;
  assert.deepEqual(controller.state.items, [], 'Access denial clears old complaint rows');
  assert.deepEqual(controller.state.assignees, [], 'Access denial clears old staff names');
  assert.equal(
    controller.state.detail,
    null,
    'A delayed ' + pendingKind + ' response cannot restore private data',
  );
  assert.equal(controller.state.loading, false);
  assert.equal(pending.length, 2, 'An invalidated write does not start private follow-up reads');
  controller.dispose();
}

const profile = {
  id: 'member-own',
  memberNumber: 'SKI-2026-0042',
  status: 'approved',
  version: 1,
  createdAt: '2026-09-01T01:00:00Z',
  data: { name: 'ANGGOTA PEMILIK' },
};
const sample = (id = 'case-own') => ({
  id,
  number: 'KLH-2026-000001',
  subject: 'Status dokumen keanggotaan',
  description: 'Mohon periksa dokumen keanggotaan saya yang belum tersedia.',
  memberName: profile.data.name,
  memberNumber: profile.memberNumber,
  createdAt: '2026-09-25T01:02:00Z',
  updatedAt: '2026-09-25T02:03:00Z',
  status: 'in_progress',
  division: 'admin',
  assignee: { id: 'staff-admin', name: 'ADMIN PENANGGUNG JAWAB' },
  dueAt: '2026-09-26T08:30:00Z',
  resolution: null,
  resolvedAt: null,
  closedAt: null,
  overdue: false,
  version: 2,
});
const initialEvent = {
  id: 'event-original',
  kind: 'reply',
  message: 'Dokumen sedang diperiksa oleh penanggung jawab.',
  actorName: 'ADMIN PENANGGUNG JAWAB',
  actorRole: 'admin',
  createdAt: '2026-09-25T02:03:00Z',
};

function mockApi({ staff = false } = {}) {
  const model = {
    role: 'manager',
    items: [sample()],
    events: [initialEvent],
    calls: [],
    mutations: [],
    failMutation: false,
    failReads: false,
    failReadAfterMutation: false,
    nextMutation: null,
    nextList: null,
  };
  const staffState = () => ({
    role: model.role,
    accountRole: 'manager',
    allowedRoles: ['manager', 'admin', 'finance', 'avalist'],
  });
  const response = (body, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => structuredClone(body),
  });
  const assignees = [
    { id: 'staff-admin', name: 'ADMIN PENANGGUNG JAWAB', role: 'admin' },
    { id: 'staff-finance', name: 'FINANCE PENANGGUNG JAWAB', role: 'finance' },
    { id: 'staff-manager', name: 'MANAJER PENANGGUNG JAWAB', role: 'manager' },
  ];
  const fetch = async (url, options = {}) => {
    const path = new URL(url, 'https://kspps.example').pathname;
    const method = options.method || 'GET';
    model.calls.push({ url, method });
    if (path === '/api/workflow')
      return response({
        profile,
        profiles: staff ? [profile] : [],
        members: [],
        items: [],
        offers: [],
        staff: staff ? staffState() : undefined,
      });
    if (path.endsWith('/staff/access'))
      return response({ configured: true, staff: staffState(), identity: { name: 'MANAJER UJI' } });
    if (path.endsWith('/staff/role')) {
      model.role = JSON.parse(options.body).role;
      return response({ staff: staffState() });
    }
    if (path.startsWith('/api/workflow/complaints')) {
      const portalHeader = Object.entries(options.headers || {}).find(
        ([name]) => name.toLowerCase() === 'x-kspps-portal',
      )?.[1];
      assert.equal(
        portalHeader === 'staff',
        staff,
        'Complaint requests retain the portal boundary',
      );
      const suffix = path.slice('/api/workflow/complaints'.length);
      if (method === 'GET' && model.failReads)
        return response({ error: 'Pembaruan keluhan belum dapat dimuat.' }, 503);
      if (method === 'GET' && !suffix) {
        if (model.nextList) {
          const wait = model.nextList;
          model.nextList = null;
          await wait;
        }
        assert.equal(
          new URL(url, 'https://kspps.example').searchParams.get('view'),
          staff ? 'staff' : null,
        );
        return response({
          items: model.items,
          assignees: staff ? assignees : [],
          canManage: staff,
        });
      }
      const item = model.items.find((entry) => entry.id === suffix.split('/')[1]);
      if (method === 'GET') {
        assert(item, 'A detail request must reference an existing case');
        return response({
          item,
          events: model.events,
          canManage: staff,
          canReply: item.status !== 'closed',
          canReplyAsStaff: staff,
          canResolve: staff && item.status !== 'resolved' && item.status !== 'closed',
          canClose: item.status === 'resolved',
        });
      }
      const body = JSON.parse(options.body);
      model.mutations.push({ path, body });
      if (model.nextMutation) {
        const wait = model.nextMutation;
        model.nextMutation = null;
        await wait;
      }
      if (model.failMutation)
        return response({ error: 'Koneksi terputus. Silakan coba lagi.' }, 503);
      if (!suffix) {
        const created = {
          ...sample(body.id),
          number: 'KLH-2026-000002',
          subject: body.subject,
          description: body.description,
          status: 'new',
          division: null,
          assignee: null,
          dueAt: null,
          version: 1,
        };
        model.items.unshift(created);
        if (model.failReadAfterMutation) model.failReads = true;
        return response({ item: created });
      }
      assert(item);
      assert.equal(body.version, item.version, 'Every correction uses the latest case version');
      if (suffix.endsWith('/assign')) {
        item.assignee = assignees.find((person) => person.id === body.assigneeId);
        item.division = body.division;
        item.dueAt = body.dueAt;
      } else if (suffix.endsWith('/reply')) {
        model.events.push({
          ...initialEvent,
          id: 'event-reply-' + model.events.length,
          message: body.message,
          actorName: staff ? 'MANAJER UJI' : profile.data.name,
          actorRole: staff ? model.role : 'member',
        });
        if (body.status) item.status = body.status;
      } else if (suffix.endsWith('/status')) {
        item.status = body.status;
        if (body.resolution) item.resolution = body.resolution;
        if (item.status === 'resolved') item.resolvedAt = '2026-09-25T08:00:00Z';
        if (item.status === 'closed') item.closedAt = '2026-09-25T08:01:00Z';
      } else assert.fail('Unexpected complaint mutation: ' + suffix);
      item.version++;
      return response({ item });
    }
    if (path.endsWith('/staff/activity'))
      return response({ tasks: [], range: { from: '2026-09-25', to: '2026-09-25' } });
    if (path.endsWith('/staff/tasks')) return response({ tasks: [] });
    if (path.endsWith('/finance/payouts')) return response({ items: [], members: [], total: 0 });
    if (path.endsWith('/reports')) return response({ reports: [] });
    if (path.endsWith('/staff/accounts')) return response({ accounts: [] });
    return response({ items: [], today: '2026-09-25' });
  };
  return { model, fetch };
}

const byLabel = (h, text, root = h.document) => {
  const label = [...root.querySelectorAll('label')].find((node) =>
    node.textContent.trim().startsWith(text),
  );
  const input = label?.querySelector('input,select,textarea');
  assert(input, 'Missing field: ' + text);
  return input;
};
const byButton = (h, text, root = h.document) => {
  const button = [...root.querySelectorAll('button')].find(
    (node) => node.textContent.trim() === text,
  );
  assert(button, 'Missing button: ' + text);
  return button;
};
async function set(h, label, value, root) {
  const input = byLabel(h, label, root);
  input.value = value;
  input.dispatchEvent(
    new h.window.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
  );
  await h.settle();
}
async function click(h, text, root) {
  byButton(h, text, root).click();
  await h.settle();
}
async function submit(h, form) {
  form.dispatchEvent(new h.window.Event('submit', { bubbles: true, cancelable: true }));
  await h.settle();
}
async function backgroundRefresh(h) {
  h.window.__portal.events.dispatchEvent(
    new h.window.CustomEvent('kspps-profile-loaded', { detail: profile }),
  );
  await h.settle();
}

const memberApi = mockApi();
const member = await browser('anggota', { fetch: memberApi.fetch });
await member.click('[data-action="enter-portal"]');
await member.route('bantuan');
assert.match(member.document.body.textContent, /Keluhan Saya/);
assert.match(member.document.body.textContent, /KLH-2026-000001/);
assert(!member.document.body.textContent.includes('Daftar keluhan'));
assert(!member.document.querySelector('[name="assigneeId"]'));
await set(member, 'Subjek keluhan', 'Koreksi setoran bulan September');
await set(member, 'Uraian keluhan', 'Bukti setoran sudah dikirim, tetapi saldo belum berubah.');
const createForm = byLabel(member, 'Subjek keluhan').form;
await backgroundRefresh(member);
assert.equal(byLabel(member, 'Subjek keluhan').form, createForm);
assert.equal(byLabel(member, 'Subjek keluhan').value, 'Koreksi setoran bulan September');
assert.equal(
  byLabel(member, 'Uraian keluhan').value,
  'Bukti setoran sudah dikirim, tetapi saldo belum berubah.',
);
memberApi.model.failMutation = true;
await submit(member, createForm);
assert.match(member.document.querySelector('[role="alert"]').textContent, /Koneksi terputus/);
assert.equal(byLabel(member, 'Subjek keluhan').form, createForm);
assert.equal(
  byLabel(member, 'Uraian keluhan').value,
  'Bukti setoran sudah dikirim, tetapi saldo belum berubah.',
);
const failedRequest = memberApi.model.mutations.at(-1).body;
assert(failedRequest.id);
memberApi.model.failMutation = false;
let releaseCreate;
memberApi.model.nextMutation = new Promise((resolve) => (releaseCreate = resolve));
await submit(member, createForm);
assert(
  byButton(member, 'Kirim keluhan').matches(':disabled'),
  'An in-flight request disables duplicate submissions',
);
await submit(member, createForm);
assert.equal(
  memberApi.model.mutations.length,
  2,
  'A repeated submit does not send another request',
);
releaseCreate();
await member.settle();
assert.equal(
  memberApi.model.mutations.at(-1).body.id,
  failedRequest.id,
  'Retries keep their idempotency key',
);
assert.equal(memberApi.model.mutations.at(-1).body.subject, failedRequest.subject);
assert.equal(memberApi.model.mutations.at(-1).body.description, failedRequest.description);
assert.match(member.document.body.textContent, /KLH-2026-000002/);
assert.match(member.document.body.textContent, /Waktu masuk/);
assert.match(member.document.body.textContent, /25 Sep 2026.*09[.:]02.*WITA/);
await click(member, 'Kembali ke daftar');
assert.equal(byLabel(member, 'Subjek keluhan').value, '', 'Successful submission clears its draft');
assert.match(member.document.querySelector('.complaint-list').textContent, /KLH-2026-000002/);
await member.click('button[aria-label="Lihat detail KLH-2026-000001"]');
assert.match(member.document.body.textContent, /ADMIN PENANGGUNG JAWAB/);
assert.match(member.document.body.textContent, /Divisi penanggung jawab/);
assert.match(member.document.body.textContent, /Batas waktu/);
assert.match(member.document.body.textContent, /Riwayat tanggapan/);
assert.match(member.document.body.textContent, /Dokumen sedang diperiksa oleh penanggung jawab/);
await set(member, 'Tanggapan', 'Saya menunggu hasil pemeriksaan dokumen.');
const replyForm = byLabel(member, 'Tanggapan').form;
await backgroundRefresh(member);
assert.equal(byLabel(member, 'Tanggapan').form, replyForm);
assert.equal(byLabel(member, 'Tanggapan').value, 'Saya menunggu hasil pemeriksaan dokumen.');
assert.match(member.document.body.textContent, /KLH-2026-000001/);
assert(
  !member.document.querySelector('.complaint-create'),
  'Background refresh keeps the selected case',
);
await submit(member, replyForm);
assert.match(member.document.body.textContent, /Saya menunggu hasil pemeriksaan dokumen/);
assert.equal(byLabel(member, 'Tanggapan').value, '');
assert(!member.document.body.textContent.includes('Simpan penugasan'));
member.close();

const savedApi = mockApi();
const saved = await browser('anggota', { fetch: savedApi.fetch });
await saved.click('[data-action="enter-portal"]');
await saved.route('bantuan');
await set(saved, 'Subjek keluhan', 'Nomor keluhan tetap tercatat');
await set(saved, 'Uraian keluhan', 'Permintaan tersimpan sebelum koneksi pembaruan terputus.');
savedApi.model.failReadAfterMutation = true;
await submit(saved, byLabel(saved, 'Subjek keluhan').form);
assert.match(saved.document.querySelector('[role="status"]').textContent, /Keluhan terkirim/);
assert.match(saved.document.body.textContent, /KLH-2026-000002/);
assert.match(saved.document.body.textContent, /Nomor keluhan tetap tercatat/);
assert.match(
  saved.document.querySelector('[role="alert"]').textContent,
  /Pembaruan keluhan belum dapat dimuat/,
);
await click(saved, 'Kembali ke daftar');
assert.equal(
  byLabel(saved, 'Subjek keluhan').value,
  '',
  'A saved request clears its draft even when subsequent reads fail',
);
assert.equal(
  savedApi.model.mutations.length,
  1,
  'A failed refresh does not send the saved complaint again',
);
savedApi.model.failReads = false;
await click(saved, 'Perbarui', saved.document.querySelector('.complaint-list'));
assert(!saved.document.querySelector('.complaint-notice--error'));
assert.match(
  saved.document.querySelector('.complaint-list').textContent,
  /Nomor keluhan tetap tercatat/,
);
saved.close();

const staffApi = mockApi({ staff: true });
const staff = await browser('petugas', { fetch: staffApi.fetch });
await staff.click('[data-action="enter"][data-role="manager"]');
for (const role of ['manager', 'admin', 'finance']) {
  if (role !== 'manager') await staff.window.KsppsWorkflow.setStaffRole(role);
  await staff.settle();
  assert.equal(
    staff.document.querySelector('a[href="#keluhan"]').textContent.trim(),
    'Keluhan Anggota',
  );
  await staff.route('keluhan');
  assert.match(staff.document.querySelector('h1').textContent, /Keluhan Anggota/);
  assert.match(staff.document.body.textContent, /KLH-2026-000001/);
}
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.settle();
await staff.route('keluhan');
await staff.click('button[aria-label="Lihat detail KLH-2026-000001"]');
await set(staff, 'Divisi penanggung jawab', 'finance');
await set(staff, 'PIC', 'staff-finance');
await set(staff, 'Batas waktu penanganan', '2026-09-27T16:30');
await set(staff, 'Alasan perubahan', 'Pemeriksaan saldo diteruskan kepada Finance.');
const assignForm = byLabel(staff, 'Alasan perubahan').form;
await backgroundRefresh(staff);
assert.equal(byLabel(staff, 'Alasan perubahan').form, assignForm);
assert.equal(byLabel(staff, 'PIC').value, 'staff-finance');
staffApi.model.failMutation = true;
await submit(staff, assignForm);
assert.equal(
  byLabel(staff, 'Alasan perubahan').value,
  'Pemeriksaan saldo diteruskan kepada Finance.',
);
staffApi.model.failMutation = false;
await submit(staff, assignForm);
const assignment = staffApi.model.mutations.findLast((call) => call.path.endsWith('/assign')).body;
assert.equal(assignment.assigneeId, 'staff-finance');
assert.equal(assignment.division, 'finance');
assert.equal(
  assignment.dueAt,
  '2026-09-27T08:30:00.000Z',
  'Local WITA deadline is sent as the corresponding instant',
);
assert.match(staff.document.body.textContent, /FINANCE PENANGGUNG JAWAB/);
await set(staff, 'Tanggapan', 'Saldo sudah diperiksa, mohon konfirmasi anggota.');
await set(staff, 'Status setelah tanggapan', 'waiting_member');
await submit(staff, byLabel(staff, 'Tanggapan').form);
assert.equal(staffApi.model.items[0].status, 'waiting_member');
assert.match(staff.document.body.textContent, /Saldo sudah diperiksa, mohon konfirmasi anggota/);
await set(
  staff,
  'Catatan hasil penyelesaian',
  'Setoran telah direkonsiliasi dan saldo anggota telah diperbarui.',
);
await submit(staff, byLabel(staff, 'Catatan hasil penyelesaian').form);
assert.equal(staffApi.model.items[0].status, 'resolved');
assert.match(
  staff.document.body.textContent,
  /Setoran telah direkonsiliasi dan saldo anggota telah diperbarui/,
);
await click(staff, 'Tutup kasus');
assert.equal(staffApi.model.items[0].status, 'closed');
assert(
  !staff.document.querySelector('textarea'),
  'Closed cases no longer offer editable response forms',
);

let releaseRoleList;
staffApi.model.nextList = new Promise((resolve) => (releaseRoleList = resolve));
const beforeRole = staffApi.model.calls.length;
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.settle();
assert(
  !staff.document.body.textContent.includes('Status dokumen keanggotaan'),
  'Role changes remove the previous private case immediately',
);
assert(
  !staff.document.body.textContent.includes(
    'Setoran telah direkonsiliasi dan saldo anggota telah diperbarui',
  ),
);
assert(staffApi.model.calls.length > beforeRole);
releaseRoleList();
await staff.settle();
await staff.route('keluhan');
assert.match(staff.document.body.textContent, /Daftar keluhan/);
assert(
  !staff.document.querySelector('.complaint-resolution'),
  'The new role starts with its own list, not the old selection',
);
assert(!staff.document.querySelector('#staff-role option[value="avalist"]'));
staff.close();

const avalistCalls = [];
const avalist = await browser('avalist', {
  fetch: async (url) => {
    avalistCalls.push(url);
    return {
      ok: true,
      json: async () => ({ allowed: false, identity: { name: 'AVALIST' } }),
    };
  },
});
assert(!avalist.document.querySelector('a[href="#keluhan"]'));
assert(
  !avalistCalls.some((url) => url.includes('/complaints')),
  'The Avalist portal never requests complaint records',
);
avalist.close();

let previewCalls = 0;
const forbiddenNetwork = async () => {
  previewCalls++;
  throw new Error('Static Pages must not send complaint records');
};
const previewMember = await browser('anggota', { preview: true, fetch: forbiddenNetwork });
await previewMember.click('[data-action="enter-portal"]');
await previewMember.route('bantuan');
assert(!previewMember.document.querySelector('.complaint-notice--error'));
assert(byLabel(previewMember, 'Subjek keluhan').disabled);
assert(byLabel(previewMember, 'Uraian keluhan').disabled);
assert(byButton(previewMember, 'Kirim keluhan').disabled);
await submit(previewMember, byLabel(previewMember, 'Subjek keluhan').form);
await assert.rejects(
  previewMember.window.KsppsWorkflow.api('/complaints', {
    method: 'POST',
    body: JSON.stringify({ id: 'blocked', subject: 'Tidak dikirim', description: 'Tidak dikirim' }),
  }),
  /Penyimpanan, unggahan, dan layanan akun tidak tersedia pada alamat ini/,
);
assert(!previewMember.document.querySelector('.complaint-notice--success'));
previewMember.close();
const previewStaff = await browser('petugas', { preview: true, fetch: forbiddenNetwork });
await previewStaff.click('[data-action="enter"][data-role="manager"]');
await previewStaff.route('keluhan');
assert(!previewStaff.document.querySelector('.complaint-notice--error'));
assert.match(previewStaff.document.body.textContent, /Belum ada keluhan/);
assert.equal(previewCalls, 0, 'Member and staff Pages never use authenticated complaint APIs');
previewStaff.close();

console.log(
  'PASS: complaint creation/idempotent retries, WITA receipt and deadline, PIC/division, status/history/resolution, draft/detail persistence, three staff roles, role-change cleanup, Avalist isolation and static Pages guards.',
);
