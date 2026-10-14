import {
  RegistrationProofInputView,
  RegistrationProofStatusView,
  RegistrationProofStatus2View,
} from './views/registration-proof.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Unggahan bukti transfer pendaftaran: validasi dan status berkas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createRegistrationProof({ app, state, esc, icon, $, runtime, render }) {
  function registrationProofInput() {
    return snippetView(RegistrationProofInputView, {
      registrationProofContent: state.registrationProof ? {} : { required: true },
      registrationProofError2: Boolean(state.registrationProofError),
      registrationProofStatus: registrationProofStatus(),
      registrationProofErrorContent: state.registrationProofError ? {} : { hidden: true },
      registrationProofError: esc(state.registrationProofError),
    });
  }

  function registrationProofStatus() {
    if (state.registrationProofBusy) return snippetView(RegistrationProofStatusView);
    const file = state.registrationProof;
    if (!file) return '';
    const size =
      file.size < 1024 * 1024
        ? Math.max(1, Math.ceil(file.size / 1024)) + ' KB'
        : (file.size / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB';
    return snippetView(RegistrationProofStatus2View, {
      icon: icon('check'),
      fieldName: esc(file.name),
      size: size,
    });
  }

  function updateRegistrationProofView() {
    const input = $('#registration-proof');
    if (!input) return;
    input.required = !state.registrationProof;
    input.setCustomValidity(state.registrationProofError);
    input.setAttribute('aria-invalid', String(Boolean(state.registrationProofError)));
    app.ui.render($('#registration-proof-selected'), registrationProofStatus());
    const error = $('#registration-proof-error');
    error.textContent = state.registrationProofError;
    error.hidden = !state.registrationProofError;
    const next = $('#registration-form button[type="submit"]');
    if (next) next.disabled = state.registrationProofBusy;
  }

  async function registrationProofFileError(file) {
    if (!file) return 'Lampirkan bukti transfer pembayaran simpanan.';
    if (file.size === 0) return 'Berkas kosong. Pilih bukti transfer yang lain.';
    if (file.size > 10 * 1024 * 1024) return 'Ukuran berkas maksimal 10 MB.';
    const extension = file.name.split('.').pop().toLowerCase();
    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
    };
    const expected = types[extension];
    if (
      !Object.hasOwn(types, extension) ||
      (file.type && file.type !== 'application/octet-stream' && file.type !== expected)
    )
      return 'Gunakan berkas JPG, PNG, atau PDF.';
    try {
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const header =
        expected === 'image/jpeg'
          ? [255, 216, 255]
          : expected === 'image/png'
            ? [137, 80, 78, 71, 13, 10, 26, 10]
            : [37, 80, 68, 70, 45];
      if (!header.every((byte, index) => bytes[index] === byte))
        return 'Isi berkas tidak sesuai formatnya. Pilih JPG, PNG, atau PDF yang valid.';
    } catch {
      return 'Berkas tidak dapat dibaca. Silakan pilih ulang.';
    }
    return '';
  }

  async function selectRegistrationProof(input) {
    const file = input.files?.[0];
    if (!file) {
      updateRegistrationProofView();
      return;
    }
    const sequence = ++runtime.registrationProofSequence;
    state.registrationProof = null;
    state.registrationProofBusy = true;
    state.registrationProofError = '';
    updateRegistrationProofView();
    const error = await registrationProofFileError(file);
    if (sequence !== runtime.registrationProofSequence) return;
    state.registrationProofBusy = false;
    state.registrationProofError = error;
    state.registrationProof = error ? null : file;
    if (error) input.value = '';
    updateRegistrationProofView();
  }

  function requireRegistrationProof() {
    if (state.registrationProof && !state.registrationProofBusy) return true;
    if (state.registrationStep !== 2) {
      state.registrationStep = 2;
      render();
    }
    if (!state.registrationProofBusy)
      state.registrationProofError =
        state.registrationProofError || 'Lampirkan bukti transfer pembayaran simpanan.';
    updateRegistrationProofView();
    const input = $('#registration-proof');
    input?.focus();
    if (!state.registrationProofBusy) input?.reportValidity();
    return false;
  }
  return {
    registrationProofInput,
    registrationProofStatus,
    updateRegistrationProofView,
    registrationProofFileError,
    selectRegistrationProof,
    requireRegistrationProof,
  };
}
