import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { landingScrollMotion } from '../frontend-user/src/motion/landing-scroll-motion.js';

const landingCss = readFileSync('frontend-user/src/styles/landing.css', 'utf8');
const startCss = landingCss.indexOf("#ski-web[data-scroll-motion='active'] [data-scroll-reveal]");
assert(startCss >= 0, 'Landing reveal styles exist');
const motionCss = landingCss.slice(startCss, landingCss.indexOf('@media print', startCss));

function environment({ reduced = false, observer = true } = {}) {
  const dom = new JSDOM(
    `<!doctype html><style>${motionCss}</style>
    <main id="ski-web" style="--unrelated-value: keep">
      <section class="ski-hero">
        <div class="ski-hero-content"><p>Cooperative</p><h1>Title</h1><a href="#services">Join</a></div>
        <div class="ski-hero-visual"><div class="ski-building-scene">
          <img class="ski-building-photo" alt="3D building">
          <svg><image href="assets/kspps-logo-color-hd.png"></image></svg>
        </div></div>
        <a class="ski-member-preview" href="#members">Members</a>
      </section>
      <section id="services">
        <div class="ski-section-heading"><h2>Services</h2><p>Choose</p></div>
        <article class="ski-product" style="transform: rotate(1deg)"><a href="#one">First service</a></article>
        <article class="ski-product"><a href="#two">Second service</a></article>
        <article class="ski-product"><a href="#three">Third service</a></article>
        <p class="ski-products-tagline">Together</p>
      </section>
      <section class="ski-about-inner"><h2>About</h2><p>Cooperative information</p></section>
      <section class="ski-faq-section"><h2>Questions</h2><div class="ski-faq-list">
        <details><summary>One</summary><p>Answer</p></details>
        <details><summary>Two</summary><p>Answer</p></details>
        <details><summary>Three</summary><p>Answer</p></details>
      </div></section>
      <footer class="ski-footer-inner"><p>Brand</p><a href="#contact">Contact</a></footer>
    </main>`,
    { pretendToBeVisual: true, url: 'https://kspps.example/' },
  );
  const view = dom.window;
  const root = view.document.querySelector('#ski-web');
  Object.defineProperty(view, 'innerHeight', { value: 800, configurable: true });
  const geometry = new Map();
  const bounds = (top, height = 80) => ({
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 400,
    width: 400,
    x: 0,
    y: top,
  });
  const place = (element, top, height) => geometry.set(element, bounds(top, height));
  for (const element of root.querySelectorAll('*')) {
    place(element, 1200);
    element.getBoundingClientRect = () => geometry.get(element);
  }
  const hero = root.querySelector('.ski-hero');
  const photo = root.querySelector('.ski-hero-visual');
  place(hero, 0, 600);
  place(photo, 0, 500);
  for (const [index, element] of [...root.querySelector('.ski-hero-content').children].entries())
    place(element, 40 + index * 100);
  place(root.querySelector('.ski-member-preview'), 400);

  const listeners = new Map();
  const registrations = [];
  const originalAdd = view.addEventListener.bind(view);
  const originalRemove = view.removeEventListener.bind(view);
  view.addEventListener = (type, callback, options) => {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(callback);
    registrations.push({ type, options });
    originalAdd(type, callback, options);
  };
  view.removeEventListener = (type, callback, options) => {
    listeners.get(type)?.delete(callback);
    originalRemove(type, callback, options);
  };
  const count = (type) => listeners.get(type)?.size || 0;
  const mediaListeners = new Set();
  const media = {
    matches: reduced,
    addEventListener(type, callback) {
      assert.equal(type, 'change');
      mediaListeners.add(callback);
    },
    removeEventListener(type, callback) {
      assert.equal(type, 'change');
      mediaListeners.delete(callback);
    },
  };
  view.matchMedia = (query) => {
    assert.equal(query, '(prefers-reduced-motion: reduce)');
    return media;
  };
  const observers = [];
  if (observer)
    view.IntersectionObserver = class {
      observed = new Set();
      disconnected = false;
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe(target) {
        this.observed.add(target);
      }
      disconnect() {
        this.observed.clear();
        this.disconnected = true;
      }
      emit(entries) {
        this.callback(entries);
      }
    };
  const frames = new Map();
  let requested = 0;
  let cancelled = 0;
  view.requestAnimationFrame = (callback) => {
    const id = ++requested;
    frames.set(id, callback);
    return id;
  };
  view.cancelAnimationFrame = (id) => {
    cancelled++;
    frames.delete(id);
  };
  return {
    root,
    view,
    hero,
    photo,
    place,
    bounds,
    observers,
    frames,
    count,
    registrations,
    mediaListeners,
    requested: () => requested,
    cancelled: () => cancelled,
    preference(value) {
      media.matches = value;
      for (const callback of [...mediaListeners]) callback({ matches: value });
    },
    flush() {
      const current = [...frames.values()];
      frames.clear();
      for (const callback of current) callback(0);
    },
    close() {
      view.close();
    },
  };
}

