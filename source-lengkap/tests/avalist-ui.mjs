import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';
let role = 'manager',
  fail = false;
const requests = [];
const data = {
  date: '2026-09-25',
  today: '2026-09-25',
  people: [
    {
      id: 'person-a',
      userId: 'avalist-account',
      name: 'AVALIST SATU',
      bankName: 'BSI',
      bankAccount: '111111',
      accountName: 'PENERIMA SATU',
      active: true,
      linked: true,
      available: true,
      email: 'avalist@example.test',
      version: 3,
    },
  ],
  accounts: [{ id: 'avalist-account', name: 'Akun Kantor', role: 'avalist' }],
  members: [
    { id: 'member-a', number: 'SKI-123', name: 'ANGGOTA SATU', personId: 'person-a', rate: 2 },
  ],
  contracts: [
    {
      id: 'contract-a',
      number: 'AKAD-123',
      memberId: 'member-a',
      memberName: 'ANGGOTA SATU',
      effectiveDate: '2026-01-25',
      endDate: '2027-01-25',
      personId: 'person-a',
      rate: 2,
    },
  ],
  events: [
    {
      seq: 1,
      memberId: 'member-a',
      contractId: 'contract-a',
      personId: 'person-a',
      rate: 2,
      date: '1901-01-01',
    },
    {
      seq: 2,
      memberId: 'member-a',
      contractId: null,
      personId: 'person-a',
      rate: 2,
      date: '2026-01-01',
    },
  ],
  proposals: [],
  history: [],
  items: [
    {
      contractId: 'contract-a',
      contractNumber: 'AKAD-123',
      memberName: 'ANGGOTA SATU',
      personId: 'person-a',
      personName: 'AVALIST SATU',
      period: 8,
      principal: 10000000,
      member: 500000,
      avalist: 100000,
      cooperative: 400000,
      rate: 1,
      cooperativeRate: 4,
      status: 'pending',
      blocked: '',
    },
  ],
};
const own = {
  personal: true,
  person: data.people[0],
  today: data.today,
  items: [
    {
      contractId: 'contract-a',
      contractNumber: 'AKAD-123',
      memberName: 'ANGGOTA SATU',
      memberId: 'SKI-123',
      date: '2026-09-25',
      period: 8,
      rate: 1,
      amount: 100000,
      status: 'pending',
    },
  ],
  history: [],
  members: [{ number: 'SKI-123', name: 'ANGGOTA SATU' }],
};
const staff = () => ({
  role,
  accountRole: 'manager',
  allowedRoles: ['manager', 'admin', 'finance', 'avalist'],
});
const fetch = async (url, options = {}) => {
  const u = new URL(url, 'https://kspps.example'),
    path = u.pathname;
  let result = {},
    status = 200;
  if (path === '/api/workflow')
    result = { staff: staff(), items: [], profiles: [], members: [], offers: [], profile: null };
  else if (path.endsWith('/staff/access'))
    result = { configured: true, staff: staff(), identity: { name: 'PETUGAS' } };
  else if (path.endsWith('/staff/role')) {
    role = JSON.parse(options.body).role;
    result = { staff: staff() };
  } else if (path === '/api/workflow/avalist') {
    requests.push({ url });
    result =
      u.searchParams.get('view') === 'personal'
        ? own
        : { ...data, date: u.searchParams.get('date') };
  } else if (path.startsWith('/api/workflow/avalist/')) {
    const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
    requests.push({ url, body });
    if (fail) {
      status = 409;
      result = { error: 'Periksa data terbaru' };
    } else {
      result = { ok: true };
      if (path.endsWith('/prepare')) {
        const detail = {
          ...data.items[0],
          bankName: 'BSI',
          bankAccount: '111111',
          accountName: 'PENERIMA SATU',
        };
        const payment = {
          id: 'payment-a',
          kind: 'regular',
          date: '2026-09-25',
          contractId: 'contract-a',
          amount: 100000,
          status: 'prepared',
          version: 1,
          detail,
        };
        data.items[0] = { ...data.items[0], status: 'prepared', payment };
        data.history = [payment];
      }
    }
  } else if (path.endsWith('/staff/tasks')) result = { tasks: [] };
  else if (path.endsWith('/staff/activity'))
    result = { tasks: [], range: { from: '2026-09-25', to: '2026-09-25' } };
  else if (path.endsWith('/finance/payouts')) result = { items: [], members: [], total: 0 };
  else if (path.endsWith('/finance/reconciliations')) result = { items: [] };
  else if (path.endsWith('/reports')) result = { reports: [] };
  else if (path.endsWith('/staff/accounts')) result = { accounts: [] };
  return { ok: status === 200, status, json: async () => structuredClone(result) };
};
const s = await browser('petugas', { fetch });
await s.click('[data-action="enter"][data-role="manager"]');
await s.route('manager-avalist');
await s.settle();
const findLabel = (text, root = s.document) =>
  [...root.querySelectorAll('label')]
    .find((x) => x.textContent.trim().startsWith(text))
    ?.querySelector('input,select,textarea');
