import { BindMemberSubmissionsView } from './views/submission-events.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Pengiriman formulir login, pemulihan akun, dan pendaftaran.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindMemberSubmissions({
  app,
  requireRegistrationKtp,
  state,
  requireRegistrationProof,
  go,
  dialog,
  icon,
  saveRegistration,
  $,
  render,
  toast,
  fileValid,
  closeDialog,
}) {
  app.scope.listen(document, 'submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'registration-form' && !requireRegistrationKtp()) return;
    if (
      form.id === 'registration-form' &&
      state.registrationStep >= 2 &&
      !requireRegistrationProof()
    )
      return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (form.id === 'login-form') {
      const error = $('#login-error');
      error.textContent =
        'Layanan masuk akun tidak tersedia pada alamat ini. Hubungi koperasi untuk akses akun.';
      error.hidden = false;
      return;
    }
    if (form.id === 'forgot-form') {
      dialog('Pemulihan akun', snippetView(BindMemberSubmissionsView, { icon: icon('mail') }));
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    if (form.id === 'registration-form') {
      saveRegistration(form);
      if (
        state.registrationStep === 3 &&
        (!state.signature || !state.registration.signatureImage)
      ) {
        $('#signature-error').hidden = false;
        return;
      }
      if (state.registrationStep < 4) {
        state.registrationStep++;
        render();
        window.scrollTo(0, 0);
      } else {
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        const error = $('#registration-submit-error');
        error.hidden = true;
        try {
          await app.services.workflow.saveRegistration(
            state.registration,
            state.registrationProof,
            state.registrationId,
            state.registrationVersion,
            state.registrationKtp,
          );
          go('daftar-selesai');
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          button.disabled = false;
        }
      }
    }
    if (form.id === 'profile-form') {
      for (const key of ['name', 'email', 'phone', 'address', 'job'])
        state.profile[key] = data[key];
      render();
      toast('Perubahan profil dicatat pada laman ini. Perubahan belum dikirim ke koperasi.');
    }
    if (form.id === 'deposit-form') {
      if (!fileValid(form)) return;
      const date = new Date(data.period + '-01T12:00:00');
      const period = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      state.deposits.unshift({
        date: new Date().toLocaleDateString('id-ID'),
        type: data.type,
        note: 'Setoran ' + period,
        amount: Number(data.amount),
        status: 'Belum dikirim',
      });
      closeDialog();
      go('simpanan');
      toast('Konfirmasi setoran dicatat pada laman ini. Data belum dikirim ke koperasi.');
    }
    if (form.id === 'application-form') {
      if (!(await app.services.workflow?.checkAccess())) return;
      const type = form.dataset.kind;
      state.requests.unshift({
        id: 'DRAF-' + String(state.requestCounter++).padStart(3, '0'),
        type,
        purpose: data.purpose,
        amount: Number(data.amount),
        period: data.period,
      });
      closeDialog();
      state.financeTab = type === 'Pembiayaan' ? 'Pengajuan' : state.financeTab;
      go(type === 'Pembiayaan' ? 'pembiayaan' : 'modal');
      toast('Pengajuan dicatat pada laman ini. Pengajuan belum dikirim ke koperasi.');
    }
    if (form.id === 'finance-payment-form') {
      if (!fileValid(form)) return;
      state.financePaymentPending = true;
      closeDialog();
      go('pembiayaan');
      toast('Konfirmasi pembayaran dicatat pada laman ini. Data belum dikirim ke koperasi.');
    }
  });
}
