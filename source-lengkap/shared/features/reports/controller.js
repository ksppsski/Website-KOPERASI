import { UploadView } from './views/controller.svelte';
import ReportCards from '../../components/reports/ReportCards.svelte';
import { displayText } from '../../lib/formatters.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Laporan koperasi: unggahan manajer dan akses anggota.
 * Tampilan halaman berada di shared/components/reports/.
 * Markup Svelte berada di views/; otorisasi dan aturan keuangan diperiksa server.
 */
export function initializeReports(app) {
  'use strict';
  const wf = () => app.services.workflow,
    $ = (s) => document.querySelector(s),
    esc = displayText;
  const state = app.state({
    reports: [],
    loaded: false,
    loading: false,
    error: '',
    filter: '',
    busy: false,
  });
  let requestId = '';
  const names = { utilization: 'Penggunaan Dana', financial: 'Laporan Keuangan' };
  const manager = () =>
    location.pathname.endsWith('petugas.html') &&
    wf()?.getStaff()?.role === 'manager' &&
    wf()?.getStaff()?.accountRole === 'manager';
  function cards() {
    return view(ReportCards, { state: { ...state }, names });
  }

  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.error = '';
    try {
      state.reports = (await wf().api('/reports')).reports;
      state.loaded = true;
    } catch (e) {
      state.error = e.message;
    } finally {
      state.loading = false;
      const el = $('#report-list');
      if (el) app.ui.render(el, cards());
    }
  }
  function mount() {
    if ($('#report-list') && !state.loaded && !state.loading && !state.error) void load();
  }
  function upload() {
    if (!manager()) return;
    requestId = crypto.randomUUID();
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    app.ui.render($('#dialog-content'), snippetView(UploadView));
    modal.showModal();
  }
  app.scope.listen(document, 'click', (e) => {
    const b = e.target.closest('[data-report-action]');
    if (!b || state.busy) return;
    const a = b.dataset.reportAction;
    if (a === 'upload') upload();
    if (a === 'close') $('#portal-dialog').close();
    if (a === 'refresh') {
      state.loaded = false;
      void load();
    }
  });
  app.scope.listen(document, 'change', (e) => {
    if (e.target.id === 'report-filter') {
      state.filter = e.target.value;
      app.ui.render($('#report-list'), cards());
    }
    if (e.target.id === 'report-category') {
      const need = e.target.value === 'utilization',
        label = $('#report-project-field');
      label.hidden = !need;
      label.querySelector('input').required = need;
    }
  });
  app.scope.listen(
    document,
    'submit',
    async (e) => {
      if (e.target.id !== 'report-upload') return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const form = e.target;
      if (state.busy || !form.reportValidity()) return;
      const data = new FormData(form);
      if (data.get('file').size > 10 * 1024 * 1024) {
        $('#report-error').hidden = false;
        $('#report-error').textContent = 'Ukuran laporan maksimal 10 MB.';
        return;
      }
      data.set('id', requestId);
      data.set('confirm', String(data.get('confirm') === 'on'));
      state.busy = true;
      form.querySelectorAll('input,select,button').forEach((x) => (x.disabled = true));
      try {
        const { report } = await wf().api('/reports', { method: 'POST', body: data });
        state.reports = [report, ...state.reports.filter((r) => r.id !== report.id)];
        state.loaded = true;
        $('#portal-dialog').close();
        const el = $('#report-list');
        if (el) app.ui.render(el, cards());
      } catch (err) {
        $('#report-error').hidden = false;
        $('#report-error').textContent = err.message;
      } finally {
        state.busy = false;
        form.querySelectorAll('input,select,button').forEach((x) => (x.disabled = false));
      }
    },
    true,
  );
  app.scope.listen($('#portal-dialog'), 'cancel', (e) => {
    if (state.busy) e.preventDefault();
  });
  app.scope.listen(app.events, 'kspps-staff-role-changed', () => {
    state.loaded = false;
    state.error = '';
  });
  app.services.reports = {
    state,
    getViewContext: () => ({ state, names, manager, cards, upload }),
    mount,
  };
  return app.services.reports;
}
