<script module>
  import Content from '../../../components/Content.svelte';
  import Region from '../../../components/Region.svelte';
  export {
    GeneratedDocuments2View,
    GeneratedDocumentsView,
    AutomaticPreviewView,
    AutomaticPreview2View,
    GenerationFormView,
    UploadFormView,
  };
</script>

{#snippet GeneratedDocuments2View({
  documentName,
  status,
  contractNumber,
  money,
  date,
  signedUrl,
  signedUrlValue,
})}
  <article class="wf-card">
    <div class="wf-card-head">
      <strong><Content value={documentName} /></strong><Content value={status} />
    </div>
    <p><Content value={contractNumber} /></p>
    <p class="small muted"><Content value={money} /> · <Content value={date} /></p>
    <p class="field-hint">Kelengkapan tanda tangan dikonfirmasi petugas.</p>
    <div class="wf-actions">
      <a class="btn secondary small-btn" href={signedUrl} target="_blank" rel="noopener"
        >Lihat PDF</a
      ><a class="btn small-btn" href={signedUrlValue + '?download=1'}>Unduh PDF</a>
    </div>
  </article>
{/snippet}

{#snippet GeneratedDocumentsView({ itemsRows })}
  <div class="wf-cards">
    <Content value={itemsRows} />
  </div>
{/snippet}

{#snippet AutomaticPreviewView({ code, renewalOfContent, date, date2 })}
  <dl class="review-list">
    <div>
      <dt>Nomor urut akad</dt>
      <dd>Otomatis saat PDF dibuat</dd>
    </div>
    <div>
      <dt>Kode surat</dt>
      <dd><Content value={code} /></dd>
    </div>
    <div>
      <dt>Efektif nisbah (<Content value={renewalOfContent} />)</dt>
      <dd><Content value={date} /></dd>
    </div>
    <div>
      <dt>Selesai (+365 hari)</dt>
      <dd><Content value={date2} /></dd>
    </div>
  </dl>
  <p class="field-hint">
    Tanggal efektif yang jatuh pada 31 dialihkan ke tanggal 1 bulan berikutnya.
  </p>
{/snippet}

{#snippet AutomaticPreview2View()}
  <p class="field-hint">Pilih tanggal akad yang valid.</p>
{/snippet}

{#snippet GenerationFormView({ id, version, input, automaticPreview })}
  <div class="wf-note">Data sudah diperiksa Admin dan dana sudah direkonsiliasi Finance.</div>
  <form id="wf-generate-form" data-id={id} data-version={version}>
    <Content value={input} />
    <div id="wf-automatic-dates" aria-live="polite">
      <Region name="wf-automatic-dates" value={automaticPreview} />
    </div>
    <label class="check"
      ><input type="checkbox" name="confirm" required="" />Data akad dan tanda tangan anggota sudah
      sesuai.</label
    >
    <p id="wf-error" class="form-error" hidden="" role="alert"></p>
    <div class="wf-actions">
      <button class="btn" type="submit">Generate &amp; unduh PDF</button>
    </div>
    <p class="field-hint">
      Layout mengikuti template asli. Bagian Ketua dikosongkan untuk ditandatangani.
    </p>
  </form>
{/snippet}

{#snippet UploadFormView({ id, version, contractNumber })}
  <div class="wf-note">
    <strong>Menunggu tanda tangan koperasi</strong>
    <p>Unduh PDF awal, tandatangani bagian Ketua, lalu unggah PDF lengkap di bawah.</p>
  </div>
  <form id="wf-signed-form" data-id={id} data-version={version}>
    <div class="file-picker">
      <label class="field-label" for="wf-signed">Akad dengan kedua tanda tangan *</label><input
        id="wf-signed"
        name="signed"
        type="file"
        accept=".pdf,application/pdf"
        required=""
      />
      <p class="field-hint">PDF · Maks. 10 MB</p>
      <a id="wf-signed-preview" class="link-button" hidden="" target="_blank" rel="noopener"
        >Periksa PDF yang dipilih</a
      >
    </div>
    <label class="check"
      ><input name="confirm" type="checkbox" required="" />Saya sudah memeriksa nomor akad
      <Content value={contractNumber} />, seluruh halaman, dan kedua tanda tangan pada PDF ini.</label
    >
    <p id="wf-error" class="form-error" hidden="" role="alert"></p>
    <div class="wf-actions"><button class="btn" type="submit">Unggah akad lengkap</button></div>
  </form>
{/snippet}
