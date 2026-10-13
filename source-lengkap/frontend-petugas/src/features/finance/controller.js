import { workflowService } from '../../../../shared/services/workflow.js';
import { registerFinance } from '../../../../shared/services/finance.js';

import { createFinancePresentation } from './presentation.js';
import { createReconciliationDialog } from './reconciliation-dialog.js';
import { createFinanceExport } from './export.js';
import { bindFinanceEvents } from './events.js';

/**
 * Inisialisasi finance: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeFinance() {
  'use strict';

  const $ = (s) => document.querySelector(s),
    wf = () => workflowService;

  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

  const date = (s) =>
    s
      ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';

  const today = () => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day}`;
  };

  const state = {
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
  };

  const announce = () => window.dispatchEvent(new CustomEvent('kspps-finance-loaded'));

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
    createFinancePresentation({
      esc,
      state,
      money,
      date,
    });

  const { show, reconciliationDialog, detail } = createReconciliationDialog({
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

  const { csvCell, exportCsv } = createFinanceExport({
    state,
  });

  bindFinanceEvents({
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

  registerFinance({
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
  });
}
