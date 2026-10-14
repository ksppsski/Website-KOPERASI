import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { browser } from './helpers/svelte-browser.mjs';
import { calculateSavings } from '../backend/src/savings.js';
import { agreementRules } from '../backend/src/contract-rules.js';

const source = (name) =>
  readFileSync(new URL('../shared/styles/' + name, import.meta.url), 'utf8').replace(/\s+/g, '');
const sessions = [];
async function harness(staff = false, accountRole = 'manager') {
  let data = { profile: null, items: [] },
    staffRole = accountRole === 'finance' ? 'finance' : 'admin';
  const h = await browser(staff ? 'petugas' : 'anggota', {
    fetch: async (path, options) => ({
      ok: true,
      json: async () => {
        if (path.endsWith('/staff/access'))
          return {
            staff: {
              role: staffRole,
              accountRole,
              allowedRoles:
                accountRole === 'manager' ? ['manager', 'admin', 'finance'] : [accountRole],
            },
            identity: { name: 'Manager', email: 'manager@example.test' },
            configured: true,
          };
        if (path.endsWith('/staff/accounts')) return { accounts: [] };
        if (path.endsWith('/reports')) return { reports: [] };
        if (path.endsWith('/staff/role')) {
          staffRole = JSON.parse(options.body).role;
          return {
            staff: {
              role: staffRole,
              accountRole,
              allowedRoles:
                accountRole === 'manager' ? ['manager', 'admin', 'finance'] : [accountRole],
              concept: false,
            },
          };
        }
        if (path.includes('/staff/activity') || path.endsWith('/staff/tasks'))
          return {
            tasks: data.tasks || [],
            range: {
              from: '2026-09-21',
              to: '2026-09-22',
              earliest: '2026-09-15',
              latest: '2026-09-22',
            },
          };
        if (path.endsWith('/finance/withdrawals') || path.endsWith('/manager/withdrawals'))
          return { items: data.withdrawals || [], today: '2026-09-23' };
        if (path.endsWith('/staff/financing')) return { items: data.financing || [] };
        if (path.includes('/finance/reconciliations')) return { items: [] };
        if (path.includes('/finance/returns'))
          return { today: '2026-09-23', items: [], totalDue: 0, totalScheduled: 0 };
        if (path.includes('/maturity/report'))
          return {
            from: '2026-09-01',
            to: '2026-09-30',
            items: [],
            total: { amount: 0, count: 0, memberCount: 0 },
            extended: { amount: 0, count: 0, memberCount: 0 },
            returned: { amount: 0, count: 0, memberCount: 0 },
            pending: { amount: 0, count: 0, memberCount: 0 },
          };
        if (path.includes('/finance/payouts'))
          return {
            date: '2026-09-05',
            total: 0,
            contractCount: 0,
            memberCount: 0,
            transferCount: 0,
            members: [],
            referenceDates: [],
          };
        return {
          ...data,
          profiles: staff ? data.profiles || (data.profile ? [data.profile] : []) : [],
          staff: {
            role: staffRole,
            accountRole,
            allowedRoles:
              accountRole === 'manager' ? ['manager', 'admin', 'finance'] : [accountRole],
            concept: false,
          },
        };
      },
    }),
  });
  sessions.push(h);
  const { window, document } = h;
  const selectorFor = (dataset) =>
    Object.entries(dataset)
      .map(
        ([key, value]) =>
          '[data-' + key.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()) + '="' + value + '"]',
      )
      .join('');
  document.emit = async (type, { target } = {}) => {
    let element;
    if (type === 'click') {
      for (const key of [
        'action',
        'wf-action',
        'report-action',
        'maturity-action',
        'resign-action',
        'work-action',
      ]) {
        const found = target.closest?.('[data-' + key + ']');
        if (found?.dataset) {
          element = document.querySelector(selectorFor(found.dataset));
          if (element) break;
        }
      }
      assert(element, 'Requested action must exist in the rendered page');
      element.click();
    } else {
      element = document.getElementById(target.id);
      assert(element, 'Requested form control must exist');
      element.value = target.value;
      element.dispatchEvent(new window.Event(type, { bubbles: true }));
    }
    await h.settle();
  };
  const nodes = new Proxy({}, { get: (_, selector) => document.querySelector(selector) });
  return {
    ...h,
    app: document.querySelector('#app'),
    nodes,
    panel: (key) => document.querySelector('[data-workflow="' + key + '"]'),
    async click(dataset) {
      await h.click(selectorFor(dataset));
    },
    async update(value) {
      data = value;
      window.dispatchEvent(new window.Event('focus'));
      await h.settle();
    },
  };
}
const profile = {
  id: 'profile-test',
  memberNumber: 'SKI-2026-0042',
  status: 'approved',
  version: 1,
  createdAt: '2026-09-21T03:00:00Z',
  data: {
    name: 'ANGGOTA UJI',
    basic: 100000,
    monthly: 10000,
    transactionSaving: 50000,
    paymentOption: 'Bulanan',
  },
};
profile.savings = calculateSavings(
  { id: profile.id, status: 'approved', created_at: '2026-09-21T03:00:00Z' },
  [
    {
      source_id: profile.id,
      source_kind: 'registration',
      basic: 100000,
      mandatory: 10000,
      other: 50000,
      accepted_at: '2026-09-21T03:00:00Z',
    },
  ],
  '2026-09-22',
);
const signed = {
  id: 'contract-test',
  memberProfileId: profile.id,
  kind: 'capital',
  memberId: profile.memberNumber,
  memberName: profile.data.name,
  status: 'signed',
  statusLabel: 'Akad lengkap',
  amount: 7000000,
  contractNumber: '0007/SPK-SKI-MRBH-1/I/2026',
  createdAt: '2026-01-21T00:00:00Z',
  signedAt: '2026-01-22T00:00:00Z',
  signedUrl: '/api/workflow/contract-test/signed',
  contractData: agreementRules('2026-01-21'),
};
const member = await harness();
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /password-field/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('value="anggota@'),
);
await member.click({ action: 'enter-portal' });
for (const token of [
  'summary-banner',
  'member-card-meta',
  'stats',
  'content-grid',
  'quick-actions',
  'Belum terdaftar',
  'Rp0',
])
  assert(
    member.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(token),
    token,
  );
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('Anggota Demo'),
);
await member.update({ profile, items: [signed] });
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /SKI-2026-0042/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp160\.000/,
);
await member.route('simpanan');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /balance-breakdown/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp100\.000/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Simpanan Lainnya/,
);
member.nodes['#savings-filter'].value = 'Simpanan Lainnya';
await member.document.emit('change', {
  target: { id: 'savings-filter', value: 'Simpanan Lainnya' },
});
assert.match(
  member.nodes['#savings-rows'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp50\.000/,
);
assert(
  !member.nodes['#savings-rows'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('Rp100.000'),
);
await member.route('modal');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /contract-list/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /0007\/SPK-SKI/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('NaN'),
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /1 Feb 2026/,
);
await member.route('pembiayaan');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /content-grid/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Angsuran berikutnya/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('MRB-2026-003'),
);
await member.route('dokumen');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /document-grid/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /href="\/api\/workflow\/contract-test\/signed\?download=1"/,
);
member.nodes['#document-search'].value = 'tidak-cocok';
await member.document.emit('input', { target: { id: 'document-search', value: 'tidak-cocok' } });
assert.match(
  member.nodes['#document-list'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Belum ada dokumen/,
);
// The displayed dates must agree with the authoritative server across month/year boundaries.
for (const day of ['2026-01-21', '2026-12-21', '2028-01-21', '2026-01-20', '2028-02-19']) {
  member.window.__portal.ui.render(
    member.document.querySelector('#dialog-content'),
    member.window.KsppsWorkflow.getViewContext().automaticPreview(day),
  );
  const actual = member.document.querySelector('#dialog-content').textContent,
    expected = agreementRules(day);
  for (const field of ['effectiveDate', 'endDate'])
    assert(
      actual.includes(
        new Date(expected[field] + 'T12:00:00Z').toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
      ),
      day + ' ' + field,
    );
  assert(actual.includes(expected.code));
}
const staff = await harness(true);
await staff.click({ action: 'enter', role: 'admin' });
for (const token of [
  'stats',
  'content-grid',
  'Antrean pemeriksaan',
  'Aktivitas petugas',
  'timeline',
])
  assert(
    staff.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(token),
    token,
  );
const pending = {
  ...signed,
  id: 'pending-test',
  status: 'pending',
  statusLabel: 'Menunggu pemeriksaan',
  contractNumber: null,
  contractData: null,
  signedUrl: null,
};
await staff.update({ profile: { ...profile, status: 'pending' }, items: [pending] });
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /2 menunggu/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-wf-action="registration-review"/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-wf-action="review"/,
);
await staff.route('pendaftaran');
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('staff-search'),
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('staff-member'),
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /SKI-2026-0042/,
);
await staff.document.emit('change', { target: { id: 'staff-filter', value: 'Disetujui' } });
assert(
  !staff.nodes['#staff-table'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('ANGGOTA UJI'),
);
await staff.update({
  profile,
  items: [signed, { ...pending, id: 'ready-test', status: 'ready', statusLabel: 'Siap dibuat' }],
});
await staff.route('anggota');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp110\.000/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp7\.000\.000/,
);
await staff.route('akad');
for (const token of ['Penyiapan akad', '1 pengajuan', 'Daftar dokumen', '0007/SPK-SKI', 'Buat PDF'])
  assert(
    staff.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(token),
    token,
  );
