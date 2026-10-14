import { displayText, formatMoney, formatLongDate, witaDate } from '../../lib/formatters.js';

import { createMaturityPresentation } from './presentation.js';
import { createMaturityDialogs } from './dialogs.js';
import { bindMaturityEvents } from './events.js';

/**
 * Inisialisasi maturity: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeMaturity(app) {
  'use strict';

  const wf = () => app.services.workflow,
    $ = (s) => document.querySelector(s);

  const esc = displayText;

  const money = formatMoney;

  const date = formatLongDate;

  const today = witaDate;

  const state = app.state({
    sequence: 0,
    busy: false,
    loading: false,
    loaded: false,
    error: '',
    returns: null,
    report: null,
    from: '',
    to: '',
    filter: '',
    route: '',
  });

  async function load() {
    if (state.loading) return;
    const route = location.hash,
      sequence = ++state.sequence;
    state.route = route;
    state.loading = true;
    state.error = '';
    try {
      if (route === '#finance-pengembalian') {
        const r = await wf().api('/finance/returns');
        if (sequence !== state.sequence) return;
        state.returns = r;
      } else if (route === '#manager-jatuh-tempo') {
        const r = await wf().api(
          '/maturity/report?' + new URLSearchParams({ from: state.from, to: state.to }),
        );
        if (sequence !== state.sequence) return;
        state.report = r;
        state.from = r.from;
        state.to = r.to;
      } else return;
      state.loaded = true;
    } catch (e) {
      if (sequence === state.sequence) state.error = e.message;
    } finally {
      if (sequence === state.sequence) {
        state.loading = false;
        app.events.dispatchEvent(new CustomEvent('kspps-maturity-loaded'));
      }
    }
  }

  function mount() {
    if (!['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash)) return;
    if (state.route !== location.hash) {
      state.loaded = false;
      state.error = '';
    }
    if (!state.loaded && !state.loading && !state.error) void load();
  }

  function idleRefresh() {
    if (
      ['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash) &&
      state.loaded &&
      !state.busy &&
      !state.loading &&
      !$('#portal-dialog').open &&
      !document.activeElement?.matches('input,textarea,select')
    )
      void load();
  }

  const { btn, heading, table, reminders, summary, stats, loading } = createMaturityPresentation({
    app,
    esc,
    wf,
    money,
    date,
    state,
  });

  const { show, decide, returnDialog, error } = createMaturityDialogs({
    app,
    $,
    btn,
    wf,
    esc,
    money,
    date,
    state,
  });

  bindMaturityEvents({ app, state, $, decide, returnDialog, load, wf, error });

  app.scope.interval(() => {
    if (document.visibilityState === 'visible') idleRefresh();
  }, 60000);

  app.scope.listen(window, 'focus', idleRefresh);

  app.services.maturity = {
    state,
    getViewContext: () => ({ esc, money, date, state, btn, heading, table, stats, loading, error }),
    reminders,
    summary,
    mount,
  };
  return app.services.maturity;
}
