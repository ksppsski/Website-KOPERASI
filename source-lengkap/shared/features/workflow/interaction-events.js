/**
 * Klik dan perubahan isian pada fitur workflow.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindWorkflowInteractions({
  close,
  refresh,
  capitalForm,
  offerForm,
  withdrawalForm,
  savingsForm,
  reviewDialog,
  state,
  registrationReview,
  completeKtpDialog,
  mutation,
  show,
  action,
  setBusy,
  $,
  api,
  adopt,
  notice,
  errorMessage,
  automaticPreview,
  mount,
}) {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-wf-action]');
    if (!button) return;
    const a = button.dataset.wfAction,
      id = button.dataset.id;
    if (a === 'close') close();
    if (a === 'refresh') void refresh();
    if (a === 'capital') await capitalForm(null, id);
    if (a === 'new-offer') await offerForm();
    if (a === 'withdrawal') void withdrawalForm();
    if (a === 'savings') await savingsForm();
    if (a === 'review') reviewDialog(id);
    if (a === 'revise') {
      const item = state.items.find((x) => x.id === id);
      if (item?.kind === 'capital') await capitalForm(item);
      else if (item?.kind === 'savings') await savingsForm(item);
      else if (item) await withdrawalForm(item);
    }
    if (a === 'registration-review') registrationReview(id);
    if (a === 'complete-ktp') completeKtpDialog();
    if (a === 'edit-registration') {
      window.dispatchEvent(new CustomEvent('kspps-edit-registration', { detail: state.profile }));
    }
    if (a === 'start') {
      const item = state.items.find((x) => x.id === id);
      if (item) await mutation(id, 'review', { action: 'start', version: item.version });
    }
    if (a === 'cancel') {
      show(
        'Batalkan permohonan?',
        /* HTML */ `<p>
            Permohonan pengunduran diri ini akan dibatalkan. Keanggotaan Anda tetap aktif.
          </p>
          <p class="form-error" id="wf-error" role="alert" hidden></p>
          <div class="form-actions">
            ${action('close', '', 'Kembali')}${action('confirm-cancel', id, 'Ya, batalkan', true)}
          </div>`,
      );
    }
    if (a === 'confirm-cancel') {
      if (state.busy) return;
      setBusy($('#dialog-content'), true);
      try {
        const result = await api('/' + id + '/cancel', { method: 'POST', body: '{}' });
        adopt(result.item);
        setBusy($('#dialog-content'), false);
        close();
        notice('Permohonan dibatalkan.');
      } catch (error) {
        setBusy($('#dialog-content'), false);
        errorMessage(error);
      }
    }
  });

  document.addEventListener('input', (event) => {
    if (event.target.name === 'agreementDate' && event.target.form?.id === 'wf-generate-form')
      $('#wf-automatic-dates').innerHTML = automaticPreview(
        event.target.value,
        state.items.find((x) => x.id === event.target.form.dataset.id),
      );
  });

  document.addEventListener('change', (event) => {
    if (event.target.dataset.wfFilter) {
      state.filters[event.target.dataset.wfFilter] = event.target.value;
      mount();
    }
    if (event.target.id === 'wf-signed') {
      const link = $('#wf-signed-preview');
      if (link.dataset.url) URL.revokeObjectURL(link.dataset.url);
      const file = event.target.files?.[0];
      if (file) {
        link.href = URL.createObjectURL(file);
        link.dataset.url = link.href;
        link.hidden = false;
      } else link.hidden = true;
      event.target.setCustomValidity(
        file?.size > 10 * 1024 * 1024 ? 'Ukuran berkas maksimal 10 MB.' : '',
      );
    }
    if (event.target.id === 'wf-proof') {
      $('#wf-file-name').textContent = event.target.files[0]?.name || '';
      event.target.setCustomValidity('');
      if (event.target.files[0]?.size > 10 * 1024 * 1024) {
        event.target.setCustomValidity('Ukuran berkas maksimal 10 MB.');
        event.target.reportValidity();
      }
    }
  });
}
