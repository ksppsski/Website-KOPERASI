import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';
const calls = [];
let state = 'anonymous',
  fail = false;
const own = {
  personal: true,
  feeSummary: {
    asOf: '2026-09-25',
    total: 300000,
    paid: 200000,
    pending: 100000,
    scheduledDue: 100000,
    pendingAdjustments: 0,
  },
  monthlyFees: [
    {
      month: '2026-10',
      total: 150000,
      paid: 0,
      pending: 150000,
      paidForPeriod: 0,
      notDueYet: 150000,
    },
    {
      month: '2026-09',
      total: 100000,
      paid: 200000,
      pending: 100000,
      paidForPeriod: 0,
      notDueYet: 0,
    },
    { month: '2026-08', total: 200000, paid: 0, pending: 0, paidForPeriod: 200000, notDueYet: 0 },
    {
      month: '2025-12',
      total: 500000,
      paid: 500000,
      pending: 0,
      paidForPeriod: 500000,
      notDueYet: 0,
    },
  ],
  today: '2026-09-25',
  person: {
    name: 'AVALIST SATU',
    email: 'avalist@example.test',
    active: true,
    bankName: '',
    bankAccount: '',
    accountName: '',
  },
  members: [{ name: 'ANGGOTA REFERENSI', number: 'SKI-123' }],
  items: [
    {
      memberName: 'ANGGOTA REFERENSI',
      contractNumber: 'SPK-123',
      date: '2026-09-25',
      period: 1,
      amount: 100000,
      rate: 1,
      status: 'pending',
    },
  ],
  history: [
    {
      id: 'paid',
      kind: 'regular',
      status: 'paid',
      amount: 200000,
      date: '2026-08-25',
      transferDate: '2026-09-25',
      reference: 'TRANSFER-123',
      detail: { memberName: 'ANGGOTA REFERENSI', contractNumber: 'SPK-123' },
      proofUrl: '/api/workflow/avalist/payments/paid/proof',
    },
  ],
};
const fetch = async (url, options = {}) => {
  calls.push({ url, options });
  assert(!options.method || options.method === 'GET', 'The personal portal makes no mutations');
  assert.equal(options.headers['X-KSPPS-Portal'], 'avalist');
  assert(!url.includes('/staff'), 'The personal portal never loads staff APIs');
  if (fail) throw new Error('Koneksi terputus');
  const status = state === 'anonymous' ? 401 : 200;
  const data =
    status === 401
      ? { error: 'Masuk dahulu' }
      : url.endsWith('/access')
        ? {
            identity: { name: 'AVALIST SATU', email: 'avalist@example.test' },
            allowed: state === 'allowed',
          }
        : own;
  return { ok: status === 200, status, json: async () => structuredClone(data) };
};
const s = await browser('avalist', { fetch, hash: 'avalist-riwayat' });
assert.match(s.document.title, /Portal Avalist/);
assert.match(s.document.querySelector('h1').textContent, /Portal Avalist/);
const login = s.document.querySelector('a[href^="/signin-with-chatgpt"]');
assert.equal(new URL(login.href).searchParams.get('return_to'), '/avalist.html');
assert.equal(login.target, '_top');
assert(!s.document.body.textContent.includes('Portal Petugas'));
assert(!s.document.querySelector('#staff-role'));
state = 'denied';
s.window.dispatchEvent(new s.window.Event('focus'));
await s.settle();
assert.match(s.document.body.textContent, /Akses Avalist belum tersedia/);
assert.match(s.document.body.textContent, /avalist@example.test/);
assert.equal(
  s.document.querySelector('a[href^="/signout-with-chatgpt"]').getAttribute('href'),
  '/signout-with-chatgpt?return_to=/avalist.html',
);
assert(
  !calls.some((c) => c.url.includes('view=personal')),
  'Denied users cannot load personal data',
);
state = 'allowed';
await s.click('button.btn');
assert.match(s.document.querySelector('h1').textContent, /Riwayat Pembayaran/);
assert.match(s.document.body.textContent, /TRANSFER-123/);
assert.equal(
  s.document.querySelector('a[href$="/paid/proof"]').getAttribute('href'),
  '/api/workflow/avalist/payments/paid/proof',
);
assert.equal(s.document.querySelectorAll('.side-nav a').length, 4);
assert(!s.document.querySelector('form, #staff-role, [data-action="enter"]'));
assert(!s.document.body.textContent.includes('Portal Petugas'));
assert(!s.document.body.textContent.includes('Catat transfer'));
await s.route('avalist-ringkasan');
assert.match(s.document.body.textContent, /Rp100.000/);
assert.match(s.document.body.textContent, /Rp200.000/);
assert.match(s.document.querySelector('.av-fee-total').textContent, /Total fee diperoleh/);
assert.match(s.document.querySelector('.av-fee-total strong').textContent, /Rp300.000/);
assert.match(s.document.querySelector('.av-fee-total').textContent, /25 September 2026/);
assert.match(
  s.document.querySelector('.av-fee-total').textContent,
  /periode mendatang belum dihitung/,
);
assert.match(s.document.body.textContent, /Fee belum dibayarkan/);
const monthlyRegion = () => s.document.querySelector('.av-monthly');
const selectMonth = () => s.document.querySelectorAll('.av-month-controls select')[0];
const selectYear = () => s.document.querySelectorAll('.av-month-controls select')[1];
async function choose(select, value) {
  select.value = value;
  select.dispatchEvent(new s.window.Event('change', { bubbles: true }));
  await s.settle();
}
assert.equal(selectMonth().value, '09');
assert.equal(selectYear().value, '2026');
assert.match(monthlyRegion().textContent, /Total fee bulan ini/);
assert.match(monthlyRegion().textContent, /Fee sudah dibayar bulan ini/);
assert.equal(s.document.querySelector('.av-month-total strong').textContent, 'Rp100.000');
assert.equal(s.document.querySelector('.av-month-paid strong').textContent, 'Rp200.000');
assert.equal(
  s.document.querySelector('.av-month-pending strong').textContent,
  'Rp100.000',
  'An older fee paid this month must not reduce current-month pending entitlement',
);
assert(!s.document.querySelector('.av-cumulative').open);
await choose(selectMonth(), '08');
assert.match(monthlyRegion().textContent, /Agustus 2026/);
assert.equal(s.document.querySelector('.av-month-total strong').textContent, 'Rp200.000');
assert.equal(s.document.querySelector('.av-month-paid strong').textContent, 'Rp0');
await s.click('.page-heading button');
assert.equal(selectMonth().value, '08', 'A refresh retains the selected fee month');
await s.route('avalist-riwayat');
await s.route('avalist-ringkasan');
assert.equal(selectMonth().value, '08', 'Navigation retains the selected fee month');
await choose(selectYear(), '2025');
await choose(selectMonth(), '12');
assert.equal(s.document.querySelector('.av-month-total strong').textContent, 'Rp500.000');
await choose(selectMonth(), '01');
assert.equal(
  s.document.querySelector('.av-month-total strong').textContent,
  'Rp0',
  'An empty month displays zero',
);
await choose(selectYear(), '2026');
await choose(selectMonth(), '10');
assert.match(monthlyRegion().textContent, /Belum jatuh tempo: Rp150.000/);
await choose(selectMonth(), '09');

