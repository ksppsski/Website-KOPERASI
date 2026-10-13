/**
 * Unggahan KTP: validasi, pratinjau, dan perlindungan hasil unggahan lama.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createRegistrationIdentity({
  state,
  esc,
  runtime,
  $,
  registrationProofFileError,
  saveRegistration,
  render,
}) {
  function registrationKtpInput() {
    return /* HTML */ `<div class="file-picker registration-proof">
      <label class="field-label" for="registration-ktp">Foto KTP *</label>
      <p class="field-hint" id="registration-ktp-help">
        Wajib · JPG atau PNG · Maks. 10 MB · Seluruh KTP terlihat jelas.
      </p>
      <input
        type="file"
        id="registration-ktp"
        name="registrationKtp"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        ${state.registrationKtp ? '' : 'required'}
        aria-describedby="registration-ktp-help registration-ktp-error"
      />
      <div id="registration-ktp-selected" aria-live="polite">${registrationKtpStatus()}</div>
      <p
        class="form-error"
        id="registration-ktp-error"
        role="alert"
        ${state.registrationKtpError ? '' : 'hidden'}
      >
        ${esc(state.registrationKtpError)}
      </p>
    </div>`;
  }

  function registrationKtpStatus() {
    if (state.registrationKtpBusy) return '<p class="field-hint">Memeriksa foto KTP…</p>';
    const file = state.registrationKtp;
    if (!file) return '';
    return /* HTML */ `<div class="registration-proof-file">
        <div><strong>${esc(file.name)}</strong><span>Foto KTP terlampir</span></div>
        <button class="link-button" type="button" data-action="remove-registration-ktp">
          Hapus
        </button>
      </div>
      <img
        class="registration-ktp-preview"
        src="${esc(state.registrationKtpUrl)}"
        alt="Pratinjau foto KTP"
        width="400"
        height="252"
      />`;
  }

  function resetRegistrationKtp() {
    runtime.registrationKtpSequence++;
    if (state.registrationKtpUrl) URL.revokeObjectURL(state.registrationKtpUrl);
    state.registrationKtp = null;
    state.registrationKtpUrl = '';
    state.registrationKtpError = '';
    state.registrationKtpBusy = false;
  }

  function updateRegistrationKtpView() {
    const input = $('#registration-ktp');
    if (!input) return;
    input.required = !state.registrationKtp;
    input.setCustomValidity(state.registrationKtpError);
    input.setAttribute('aria-invalid', String(Boolean(state.registrationKtpError)));
    $('#registration-ktp-selected').innerHTML = registrationKtpStatus();
    const error = $('#registration-ktp-error');
    error.textContent = state.registrationKtpError;
    error.hidden = !state.registrationKtpError;
    const button = $('#registration-form button[type="submit"]');
    if (button) button.disabled = state.registrationKtpBusy;
  }

  async function selectRegistrationKtp(input) {
    const file = input.files?.[0];
    if (!file) {
      updateRegistrationKtpView();
      return;
    }
    resetRegistrationKtp();
    const sequence = runtime.registrationKtpSequence;
    state.registrationKtpBusy = true;
    updateRegistrationKtpView();
    let error = !/\.(jpe?g|png)$/i.test(file.name)
        ? 'Gunakan foto KTP JPG atau PNG.'
        : (await registrationProofFileError(file))
            .replaceAll('bukti transfer pembayaran simpanan', 'foto KTP')
            .replaceAll('bukti transfer', 'foto KTP')
            .replaceAll('JPG, PNG, atau PDF', 'JPG atau PNG'),
      url = '';
    if (!error) {
      url = URL.createObjectURL(file);
      error = await new Promise((resolve) => {
        const photo = new Image();
        photo.onload = () => {
          const png = /\.png$/i.test(file.name),
            pixels = photo.naturalWidth * photo.naturalHeight;
          resolve(
            !pixels
              ? 'Foto KTP tidak dapat dibaca.'
              : png && pixels > 8000000
                ? 'Resolusi PNG maksimal 8 megapiksel. Gunakan JPG untuk foto lebih besar.'
                : !png && pixels > 50000000
                  ? 'Resolusi JPG maksimal 50 megapiksel.'
                  : '',
          );
        };
        photo.onerror = () => resolve('Foto KTP tidak dapat dibaca. Pilih gambar yang valid.');
        photo.src = url;
      });
    }
    if (sequence !== runtime.registrationKtpSequence) {
      if (url) URL.revokeObjectURL(url);
      return;
    }
    state.registrationKtpBusy = false;
    state.registrationKtpError = error;
    if (error) {
      if (url) URL.revokeObjectURL(url);
      input.value = '';
    } else {
      state.registrationKtp = file;
      state.registrationKtpUrl = url;
    }
    updateRegistrationKtpView();
  }

  function requireRegistrationKtp() {
    if (state.registrationKtp && !state.registrationKtpBusy) return true;
    if (state.registrationStep !== 1) {
      saveRegistration($('#registration-form'));
      state.registrationStep = 1;
      render();
    }
    if (!state.registrationKtpBusy)
      state.registrationKtpError = state.registrationKtpError || 'Foto KTP wajib diunggah.';
    updateRegistrationKtpView();
    const input = $('#registration-ktp');
    input?.focus();
    if (!state.registrationKtpBusy) input?.reportValidity();
    return false;
  }
  return {
    registrationKtpInput,
    registrationKtpStatus,
    resetRegistrationKtp,
    updateRegistrationKtpView,
    selectRegistrationKtp,
    requireRegistrationKtp,
  };
}
