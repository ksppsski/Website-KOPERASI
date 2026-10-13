import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';
const h = await browser('index');
const { document, window } = h;
assert.deepEqual(
  [...document.querySelector('main').children].map((node) => node.id || node.className),
  ['ski-beranda', 'ski-values ski-wrap', 'ski-layanan', 'ski-bergabung', 'ski-tentang'],
);
const card = document.querySelector('.ski-membership');
const panel = document.querySelector('#ski-portal-preview');
const preview = panel || document.querySelector('.ski-access');
assert.equal(card.getAttribute('aria-expanded'), 'false');
assert.equal(preview.getAttribute('aria-hidden'), 'true');
assert.equal(preview.inert, true);
await h.click('.ski-membership');
assert.equal(card.getAttribute('aria-expanded'), 'true');
assert(document.querySelector('.ski-art').classList.contains('is-open'));
assert.equal(preview.getAttribute('aria-hidden'), 'false');
assert.equal(preview.inert, false);
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
await h.settle();
assert.equal(card.getAttribute('aria-expanded'), 'false');
assert.equal(document.activeElement, card);
await h.click('[data-ski-product="penyertaan-modal"]');
assert.equal(document.querySelector('#ski-product-detail').hidden, false);
assert.equal(
  document.querySelector('[data-ski-product="penyertaan-modal"]').getAttribute('aria-pressed'),
  'true',
);
assert.match(
  document.querySelector('#ski-product-detail').textContent,
  /Pengadaan kebutuhan barang Mitra/,
);
await h.click('[data-ski-product="simpanan"]');
assert.equal(
  document.querySelector('[data-ski-product="penyertaan-modal"]').getAttribute('aria-pressed'),
  'false',
);
await h.click('.ski-menu-button');
assert.equal(document.querySelector('.ski-menu-button').getAttribute('aria-expanded'), 'true');
assert(document.querySelector('.ski-nav').classList.contains('ski-open'));
await h.click('[data-ski-dialog="contact"]');
assert.equal(document.querySelector('.ski-overlay').hidden, false);
assert.equal(document.activeElement, document.querySelector('.ski-close'));
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
await h.settle();
assert.equal(document.querySelector('.ski-overlay').hidden, true);
assert.equal(document.querySelectorAll('a[href*="petugas"]').length, 0);
h.close();
console.log(
  'PASS: full landing structure, card motion state, keyboard close, product selection, mobile menu and contact dialog.',
);
