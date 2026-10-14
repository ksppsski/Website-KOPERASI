import { displayText } from '../../../../shared/lib/formatters.js';

import { createActivityQueue } from './queue.js';
import { createActivityPresentation } from './presentation.js';
import { createActivityExport } from './export.js';
import { bindActivityEvents } from './events.js';

/**
 * Inisialisasi activity: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeActivity(app) {
  'use strict';

  const $ = (s) => document.querySelector(s),
    wf = () => app.services.workflow;

  const esc = displayText;

  const state = app.state({
    tasks: [],
    queueTasks: [],
    loaded: false,
    loading: false,
    error: '',
    role: '',
    status: '',
    from: '',
    to: '',
    busy: false,
    sequence: 0,
    range: null,
  });

  function announce() {
    app.events.dispatchEvent(new CustomEvent('kspps-activity-loaded'));
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.error = '';
    const seq = ++state.sequence;
    try {
      const manager = wf().getStaff()?.role === 'manager';
      const query =
        state.from && state.to
          ? '?from=' + encodeURIComponent(state.from) + '&to=' + encodeURIComponent(state.to)
          : '';
      const [result, queueResult] = manager
        ? await Promise.all([wf().api('/staff/activity' + query), wf().api('/staff/tasks')])
        : [await wf().api('/staff/tasks'), null];
      if (seq !== state.sequence) return;
      state.tasks = result.tasks;
      state.queueTasks = queueResult?.tasks || result.tasks;
      state.range = result.range || null;
      if (result.range) {
        state.from = result.range.from;
        state.to = result.range.to;
      }
      state.loaded = true;
    } catch (error) {
      if (seq === state.sequence) state.error = error.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        paintPanels();
        announce();
      }
    }
  }

  function mount() {
    if (
      (['#waktu-kerja', '#finance-ringkasan'].includes(location.hash) || $('[data-work-target]')) &&
      !state.loaded &&
      !state.loading &&
      !state.error
    )
      void load();
  }

  function invalidate() {
    state.loaded = false;
    state.error = '';
    state.sequence++;
    state.loading = false;
  }

  async function requireStarted(target, stage) {
    if (!state.loaded) await load();
    const t = currentTask(target, stage);
    if (
      (t?.started ?? !!t?.startedAt) &&
      !(t.completed ?? !!t.completedAt) &&
      !(t.closed ?? !!t.closedAt)
    )
      return true;
    const el = $('[data-work-target] .work-error');
    if (el) {
      el.hidden = false;
      el.textContent =
        state.error || 'Tekan “Mulai mengerjakan” sebelum menyimpan hasil tahap ini.';
    }
    $('[data-activity-action="start"]')?.focus();
    return false;
  }

  const { newestFirst, stageRoutes, queue } = createActivityQueue({
    app,
    wf,
    state,
    esc,
    button: (...args) => button(...args),
  });

  const {
    roleLabel,
    statusLabel,
    time,
    dateKey,
    duration,
    button,
    currentTask,
    card,
    panelBody,
    panel,
    paintPanels,
    filtered,
    summary,
    results,
  } = createActivityPresentation({ app, state, wf, esc, newestFirst });

  const { csv } = createActivityExport({ app, state, wf, filtered, roleLabel, time, statusLabel });

  bindActivityEvents({
    app,
    dateKey,
    state,
    invalidate,
    load,
    csv,
    wf,
    paintPanels,
    announce,
    $,
    results,
    mount,
  });

  app.services.activity = {
    state,
    getViewContext: () => ({ wf, state, queue, dateKey, button, panel, summary, results, csv }),
    queue,
    panel,
    mount,
    load,
    invalidate,
    requireStarted,
  };
  return app.services.activity;
}
