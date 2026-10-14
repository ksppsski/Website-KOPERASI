import assert from 'node:assert/strict';
import { createLifecycle } from '../shared/runtime/lifecycle.js';
import { createFeatureState } from '../shared/runtime/state.js';
import { createWorkflowClient } from '../shared/features/workflow/client.js';
import { browser } from './helpers/svelte-browser.mjs';

const target = new EventTarget();
const scope = createLifecycle();
let received = 0;
scope.listen(target, 'change', () => received++);
target.dispatchEvent(new Event('change'));
assert.equal(received, 1);
const state = createFeatureState({ amount: 0 }, scope);
const values = [];
const unsubscribe = state.subscribe((value) => values.push(value.amount));
state.amount = 40;
let timerRan = false;
scope.timeout(() => {
  timerRan = true;
}, 1);
scope.interval(() => {
  timerRan = true;
}, 1);
scope.dispose();
scope.dispose();
target.dispatchEvent(new Event('change'));
state.amount = 90;
await new Promise((resolve) => setTimeout(resolve, 10));
assert.equal(received, 1, 'Disposed listeners cannot run again');
assert.equal(timerRan, false, 'Disposal cancels both kinds of timer');
assert.equal(scope.signal.aborted, true, 'Pending HTTP requests are cancelled');
assert.deepEqual(values, [0, 40], 'Late responses cannot mutate disposed state');
unsubscribe();

const requests = [];
const client = createWorkflowClient({
  staff: true,
  memberForPath: () => 'member-owned',
  request: async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => ({ proofUrl: '/api/workflow/request/proof' }) };
  },
});
const data = await client.api('/request/review', { method: 'POST', body: '{}' });
assert.equal(requests[0].options.headers['X-KSPPS-Member'], 'member-owned');
assert.equal(requests[0].options.headers['X-KSPPS-Portal'], 'staff');
assert.equal(data.proofUrl, '/api/workflow/member/member-owned/request/proof');
await client.api('/request/review', { memberId: 'selected-member' });
assert.equal(requests[1].options.headers['X-KSPPS-Member'], 'selected-member');
const denied = createWorkflowClient({
  staff: false,
  memberForPath: () => '',
  request: async () => ({ ok: false, status: 401, json: async () => ({ error: 'Masuk dahulu' }) }),
});
await assert.rejects(
  denied.api(),
  (error) => error.status === 401 && error.message === 'Masuk dahulu',
);

const first = await browser('anggota');
const second = await browser('anggota');
assert.notEqual(first.window.__portal.services.workflow, second.window.__portal.services.workflow);
await first.window.__portal.dispose();
assert.equal(first.document.getElementById('app'), null, 'Portal root is unmounted');
first.window.dispatchEvent(new first.window.Event('focus'));
await first.settle();
await second.click('[data-action="enter-portal"]');
assert(second.document.querySelector('.portal-shell'), 'Other portal instance still works');
first.close();
second.close();
console.log(
  'PASS: isolated portal state, listener/timer/HTTP cleanup, unmount, ownership headers and transport errors.',
);
