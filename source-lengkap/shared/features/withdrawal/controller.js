import { workflowService } from '../../services/workflow.js';
import { registerWithdrawal } from '../../services/withdrawal.js';

import { createWithdrawalPresentation } from './presentation.js';
import { createWithdrawalDialogs } from './dialogs.js';
import { bindWithdrawalEvents } from './events.js';

/**
 * Inisialisasi withdrawal: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeWithdrawal() {
  'use strict';

  const wf = () => workflowService,
    $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );

  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID'),
    date = (s) =>
      s
        ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Makassar',
          })
        : '—';

  const state = {
    items: [],
    route: '',
    loading: false,
    loaded: false,
    error: '',
    busy: false,
    sequence: 0,
    today: '',
  };

  const routes = ['#finance-pengunduran', '#manager-pengunduran', '#pengajuan'];

  async function load() {
    if (state.loading) return;
    const route = location.hash,
      seq = ++state.sequence;
    state.loading = true;
    state.route = route;
    state.error = '';
    try {
      const data = await wf().api(
        route === '#pengajuan'
          ? '/staff/financing'
          : route === '#manager-pengunduran'
            ? '/manager/withdrawals'
            : '/finance/withdrawals',
      );
      if (seq !== state.sequence) return;
      state.items = data.items;
      state.today = data.today || '';
      state.loaded = true;
    } catch (e) {
      if (seq === state.sequence) state.error = e.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        window.dispatchEvent(new CustomEvent('kspps-withdrawal-loaded'));
      }
    }
  }

  function mount() {
    if (!location.pathname.endsWith('petugas.html') || !routes.includes(location.hash)) return;
    if (state.route !== location.hash) {
      state.loaded = false;
      state.error = '';
    }
    if (!state.loaded && !state.loading && !state.error) void load();
  }

  const { button, field, details, summary, closedPage, eligibility, table, memberFinancing } =
    createWithdrawalPresentation({
      esc,
      date,
      money,
      wf,
    });

  const { show, errorBlock, detail, record, financingDetail } = createWithdrawalDialogs({
    $,
    button,
    state,
    details,
    money,
    summary,
    esc,
    field,
    wf,
    date,
  });

  bindWithdrawalEvents({
    state,
    $,
    load,
    detail,
    record,
    financingDetail,
    wf,
  });

  registerWithdrawal({
    getViewContext: () => ({ wf, state, button, table, record }),
    mount,
    summary,
    eligibility,
    closedPage,
    memberFinancing,
  });
}
