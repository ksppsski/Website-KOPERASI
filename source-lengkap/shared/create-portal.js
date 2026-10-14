import { createRequest } from './runtime/request.js';
import { isStaticPreview } from './runtime/environment.js';
import { protectPreviewForms } from './preview/forms.js';
import { mount, unmount, flushSync } from 'svelte';
import { writable } from 'svelte/store';
import { createComponentHost } from './runtime/component-host.js';
import { createLifecycle } from './runtime/lifecycle.js';
import { createFeatureState } from './runtime/state.js';
import { initializeWorkflow } from './features/workflow/controller.js';
import { initializeMaturity } from './features/maturity/controller.js';
import { initializeWithdrawal } from './features/withdrawal/controller.js';
import { initializeReports } from './features/reports/controller.js';
import './styles/portal.css';
import './styles/workflow.css';

export function createPortal(Portal, options = {}) {
  const scope = createLifecycle();
  const view = writable(null);
  const app = {
    scope,
    events: new EventTarget(),
    services: {},
    state: (initial) => createFeatureState(initial, scope),
    request: createRequest(scope, {
      portal: location.pathname.endsWith('petugas.html') ? 'staff' : 'member',
      fetch: options.fetch,
    }),
    render(model) {
      if (!scope.disposed) flushSync(() => view.set(model));
    },
    dispose() {
      scope.dispose();
      return unmount(component);
    },
  };
  app.ui = createComponentHost(app);
  const component = flushSync(() =>
    mount(Portal, {
      target: options.target || document.getElementById('root'),
      props: { view },
      context: new Map([['kspps-portal', app]]),
    }),
  );

  if (isStaticPreview) protectPreviewForms(scope);
  initializeWorkflow(app);
  initializeMaturity(app);
  initializeWithdrawal(app);
  initializeReports(app);
  scope.listen(window, 'pagehide', (event) => {
    // A page in the back/forward cache will resume with the same instance.
    if (!event.persisted) void app.dispose();
  });
  return app;
}
