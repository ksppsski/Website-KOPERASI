<script module>
  export { UploadView };
</script>

{#snippet UploadView()}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title">Unggah laporan</h2>
      <button class="icon-btn" data-report-action="close" aria-label="Tutup">×</button>
    </div>
    <form id="report-upload">
      <label class="form-field"
        ><span>Jenis laporan *</span><select name="category" id="report-category" required="">
          <option value="financial">Laporan Keuangan</option>
          <option value="utilization">Penggunaan Dana Penyertaan Modal</option>
        </select></label
      ><label class="form-field"
        ><span>Judul laporan *</span><input
          name="title"
          maxlength="120"
          required=""
          placeholder="Laporan Keuangan September 2026"
        /></label
      ><label class="form-field"
        ><span>Periode *</span><input name="period" type="month" required="" /></label
      ><label class="form-field" id="report-project-field" hidden=""
        ><span>Kode project *</span><input
          name="projectCode"
          maxlength="60"
          placeholder="MRBH-2026-09-01"
        /></label
      ><label class="form-field"
        ><span>File laporan PDF *</span><input
          name="file"
          type="file"
          accept=".pdf,application/pdf"
          required=""
        /><small>PDF · Maksimal 10 MB</small></label
      ><label class="check"
        ><input name="confirm" type="checkbox" required="" />Laporan sudah diperiksa dan boleh
        dibaca anggota koperasi.</label
      >
      <p id="report-error" class="form-error" role="alert" hidden=""></p>
      <div class="form-actions">
        <button type="button" class="btn secondary" data-report-action="close">Batal</button><button
          type="submit"
          class="btn">Terbitkan laporan</button
        >
      </div>
    </form>
  </div>
{/snippet}
