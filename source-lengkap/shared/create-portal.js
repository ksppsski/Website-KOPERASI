import { mount, flushSync } from 'svelte';
import { writable } from 'svelte/store';
import { initializeWorkflow } from './features/workflow/controller.js';
import { initializeMaturity } from './features/maturity/controller.js';
import { initializeWithdrawal } from './features/withdrawal/controller.js';
import { initializeReports } from './features/reports/controller.js';
import './styles/portal.css';
import './styles/workflow.css';

export function createPortal(Portal) {
  const view = writable(null);
  flushSync(() => mount(Portal, { target: document.getElementById('root'), props: { view } }));

  initializeWorkflow();
  initializeMaturity();
  initializeWithdrawal();
  initializeReports();

  // Flush before controllers attach signature canvases, filters and file inputs.
  // The dialog lives outside the keyed page so refresh never removes a draft.
  return (model) => flushSync(() => view.set(model));
}
