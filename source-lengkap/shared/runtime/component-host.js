import { flushSync } from 'svelte';
import { writable } from 'svelte/store';

/** Named Svelte regions. Controllers update data; Svelte alone owns the DOM. */
export function createComponentHost(app) {
  const regions = new Map();
  function region(name, initial = null) {
    let entry = regions.get(name);
    if (!entry) {
      entry = { content: writable(initial), users: 0 };
      regions.set(name, entry);
    } else entry.content.set(initial);
    entry.users++;
    return {
      subscribe: entry.content.subscribe,
      release() {
        entry.users--;
        if (!entry.users) regions.delete(name);
      },
    };
  }
  function render(target, value) {
    if (!target || app.scope.disposed) return;
    const owner = target.closest('[data-work-target]');
    const name = target.dataset.workflow
      ? 'workflow:' + target.dataset.workflow
      : target.hasAttribute('data-work-body')
        ? 'work:' + owner.dataset.workTarget + ':' + owner.dataset.workStage
        : target.id;
    const entry = regions.get(name);
    if (!entry) throw new Error('Svelte region is not registered: ' + name);
    flushSync(() => entry.content.set(value));
  }
  app.scope.add(() => regions.clear());
  return { render, region };
}
