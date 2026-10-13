import { activityService } from '../../services/activity.js';
/**
 * Pengiriman formulir workflow, pemeriksaan versi, dan penanganan konflik.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindWorkflowSubmissions({
  state,
  staff,
  workStage,
  runtime,
  setBusy,
  api,
  close,
  mount,
  notice,
  registrationReview,
  adopt,
  reviewDialog,
  downloadPdf,
  errorMessage,
}) {
  document.addEventListener(
    'submit',
    async (event) => {
      const form = event.target;
      if (
        ![
          'wf-offer-form',
          'wf-capital-form',
          'wf-withdrawal-form',
          'wf-review-form',
          'wf-generate-form',
          'wf-signed-form',
          'wf-registration-review',
          'wf-ktp-form',
          'wf-savings-form',
        ].includes(form.id)
      )
        return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy) return;
      const actionName = event.submitter?.value || 'approve';
      if (!['return', 'reject'].includes(actionName) && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (
        staff &&
        activityService &&
        ['wf-review-form', 'wf-generate-form', 'wf-signed-form', 'wf-registration-review'].includes(
          form.id,
        )
      ) {
        const item = state.items.find((x) => x.id === form.dataset.id),
          target = form.id === 'wf-registration-review' ? form.dataset.id : item?.id,
          stage =
            form.id === 'wf-registration-review' ? 'registration' : item ? workStage(item) : '';
        if (!(await activityService.requireStarted(target, stage))) return;
      }
      const data = new FormData(form);
      let path, body;
      if (form.id === 'wf-savings-form') {
        data.set('id', runtime.formId);
        data.set('version', form.dataset.version);
        path = form.dataset.revise ? '/' + runtime.formId + '/revise' : '/savings';
        body = data;
      }
      if (form.id === 'wf-offer-form') {
        path = '/offers';
        body = JSON.stringify({ id: runtime.formId, ...Object.fromEntries(data) });
      }
      if (form.id === 'wf-capital-form') {
        data.set('offerId', form.dataset.offerId || '');
        data.set('id', runtime.formId);
        data.set('version', form.dataset.version);
        data.set('signatureConsent', String(data.get('signatureConsent') === 'on'));
        path = form.dataset.revise ? '/' + runtime.formId + '/revise' : '/capital';
        body = data;
      }
      if (form.id === 'wf-withdrawal-form') {
        path = form.dataset.revise ? '/' + runtime.formId + '/revise' : '/withdrawal';
        body = JSON.stringify({
          id: runtime.formId,
          version: Number(form.dataset.version),
          reason: data.get('reason'),
          consent: data.get('consent') === 'on',
        });
      }
      if (form.id === 'wf-review-form') {
        path = '/' + form.dataset.id + '/review';
        body = JSON.stringify({
          action: actionName,
          version: Number(form.dataset.version),
          note: data.get('note'),
          checks: Object.fromEntries(
            ['identity', 'amount', 'reconciled'].map((x) => [x, data.get(x) === 'on']),
          ),
        });
      }
      if (form.id === 'wf-generate-form') {
        path = '/' + form.dataset.id + '/generate';
        body = JSON.stringify({
          ...Object.fromEntries(data),
          version: Number(form.dataset.version),
          confirm: data.get('confirm') === 'on',
        });
      }
      if (form.id === 'wf-signed-form') {
        path = '/' + form.dataset.id + '/upload-signed';
        data.set('version', form.dataset.version);
        data.set('confirm', String(data.get('confirm') === 'on'));
        body = data;
      }
      if (form.id === 'wf-ktp-form') {
        path = '/profile/ktp';
        data.set('version', form.dataset.version);
        body = data;
      }
      if (form.id === 'wf-registration-review') {
        path = '/profile/review';
        body = JSON.stringify({
          action: actionName,
          version: Number(form.dataset.version),
          note: data.get('note'),
          checks: Object.fromEntries(
            ['identity', 'reconciled', 'signature', 'ktp'].map((k) => [k, data.get(k) === 'on']),
          ),
        });
      }
      setBusy(form, true);
      try {
        const result = await api(path, {
          method: 'POST',
          body,
          memberId: form.id === 'wf-registration-review' ? form.dataset.id : undefined,
        });
        setBusy(form, false);
        if (result.offer) {
          state.offers = [result.offer, ...state.offers.filter((o) => o.id !== result.offer.id)];
          close();
          mount();
          notice('Penawaran sudah tampil di portal anggota.');
          return;
        }
        if (form.id === 'wf-capital-form') {
          const prior = state.items.find((x) => x.id === result.item.id),
            offer = state.offers.find((o) => o.id === result.item.offerId);
          if (offer) {
            offer.reserved += result.item.amount - (prior?.amount || 0);
            offer.remaining = Math.max(0, offer.quota - offer.reserved);
            offer.status = offer.remaining ? 'open' : 'full';
          }
        }
        if (result.profile && !result.item) {
          if (staff)
            state.profiles = state.profiles.map((p) =>
              p.id === result.profile.id ? result.profile : p,
            );
          else state.profile = result.profile;
          window.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
          mount();
          if (form.id === 'wf-ktp-form') {
            close();
            notice('Foto KTP tersimpan dan menunggu pemeriksaan Admin.');
          } else {
            registrationReview(result.profile.id);
            notice('Hasil pemeriksaan pendaftaran tersimpan.');
          }
          return;
        }
        adopt(result.item);
        if (form.id === 'wf-generate-form') {
          reviewDialog(result.item.id);
          await downloadPdf(result.item);
          notice('PDF dengan tanda tangan anggota telah dibuat dan diunduh.');
        } else if (form.id === 'wf-signed-form') {
          reviewDialog(result.item.id);
          notice('Akad lengkap sudah tersedia di portal anggota.');
        } else if (form.id === 'wf-review-form') {
          reviewDialog(result.item.id);
          notice('Hasil pemeriksaan tersimpan.');
        } else {
          close();
          notice(
            form.id === 'wf-savings-form'
              ? 'Setoran dikirim untuk rekonsiliasi Finance.'
              : form.id === 'wf-capital-form'
                ? 'Pengajuan sudah masuk ke portal petugas.'
                : 'Permohonan pengunduran diri sudah masuk ke portal petugas.',
          );
        }
      } catch (error) {
        setBusy(form, false);
        errorMessage(error);
        if (form.id === 'wf-capital-form' && error.status === 409) {
          try {
            state.offers = (await api('/offers')).offers;
            const o = state.offers.find((x) => x.id === form.dataset.offerId);
            const input = form.querySelector('[name=amount]');
            if (o && input) {
              const prior = state.items.find((x) => x.id === runtime.formId);
              input.max = String(o.remaining + (prior?.amount || 0));
            }
            mount();
          } catch {}
        }
      }
    },
    true,
  );
}