own.feeSummary = { ...own.feeSummary, total: 150000, pending: -50000, pendingAdjustments: -150000 };
await s.click('.page-heading button');
assert.match(s.document.querySelector('.av-fee-total strong').textContent, /Rp150.000/);
assert.match(
  s.document.querySelector('.av-cumulative-metrics').textContent,
  /Fee perlu dikembalikan/,
);
assert.match(s.document.querySelector('.av-cumulative-metrics').textContent, /Rp50.000/);

assert.match(s.document.body.textContent, /Rekening belum lengkap/);
await s.route('avalist-anggota');
assert.match(s.document.body.textContent, /ANGGOTA REFERENSI/);
await s.route('avalist-rincian');
assert.match(s.document.body.textContent, /SPK-123/);
assert.match(s.document.body.textContent, /Terjadwal/);
await s.click('.skip-link');
assert.equal(s.window.location.hash, '#avalist-rincian');
assert.equal(s.document.activeElement.id, 'page-main');
await s.click('#avalist-menu-toggle');
assert.equal(
  s.document.querySelector('#avalist-menu-toggle').getAttribute('aria-expanded'),
  'true',
);
assert(s.document.querySelector('#avalist-sidebar').classList.contains('open'));
s.window.dispatchEvent(new s.window.KeyboardEvent('keydown', { key: 'Escape' }));
await s.settle();
assert.equal(
  s.document.querySelector('#avalist-menu-toggle').getAttribute('aria-expanded'),
  'false',
);
await s.route('manager-avalist');
assert.equal(s.window.location.hash, '#avalist-ringkasan');
assert(!s.document.body.textContent.includes('Pengelolaan Avalist'));
// Revocation clears the old private view, including history and member names.
state = 'denied';
s.window.dispatchEvent(new s.window.Event('focus'));
await s.settle();
assert(!s.document.body.textContent.includes('ANGGOTA REFERENSI'));
assert(!s.document.querySelector('.side-nav'));
state = 'allowed';
fail = true;
await s.click('button.btn');
assert.match(s.document.body.textContent, /Koneksi terputus/);
fail = false;
await s.click('button.btn');
assert(s.document.querySelector('.side-nav'));
state = 'anonymous';
s.window.dispatchEvent(new s.window.Event('focus'));
await s.settle();
assert(s.document.querySelector('a[href^="/signin-with-chatgpt"]'));
assert(!s.document.querySelector('.side-nav'));
s.close();
console.log(
  'Avalist portal: separate entry/bundle, sign-in/out targets, registered-only access, four private pages, mobile navigation, old-data clearing, retries and no staff APIs passed.',
);
