import { BindMemberInteractionsView } from './views/interaction-events.svelte';
import { view, fallbackView, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Klik, filter, menu, dan interaksi dialog anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindMemberInteractions({
  app,
  state,
  render,
  go,
  $,
  toast,
  saveRegistration,
  resetRegistrationKtp,
  updateRegistrationKtpView,
  runtime,
  updateRegistrationProofView,
  closeDialog,
  depositDialog,
  applicationDialog,
  capitalDetail,
  dialog,
  memberAlerts,
  savingsHistory,
  download,
  savingsRows,
  documentCards,
  updateSavingsForm,
  selectRegistrationKtp,
  selectRegistrationProof,
  modal,
}) {
  app.scope.listen(document, 'click', async (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      state[tab.dataset.tab === 'modal' ? 'modalTab' : 'financeTab'] = tab.dataset.value;
      render();
      return;
    }
    const b = event.target.closest('[data-action]');
    if (!b) return;
    const action = b.dataset.action;
    if (action === 'enter-portal') {
      state.signedIn = true;
      const p = app.services.workflow?.getProfile();
      state.profile = p ? { ...p.data } : {};
      state.savedProfile = !!p;
      go('ringkasan');
    }
    if (action === 'show-password') {
      const p = $('#login-password');
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    }
    if (action === 'open-sidebar') {
      $('#sidebar').classList.add('open');
      $('.mobile-scrim').classList.add('show');
      b.setAttribute('aria-expanded', 'true');
    }
    if (action === 'close-sidebar') {
      $('#sidebar').classList.remove('open');
      $('.mobile-scrim').classList.remove('show');
      $('[data-action="open-sidebar"]')?.setAttribute('aria-expanded', 'false');
    }
    if (action === 'logout') {
      state.signedIn = false;
      state.requests = [];
      state.deposits = [];
      state.financePaymentPending = false;
      state.profile = {};
      state.savedProfile = false;
      go('masuk');
      toast('Anda sudah keluar dari akun demo.');
    }
    if (action === 'registration-back') {
      saveRegistration($('#registration-form'));
      state.registrationStep = Math.max(1, state.registrationStep - 1);
      render();
      window.scrollTo(0, 0);
    }
    if (action === 'remove-registration-ktp') {
      resetRegistrationKtp();
      const input = $('#registration-ktp');
      if (input) input.value = '';
      updateRegistrationKtpView();
      input?.focus();
    }
    if (action === 'remove-registration-proof') {
      runtime.registrationProofSequence++;
      state.registrationProof = null;
      state.registrationProofBusy = false;
      state.registrationProofError = '';
      const input = $('#registration-proof');
      if (input) input.value = '';
      updateRegistrationProofView();
      input?.focus();
    }
    if (action === 'clear-signature') {
      const c = $('#signature');
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      state.signature = false;
      delete state.registration.signatureImage;
    }
    if (action === 'close-dialog') closeDialog();
    if (action === 'deposit') depositDialog();
    if (action === 'apply-capital') void app.services.workflow?.capitalForm();
    if (action === 'apply-finance' && (await app.services.workflow?.checkAccess()))
      applicationDialog('Pembiayaan');
    if (action === 'capital-detail') capitalDetail(b.dataset.id);
    if (action === 'notifications') {
      dialog(
        'Pemberitahuan',
        fallbackView(memberAlerts(), snippetView(BindMemberInteractionsView)),
      );
    }
    if (action === 'export-savings') {
      const rows = [
        ['Tanggal', 'Jenis', 'Keterangan', 'Nominal', 'Status'],
        ...savingsHistory().map((x) => [x.date, x.type, x.note, x.amount, x.status]),
      ];
      download(
        'simpanan-anggota.csv',
        '\uFEFF' +
          rows
            .map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(';'))
            .join('\r\n'),
        'text/csv;charset=utf-8',
      );
      toast('Riwayat setoran diunduh.');
    }
  });

  app.scope.listen(document, 'input', (event) => {
    const target = event.target;
    if (target.id === 'savings-search')
      app.ui.render($('#savings-rows'), savingsRows(target.value, $('#savings-filter').value));
    if (target.id === 'document-search')
      app.ui.render($('#document-list'), documentCards(target.value, $('#document-filter').value));
    if (
      target.type !== 'file' &&
      target.form?.id === 'registration-form' &&
      state.registrationStep === 2
    )
      updateSavingsForm(target.form);
  });

  app.scope.listen(document, 'change', (event) => {
    const target = event.target;
    if (target.id === 'registration-ktp') {
      void selectRegistrationKtp(target);
      return;
    }
    if (target.id === 'registration-proof') {
      void selectRegistrationProof(target);
      return;
    }
    if (target.id === 'savings-filter')
      app.ui.render($('#savings-rows'), savingsRows($('#savings-search').value, target.value));
    if (target.id === 'document-filter')
      app.ui.render($('#document-list'), documentCards($('#document-search').value, target.value));
    if (target.form?.id === 'registration-form') {
      if (state.registrationStep === 2) updateSavingsForm(target.form);
      else if (target.name === 'sameAddress') {
        if (target.checked)
          target.form.elements.address.value = target.form.elements.identityAddress.value;
        saveRegistration(target.form);
      } else if (target.name === 'identityType') {
        saveRegistration(target.form);
        render();
      }
    }
  });

  app.scope.listen(document, 'keydown', (event) => {
    if (event.key === 'Escape' && $('#sidebar')?.classList.contains('open')) {
      document.querySelector('[data-action="close-sidebar"]').click();
    }
  });

  app.scope.listen(modal, 'click', (event) => {
    if (event.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeDialog();
    }
  });

  app.scope.listen(modal, 'close', () => {
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  });
}