console.log(
  'PASS: restored member/staff layouts with empty/current data, savings/document/status filters, live queues and document links, and browser/server date parity.',
);

assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /id="staff-role"/,
);
assert.equal(await staff.window.KsppsWorkflow.setStaffRole('finance'), true);
await staff.route('finance-ringkasan');
await new Promise((resolve) => setImmediate(resolve));
for (const token of [
  'Ringkasan Finance',
  'Total bagi hasil',
  'Bukti transfer masuk',
  'Bagi Hasil Harian',
])
  assert(
    staff.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(token),
    token,
  );
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#pendaftaran"'),
  'Finance navigation does not expose Admin approval screens',
);
await staff.route('finance-rekonsiliasi');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /finance-queue-table/,
);
await staff.route('finance-bagi-hasil');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /id="finance-date"/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Daftar transfer/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Tidak ada akad yang terjadwal/,
);
await staff.route('akad');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Ringkasan Finance/,
  'Admin routes redirect within Finance view',
);
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.route('ringkasan');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Antrean pemeriksaan/,
);
console.log(
  'PASS: Admin/Finance selection, role-specific navigation, Finance data loading, reconciliation screen and daily payout empty state.',
);

// Monitoring navigation and data are reserved for the Manager role.
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#waktu-kerja"'),
);
await staff.route('waktu-kerja');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Antrean pemeriksaan/,
);
await staff.window.KsppsWorkflow.setStaffRole('finance');
await staff.route('waktu-kerja');
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#waktu-kerja"'),
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Ringkasan Finance/,
);
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.route('waktu-kerja');
await new Promise((resolve) => setImmediate(resolve));
for (const token of [
  'Pekerjaan & Waktu Kerja',
  'Ringkasan per peran',
  'Rata-rata respons',
  'Riwayat tahap pekerjaan',
  'data-work-filter="from"',
  'Unduh CSV',
  'Belum ada catatan yang sesuai',
  'bukan jam kerja aktif',
  'Hari ini + 7 hari sebelumnya',
])
  assert(
    staff.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(token),
    token,
  );
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#pendaftaran"'),
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#finance-rekonsiliasi"'),
);
await staff.route('manager-penawaran');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Buat penawaran/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-workflow="manager-offers"/,
);
await staff.route('waktu-kerja');
console.log(
  'PASS: Manager-only monitoring and offer navigation; Admin/Finance cannot open reports.',
);

