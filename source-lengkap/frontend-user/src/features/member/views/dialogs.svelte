<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { CapitalDetailView, DialogView, ProofInputView, ApplicationDialogView };
</script>

{#snippet CapitalDetailView({ badge, review, summary, icon })}
  <Content value={badge} /><Content value={review} /><Content value={summary} />
  <div class="form-actions">
    <a class="btn full" href="#dokumen">Lihat dokumen akad <Content value={icon} /></a>
  </div>
{/snippet}

{#snippet DialogView({ title, icon, content })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <button type="button" class="icon-btn" data-action="close-dialog" aria-label="Tutup">
        <Content value={icon} />
      </button>
    </div>
    <Content value={content} />
  </div>
{/snippet}

{#snippet ProofInputView()}
  <div class="file-picker">
    <strong>Bukti pembayaran</strong><label
      >Pilih berkas (maks. 10 MB)<input
        type="file"
        name="proof"
        accept="image/png,image/jpeg,application/pdf"
      /></label
    >
    <p class="field-hint">Berkas hanya dipilih di perangkat, tidak diunggah.</p>
  </div>
{/snippet}

{#snippet ApplicationDialogView({
  financeContent,
  type,
  field,
  fieldValue,
  selectField,
  fieldValueValue,
  financeContent2,
})}
  <p class="muted">
    <Content value={financeContent} />
  </p>
  <form id="application-form" data-kind={type} style="margin-top:22px">
    <Content value={field} />
    <div class="form-row">
      <Content value={fieldValue} /><Content value={selectField} />
    </div>
    <Content value={fieldValueValue} />
    <div class="info-box">
      <Content value={financeContent2} />
    </div>
    <p class="dialog-note">Pengajuan pada formulir ini belum dikirim kepada koperasi.</p>
    <div class="form-actions">
      <button class="btn secondary" type="button" data-action="close-dialog">Batal</button><button
        class="btn"
        type="submit">Catat pengajuan</button
      >
    </div>
  </form>
{/snippet}