const env = environment();
const action = landingScrollMotion(env.root);
const firstScreen = env.root.querySelector('h1');
const cards = [...env.root.querySelectorAll('.ski-product')];
const card = cards[0];
assert.equal(env.root.dataset.scrollMotion, 'active');
const scene = env.root.querySelector('.ski-building-scene');
assert(scene.contains(env.root.querySelector('.ski-building-photo')));
assert(scene.contains(env.root.querySelector('svg image')));
assert.match(
  env.view.getComputedStyle(scene).translate,
  /--ski-photo-drift/,
  'The scene moves its building and original signage together',
);
assert.doesNotMatch(
  env.view.getComputedStyle(env.root.querySelector('.ski-building-photo')).translate,
  /--ski-photo-drift/,
  'The building has no separate drift from its signage',
);
assert.equal(
  firstScreen.dataset.scrollVisible,
  'true',
  'The initial viewport is immediately readable',
);
assert.equal(card.dataset.scrollVisible, undefined);
assert.equal(env.view.getComputedStyle(card).opacity, '0');
assert.equal(env.observers.length, 1);
assert.deepEqual(
  env.observers[0].observed,
  new Set(env.root.querySelectorAll('[data-scroll-reveal]')),
  'All reveal targets are observed',
);
const delays = cards.map((element) =>
  parseFloat(element.style.getPropertyValue('--ski-reveal-delay')),
);
assert(delays.every(Number.isFinite));
assert(delays[1] > delays[0] && delays[2] > delays[1], 'Service cards reveal in sequence');
assert(
  delays.every((delay) => delay <= 240),
  'Stagger stays short',
);

// Keyboard focus makes an offscreen target visible without waiting for an observer callback.
const focusLink = card.querySelector('a');
focusLink.focus();
assert.equal(env.view.document.activeElement, focusLink);
assert(card.matches(':focus-within'));
// JSDOM caches computed focus selectors. Reload unchanged CSS to recalculate them.
env.view.document.querySelector('style').textContent += '\n';
assert.equal(
  card.dataset.scrollVisible,
  undefined,
  'Focus visibility does not depend on JS reveal state',
);
assert.equal(env.view.getComputedStyle(card).opacity, '1');
assert.equal(env.view.getComputedStyle(card).translate, '0 0');
assert.equal(env.view.getComputedStyle(card).transition, 'none');
assert.equal(
  env.view.getComputedStyle(card).transform,
  'rotate(1deg)',
  'Reveal does not overwrite hover transforms',
);
focusLink.blur();
const intersection = (visible, top, height = 80) => ({
  target: card,
  isIntersecting: visible,
  intersectionRatio: visible ? 0.5 : 0,
  boundingClientRect: env.bounds(top, height),
});
env.observers[0].emit([intersection(true, 500)]);
assert.equal(card.dataset.scrollVisible, 'true');
env.observers[0].emit([intersection(false, 700, 200)]);
assert.equal(card.dataset.scrollVisible, 'true', 'A partially visible element does not reset');
env.observers[0].emit([intersection(false, -120)]);
assert.equal(card.dataset.scrollVisible, undefined, 'A full exit resets for a later entry');
env.observers[0].emit([intersection(true, 100)]);
assert.equal(card.dataset.scrollVisible, 'true', 'A returning element reveals again');
env.observers[0].emit([intersection(false, 900)]);
assert.equal(card.dataset.scrollVisible, undefined, 'Exiting below the viewport also resets');