await staff.update({
  profile,
  items: [signed],
  tasks: [
    {
      id: 'task-fixture',
      targetId: 'abc12345',
      stage: 'registration',
      role: 'admin',
      label: 'Pemeriksaan pendaftaran',
      memberName: '<script>unsafe</script>',
      receivedAt: '2026-09-21T00:00:00Z',
      startedAt: '2026-09-21T00:02:00Z',
      completedAt: '2026-09-21T00:07:00Z',
      startedBy: 'account',
      completedBy: 'account',
      responseSeconds: 120,
      processingSeconds: 300,
      status: 'completed',
    },
  ],
});
await new Promise((resolve) => setImmediate(resolve));
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /08\.00\.00/,
  'timestamps shown in WITA',
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /2 mnt 0 dtk/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /5 mnt 0 dtk/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /&lt;script&gt;unsafe&lt;\/script&gt;/,
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('<script>unsafe'),
);
console.log(
  'PASS: populated KPI report, WITA timestamps, duration rendering and escaped member data.',
);

const registrationUi = await harness();
await registrationUi.route('daftar');
assert.match(
  registrationUi.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /<input type="file" id="registration-ktp"[^>]*required/,
);
assert.match(
  registrationUi.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /JPG atau PNG/,
);
const renderIdentity = (profile) => {
  registrationUi.window.__portal.ui.render(
    registrationUi.document.querySelector('#dialog-content'),
    registrationUi.window.KsppsWorkflow.identityMedia(profile),
  );
  return registrationUi.document.querySelector('#dialog-content').innerHTML;
};
const identityHtml = renderIdentity({
  ...profile,
  signatureUrl: '/api/workflow/profile/signature',
  ktpUrl: '/api/workflow/profile/ktp',
  ktpCheckedAt: '2026-09-21T01:00:00Z',
});
assert(
  identityHtml.indexOf('class="wf-signature"') < identityHtml.indexOf('class="wf-ktp"'),
  'KTP follows signature in the two-column grid',
);
assert.equal(
  registrationUi.document.querySelector('.wf-ktp img').getAttribute('src'),
  '/api/workflow/profile/ktp?v=1',
);
assert.match(identityHtml, /Sudah diperiksa Admin/);
assert.match(identityHtml, /aria-label="Lihat foto KTP ukuran penuh"/);
assert.match(renderIdentity(profile), /Foto KTP belum diunggah/);
const responsiveCss = source('workflow.css');
assert.match(
  responsiveCss,
  /\.wf-identity-media\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/,
);
assert.match(
  responsiveCss,
  /@media\(max-width:540px\)\{\.wf-identity-media\{grid-template-columns:1fr;?\}/,
);
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.update({
  profile: {
    ...profile,
    status: 'pending',
    signatureUrl: '/api/workflow/profile/signature',
    ktpUrl: '/api/workflow/profile/ktp',
    finance: { status: 'approved' },
  },
  items: [],
});
await staff.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]'
        ? { dataset: { wfAction: 'registration-review', id: profile.id } }
        : null,
  },
});
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /name="ktp"/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Foto KTP terbaca dan sesuai data calon anggota/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /class="wf-identity-media"/,
);
assert(
  !staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('WAKTU KERJA'),
);
assert(
  !staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('Masuk ke antrean'),
);
console.log(
  'PASS: mandatory registration KTP input, signature-left/KTP-right layout, narrow-screen stacking, image links and Admin KTP verification control.',
);

