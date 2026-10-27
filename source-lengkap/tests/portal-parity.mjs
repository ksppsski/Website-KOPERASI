import fs from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { browser, normalize } from './helpers/svelte-browser.mjs';
import { calculateSavings } from '../backend/src/savings.js';
let currentRole = 'admin',
  testCase = 'member-empty';
const snapshots = {},
  differences = [];
const profile = {
  id: 'profile-test',
  memberNumber: 'SKI-2026-0042',
  status: 'approved',
  version: 1,
  createdAt: '2026-01-01T03:00:00Z',
  data: {
    name: 'ANGGOTA UJI',
    email: 'anggota@example.test',
    phone: '081234567890',
    bankName: 'BSI',
    bankAccount: '1234567890',
    basic: 100000,
    monthly: 10000,
    paymentOption: 'Tahunan',
  },
};
profile.savings = calculateSavings(
  { id: profile.id, status: 'approved', created_at: profile.createdAt },
  [
    {
      source_id: profile.id,
      source_kind: 'registration',
      basic: 100000,
      mandatory: 240000,
      other: 50000,
      accepted_at: profile.createdAt,
    },
  ],
  '2026-09-25',
);
const signed = {
  id: 'contract-test',
  kind: 'capital',
  memberName: profile.data.name,
  memberId: profile.memberNumber,
  memberProfileId: profile.id,
  amount: 7000000,
  status: 'signed',
  statusLabel: 'Akad lengkap',
  projectCode: 'MRBH-UJI',
  contractNumber: '0007/SPK-SKI-MRBH-1/I/2026',
  contractData: { agreementDate: '2026-01-22', effectiveDate: '2026-02-01', endDate: '2027-02-01' },
  signedUrl: '/api/workflow/contract-test/signed',
  createdAt: '2026-01-22T03:00:00Z',
  updatedAt: '2026-01-23T03:00:00Z',
  finance: { status: 'approved' },
};
let activeProfile = null,
  items = [];
const staff = () => ({
  role: currentRole,
  accountRole: 'manager',
  allowedRoles: ['admin', 'finance', 'manager', 'customer_relation'],
});
const fetch = async (url, options = {}) => {
  const path = new URL(url, 'https://kspps.example').pathname;
  let data;
  if (path === '/api/workflow/staff/role') {
    currentRole = JSON.parse(options.body).role;
    data = { staff: staff() };
  } else if (path === '/api/workflow') {
    data = {
      profile: activeProfile,
      profiles: activeProfile ? [activeProfile] : [],
      items,
      offers: [],
      staff: staff(),
      financing: [],
      members: [],
    };
  } else if (path.endsWith('/staff/access'))
    data = {
      configured: true,
      staff: staff(),
      identity: { name: 'PETUGAS UJI', email: 'staff@example.test' },
    };
  else if (path.endsWith('/reports')) data = { reports: [] };
  else if (path.endsWith('/staff/accounts')) data = { accounts: [] };
  else if (path.endsWith('/staff/tasks') || path.endsWith('/staff/activity'))
    data = {
      tasks: [],
      range: { from: '2026-09-25', to: '2026-09-25', earliest: '2026-09-18', latest: '2026-09-25' },
    };
  else if (path.endsWith('/finance/reconciliations')) data = { items: [] };
  else if (path.endsWith('/finance/payouts'))
    data = {
      total: 0,
      memberCount: 0,
      transferCount: 0,
      contractCount: 0,
      members: [],
      contracts: [],
      transfers: [],
      date: '2026-09-25',
    };
  else if (path.endsWith('/finance/returns'))
    data = { items: [], today: '2026-09-25', total: 0, scheduled: 0, due: 0, paid: 0 };
  else if (path.endsWith('/maturity/report')) {
    const empty = { amount: 0, count: 0, memberCount: 0 };
    data = {
      items: [],
      total: empty,
      extended: empty,
      returned: empty,
      pending: empty,
      from: '2026-09-01',
      to: '2026-09-30',
    };
  } else data = { items: [], today: '2026-09-25' };
  return { ok: true, status: 200, json: async () => structuredClone(data) };
};
const baseline = JSON.parse(
  fs.readFileSync(new URL('./fixtures/portal-parity.json', import.meta.url)),
);
const compare = (model, expected, app) => {
  const key = testCase + ':' + model.route;
  const hash = createHash('sha256')
    .update(JSON.stringify(normalize(app)[2]))
    .digest('hex');
  snapshots[key] = hash;
  if (!baseline[key]?.includes(hash)) differences.push(key);
};
const m = await browser('anggota', { fetch, compare });
await m.click('[data-action="enter-portal"]');
for (const route of [
  'ringkasan',
  'simpanan',
  'modal',
  'pembiayaan',
  'dokumen',
  'profil',
  'bantuan',
  'pengunduran',
  'laporan',
])
  await m.route(route);
activeProfile = profile;
items = [signed];
testCase = 'member-active';
await m.window.KsppsWorkflow.refresh();
for (const route of [
  'ringkasan',
  'simpanan',
  'modal',
  'pembiayaan',
  'dokumen',
  'profil',
  'bantuan',
  'pengunduran',
  'laporan',
])
  await m.route(route);
testCase = 'registration';
await m.route('daftar');
const ctx = m.window.__view.context;
for (const step of [2, 3, 4]) {
  ctx.state.registrationStep = step;
  ctx.render();
  await m.settle();
}
m.close();
const s = await browser('petugas', { fetch, compare });
testCase = 'admin';
await s.click('[data-action="enter"][data-role="admin"]');
for (const route of [
  'ringkasan',
  'pendaftaran',
  'setoran',
  'penyertaan',
  'pengunduran',
  'pengajuan',
  'anggota',
  'akad',
])
  await s.route(route);
for (const role of ['finance', 'manager']) {
  testCase = role;
  await s.window.KsppsWorkflow.setStaffRole(role);
  await s.settle();
  for (const route of role === 'finance'
    ? [
        'finance-ringkasan',
        'finance-rekonsiliasi',
        'finance-bagi-hasil',
        'finance-pengembalian',
        'finance-pengunduran',
      ]
    : [
        'waktu-kerja',
        'manager-penawaran',
        'manager-laporan',
        'manager-akses',
        'manager-jatuh-tempo',
        'manager-pengunduran',
      ])
    await s.route(route);
}
s.close();
assert.deepEqual(
  [...new Set(differences)],
  [],
  'Svelte pages must retain the approved pre-migration markup.',
);
assert.equal(Object.keys(snapshots).length, 40);
console.log(
  'PASS: 40 portal views retain the approved content, structure, fields, classes and controls.',
);
