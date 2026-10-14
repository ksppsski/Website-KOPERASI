<script module>
  import Region from '../../../../../shared/components/Region.svelte';
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export { RegistrationProofInputView, RegistrationProofStatusView, RegistrationProofStatus2View };
</script>

{#snippet RegistrationProofInputView({
  registrationProofContent,
  registrationProofError2,
  registrationProofStatus,
  registrationProofErrorContent,
  registrationProofError,
})}
  <div class="file-picker registration-proof">
    <label class="field-label" for="registration-proof"
      >Bukti transfer pembayaran simpanan <span aria-hidden="true">*</span></label
    >
    <p class="field-hint" id="registration-proof-help">
      Wajib dilampirkan · JPG, PNG, atau PDF · Maks. 10 MB
    </p>
    <input
      type="file"
      id="registration-proof"
      name="registrationProof"
      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
      {...attributeProps(registrationProofContent)}
      aria-describedby="registration-proof-help registration-proof-error"
      aria-invalid={registrationProofError2}
    />
    <div id="registration-proof-selected" aria-live="polite">
      <Region name="registration-proof-selected" value={registrationProofStatus} />
    </div>
    <p
      class="form-error"
      id="registration-proof-error"
      role="alert"
      {...attributeProps(registrationProofErrorContent)}
    >
      <Content value={registrationProofError} />
    </p>
    <p class="field-hint">Bukti simpanan tersimpan bersama pendaftaran.</p>
  </div>
{/snippet}

{#snippet RegistrationProofStatusView()}
  <p class="field-hint">Memeriksa berkas…</p>
{/snippet}

{#snippet RegistrationProofStatus2View({ icon, fieldName, size })}
  <div class="registration-proof-file">
    <Content value={icon} />
    <div>
      <strong><Content value={fieldName} /></strong><span
        ><Content value={size} /> · Berkas terlampir</span
      >
    </div>
    <button class="link-button" type="button" data-action="remove-registration-proof">
      Hapus
    </button>
  </div>
{/snippet}