// Both staff roles' correction notes must lead directly to a member action.
member.nodes['#portal-dialog'].close();
const needsFix = {
  ...pending,
  id: 'correction-capital',
  finance: {
    status: 'correction',
    note: 'Nominal tidak sesuai mutasi.',
    label: 'Perlu perbaikan',
    version: 2,
  },
  version: 3,
};
const savingsFix = {
  ...needsFix,
  id: 'correction-savings',
  kind: 'savings',
  amount: 120000,
  finance: {
    status: 'correction',
    note: 'Bukti simpanan kurang jelas.',
    label: 'Perlu perbaikan',
    version: 1,
  },
};
await member.route('ringkasan');
await member.update({
  profile: {
    ...profile,
    status: 'pending',
    finance: { status: 'correction', note: 'Periksa setoran pendaftaran.' },
    savings: { ...profile.savings, active: false },
  },
  items: [needsFix, savingsFix],
});
for (const text of [
  'Perbaiki pendaftaran',
  'Nominal tidak sesuai mutasi.',
  'Bukti simpanan kurang jelas.',
  'Periksa setoran pendaftaran.',
  'data-id="correction-capital"',
  'data-id="correction-savings"',
])
  assert(
    member.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(text),
    text,
  );
await member.route('modal');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Simpanan belum aktif/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('data-action="apply-capital"'),
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Perbaiki pengajuan/,
);
await member.route('pembiayaan');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Simpanan belum aktif/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('data-action="apply-finance"'),
);
await member.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]' ? { dataset: { wfAction: 'revise', id: needsFix.id } } : null,
  },
});
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Perbaiki penyertaan modal/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Nominal tidak sesuai mutasi/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-version="3"/,
);
member.nodes['#portal-dialog'].close();
await member.route('simpanan');
await member.update({ profile, items: [savingsFix] });
await member.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]' ? { dataset: { wfAction: 'revise', id: savingsFix.id } } : null,
  },
});
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /wf-savings-form/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Perbaiki setoran simpanan wajib/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /value="120000" selected/,
);
member.nodes['#portal-dialog'].close();
await member.route('simpanan');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Sisa simpanan wajib di muka/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Riwayat alokasi bulanan/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Segera setor simpanan wajib/,
);
const atThreshold = { ...profile, savings: { ...profile.savings, remaining: 30000, low: true } };
await member.update({ profile: atThreshold, items: [] });
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Sisa saldo di muka Rp30\.000/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Segera setor/,
);
await member.click({ action: 'notifications' });
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp30\.000/,
);
console.log(
  'PASS: actionable Admin/Finance notes, inactive service screens, accessible existing corrections, prefilled revision amount/version, reconciled savings view and low-balance notification.',
);

