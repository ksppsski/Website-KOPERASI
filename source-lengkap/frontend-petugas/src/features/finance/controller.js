import {
  displayText,
  formatMoney,
  formatDate,
  witaDate,
} from '../../../../shared/lib/formatters.js';

import { createFinancePresentation } from './presentation.js';
import { createReconciliationDialog } from './reconciliation-dialog.js';
import { createFinanceExport } from './export.js';
import { bindFinanceEvents } from './events.js';

/**
 * Inisialisasi finance: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeFinance(app) {
  'use strict';

  const $ = (s) => document.querySelector(s),
    wf = () => app.services.workflow;

  const esc = displayText;

  const money = formatMoney;

  const date = formatDate;

  const today = witaDate;

  const state = app.state({
    date: today(),
    followToday: true,
    items: [],
    payout: null,
    loaded: false,
    loading: false,
    error: '',
    query: '',
    filter: '',
    busy: false,
    sequence: 0,
  });

  const announce = () => app.events.dispatchEvent(new CustomEvent('kspps-finance-loaded'));

  const role = () => wf()?.getStaff()?.role || 'admin';

  async function load() {
    if (state.loading || role() !== 'finance') return;
    state.loading = true;
    state.error = '';
    const seq = ++state.sequence;
    announce();
    try {
      const [q, p] = await Promise.all([
        wf().api('/finance/reconciliations'),
        wf().api('/finance/payouts?date=' + encodeURIComponent(state.date)),
      ]);
      if (seq !== state.sequence) return;
      state.items = q.items;
      state.payout = p;
      state.loaded = true;
    } catch (error) {
      if (seq === state.sequence) state.error = error.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        announce();
      }
    }
  }

  function syncToday() {
    if (state.followToday && state.date !== today() && !state.busy && !$('#portal-dialog').open) {
      state.date = today();
      invalidate();
      return true;
    }
    return false;
  }

  function mount() {
    syncToday();
    if (
      role() === 'finance' &&
      location.hash.startsWith('#finance-') &&
      !state.loaded &&
      !state.loading &&
      !state.error
    )
      void load();
  }

  function invalidate() {
    state.loaded = false;
    state.error = '';
  }

  const { badge, heading, action, table, loading, metrics, queueTable, datePicker } =
    createFinancePresentation({ app, esc, state, money, date });

  const { show, reconciliationDialog, detail } = createReconciliationDialog({
    app,
    $,
    action,
    state,
    badge,
    money,
    esc,
    date,
    today,
    table,
  });

  const { csvCell, exportCsv } = createFinanceExport({ app, state });

  bindFinanceEvents({
    app,
    state,
    $,
    invalidate,
    load,
    today,
    reconciliationDialog,
    detail,
    exportCsv,
    show,
    date,
    queueTable,
    wf,
    syncToday,
    role,
  });

  app.services.finance = {
    state,
    getViewContext: () => ({
      wf,
      esc,
      money,
      date,
      state,
      heading,
      action,
      table,
      loading,
      metrics,
      datePicker,
      detail,
      badge,
      queueTable,
    }),
    mount,
  };
  return app.services.finance;
}
