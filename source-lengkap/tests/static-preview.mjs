import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';

let networkCalls = 0;
const offline = async () => {
  networkCalls++;
  throw new Error('Static previews must not contact a backend');
};
function assertServicePresentation(app) {
  const labels = [...app.document.querySelectorAll('[title], [aria-label], [alt], [placeholder]')]
    .flatMap((element) => ['title', 'aria-label', 'alt', 'placeholder'].map((key) => element.getAttribute(key) || ''));
  assert.doesNotMatch(
    [app.document.body.textContent, ...labels].join(' '),
    /pratinjau|prototipe|simulasi|\bdemo\b|portal konsep|rancangan portal|data contoh/i,
  );
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
]) {
  await member.route(route);
  assertServicePresentation(member);
}
const staff = await browser('petugas', { preview: true, fetch: offline });
assert.match(
  staff.document.body.textContent.replace(/\s+/g, ' '),
  /Pilih portal yang ingin dibuka/,
);
assertServicePresentation(staff);
await staff.click('[data-action="enter"][data-role="manager"]');
const pages = {
  manager: [
    'waktu-kerja',
    'manager-penawaran',
    'manager-laporan',
    'manager-akses',
    'manager-avalist',
    'manager-jatuh-tempo',
    'manager-pengunduran',
  ],
  finance: [
    'finance-ringkasan',
    'finance-rekonsiliasi',
    'finance-bagi-hasil',
    'finance-pengembalian',
    'finance-pengunduran',
    'finance-avalist',
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
  ],
};
for (const [role, routes] of Object.entries(pages)) {
  await staff.window.KsppsWorkflow.setStaffRole(role);
  for (const route of routes) {
    await staff.route(route);
    assert(staff.document.querySelector('h1'), route + ' must render');
    assertServicePresentation(staff);
  }
}
const avalist = await browser('avalist', { preview: true, fetch: offline });
for (const route of ['avalist-ringkasan', 'avalist-anggota', 'avalist-rincian', 'avalist-riwayat']) {
  await avalist.route(route);
  assertServicePresentation(avalist);
}
assert.equal(networkCalls, 0, 'All three previews are independent of authenticated APIs');
member.close();
staff.close();
avalist.close();
console.log(
  'PASS: same-source static member/staff/avalist pages, disabled data collection, blocked writes, and zero API requests.',
);
