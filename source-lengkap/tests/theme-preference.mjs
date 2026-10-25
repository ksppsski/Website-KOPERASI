import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import {
  THEME_STORAGE_KEY,
  createThemeController,
  readThemePreference,
} from '../shared/lib/theme.js';
import { browser } from './helpers/svelte-browser.mjs';

function events() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) {
      listeners.get(name)?.delete(callback);
    },
    emit(name, event = {}) {
      for (const callback of listeners.get(name) || []) callback(event);
    },
    listenerCount(name) {
      return listeners.get(name)?.size || 0;
    },
  };
}

function environment({ saved = null, dark = false, denied = false, legacy = false } = {}) {
  const root = {
    style: {},
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  let value = saved;
  const storage = {
    getItem(key) {
      assert.equal(key, THEME_STORAGE_KEY);
      return value;
    },
    setItem(key, next) {
      assert.equal(key, THEME_STORAGE_KEY);
      value = next;
    },
  };
  const media = { ...events(), matches: dark };
  if (legacy) {
    const { addEventListener, removeEventListener } = media;
    media.addListener = (callback) => addEventListener('change', callback);
    media.removeListener = (callback) => removeEventListener('change', callback);
    delete media.addEventListener;
    delete media.removeEventListener;
  }
  const window = {
    ...events(),
    matchMedia(query) {
      assert.equal(query, '(prefers-color-scheme: dark)');
      return media;
    },
  };
  Object.defineProperty(window, 'localStorage', {
    get() {
      if (denied) throw new Error('Storage denied');
      return storage;
    },
  });
  const changes = [];
  return { window, root, media, storage, changes, stored: () => value };
}

function start(env) {
  return createThemeController({
    browser: env.window,
    root: env.root,
    onChange: (theme) => env.changes.push(theme),
  });
}

// System changes apply until the user chooses a theme, then manual choice wins.
const system = environment({ dark: true });
const control = start(system);
assert.equal(control.theme, 'dark');
assert.equal(system.root.style.colorScheme, 'dark');
assert.equal(system.stored(), null, 'following the system does not save a manual choice');
system.media.matches = false;
system.media.emit('change');
assert.equal(control.theme, 'light');
control.toggle();
assert.equal(system.stored(), 'dark');
assert.equal(control.theme, 'dark');
system.media.emit('change');
assert.equal(control.theme, 'dark', 'system changes cannot overwrite a manual theme');

// A saved choice survives the next page and storage events synchronize tabs.
const nextPage = environment({ saved: system.stored(), dark: false });
const nextControl = start(nextPage);
assert.equal(nextControl.theme, 'dark');
nextPage.window.emit('storage', {
  key: THEME_STORAGE_KEY,
  newValue: 'light',
  storageArea: nextPage.storage,
});
assert.equal(nextControl.theme, 'light');
nextPage.window.emit('storage', { key: 'unrelated', newValue: 'dark' });
assert.equal(nextControl.theme, 'light');
nextPage.window.emit('storage', {
  key: THEME_STORAGE_KEY,
  newValue: 'dark',
  storageArea: {},
});
assert.equal(nextControl.theme, 'light', 'session storage cannot change the theme');
nextPage.media.matches = true;
nextPage.window.emit('storage', { key: null, newValue: null });
assert.equal(nextControl.theme, 'dark', 'clearing preferences restores the system theme');

// Release both media and storage listeners, including older browser APIs.
for (const legacy of [false, true]) {
  const env = environment({ legacy });
  const instance = start(env);
  assert.equal(env.media.listenerCount('change'), 1);
  assert.equal(env.window.listenerCount('storage'), 1);
  const calls = env.changes.length;
  instance.dispose();
  instance.dispose();
  env.media.matches = true;
  env.media.emit('change');
  env.window.emit('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' });
  instance.toggle();
  assert.equal(env.media.listenerCount('change'), 0);
  assert.equal(env.window.listenerCount('storage'), 0);
  assert.equal(env.changes.length, calls);
}

const denied = environment({ denied: true, dark: true });
const deniedControl = start(denied);
deniedControl.toggle();
assert.equal(deniedControl.theme, 'light', 'storage restrictions do not disable the toggle');
denied.media.emit('change');
assert.equal(deniedControl.theme, 'light');
const full = environment();
full.storage.setItem = () => {
  throw new Error('Storage full');
};
const fullControl = start(full);
fullControl.toggle();
assert.equal(fullControl.theme, 'dark');
assert.equal(readThemePreference({ getItem: () => 'invalid' }), null);
assert.equal(
  readThemePreference({
    getItem: () => {
      throw new Error('Denied');
    },
  }),
  null,
);

// The synchronous bootstrap must choose the same first-paint theme as the control.
const bootstrap = await readFile(new URL('../public/theme-preference.js', import.meta.url), 'utf8');
for (const options of [
  { saved: 'light', dark: true },
  { saved: 'dark', dark: false },
  { saved: 'invalid', dark: true },
  { denied: true, dark: true },
]) {
  const env = environment(options);
  vm.runInNewContext(bootstrap, {
    window: env.window,
    document: { documentElement: env.root },
  });
  const firstPaint = env.root.attributes['data-theme'];
  const instance = start(env);
  assert.equal(instance.theme, firstPaint);
  instance.dispose();
}
const basic = environment();
delete basic.window.matchMedia;
vm.runInNewContext(bootstrap, {
  window: basic.window,
  document: { documentElement: basic.root },
});
assert.equal(basic.root.attributes['data-theme'], 'light');

// All four entry points have the control; changing it preserves a filled form.
for (const entry of ['index', 'anggota', 'petugas', 'avalist']) {
  const h = await browser(entry);
  assert.equal(h.document.querySelectorAll('.theme-toggle').length, 1, entry);
  await h.click('.theme-toggle');
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark', entry);
  assert.equal(h.window.localStorage.getItem(THEME_STORAGE_KEY), 'dark', entry);
  assert.equal(h.document.querySelector('.theme-toggle').getAttribute('aria-label'), 'Aktifkan mode terang');
  await h.click('.theme-toggle');
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'light', entry);
  if (entry === 'anggota') {
    const input = h.document.querySelector('#login-form input[name=email]');
    input.value = 'contoh@kspps.test';
    const hash = h.window.location.hash;
    await h.click('.theme-toggle');
    assert.equal(h.document.querySelector('#login-form input[name=email]'), input);
    assert.equal(input.value, 'contoh@kspps.test');
    assert.equal(h.window.location.hash, hash);
    await h.route('daftar');
    assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(h.document.querySelectorAll('.theme-toggle').length, 1);
  }
  h.close();
}

for (const instance of [control, nextControl, deniedControl, fullControl]) instance.dispose();
console.log('PASS: shared theme, system fallback, persistence, tab sync, cleanup, first paint and form preservation.');