const openOffer = {
  id: 'offer-open',
  title: 'Pengadaan Barang Mitra',
  projectCode: 'MRBH-2026-09-01',
  quota: 1000000000,
  reserved: 800000000,
  remaining: 200000000,
};
const fullOffer = {
  ...openOffer,
  id: 'offer-full',
  projectCode: 'MRBH-2026-08-01',
  reserved: 1000000000,
  remaining: 0,
};
member.nodes['#portal-dialog'].close();
await member.route('ringkasan');
await member.update({ profile, items: [], offers: [openOffer, fullOffer] });
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-workflow="member-offers"/,
);
let cards = member
  .panel('member-offers')
  .innerHTML.replace(/<!--.*?-->/g, '')
  .replaceAll('&amp;', '&')
  .replace(/\s+/g, ' ');
assert.match(cards, /MRBH-2026-09-01/);
assert.match(cards, /MRBH-2026-08-01/);
assert.match(cards, /Rp200\.000\.000/);
assert.match(cards, /data-id="offer-full" disabled/);
// Expiration updates the visible cards even if an unrelated form remains open.
const originalNow = member.window.Date.now;
const originalSetTimeout = member.window.setTimeout;
let offerClock = originalNow(),
  expireOffer;
member.window.Date.now = () => offerClock;
member.window.setTimeout = (callback, delay, ...args) => {
  if (delay === 1000) {
    expireOffer = callback;
    return -1;
  }
  return originalSetTimeout(callback, delay, ...args);
};
const expiringOffer = {
  ...fullOffer,
  fulfilledAt: new Date(offerClock - 3 * 86400000 + 1000).toISOString(),
  memberVisibleUntil: new Date(offerClock + 1000).toISOString(),
};
await member.update({ profile, items: [], offers: [openOffer, expiringOffer] });
assert.match(member.panel('member-offers').innerHTML, /MRBH-2026-08-01/);
assert.equal(typeof expireOffer, 'function');
member.nodes['#portal-dialog'].showModal();
const dialogBeforeExpiry = member.nodes['#dialog-content'].innerHTML;
offerClock += 1000;
expireOffer();
assert.doesNotMatch(member.panel('member-offers').innerHTML, /MRBH-2026-08-01/);
assert.match(member.panel('member-offers').innerHTML, /MRBH-2026-09-01/);
assert(member.nodes['#portal-dialog'].open, 'expiry does not close an open form');
assert.equal(member.nodes['#dialog-content'].innerHTML, dialogBeforeExpiry);
member.nodes['#portal-dialog'].close();
member.window.Date.now = originalNow;
member.window.setTimeout = originalSetTimeout;
await member.update({ profile, items: [], offers: [openOffer, fullOffer] });
await member.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]' ? { dataset: { wfAction: 'capital', id: 'offer-open' } } : null,
  },
});
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-offer-id="offer-open"/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /max="200000000"/,
);
assert.match(
  member.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /MRBH-2026-09-01/,
);
member.nodes['#portal-dialog'].close();
await member.update({
  profile: { ...profile, savings: { ...profile.savings, active: false } },
  items: [],
  offers: [openOffer],
});
assert.match(
  member
    .panel('member-offers')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-id="offer-open" disabled/,
);
staff.nodes['#portal-dialog'].close();
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.route('manager-penawaran');
await staff.update({ profile, items: [], offers: [openOffer, fullOffer] });
const expiredOffer = {
  ...fullOffer,
  fulfilledAt: '2026-09-01T00:00:00Z',
  memberVisibleUntil: '2026-09-04T00:00:00Z',
};
await staff.update({ profile, items: [], offers: [openOffer, expiredOffer] });
assert.match(staff.panel('manager-offers').innerHTML, /MRBH-2026-08-01/);
assert.match(staff.panel('manager-offers').innerHTML, /Tidak ditampilkan di portal anggota/);
assert.match(
  staff
    .panel('manager-offers')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /MRBH-2026-09-01/,
);
await staff.document.emit('click', {
  target: {
    closest: (s) => (s === '[data-wf-action]' ? { dataset: { wfAction: 'new-offer' } } : null),
  },
});
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /name="projectCode"[^>]+required/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /name="quota"[^>]+required/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Buka penawaran/,
);
console.log(
  'PASS: offer codes and quotas on member/manager views, full/inactive disabled controls, offer-bound amount form and mandatory Manager project code.',
);

