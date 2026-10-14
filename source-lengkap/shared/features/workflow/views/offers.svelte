<script module>
  import Content from '../../../components/Content.svelte';
  export { OfferFormView };
</script>

{#snippet OfferFormView({ action })}
  <form id="wf-offer-form">
    <label class="form-field"
      ><span>Nama penawaran *</span><input
        name="title"
        maxlength="80"
        placeholder="Pengadaan Barang Mitra"
        required=""
      /></label
    ><label class="form-field"
      ><span>Kode project *</span><input
        name="projectCode"
        maxlength="60"
        placeholder="MRBH-2026-09-01"
        required=""
      /><small class="field-hint">Gunakan kode berbeda untuk setiap penawaran.</small></label
    ><label class="form-field"
      ><span>Kuota penerimaan (Rp) *</span><input
        name="quota"
        type="number"
        min="1"
        max="1000000000000"
        step="1"
        inputmode="numeric"
        placeholder="1000000000"
        required=""
      /></label
    >
    <p id="wf-error" class="form-error" role="alert" hidden=""></p>
    <div class="form-actions">
      <Content value={action} /><button type="submit" class="btn">Buka penawaran</button>
    </div>
  </form>
{/snippet}
