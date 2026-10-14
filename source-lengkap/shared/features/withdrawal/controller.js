import { displayText, formatMoney, formatLongDate } from '../../lib/formatters.js';

import { createWithdrawalPresentation } from './presentation.js';
import { createWithdrawalDialogs } from './dialogs.js';
import { bindWithdrawalEvents } from './events.js';

/**
 * Inisialisasi withdrawal: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeWithdrawal(app) {
  'use strict';

  const wf = () => app.services.workflow,
    $ = (s) => document.querySelector(s),
    esc = displayText;

  const money = formatMoney,
    date = formatLongDate;

  const state = app.state({
    items: [],
    route: '',
    loading: false,
    loaded: false,
    error: '',
    busy: false,
    sequence: 0,
    today: '',
  });

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
        app.events.dispatchEvent(new CustomEvent('kspps-withdrawal-loaded'));
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
    createWithdrawalPresentation({ app, esc, date, money, wf });

  const { show, errorBlock, detail, record, financingDetail } = createWithdrawalDialogs({
    app,
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

  bindWithdrawalEvents({ app, state, $, load, detail, record, financingDetail, wf });

  app.services.withdrawal = {
    state,
    getViewContext: () => ({ wf, state, button, table, record }),
    mount,
    summary,
    eligibility,
    closedPage,
    memberFinancing,
  };
  return app.services.withdrawal;
}