// Scroll/resize bursts share one passive animation frame; the document keeps native scrolling.
assert.equal(env.count('scroll'), 1);
assert.equal(env.count('resize'), 1);
assert.equal(env.count('wheel'), 0);
assert(
  env.registrations
    .filter(({ type }) => ['scroll', 'resize'].includes(type))
    .every(({ options }) => options?.passive),
);
env.flush();
const beforeBurst = env.requested();
env.place(env.hero, -200, 1200);
env.place(env.photo, -200, 200);
for (const type of ['scroll', 'resize', 'scroll', 'scroll']) {
  const event = new env.view.Event(type, { cancelable: true });
  env.view.dispatchEvent(event);
  assert.equal(event.defaultPrevented, false);
}
assert.equal(env.frames.size, 1);
assert.equal(env.requested(), beforeBurst + 1, 'Only one frame is requested for an event burst');
env.flush();
assert.equal(
  parseFloat(env.root.style.getPropertyValue('--ski-photo-drift')),
  8,
  'Small photo bounds cap drift at four percent',
);
env.place(env.hero, -500, 1500);
env.place(env.photo, -500, 1000);
env.view.dispatchEvent(new env.view.Event('scroll'));
env.flush();
assert.equal(
  parseFloat(env.root.style.getPropertyValue('--ski-photo-drift')),
  20,
  'Parallax never exceeds twenty pixels',
);
const drift = env.root.style.getPropertyValue('--ski-photo-drift');
env.place(env.hero, -1600, 1500);
env.view.dispatchEvent(new env.view.Event('scroll'));
env.flush();
assert.equal(
  env.root.style.getPropertyValue('--ski-photo-drift'),
  drift,
  'Offscreen hero does not update photo drift',
);

// Live reduced-motion changes stop observers/frames, show everything, and may resume later.
env.view.dispatchEvent(new env.view.Event('scroll'));
assert.equal(env.frames.size, 1);
env.preference(true);
assert.equal(env.root.dataset.scrollMotion, undefined);
assert.equal(env.count('scroll'), 0);
assert.equal(env.count('resize'), 0);
assert.equal(env.frames.size, 0);
assert(env.cancelled() > 0);
assert(env.observers[0].disconnected);
assert.equal(env.root.style.getPropertyValue('--ski-photo-drift'), '');
for (const element of cards) {
  assert.notEqual(env.view.getComputedStyle(element).opacity, '0');
  assert.equal(element.style.getPropertyValue('--ski-reveal-delay'), '');
}
env.preference(false);
assert.equal(env.root.dataset.scrollMotion, 'active');
assert.equal(env.observers.length, 2);
assert.equal(env.count('scroll'), 1);
assert.equal(env.count('resize'), 1);
assert.equal(env.mediaListeners.size, 1);
const beforeDestroy = env.requested();
action.destroy();
assert.equal(env.frames.size, 0);
assert.equal(env.count('scroll'), 0);
assert.equal(env.count('resize'), 0);
assert.equal(env.mediaListeners.size, 0);
assert(env.observers[1].disconnected);
assert.equal(env.root.dataset.scrollMotion, undefined);
assert.equal(env.root.style.getPropertyValue('--ski-photo-drift'), '');
assert.equal(env.root.style.getPropertyValue('--unrelated-value'), 'keep');
assert.equal(env.root.querySelector('[data-scroll-reveal], [data-scroll-visible]'), null);
env.observers[1].emit([intersection(true, 100)]);
env.view.dispatchEvent(new env.view.Event('scroll'));
env.preference(false);
assert.equal(
  env.requested(),
  beforeDestroy,
  'Late notifications cannot restart a destroyed action',
);
assert.equal(card.dataset.scrollVisible, undefined);
action.destroy();
env.close();

for (const options of [{ reduced: true }, { observer: false }]) {
  const fallback = environment(options);
  const motion = landingScrollMotion(fallback.root);
  assert.equal(fallback.observers.length, 0);
  assert.equal(fallback.count('scroll'), 0);
  assert.equal(fallback.count('resize'), 0);
  assert.equal(fallback.frames.size, 0);
  assert.equal(fallback.requested(), 0);
  assert.equal(fallback.root.dataset.scrollMotion, undefined);
  assert.notEqual(
    fallback.view.getComputedStyle(fallback.root.querySelector('.ski-product')).opacity,
    '0',
  );
  if (options.reduced) {
    fallback.preference(false);
    assert.equal(
      fallback.root.dataset.scrollMotion,
      'active',
      'An initial preference may change live',
    );
    assert.equal(fallback.observers.length, 1);
    fallback.preference(true);
    assert.equal(fallback.count('scroll'), 0);
    assert.equal(fallback.frames.size, 0);
  }
  motion.destroy();
  assert.equal(fallback.mediaListeners.size, 0);
  fallback.close();
}
console.log(
  'PASS: landing reveal/re-entry, stagger, keyboard visibility, native passive scrolling, bounded photo drift, frame coalescing, reduced motion, cleanup and observer fallback.',
);