const onlyAdmin = await harness(true, 'admin');
await onlyAdmin.click({ action: 'enter', role: 'admin' });
assert(
  !onlyAdmin.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('id="staff-role"'),
);
assert.match(
  onlyAdmin.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Antrean pemeriksaan/,
);
const onlyFinance = await harness(true, 'finance');
await onlyFinance.click({ action: 'enter', role: 'finance' });
assert(
  !onlyFinance.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('id="staff-role"'),
);
assert(
  !onlyFinance.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#pendaftaran"'),
);
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.route('manager-laporan');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Laporan Koperasi/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-report-action="upload"/,
);
await staff.document.emit('click', {
  target: {
    closest: (s) => (s === '[data-report-action]' ? { dataset: { reportAction: 'upload' } } : null),
  },
});
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /id="report-upload"/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /accept=".pdf,application\/pdf"/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /name="period" type="month" required/,
);
member.nodes['#portal-dialog'].close();
await member.route('laporan');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Laporan Koperasi/,
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('data-report-action="upload"'),
);
assert(
  !member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('petugas.html'),
);
console.log(
  'PASS: account-restricted role picker, Manager report upload form, member report page without upload control, and member/staff entrance separation.',
);
// Maturity UI: persistent member prompt, one-way confirmation and new role screens.
member.nodes['#portal-dialog'].close();
const expiring = {
  ...signed,
  maturity: {
    needsDecision: true,
    endDate: '2026-09-30',
    opensAt: '2026-08-31',
    ended: false,
    status: 'Berjalan',
    decision: null,
  },
  projectCode: 'OLD',
  offerId: 'old-offer',
};
await member.route('ringkasan');
await member.update({
  profile: {
    ...profile,
    letter: {
      filename: 'SPA SKI-2026-0042 a.n ANGGOTA UJI.pdf',
      number: '0042/KSPPS-SKI/SPA/09/2026',
      effectiveDate: '2026-09-22',
      url: '/api/workflow/profile/letter',
    },
  },
  items: [expiring],
  offers: [openOffer],
});
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Konfirmasi kelanjutan modal/,
);
await member.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-maturity-action]'
        ? { dataset: { maturityAction: 'decide', id: signed.id } }
        : null,
  },
});
for (const term of [
  'Lanjut ke project baru',
  'Pengembalian modal',
  'tidak dapat diganti',
  'MRBH-2026-09-01',
  'tanpa tambahan masa tunggu 10 hari',
])
  assert(
    member.nodes['#dialog-content'].innerHTML
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(term),
    term,
  );
