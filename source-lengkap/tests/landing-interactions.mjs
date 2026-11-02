import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';

let requests = 0;
const h = await browser('index', {
  preview: true,
  fetch: async () => {
    requests++;
    throw new Error('The public landing page must not request private portal data');
  },
});
const { document, window } = h;
const text = (node) => {
  const copy = node.cloneNode(true);
  for (const br of copy.querySelectorAll('br')) br.replaceWith(' ');
  return copy.textContent.replace(/\s+/g, ' ').trim();
};
const named = (selector, label, root = document) =>
  [...root.querySelectorAll(selector)].find((node) => text(node) === label);
const link = (label, root = document) => {
  const node = named('a', label, root);
  assert(node, 'Missing link: ' + label);
  return node;
};

assert.equal(document.querySelector('.static-preview-banner, .prototype-strip'), null);
assert.doesNotMatch(document.body.textContent, /pratinjau|prototipe|simulasi|\bdemo\b|konsep/i);
assert.equal(document.querySelectorAll('h1').length, 1);
assert.match(text(document.querySelector('h1')), /Langkah Baik,\s*Tumbuh Bersama\./);
assert.equal(document.querySelectorAll('.theme-toggle').length, 1);
assert.equal(document.querySelectorAll('a[href*="petugas"], a[href*="avalist"]').length, 0);

// The mockup becomes real headings, controls and cards, with only the photo rasterized.
const main = document.querySelector('main');
assert(main);
const headings = [...main.querySelectorAll('h2')].map(text);
assert.deepEqual(headings, ['Simpanan untuk setiap langkah.', 'Tentang KSPPS', 'Pertanyaan umum']);
assert.equal(document.querySelector('#ski-values, #ski-bergabung, .ski-values, .ski-join'), null);
const hero = document.querySelector('h1').closest('section');
assert(hero.querySelector('img'), 'The building is a separate visual asset');
assert.match(hero.textContent, /Ruang Anggota/);
assert.match(hero.textContent, /Simpanan dan akad, lebih mudah dipantau\./);
assert.equal(
  hero.querySelector('a[aria-label*="Ruang Anggota"]').getAttribute('href'),
  'anggota.html#masuk',
);
assert.equal(link('Daftar Anggota', hero).getAttribute('href'), 'anggota.html#daftar');
const discover = link('Kenali Layanan', hero);
assert.match(discover.getAttribute('href'), /^#/);
assert(document.querySelector(discover.getAttribute('href')));

const header = document.querySelector('header');
assert.equal(link('Portal Anggota', header).getAttribute('href'), 'anggota.html#masuk');
const nav = document.querySelector('nav[aria-label="Navigasi utama"]');
assert(nav);
for (const label of ['Beranda', 'Tentang Kami', 'Layanan', 'Informasi']) {
  const target = link(label, nav).getAttribute('href');
  assert.match(target, /^#/);
  assert(document.querySelector(target), 'Navigation target exists: ' + target);
}

const services = named('h2', 'Simpanan untuk setiap langkah.').closest('section');
const cards = [...services.querySelectorAll('article')];
assert.equal(cards.length, 3);
assert.deepEqual(
  cards.map((card) => text(card.querySelector('h3'))),
  ['Simpanan Pokok dan Wajib', 'Simpanan Mudharabah', 'Simpanan Wadiah Yadh Dhamanah'],
);
assert.equal(link('Pelajari lebih lanjut', cards[0]).getAttribute('href'), 'anggota.html#simpanan');
assert.equal(link('Pelajari lebih lanjut', cards[1]).getAttribute('href'), 'anggota.html#modal');
assert(
  named('[data-ski-dialog="contact"]', 'Pelajari lebih lanjut', cards[2]),
  'Wadiah information uses the existing admin contact, without inventing a portal feature',
);

// Each native disclosure starts closed and opens/closes by activating its summary.
const faq = named('h2', 'Pertanyaan umum').closest('section');
const questions = [...faq.querySelectorAll('details')];
assert.equal(questions.length, 3);
assert.deepEqual(
  questions.map((details) => text(details.querySelector('summary'))),
  [
    'Bagaimana cara menjadi anggota?',
    'Apa perbedaan jenis simpanan?',
    'Di mana saya bisa melihat dokumen akad?',
  ],
);
for (const details of questions) {
  assert.equal(details.open, false);
  const summary = details.querySelector('summary');
  assert(details.querySelector('p')?.textContent.trim(), 'Each answer has real text');
  summary.click();
  await h.settle();
  assert.equal(details.open, true, text(summary));
  summary.click();
  await h.settle();
  assert.equal(details.open, false, text(summary));
}

const menu = document.querySelector('button[aria-label="Buka menu"]');
assert(menu);
assert.equal(menu.getAttribute('aria-expanded'), 'false');
menu.click();
await h.settle();
assert.equal(menu.getAttribute('aria-expanded'), 'true');
link('Layanan', nav).click();
await h.settle();
assert.equal(
  menu.getAttribute('aria-expanded'),
  'false',
  'Selecting a destination closes mobile navigation',
);
menu.click();
await h.settle();
window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
await h.settle();
assert.equal(menu.getAttribute('aria-expanded'), 'false', 'Escape closes mobile navigation');

// Contact opens from the service card and footer, preserves focus, and closes safely.
const overlay = document.querySelector('.ski-overlay');
assert(overlay.hidden);
const contactActions = [
  cards[2].querySelector('[data-ski-dialog="contact"]'),
  named('[data-ski-dialog="contact"]', 'Hubungi Admin', document.querySelector('footer')),
];
for (const action of contactActions) {
  assert(action);
  action.focus();
  const click = new window.MouseEvent('click', { bubbles: true, cancelable: true });
  action.dispatchEvent(click);
  await h.settle();
  if (action.tagName === 'A')
    assert(
      click.defaultPrevented,
      'The contact link opens the dialog without opening a mail client',
    );
  assert.equal(overlay.hidden, false);
  const close = document.querySelector('.ski-close');
  assert.equal(document.activeElement, close);
  assert.equal(document.querySelector('[role="dialog"]').getAttribute('aria-modal'), 'true');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
  await h.settle();
  assert.equal(overlay.hidden, true);
  assert.equal(document.activeElement, action);
}
contactActions[1].click();
await h.settle();
document.querySelector('.ski-dialog').click();
await h.settle();
assert.equal(overlay.hidden, false, 'Clicking inside the contact dialog keeps it open');
overlay.click();
await h.settle();
assert.equal(overlay.hidden, true);
assert.equal(document.activeElement, contactActions[1]);
assert.equal(requests, 0, 'The landing page does not load private data or collect personal data');
h.close();
console.log(
  'PASS: mockup landing, real portal links, three service cards, native FAQ disclosures, mobile navigation, accessible contact dialog, shared theme and zero private API calls.',
);
