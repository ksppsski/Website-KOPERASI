import { BindActivityEventsView, BindActivityEvents2View } from './views/events.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Tindakan mulai tugas, filter laporan, dan penyegaran data aktivitas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindActivityEvents({
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
}) {
  app.scope.listen(document, 'click', async (event) => {
    const b = event.target.closest('[data-activity-action]');
    if (!b) return;
    const action = b.dataset.activityAction;
    if (action === 'today' || action === 'week') {
      const latest = dateKey(new Date()),
        d = new Date(latest + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 7);
      state.from = action === 'week' ? d.toISOString().slice(0, 10) : latest;
      state.to = latest;
      invalidate();
      void load();
      return;
    }
    if (action === 'refresh') {
      invalidate();
      void load();
      return;
    }
    if (action === 'csv') {
      csv();
      return;
    }
    if (action !== 'start' || state.busy) return;
    state.busy = true;
    b.disabled = true;
    try {
      const result = await wf().api('/staff/activity/start', {
        method: 'POST',
        body: JSON.stringify({ taskId: b.dataset.taskId }),
      });
      const updated = {
        ...result.task,
        started: !!result.task.startedAt,
        completed: !!result.task.completedAt,
        closed: !!result.task.closedAt,
      };
      state.tasks = state.tasks.map((t) => (t.id === updated.id ? updated : t));
      state.queueTasks = state.queueTasks.map((t) => (t.id === updated.id ? updated : t));
      paintPanels();
      announce();
    } catch (error) {
      const el = b.closest('[data-work-target]')?.querySelector('.work-error');
      if (el) {
        el.textContent = error.message;
        el.hidden = false;
      }
      b.disabled = false;
    } finally {
      state.busy = false;
    }
  });

  app.scope.listen(document, 'change', (event) => {
    const key = event.target.dataset.workFilter;
    if (!['role', 'status', 'from', 'to'].includes(key)) return;
    state[key] = event.target.value;
    const el = $('#work-results');
    if (['from', 'to'].includes(key)) {
      if (!state.from || !state.to || state.from > state.to) {
        if (el) app.ui.render(el, snippetView(BindActivityEventsView));
        return;
      }
      invalidate();
      if (el) app.ui.render(el, snippetView(BindActivityEvents2View));
      void load();
      return;
    }
    if (el) app.ui.render(el, results());
  });

  app.scope.listen(app.events, 'kspps-profile-loaded', () => {
    invalidate();
    mount();
  });

  app.scope.listen(app.events, 'kspps-staff-role-changed', () => {
    invalidate();
    state.tasks = [];
    state.queueTasks = [];
    state.from = '';
    state.to = '';
    state.range = null;
    state.role = '';
    state.status = '';
  });

  app.scope.listen(app.events, 'kspps-member-changed', () => {
    invalidate();
    state.tasks = [];
    state.queueTasks = [];
  });
}
