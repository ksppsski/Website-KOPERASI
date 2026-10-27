import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';

let networkCalls = 0;
const offline = async () => {
  networkCalls++;
  throw new Error('Static previews must not contact a backend');
};
function assertServicePresentation(app) {
  const labels = [
    ...app.document.querySelectorAll('[title], [aria-label], [alt], [placeholder]'),
  ].flatMap((element) =>
    ['title', 'aria-label', 'alt', 'placeholder'].map((key) => element.getAttribute(key) || ''),
  );
  assert.doesNotMatch(
    [app.document.body.textContent, ...labels].join(' '),
    /pratinjau|prototipe|simulasi|\bdemo\b|portal konsep|rancangan portal|data contoh|chatgpt/i,
  );
  for (const link of app.document.querySelectorAll('a[href]'))
    assert.doesNotMatch(link.getAttribute('href'), /chatgpt/i);
  assert.equal(app.document.querySelector('.static-preview-banner, .prototype-strip'), null);
}
const member = await browser('anggota', { preview: true, fetch: offline });
assertServicePresentation(member);
await member.route('daftar');
for (const step of [1, 2, 3, 4]) {
  assert.equal(member.window.__view.context.state.registrationStep, step);
  for (const input of member.document.querySelectorAll('form input, form select, form textarea')) {
    assert(input.disabled, `${input.name || input.id} must not collect personal data`);
  }
  if (step < 4) await member.click('#registration-form .form-actions button.btn:not(.secondary)');
}
assert(
  member.document.querySelector('#registration-form .form-actions button.btn:not(.secondary)')
    .disabled,
);
await assert.rejects(
  member.window.KsppsWorkflow.api('/profile', { method: 'POST', body: '{}' }),
  /Penyimpanan, unggahan, dan layanan akun tidak tersedia pada alamat ini/,
);
await member.route('masuk');
await member.click('[data-action="enter-portal"]');
for (const route of [
  'ringkasan',
  'simpanan',
  'modal',
  'pembiayaan',
  'dokumen',
  'laporan',
  'profil',
  'pengunduran',
  'bantuan',
]) {
  await member.route(route);
  assertServicePresentation(member);
}
const complaintForm = member.document.querySelector('.complaint-create form');
assert(complaintForm, 'Bantuan includes the complaint form');
for (const input of complaintForm.querySelectorAll('input,textarea,button[type="submit"]'))
  assert(
    input.matches(':disabled'),
    `${input.name || input.textContent} must not collect complaint data`,
  );
complaintForm.dispatchEvent(new member.window.Event('submit', { bubbles: true, cancelable: true }));
await member.settle();
assert(
  !member.document.querySelector('.complaint-notice--success'),
  'A disabled form never claims a complaint was sent',
);
assert(!member.document.querySelector('.complaint-notice--error'));
await assert.rejects(
  member.window.KsppsWorkflow.api('/complaints', { method: 'POST', body: '{}' }),
  /Penyimpanan, unggahan, dan layanan akun tidak tersedia pada alamat ini/,
);
const staff = await browser('petugas', { preview: true, fetch: offline });
assert.match(
  staff.document.body.textContent.replace(/\s+/g, ' '),
  /Pilih portal yang ingin dibuka/,
);
assertServicePresentation(staff);
assert.equal(
  staff.document
    .querySelector('[data-action="enter"][data-role="customer_relation"]')
    .textContent.trim(),
  'Buka portal Customer Relation',
);
await staff.click('[data-action="enter"][data-role="manager"]');
assert.equal(
  staff.document.querySelector('#staff-role option[value="customer_relation"]').textContent,
  'Customer Relation',
);
const pages = {
  manager: [
    'waktu-kerja',
    'manager-penawaran',
    'manager-laporan',
    'manager-akses',
    'manager-avalist',
    'manager-jatuh-tempo',
    'manager-pengunduran',
    'keluhan',
  ],
  finance: [
    'finance-ringkasan',
    'finance-rekonsiliasi',
    'finance-bagi-hasil',
    'finance-pengembalian',
    'finance-pengunduran',
    'finance-avalist',
    'keluhan',
  ],
  admin: [
    'ringkasan',
    'pendaftaran',
    'setoran',
    'penyertaan',
    'pengunduran',
    'pengajuan',
    'anggota',
    'akad',
    'admin-avalist',
    'keluhan',
  ],
  customer_relation: ['keluhan'],
};
for (const [role, routes] of Object.entries(pages)) {
  await staff.window.KsppsWorkflow.setStaffRole(role);
  for (const route of routes) {
    await staff.route(route);
    assert(staff.document.querySelector('h1'), route + ' must render');
    assertServicePresentation(staff);
    if (route === 'keluhan') {
      assert.equal(staff.document.querySelector('h1').textContent, 'Keluhan Anggota');
      assert(
        staff.document.querySelector('a[href="#keluhan"]'),
        role + ' can view the complaint menu',
      );
      assert.match(
        staff.document.querySelector('.complaint-list').textContent,
        /Belum ada keluhan/,
      );
      assert(!staff.document.querySelector('.complaint-notice--error'));
      assert(
        !staff.document.querySelector('.complaint-create'),
        'Staff do not submit member complaints',
      );
      assert(
        !staff.document.querySelector('.complaints form'),
        'Empty staff Pages offer no case mutations',
      );
      if (role === 'customer_relation') {
        assert.deepEqual(
          [...staff.document.querySelectorAll('.side-nav a')].map((link) =>
            link.getAttribute('href'),
          ),
          ['#keluhan'],
        );
        await assert.rejects(
          staff.window.KsppsWorkflow.api('/complaints/11111111-1111-4111-8111-111111111111/reply', {
            method: 'POST',
            body: JSON.stringify({ version: 1, message: 'Tidak dikirim.' }),
          }),
          /Penyimpanan, unggahan, dan layanan akun tidak tersedia pada alamat ini/,
        );
      }
    }
  }
}
const avalist = await browser('avalist', { preview: true, fetch: offline });
for (const route of [
  'avalist-ringkasan',
  'avalist-anggota',
  'avalist-rincian',
  'avalist-riwayat',
]) {
  await avalist.route(route);
  assertServicePresentation(avalist);
  assert(
    !avalist.document.querySelector('a[href="#keluhan"]'),
    'Avalist has no complaint-management menu',
  );
}
assert.equal(networkCalls, 0, 'All three previews are independent of authenticated APIs');
member.close();
staff.close();
avalist.close();
console.log(
  'PASS: same-source static member/staff/avalist pages, disabled data collection, blocked writes, and zero API requests.',
);
