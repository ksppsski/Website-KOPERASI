import { BindFinanceEventsView } from './views/events.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Interaksi rekonsiliasi, persiapan pembayaran, dan invalidasi data Finance.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindFinanceEvents({
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
}) {
  app.scope.listen(document, 'click', (event) => {
    const b = event.target.closest('[data-finance-action]');
    if (!b) return;
    const a = b.dataset.financeAction;
    if (a === 'close' && !state.busy) $('#portal-dialog').close();
    if (a === 'refresh') {
      invalidate();
      void load();
    }
    if (a === 'today' && !state.loading) {
      state.date = today();
      state.followToday = true;
      invalidate();
      void load();
    }
    if (a === 'reconcile') reconciliationDialog(b.dataset.id, b.dataset.kind);
    if (a === 'detail') detail(Number(b.dataset.index));
    if (a === 'csv') exportCsv();
    if (a === 'payout-complete' && state.payout?.task) {
      show(
        'Selesaikan persiapan bagi hasil',
        snippetView(BindFinanceEventsView, { date: date(state.date) }),
      );
    }
  });

  app.scope.listen(document, 'change', (event) => {
    if (event.target.id === 'finance-filter') {
      state.filter = event.target.value;
      app.ui.render($('#finance-queue-table'), queueTable());
    }
    if (event.target.id === 'finance-date' && event.target.checkValidity() && event.target.value) {
      state.date = event.target.value;
      state.followToday = false;
      invalidate();
      if (state.loading) {
        state.sequence++;
        state.loading = false;
      }
      void load();
    }
  });

  app.scope.listen(
    document,
    'submit',
    async (event) => {
      const form = event.target;
      if (form.id !== 'finance-reconcile-form') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy) return;
      const decision = event.submitter?.value || 'approve';
      if (decision === 'approve' && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (
        app.services.activity &&
        !(await app.services.activity.requireStarted(form.dataset.id, 'reconciliation'))
      )
        return;
      const f = new FormData(form),
        body = {
          id: form.dataset.id,
          kind: form.dataset.kind,
          version: Number(form.dataset.version),
          sourceVersion: Number(form.dataset.sourceVersion),
          receivedAmount: f.get('receivedAmount') === '' ? null : Number(f.get('receivedAmount')),
          transferDate: f.get('transferDate'),
          reference: f.get('reference'),
          note: f.get('note'),
          confirm: f.get('confirm') === 'on',
          decision,
        };
      state.busy = true;
      const error = $('#finance-error');
      error.hidden = true;
      form.querySelectorAll('button,input,textarea').forEach((x) => (x.disabled = true));
      try {
        await wf().api('/finance/reconcile', { method: 'POST', body: JSON.stringify(body) });
        state.busy = false;
        $('#portal-dialog').close();
        invalidate();
        await wf().refresh();
        void load();
      } catch (e) {
        state.busy = false;
        form.querySelectorAll('button,input,textarea').forEach((x) => (x.disabled = false));
        error.textContent = e.message;
        error.hidden = false;
      }
    },
    true,
  );

  app.scope.listen(
    document,
    'submit',
    async (event) => {
      const form = event.target;
      if (form.id !== 'finance-payout-complete') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy || !form.reportValidity()) return;
      state.busy = true;
      const b = form.querySelector('button');
      b.disabled = true;
      try {
        await wf().api('/finance/payouts/complete', {
          method: 'POST',
          body: JSON.stringify({
            date: state.date,
            taskId: state.payout.task.id,
            confirm: new FormData(form).get('confirm') === 'on',
          }),
        });
        state.busy = false;
        $('#portal-dialog').close();
        app.services.activity?.invalidate();
        invalidate();
        void load();
      } catch (error) {
        state.busy = false;
        b.disabled = false;
        const el = $('#finance-error');
        el.hidden = false;
        el.textContent = error.message;
      }
    },
    true,
  );

  app.scope.listen($('#portal-dialog'), 'cancel', (event) => {
    if (state.busy) event.preventDefault();
  });

  app.scope.listen(app.events, 'kspps-profile-loaded', () => {
    if (!$('#portal-dialog').open && !state.busy) invalidate();
  });

  app.scope.listen(app.events, 'kspps-staff-role-changed', () => {
    state.sequence++;
    state.loading = false;
    invalidate();
  });

  app.scope.listen(app.events, 'kspps-member-changed', () => {
    state.sequence++;
    state.loading = false;
    state.items = [];
    state.payout = null;
    invalidate();
  });

  app.scope.interval(() => {
    if (syncToday() && role() === 'finance' && location.hash.startsWith('#finance-')) void load();
  }, 60000);
}
