import assert from 'node:assert/strict';
import { browser } from './helpers/svelte-browser.mjs';

let networkCalls = 0;
const member = await browser('anggota', {
  fetch: async () => {
    networkCalls++;
    return {
      ok: false,
      status: 401,
      json: async () => ({ error: 'Masuk ke akun koperasi.', signInRequired: true }),
    };
  },
});
try {
  const form = member.document.getElementById('login-form');
  form.elements.email.value = 'anggota@example.test';
  form.elements.password.value = 'bukan-kredensial-asli';
  const before = networkCalls;
  form.dispatchEvent(new member.window.Event('submit', { bubbles: true, cancelable: true }));
  await member.settle();
  assert.equal(member.window.location.hash, '#masuk');
  assert.equal(member.window.__view.context.state.signedIn, false);
  assert.equal(member.document.getElementById('login-error').hidden, false);
  assert.match(
    member.document.getElementById('login-error').textContent,
    /Layanan masuk akun tidak tersedia/,
  );
  assert.equal(networkCalls, before, 'An unconfigured login must not send entered credentials');
  assert.equal(form.elements.email.value, 'anggota@example.test');
  assert.equal(form.elements.password.value, 'bukan-kredensial-asli');
} finally {
  member.close();
}
console.log(
  'PASS: entering credentials cannot create a local authenticated state or transmit them without a configured login.',
);
