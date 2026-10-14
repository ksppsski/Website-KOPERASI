import { writable } from 'svelte/store';

/** A feature owns its state; components subscribe without window events. */
export function createFeatureState(initial, scope) {
  let store;
  const state = new Proxy(initial, {
    set(target, key, value) {
      if (scope.disposed) return true;
      target[key] = value;
      store.set(state);
      return true;
    },
    get(target, key) {
      if (key === 'subscribe') return store.subscribe;
      return target[key];
    },
  });
  store = writable(state);
  return state;
}
