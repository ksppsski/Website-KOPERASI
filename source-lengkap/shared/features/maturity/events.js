/**
 * Pengiriman keputusan akhir akad, pembayaran, dan pergantian role.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindMaturityEvents({ app, state, $, decide, returnDialog, load, wf, error }) {
  app.scope.listen(document, 'click', (e) => {
    const b = e.target.closest('[data-maturity-action]');
    if (!b || state.busy) return;
    const a = b.dataset.maturityAction;
    if (a === 'close') $('#portal-dialog').close();
    if (a === 'decide') decide(b.dataset.id);
    if (a === 'return-detail') returnDialog(b.dataset.id);
    if (a === 'refresh') void load();
  });

  app.scope.listen(document, 'change', (e) => {
    if (e.target.name === 'choice' && e.target.form?.id === 'maturity-choice-form') {
      const extend = e.target.value === 'extend';
      $('#maturity-project').hidden = !extend;
      $('#maturity-return-note').hidden = extend;
      for (const el of $('#maturity-project').querySelectorAll('input,select')) {
        el.required = extend;
        el.disabled = !extend;
      }
    }
    if (e.target.id === 'maturity-return-filter') {
      state.filter = e.target.value;
      app.events.dispatchEvent(new CustomEvent('kspps-maturity-loaded'));
    }
  });

  app.scope.listen(
    document,
    'submit',
    async (e) => {
      const form = e.target;
      if (
        !['maturity-choice-form', 'maturity-return-form', 'maturity-period-form'].includes(form.id)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (state.busy || !form.reportValidity()) return;
      const data = new FormData(form);
      if (form.id === 'maturity-period-form') {
        state.from = data.get('from');
        state.to = data.get('to');
        if (state.from > state.to) {
          form.elements.to.setCustomValidity('Tanggal akhir harus setelah tanggal awal.');
          form.elements.to.reportValidity();
          form.elements.to.setCustomValidity('');
          return;
        }
        void load();
        return;
      }
      if (
        form.id === 'maturity-return-form' &&
        !(await app.services.activity.requireStarted(form.dataset.id, 'principal-return'))
      )
        return;
      state.busy = true;
      form.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        if (form.id === 'maturity-choice-form')
          await wf().api('/' + form.dataset.id + '/maturity', {
            method: 'POST',
            body: JSON.stringify({
              choice: data.get('choice'),
              offerId: data.get('offerId'),
              confirm: data.get('confirm') === 'on',
              signatureConsent: data.get('signatureConsent') === 'on',
            }),
          });
        else {
          data.set('confirm', String(data.get('confirm') === 'on'));
          await wf().api('/finance/returns/' + form.dataset.id + '/complete', {
            method: 'POST',
            body: data,
          });
        }
        $('#portal-dialog').close();
        state.loaded = false;
        app.services.activity?.invalidate();
        await wf().refresh();
        if (location.pathname.endsWith('petugas.html')) await load();
      } catch (e) {
        error(e);
      } finally {
        state.busy = false;
        form.querySelectorAll('button').forEach((x) => (x.disabled = false));
      }
    },
    true,
  );

  app.scope.listen($('#portal-dialog'), 'cancel', (e) => {
    if (state.busy) e.preventDefault();
  });

  app.scope.listen(app.events, 'kspps-staff-role-changed', () => {
    state.sequence++;
    state.loading = false;
    state.loaded = false;
    state.error = '';
    state.route = '';
  });
}