async function set(el, value) {
  assert(el);
  el.value = value;
  el.dispatchEvent(
    new s.window.Event(el.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
  );
  await s.settle();
}
async function button(label) {
  const el = [...s.document.querySelectorAll('button')].find((x) => x.textContent.trim() === label);
  assert(el, label);
  el.click();
  await s.settle();
}
async function submit(form) {
  form.dispatchEvent(new s.window.Event('submit', { bubbles: true, cancelable: true }));
  await s.settle();
}
await set(findLabel('Anggota'), 'member-a');
await set(findLabel('Berlaku untuk'), 'selected');
await set(findLabel('Tanggal mulai berlakunya perubahan'), '2026-09-25');
s.document.querySelector('input[type=checkbox][value="contract-a"]').click();
await s.settle();
await set(findLabel('Avalist'), 'person-a');
await set(findLabel('Alasan penetapan'), 'Pergantian avalist untuk akad berjalan');
const form = findLabel('Alasan penetapan').form;
s.window.__portal.events.dispatchEvent(new s.window.CustomEvent('kspps-profile-loaded'));
await s.settle();
assert.equal(
  findLabel('Alasan penetapan').value,
  'Pergantian avalist untuk akad berjalan',
  'Refresh must not destroy an in-progress form',
);
assert.equal(findLabel('Alasan penetapan').form, form);
fail = true;
await submit(form);
assert.match(s.document.body.textContent, /Periksa data terbaru/);
assert.equal(findLabel('Alasan penetapan').value, 'Pergantian avalist untuk akad berjalan');
fail = false;
await submit(form);
const sent = requests.findLast((r) => r.url.endsWith('/assignments')).body;
assert.equal(sent.rate, null, 'Person-only change preserves rate');
assert.deepEqual(sent.contractIds, ['contract-a']);
assert.equal(sent.effectiveDate, '2026-09-25');
assert.equal(findLabel('Alasan penetapan').value, '');
// Manager completes an existing incomplete proposal in place, with explicit selection.
data.proposals = [
  {
    id: 'proposal-incomplete',
    status: 'pending',
    createdAt: '2026-09-25T00:00:00Z',
    payload: {
      memberId: 'member-a',
      scope: 'all',
      contractIds: ['contract-a'],
      personId: null,
      rate: 2,
      effectiveDate: '2026-09-25',
      reason: 'Usulan penetapan awal',
    },
    completionNeeded: [{ contractId: 'contract-a', needsPerson: true, needsRate: false }],
  },
];
await button('Perbarui');
assert.match(s.document.body.textContent, /Lengkapi sebelum menyetujui/);
const approval = s.document.querySelector('.av-approval');
assert(approval.querySelector('button').disabled);
assert.equal(
  approval.querySelectorAll('select').length,
  1,
  'Only the missing person must be requested',
);
await set(findLabel('Avalist untuk penetapan awal', approval), 'person-a');
assert(!approval.querySelector('button').disabled);
fail = true;
await submit(approval);
assert.equal(
  findLabel('Avalist untuk penetapan awal', approval).value,
  'person-a',
  'A failed approval retains the selected avalist',
);
fail = false;
await submit(approval);
assert.deepEqual(requests.findLast((r) => r.url.endsWith('/proposal-incomplete/approve')).body, {
  completion: { personId: 'person-a', rate: null },
});
const registeredPeople = data.people;
data.people = [];
await button('Perbarui');
assert.match(s.document.body.textContent, /Belum ada avalist aktif/);
await button('Daftarkan avalist');
assert(findLabel('Email avalist'), 'Empty registry must lead to email registration');
assert(!findLabel('Akun kantor'), 'No staff account is required');
await set(findLabel('Email avalist'), 'baru@example.test');
const emailForm = findLabel('Email avalist').form;
assert(emailForm.checkValidity(), 'Email alone is sufficient');
fail = true;
await submit(emailForm);
assert.equal(findLabel('Email avalist').value, 'baru@example.test', 'Failed saves retain email');
fail = false;
await submit(emailForm);
const registration = requests.findLast((r) => r.url.endsWith('/people')).body;
assert.equal(registration.email, 'baru@example.test');
assert.equal(registration.bankAccount, '');
assert.equal(registration.reason, '');
data.people = registeredPeople;
await button('Penetapan & usulan');
await button('Perbarui');
data.proposals = [];
await button('Daftar avalist');
await set(findLabel('Data avalist'), 'person-a');
assert(findLabel('Email avalist').readOnly);
assert.equal(
  findLabel('Nama avalist').value,
  'AVALIST SATU',
  'Select uses the existing avalist profile',
);
assert.equal(findLabel('Nomor rekening').value, '111111');
await set(findLabel('Nomor rekening'), '222222');
await set(findLabel('Alasan'), 'Rekening baru telah diverifikasi');
await submit(findLabel('Alasan').form);
assert.equal(requests.findLast((r) => r.url.endsWith('/people')).body.version, 3);
await button('Riwayat & koreksi');
assert.match(s.document.body.textContent, /Koreksi pembayaran selesai/);
await s.window.KsppsWorkflow.setStaffRole('admin');
await s.settle();
await s.route('admin-avalist');
assert.match(s.document.body.textContent, /Kirim usulan ke Manajer/);
assert(!s.document.body.textContent.includes('Simpan penetapan Manajer'));
data.contracts.push({
  ...data.contracts[0],
  id: 'unassigned-contract',
  number: 'AKAD-BELUM-DITETAPKAN',
  personId: null,
  rate: null,
});
await button('Perbarui');
await set(findLabel('Anggota'), 'member-a');
await set(findLabel('Berlaku untuk'), 'selected');
await set(findLabel('Tanggal mulai berlakunya perubahan'), '2026-09-25');
s.document.querySelector('input[type=checkbox][value="unassigned-contract"]').click();
await s.settle();
assert(findLabel('Avalist').required);
assert(findLabel('Bagian avalist').required);
assert.match(
  s.document.body.textContent,
  /AKAD-BELUM-DITETAPKAN belum memiliki nama avalist dan persentase/,
);
const count = requests.filter((r) => r.url.endsWith('/proposals')).length;
await set(findLabel('Alasan penetapan'), 'Pengajuan tanpa penetapan sebelumnya');
await submit(findLabel('Alasan penetapan').form);
assert.equal(
  requests.filter((r) => r.url.endsWith('/proposals')).length,
  count,
  'An incomplete form must not submit',
);
await set(findLabel('Avalist'), 'person-a');
await set(findLabel('Bagian avalist'), '2');
await submit(findLabel('Alasan penetapan').form);
assert.equal(requests.filter((r) => r.url.endsWith('/proposals')).length, count + 1);

await s.window.KsppsWorkflow.setStaffRole('finance');
await s.settle();
await s.route('finance-avalist');
assert.match(s.document.body.textContent, /Rp400.000/);
const date = findLabel('Tanggal bagi hasil');
date.value = '2026-09-26';
date.dispatchEvent(new s.window.Event('change', { bubbles: true }));
await s.settle();
assert(requests.at(-1).url.includes('2026-09-26'), 'Date picker loads the selected date');
await button('Siapkan pembayaran');
assert.equal(requests.findLast((r) => r.url.endsWith('/prepare')).body.date, '2026-09-26');
await button('Catat transfer');
assert(s.document.querySelector('.av-dialog').open);
assert.match(s.document.querySelector('.av-dialog').textContent, /111111/);
assert(s.document.querySelector('.av-dialog input[type=file][required]'));
await button('Tutup');
assert(!s.document.querySelector('.av-dialog').open);
assert(
  s.document.querySelector('a[href="/avalist.html"]'),
  'Staff with an Avalist entitlement use the separate portal',
);
assert(
  !s.document.querySelector('#staff-role option[value="avalist"]'),
  'Avalist is no longer a staff role-picker entry',
);
await s.route('avalist-riwayat');
assert.equal(s.window.__navigations.at(-1), '/avalist.html#avalist-riwayat');
s.close();
console.log(
  'Avalist UI: role navigation, form persistence/errors, account selection, date refresh, manager/admin actions, payment proof dialog and personal read-only views passed.',
);
