import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';
import { calculateSavings } from '../backend/src/savings.js';

const profile = {
  id: 'profile-test',
  memberNumber: 'SKI-2026-0001',
  status: 'approved',
  version: 1,
  createdAt: '2026-09-21',
  data: { name: 'ANGGOTA UJI' },
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
  '2026-09-25',
);
let items = [],
  getCount = 0,
  postCount = 0,
  nextGet = null,
  nextPost = null,
  postFails = false,
  lastSubmission;
const fetch = async (url, options = {}) => {
  if (options.method === 'POST') {
    postCount++;
    lastSubmission = options.body;
    if (nextPost) {
      const wait = nextPost;
      nextPost = null;
      await wait;
    }
    if (postFails)
      return { ok: false, status: 503, json: async () => ({ error: 'Coba kirim kembali.' }) };
    assert.equal(url, '/api/workflow/capital');
    const item = {
      id: lastSubmission.get('id'),
      kind: 'capital',
      memberName: profile.data.name,
      amount: Number(lastSubmission.get('amount')),
      proofName: lastSubmission.get('proof').name,
      status: 'pending',
      statusLabel: 'Menunggu pemeriksaan',
      createdAt: '2026-09-25',
    };
    items = [item];
    return { ok: true, json: async () => ({ item }) };
  }
  if (url === '/api/workflow') {
    getCount++;
    if (nextGet) {
      const wait = nextGet;
      nextGet = null;
      await wait;
    }
    return {
      ok: true,
      json: async () => ({
        items,
        profile,
        offers: [
          {
            id: 'offer-test',
            title: 'Kebutuhan Mitra',
            projectCode: 'MRBH-2026-09-01',
            quota: 100000000,
            remaining: 100000000,
            reserved: 0,
          },
        ],
      }),
    };
  }
  return { ok: true, json: async () => ({ reports: [] }) };
};
const h = await browser('anggota', { fetch });
const { window, document } = h;
// JSDOM does not implement the operating-system file chooser. Supply its selected
// File to FormData while retaining the real DOM controls and submission listeners.
const NativeFormData = window.FormData;
window.FormData = class extends NativeFormData {
  constructor(form) {
    super(form);
    for (const input of form?.querySelectorAll('input[type=file]') || [])
      if (input.files?.[0]) this.set(input.name, input.files[0]);
  }
};
await h.click('[data-action="enter-portal"]');
await h.route('modal');
let releaseGet;
nextGet = new Promise((resolve) => (releaseGet = resolve));
window.dispatchEvent(new window.Event('focus'));
await h.click('[data-wf-action="capital"][data-id="offer-test"]');
const dialog = document.querySelector('#portal-dialog'),
  content = document.querySelector('#dialog-content'),
  form = document.querySelector('#wf-capital-form');
assert(dialog.open);
assert(form);
assert(content.textContent.includes(profile.memberNumber));
assert(!content.textContent.includes('profile-test'));
form.elements.amount.value = '17500000';
form.elements.signatureConsent.checked = true;
const proof = new window.File(['payment proof'], 'bukti.png', { type: 'image/png' });
Object.defineProperty(form.elements.proof, 'files', { value: [proof] });
// This validity hook only supplies the missing native file-picker state.
form.checkValidity = () => true;
const originalHTML = content.innerHTML;
releaseGet();
await h.settle();
assert(dialog.open);
assert.equal(document.querySelector('#wf-capital-form'), form);
assert.equal(content.innerHTML, originalHTML);
const before = getCount;
window.dispatchEvent(new window.Event('focus'));
window.dispatchEvent(new window.Event('focus'));
await h.settle();
assert.equal(getCount, before);
assert.equal(form.elements.amount.value, '17500000');
assert.equal(form.elements.proof.files[0], proof);
const submit = () =>
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
postFails = true;
submit();
await h.settle();
assert.equal(postCount, 1);
assert(dialog.open);
assert.equal(document.querySelector('#wf-capital-form'), form);
assert.equal(document.querySelector('#wf-error').hidden, false);
const requestId = lastSubmission.get('id');
postFails = false;
let releasePost;
nextPost = new Promise((resolve) => (releasePost = resolve));
submit();
await h.settle();
window.dispatchEvent(new window.Event('focus'));
window.__portal.events.dispatchEvent(
  new window.CustomEvent('kspps-profile-loaded', { detail: profile }),
);
await h.settle();
assert(dialog.open);
assert.equal(document.querySelector('#wf-capital-form'), form);
assert.equal(getCount, before);
releasePost();
await h.settle();
assert.equal(dialog.open, false);
assert.equal(lastSubmission.get('id'), requestId);
assert.equal(lastSubmission.get('offerId'), 'offer-test');
assert.equal(lastSubmission.get('amount'), '17500000');
assert.equal(lastSubmission.get('proof').name, 'bukti.png');
assert.equal(lastSubmission.get('signatureConsent'), 'true');
assert.match(
  document.querySelector('[data-workflow="member-capital"]').textContent,
  /Menunggu pemeriksaan/,
);
await h.click('[data-wf-action="capital"][data-id="offer-test"]');
assert(dialog.open);
await h.click('[data-wf-action="close"]');
assert.equal(dialog.open, false);
await h.click('[data-wf-action="capital"][data-id="offer-test"]');
await h.route('ringkasan');
assert.equal(dialog.open, false);
window.dispatchEvent(new window.Event('focus'));
await h.settle();
assert(getCount > before);
h.close();
console.log(
  'PASS: Svelte preserves draft amount, proof and consent across refresh, tab focus, failed submit and retry; deliberate navigation closes the dialog.',
);
