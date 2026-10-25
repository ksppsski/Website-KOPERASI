import assert from 'node:assert/strict';
import { createThemeMotion } from '../shared/lib/theme-motion.js';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const settle = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function environment({ reduced = false, native = false, throws = false } = {}) {
  const attributes = new Map(),
    classes = new Set(),
    timers = new Map();
  const ready = deferred(),
    finished = deferred(),
    animationDone = deferred();
  let callback,
    calls = 0,
    skipped = 0,
    cancelled = 0,
    animated;
  const document = { hidden: false };
  if (native || throws)
    document.startViewTransition = (update) => {
      calls++;
      if (throws) throw Error('Unavailable transition');
      callback = update;
      return {
        ready: ready.promise,
        finished: finished.promise,
        skipTransition() {
          skipped++;
          ready.reject(Error('Skipped'));
          finished.resolve();
        },
      };
    };
  const root = {
    ownerDocument: document,
    setAttribute: (key, value) => attributes.set(key, value),
    removeAttribute: (key) => attributes.delete(key),
    classList: { add: (key) => classes.add(key), remove: (key) => classes.delete(key) },
    animate(frames, options) {
      animated = { frames, options };
      return {
        finished: animationDone.promise,
        cancel() {
          cancelled++;
          animationDone.reject(Error('Cancelled'));
        },
      };
    },
  };
  const browser = {
    innerWidth: 390,
    innerHeight: 844,
    matchMedia(query) {
      assert.equal(query, '(prefers-reduced-motion: reduce)');
      return { matches: reduced };
    },
    setTimeout(fn) {
      const id = timers.size + 1;
      timers.set(id, fn);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const motion = createThemeMotion({ browser, root });
  return {
    motion,
    root,
    document,
    attributes,
    classes,
    timers,
    ready,
    finished,
    animationDone,
    commit: () => callback(),
    calls: () => calls,
    skipped: () => skipped,
    cancelled: () => cancelled,
    animation: () => animated,
    finishFade() {
      for (const fn of timers.values()) fn();
    },
  };
}

// CSS fallback changes once, ignores duplicate clicks and releases its timer/class.
const fallback = environment();
let changes = 0;
const fading = fallback.motion.run(() => changes++, { x: 356, y: 34 });
await settle();
assert.equal(changes, 1);
assert(fallback.classes.has('theme-transitioning'));
assert.equal(await fallback.motion.run(() => changes++, { x: 0, y: 0 }), false);
fallback.finishFade();
assert.equal(await fading, true);
assert.equal(changes, 1);
assert.equal(fallback.timers.size, 0);
assert.equal(fallback.classes.size, 0);

// The native snapshot changes only in its callback, then reveals from the control.
const native = environment({ native: true });
changes = 0;
const revealing = native.motion.run(() => changes++, { x: 356, y: 34 });
assert.equal(changes, 0);
await native.commit();
native.ready.resolve();
await settle();
assert.equal(changes, 1);
const { frames, options } = native.animation();
assert.equal(frames.clipPath[0], 'circle(0px at 356px 34px)');
assert(Number(frames.clipPath[1].match(/circle\(([\d.]+)/)[1]) >= Math.hypot(356, 810));
assert.equal(options.pseudoElement, '::view-transition-new(root)');
assert.equal(options.duration, 650);
native.animationDone.resolve();
native.finished.resolve();
assert.equal(await revealing, true);
assert.equal(native.attributes.size, 0);

// Reduced motion performs a direct switch, including when the API is available.
const reduced = environment({ reduced: true, native: true });
changes = 0;
await reduced.motion.run(() => changes++, { x: 0, y: 0 });
assert.equal(changes, 1);
assert.equal(reduced.calls(), 0);
assert.equal(reduced.timers.size, 0);

// Native failure falls back; skipped ready still applies the preference once.
const broken = environment({ throws: true });
changes = 0;
const failed = broken.motion.run(() => changes++, { x: 0, y: 0 });
await settle();
broken.finishFade();
await failed;
assert.equal(changes, 1);
assert.equal(broken.attributes.size, 0);
const skipped = environment({ native: true });
changes = 0;
const skipping = skipped.motion.run(() => changes++, { x: 0, y: 0 });
await skipped.commit();
skipped.ready.reject(Error('Hidden page'));
await skipping;
assert.equal(changes, 1);
assert.equal(skipped.skipped(), 1);

// Unmount before a deferred callback cannot change theme; active effects are cancelled.
const unmounted = environment({ native: true });
changes = 0;
const unmounting = unmounted.motion.run(() => changes++, { x: 0, y: 0 });
unmounted.motion.dispose();
await unmounted.commit();
await unmounting;
assert.equal(changes, 0);
assert.equal(unmounted.attributes.size, 0);
assert.equal(await unmounted.motion.run(() => changes++, { x: 0, y: 0 }), false);
const cancelFade = environment();
const cancelling = cancelFade.motion.run(() => {}, { x: 0, y: 0 });
await settle();
cancelFade.motion.dispose();
await cancelling;
assert.equal(cancelFade.timers.size, 0);
assert.equal(cancelFade.classes.size, 0);

const cancelNative = environment({ native: true });
const cancellingNative = cancelNative.motion.run(() => {}, { x: 356, y: 34 });
await cancelNative.commit();
cancelNative.ready.resolve();
await settle();
cancelNative.motion.dispose();
await cancellingNative;
assert.equal(cancelNative.cancelled(), 1);
assert.equal(cancelNative.attributes.size, 0);

console.log(
  'PASS: radial reveal, complete coverage, fallback, reduced motion, rapid clicks, failure and disposal.',
);