member.nodes['#portal-dialog'].close();
await member.route('dokumen');
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /SPA SKI-2026-0042 a.n ANGGOTA UJI/,
);
assert.match(
  member.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /profile\/letter\?download=1/,
);
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.route('pendaftaran');
await staff.update({
  profiles: [
    { ...profile, status: 'pending' },
    {
      ...profile,
      id: 'profile-second',
      memberNumber: 'SKI-2026-0043',
      status: 'pending',
      data: { ...profile.data, name: 'ANGGOTA KEDUA' },
    },
  ],
  items: [],
});
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /ANGGOTA UJI/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /ANGGOTA KEDUA/,
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('staff-search'),
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('staff-member'),
);
await staff.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]'
        ? { dataset: { wfAction: 'registration-review', id: 'profile-second' } }
        : null,
  },
});
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /ANGGOTA KEDUA/,
);
assert.match(
  staff.nodes['#dialog-content'].innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /data-id="profile-second"/,
);
staff.nodes['#portal-dialog'].close();
await staff.window.KsppsWorkflow.setStaffRole('finance');
await staff.route('finance-pengembalian');
await new Promise((resolve) => setImmediate(resolve));
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Pengembalian Modal/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Belum ada pengembalian modal/,
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('finance-search'),
);
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.route('manager-jatuh-tempo');
await new Promise((resolve) => setImmediate(resolve));
for (const term of ['Total akad berakhir', 'Lanjut', 'Pengembalian', 'Belum memilih'])
  assert(
    staff.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes(term),
  );
console.log(
  'PASS: H-30 member prompt, immutable-choice form, project choices, SPA download, aggregate Admin queue, exact selected registration, no name search, Finance returns and Manager maturity report.',
);
// Resignation retains the established page layout, with two Admin decisions.
const resign = {
  id: 'withdrawal-ui',
  kind: 'withdrawal',
  memberProfileId: profile.id,
  memberName: profile.data.name,
  memberId: profile.memberNumber,
  reason: 'Mengundurkan diri atas permintaan sendiri.',
  createdAt: '2026-09-23T02:00:00Z',
  updatedAt: '2026-09-23T02:00:00Z',
  version: 1,
  status: 'pending',
  statusLabel: 'Menunggu keputusan Admin',
};
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.route('pengunduran');
await staff.update({ profiles: [profile], items: [resign] });
assert.match(
  staff
    .panel('staff-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Menunggu keputusan Admin/,
);
await staff.document.emit('click', {
  target: {
    closest: (s) =>
      s === '[data-wf-action]' ? { dataset: { wfAction: 'review', id: resign.id } } : null,
  },
});
let resignationDialog = staff.nodes['#dialog-content'].innerHTML
  .replace(/<!--.*?-->/g, '')
  .replaceAll('&amp;', '&')
  .replace(/\s+/g, ' ');
for (const term of [
  'Mengundurkan diri atas permintaan sendiri.',
  'value="approve"',
  'value="reject"',
])
  assert(resignationDialog.includes(term), term);
for (const term of [
  'value="return"',
  'name="obligations"',
  'name="savings"',
  'Rekonsiliasi Finance',
])
  assert(!resignationDialog.includes(term), term);
member.nodes['#portal-dialog'].close();
await member.route('pengunduran');
await member.update({
  profile,
  items: [
    {
      ...resign,
      status: 'rejected',
      statusLabel: 'Ditolak',
      note: 'Alasan permohonan belum sesuai.',
    },
  ],
});
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Alasan penolakan/,
);
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Alasan permohonan belum sesuai/,
);
await member.update({
  profile,
  items: [{ ...resign, status: 'approved', statusLabel: 'Disetujui' }],
});
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Disetujui/,
);
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Keputusan Admin/,
);
console.log(
  'PASS: resignation Admin approve/reject controls, no correction/financial checklist, visible member decision and rejection reason.',
);

// New operational queues retain the existing portal shell and exact role actions.
const returned = {
  ...resign,
  id: 'withdrawal-paid',
  version: 3,
  status: 'manager_pending',
  statusLabel: 'Menunggu persetujuan final Manajer',
  memberNumber: profile.memberNumber,
  settlement: {
    amount: 100000,
    bankName: 'Bank Uji',
    bankAccount: '1234567890',
    accountName: profile.data.name,
    adminAt: '2026-09-23T01:00:00Z',
    paidAt: '2026-09-23T02:00:00Z',
    transferDate: '2026-09-23',
    reference: 'REF-001',
    proofUrl: '/api/workflow/withdrawals/withdrawal-paid/proof',
  },
};
const detailClick = (h, id) =>
  h.document.emit('click', {
    target: {
      closest: (s) =>
        s === '[data-resign-action]' ? { dataset: { resignAction: 'detail', id } } : null,
    },
  });
