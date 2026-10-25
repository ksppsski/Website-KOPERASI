<script module>
  import Region from '../../../../../shared/components/Region.svelte';
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export { RegistrationKtpInputView, RegistrationKtpStatusView, RegistrationKtpStatus2View };
</script>

{#snippet RegistrationKtpInputView({
  registrationKtpContent,
  registrationKtpStatus,
  registrationKtpErrorContent,
  registrationKtpError,
})}
  <div class="file-picker registration-proof">
    <label class="field-label" for="registration-ktp">Foto KTP *</label>
    <p class="field-hint" id="registration-ktp-help">
      Wajib · JPG atau PNG · Maks. 10 MB · Seluruh KTP terlihat jelas.
    </p>
    <input
      type="file"
      id="registration-ktp"
      name="registrationKtp"
      accept=".jpg,.jpeg,.png,image/jpeg,image/png"
      {...attributeProps(registrationKtpContent)}
      aria-describedby="registration-ktp-help registration-ktp-error"
    />
    <div id="registration-ktp-selected" aria-live="polite">
      <Region name="registration-ktp-selected" value={registrationKtpStatus} />
    </div>
    <p
      class="form-error"
      id="registration-ktp-error"
      role="alert"
      {...attributeProps(registrationKtpErrorContent)}
    >
      <Content value={registrationKtpError} />
    </p>
  </div>
{/snippet}

{#snippet RegistrationKtpStatusView()}
  <p class="field-hint">Memeriksa foto KTP…</p>
{/snippet}

{#snippet RegistrationKtpStatus2View({ fieldName, registrationKtpUrl })}
  <div class="registration-proof-file">
    <div><strong><Content value={fieldName} /></strong><span>Foto KTP terlampir</span></div>
    <button class="link-button" type="button" data-action="remove-registration-ktp"> Hapus </button>
  </div>
  <img
    class="registration-ktp-preview"
    src={registrationKtpUrl}
    alt="Foto KTP yang dipilih"
    width="400"
    height="252"
  />
{/snippet}
