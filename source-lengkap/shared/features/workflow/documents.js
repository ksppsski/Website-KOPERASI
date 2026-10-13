/**
 * Daftar dokumen, pratinjau tanggal akad, generate, unggah, dan unduh PDF.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowDocuments({ state, esc, status, money, date, empty, input }) {
  function generatedDocuments() {
    const items = state.items.filter((x) => x.status === 'signed' && x.signedUrl);
    return items.length
      ? /* HTML */ `<div class="wf-cards">
          ${items
            .map(
              (item) =>
                /* HTML */ `<article class="wf-card">
                  <div class="wf-card-head">
                    <strong>${esc(item.documentName || 'Akad Penyertaan Modal')}</strong
                    >${status(item)}
                  </div>
                  <p>${esc(item.contractNumber)}</p>
                  <p class="small muted">${money(item.amount)} · ${date(item.signedAt)}</p>
                  <p class="field-hint">Kelengkapan tanda tangan dikonfirmasi petugas.</p>
                  <div class="wf-actions">
                    <a
                      class="btn secondary small-btn"
                      href="${item.signedUrl}"
                      target="_blank"
                      rel="noopener"
                      >Lihat PDF</a
                    ><a class="btn small-btn" href="${item.signedUrl}?download=1">Unduh PDF</a>
                  </div>
                </article>`,
            )
            .join('')}
        </div>`
      : empty(
          'Akad lengkap akan tampil setelah petugas mengunggah PDF yang ditandatangani kedua pihak.',
        );
  }

  function automaticDates(value) {
    const d = new Date(value + 'T12:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(d.getTime()) ||
      d.toISOString().slice(0, 10) !== value
    )
      return null;
    const month = d.getUTCMonth() + 1,
      roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1],
      code = `SPK-SKI-MRBH-${month}/${roman}/${d.getUTCFullYear()}`;
    d.setUTCDate(d.getUTCDate() + 10);
    if (d.getUTCDate() === 31) d.setUTCDate(d.getUTCDate() + 1);
    const effectiveDate = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 365);
    return { code, effectiveDate, endDate: d.toISOString().slice(0, 10) };
  }

  function automaticPreview(value, item) {
    const d = automaticDates(value);
    if (d && item?.renewalEffectiveDate) {
      d.effectiveDate = item.renewalEffectiveDate;
      const end = new Date(d.effectiveDate + 'T12:00:00Z');
      end.setUTCDate(end.getUTCDate() + 365);
      d.endDate = end.toISOString().slice(0, 10);
    }
    return d
      ? /* HTML */ `<dl class="review-list">
            <div>
              <dt>Nomor urut akad</dt>
              <dd>Otomatis saat PDF dibuat</dd>
            </div>
            <div>
              <dt>Kode surat</dt>
              <dd>${esc(d.code)}</dd>
            </div>
            <div>
              <dt>Efektif nisbah (${item?.renewalOf ? 'tanpa +10 hari' : '+10 hari'})</dt>
              <dd>${date(d.effectiveDate + 'T12:00:00Z')}</dd>
            </div>
            <div>
              <dt>Selesai (+365 hari)</dt>
              <dd>${date(d.endDate + 'T12:00:00Z')}</dd>
            </div>
          </dl>
          <p class="field-hint">
            Tanggal efektif yang jatuh pada 31 dialihkan ke tanggal 1 bulan berikutnya.
          </p>`
      : '<p class="field-hint">Pilih tanggal akad yang valid.</p>';
  }

  function generationForm(item) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    return /* HTML */ `<div class="wf-note">
        Data sudah diperiksa Admin dan dana sudah direkonsiliasi Finance.
      </div>
      <form id="wf-generate-form" data-id="${item.id}" data-version="${item.version}">
        ${input('Tanggal akad', 'agreementDate', today, 'date', 'min="1900-01-01" max="9998-12-20"')}
        <div id="wf-automatic-dates" aria-live="polite">${automaticPreview(today, item)}</div>
        <label class="check"
          ><input type="checkbox" name="confirm" required />Data akad dan tanda tangan anggota sudah
          sesuai.</label
        >
        <p id="wf-error" class="form-error" hidden role="alert"></p>
        <div class="wf-actions">
          <button class="btn" type="submit">Generate &amp; unduh PDF</button>
        </div>
        <p class="field-hint">
          Layout mengikuti template asli. Bagian Ketua dikosongkan untuk ditandatangani.
        </p>
      </form>`;
  }

  function uploadForm(item) {
    return /* HTML */ `<div class="wf-note">
        <strong>Menunggu tanda tangan koperasi</strong>
        <p>Unduh PDF awal, tandatangani bagian Ketua, lalu unggah PDF lengkap di bawah.</p>
      </div>
      <form id="wf-signed-form" data-id="${item.id}" data-version="${item.version}">
        <div class="file-picker">
          <label class="field-label" for="wf-signed">Akad dengan kedua tanda tangan *</label
          ><input id="wf-signed" name="signed" type="file" accept=".pdf,application/pdf" required />
          <p class="field-hint">PDF · Maks. 10 MB</p>
          <a id="wf-signed-preview" class="link-button" hidden target="_blank" rel="noopener"
            >Periksa PDF yang dipilih</a
          >
        </div>
        <label class="check"
          ><input name="confirm" type="checkbox" required />Saya sudah memeriksa nomor akad
          ${esc(item.contractNumber)}, seluruh halaman, dan kedua tanda tangan pada PDF ini.</label
        >
        <p id="wf-error" class="form-error" hidden role="alert"></p>
        <div class="wf-actions"><button class="btn" type="submit">Unggah akad lengkap</button></div>
      </form>`;
  }

  async function downloadPdf(item) {
    const response = await fetch(item.contractUrl + '?download=1', { credentials: 'same-origin' });
    if (!response.ok)
      throw new Error('PDF tersimpan, tetapi unduh otomatis gagal. Gunakan tombol Unduh PDF awal.');
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = item.documentFilename || 'SPK.pdf';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  return {
    generatedDocuments,
    automaticDates,
    automaticPreview,
    generationForm,
    uploadForm,
    downloadPdf,
  };
}
