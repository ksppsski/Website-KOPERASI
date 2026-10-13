import { workflowService } from '../../../../shared/services/workflow.js';
/**
 * Pengiriman formulir login, pemulihan akun, dan pendaftaran.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindMemberSubmissions({
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
  document.addEventListener('submit', async (event) => {
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
    const data = Object.fromEntries(new FormData(form));
    if (form.id === 'login-form') {
      state.signedIn = true;
      const p = workflowService?.getProfile();
      state.profile = p ? { ...p.data } : {};
      state.savedProfile = !!p;
      go('ringkasan');
    }
    if (form.id === 'forgot-form') {
      dialog(
        'Simulasi pemulihan akun',
        /* HTML */ `<div class="success-icon">${icon('mail')}</div>
          <p>Di sistem yang sudah aktif, petunjuk pemulihan akan dikirim ke email terdaftar.</p>
          <p class="dialog-note">Tidak ada email yang dikirim dalam demo ini.</p>
          <div class="form-actions">
            <a class="btn full" href="#masuk">Kembali ke halaman masuk</a>
          </div>`,
      );
    }
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
          await workflowService.saveRegistration(
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
      toast('Perubahan profil tersimpan dalam demo ini.');
    }
    if (form.id === 'deposit-form') {
      if (!fileValid(form)) return;
      const date = new Date(data.period + '-01T12:00:00');
      const period = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      state.deposits.unshift({
        date: new Date().toLocaleDateString('id-ID'),
        type: data.type,
        note: 'Setoran ' + period + ' (contoh)',
        amount: Number(data.amount),
        status: 'Menunggu verifikasi',
      });
      closeDialog();
      go('simpanan');
      toast('Konfirmasi setoran contoh menunggu verifikasi.');
    }
    if (form.id === 'application-form') {
      if (!(await workflowService?.checkAccess())) return;
      const type = form.dataset.kind;
      state.requests.unshift({
        id: 'DEMO-' + String(state.requestCounter++).padStart(3, '0'),
        type,
        purpose: data.purpose,
        amount: Number(data.amount),
        period: data.period,
      });
      closeDialog();
      state.financeTab = type === 'Pembiayaan' ? 'Pengajuan' : state.financeTab;
      go(type === 'Pembiayaan' ? 'pembiayaan' : 'modal');
      toast('Pengajuan contoh dibuat dan menunggu verifikasi.');
    }
    if (form.id === 'finance-payment-form') {
      if (!fileValid(form)) return;
      state.financePaymentPending = true;
      closeDialog();
      go('pembiayaan');
      toast('Konfirmasi pembayaran contoh menunggu verifikasi.');
    }
  });
}