await staff.window.KsppsWorkflow.setStaffRole('finance');
await staff.update({
  profile: null,
  items: [],
  withdrawals: [
    {
      ...returned,
      version: 2,
      status: 'finance_pending',
      statusLabel: 'Menunggu pengembalian Finance',
      settlement: { ...returned.settlement, paidAt: null, proofUrl: null },
    },
  ],
});
await staff.route('finance-pengunduran');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Pengembalian Simpanan Pokok/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Rp100\.000/,
);
assert(
  !staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .includes('href="#manager-pengunduran"'),
);
await detailClick(staff, returned.id);
let transferDialog = staff.nodes['#dialog-content'].innerHTML
  .replace(/<!--.*?-->/g, '')
  .replaceAll('&amp;', '&')
  .replace(/\s+/g, ' ');
for (const t of [
  'resign-pay-form',
  'name="proof"',
  '1234567890',
  'Simpan pengembalian & kirim ke Manajer',
  'withdrawal-return',
])
  assert(transferDialog.includes(t), t);
assert(!transferDialog.includes('resign-close-form'));
staff.nodes['#portal-dialog'].close();
await staff.window.KsppsWorkflow.setStaffRole('manager');
await staff.update({ profile: null, items: [], withdrawals: [returned] });
await staff.route('manager-pengunduran');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Persetujuan Pengunduran Diri/,
);
await detailClick(staff, returned.id);
let finalDialog = staff.nodes['#dialog-content'].innerHTML
  .replace(/<!--.*?-->/g, '')
  .replaceAll('&amp;', '&')
  .replace(/\s+/g, ' ');
for (const t of [
  'resign-close-form',
  'Bukti pengembalian',
  'menonaktifkan nomor anggota secara permanen',
  'name="confirm"',
])
  assert(finalDialog.includes(t), t);
assert(!finalDialog.includes('resign-pay-form'));
await member.route('pengunduran');
await member.update({ profile, items: [returned] });
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Simpanan pokok dikembalikan/,
);
assert.match(
  member
    .panel('member-withdrawal')
    .innerHTML.replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Persetujuan final Manajer/,
);
await member.update({
  profile: { ...profile, status: 'closed', closedAt: '2026-09-23T03:00:00Z' },
  items: [{ ...returned, status: 'completed' }],
});
for (const route of ['ringkasan', 'modal', 'pembiayaan', 'daftar']) {
  await member.route(route);
  assert.match(
    member.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' '),
    /dinonaktifkan permanen/,
  );
  assert.match(
    member.app.innerHTML
      .replace(/<!--.*?-->/g, '')
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' '),
    /Daftar ulang sebagai anggota/,
  );
  assert(
    !member.app.innerHTML
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes('id="registration-form"'),
  );
  assert(
    !member.app.innerHTML
      .replaceAll('&amp;', '&')
      .replace(/\s+/g, ' ')
      .includes('data-action="apply-capital"'),
  );
}
await staff.window.KsppsWorkflow.setStaffRole('admin');
await staff.update({
  profiles: [profile],
  items: [],
  financing: [
    {
      id: 'fin-1',
      memberName: profile.data.name,
      memberNumber: profile.memberNumber,
      number: 'PB-001',
      purpose: 'Barang Mitra',
      amount: 1000000,
      status: 'Aktif',
      startDate: '2026-09-01',
      endDate: '2027-09-01',
    },
  ],
});
await staff.route('pengajuan');
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Kontrak Pembiayaan/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /PB-001/,
);
assert.match(
  staff.app.innerHTML
    .replace(/<!--.*?-->/g, '')
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' '),
  /Catat kontrak/,
);
console.log(
  'PASS: Finance refund form and proof, Manager final-only form, member progress timeline, closed membership blocks every service/registration view, and financing registry in Admin.',
);

for (const session of sessions) session.close();
