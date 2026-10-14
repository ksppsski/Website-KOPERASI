/**
 * Tindakan pengunduran diri dan penyegaran data sesuai peran.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindWithdrawalEvents({ app, state, $, load, detail, record, financingDetail, wf }) {
  app.scope.listen(document, 'click', async (e) => {
    const b = e.target.closest('[data-resign-action]');
    if (!b || state.busy) return;
    const a = b.dataset.resignAction;
    if (a === 'close') $('#portal-dialog').close();
    if (a === 'refresh') void load();
    if (a === 'detail') detail(b.dataset.id);
    if (a === 'record') record();
    if (a === 'financing-detail') financingDetail(b.dataset.id);
    if (a === 'restart') {
      state.busy = true;
      b.disabled = true;
      try {
        await wf().api('/profile/restart', {
          method: 'POST',
          body: JSON.stringify({ confirm: true }),
        });
        await wf().refresh();
        app.events.dispatchEvent(new CustomEvent('kspps-new-registration'));
      } catch (e) {
        const el = $('#resign-restart-error');
        if (el) {
          el.textContent = e.message;
          el.hidden = false;
        }
        b.disabled = false;
      } finally {
        state.busy = false;
      }
    }
  });

  app.scope.listen(
    document,
    'submit',
    async (e) => {
      const f = e.target;
      if (
        ![
          'resign-pay-form',
          'resign-close-form',
          'resign-financing-form',
          'resign-settle-form',
        ].includes(f.id)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (state.busy || !f.reportValidity()) return;
      if (
        f.id === 'resign-pay-form' &&
        !(await app.services.activity.requireStarted(f.dataset.id, 'withdrawal-return'))
      )
        return;
      const data = new FormData(f),
        obj = Object.fromEntries(data);
      obj.confirm = data.get('confirm') === 'on';
      obj.version = Number(f.dataset.version);
      let path, body;
      if (f.id === 'resign-pay-form') {
        data.set('confirm', String(obj.confirm));
        data.set('version', String(obj.version));
        path = '/finance/withdrawals/' + f.dataset.id + '/pay';
        body = data;
      } else {
        path =
          f.id === 'resign-close-form'
            ? '/manager/withdrawals/' + f.dataset.id + '/close'
            : f.id === 'resign-settle-form'
              ? '/staff/financing/' + f.dataset.id + '/settle'
              : '/staff/financing';
        body = JSON.stringify(obj);
      }
      state.busy = true;
      f.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        await wf().api(path, { method: 'POST', body });
        $('#portal-dialog').close();
        app.services.activity?.invalidate();
        await wf().refresh();
        state.loaded = false;
        await load();
      } catch (e) {
        const el = $('#resign-error');
        if (el) {
          el.textContent = e.message;
          el.hidden = false;
        }
      } finally {
        state.busy = false;
        f.querySelectorAll('button').forEach((x) => (x.disabled = false));
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
    state.items = [];
  });
}
