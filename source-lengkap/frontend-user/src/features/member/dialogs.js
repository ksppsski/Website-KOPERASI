import { workflowService } from '../../../../shared/services/workflow.js';
import { maturityService } from '../../../../shared/services/maturity.js';
/**
 * Dialog anggota, detail akad, dan unduhan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberDialogs({
  currentContracts,
  badge,
  review,
  rupiah,
  workflowItems,
  icon,
  runtime,
  $,
  modal,
  field,
  selectField,
}) {
  function capitalDetail(id) {
    const x = currentContracts().find((c) => c.id === id);
    if (!x) return;
    dialog(
      'Rincian penyertaan modal',
      /* HTML */ `${badge(x.status === 'Selesai' ? 'Periode selesai' : x.status, x.status === 'Aktif' ? 'green' : 'gray')}${review(
          [
            ['Nomor akad', x.number],
            ['Tujuan', x.title],
            ['Nilai penyertaan modal', rupiah(x.amount)],
            ['Tanggal efektif nisbah', x.start],
            ['Akhir periode', x.end],
            ['Mekanisme bagi hasil', 'Sesuai akad kerja sama'],
          ],
        )}${maturityService?.summary(workflowItems().find((i) => i.id === id)) || ''}
        <div class="form-actions">
          <a class="btn full" href="#dokumen">Lihat dokumen akad ${icon('arrow')}</a>
        </div>`,
    );
  }

  function dialog(title, content) {
    runtime.lastFocus = document.activeElement;
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        <button type="button" class="icon-btn" data-action="close-dialog" aria-label="Tutup">
          ${icon('close')}
        </button>
      </div>
      ${content}
    </div>`;
    modal.showModal();
  }

  function closeDialog() {
    modal.close();
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  }

  function proofInput() {
    return /* HTML */ `<div class="file-picker">
      <strong>Bukti pembayaran</strong
      ><label class="check" style="margin:10px 0"
        ><input type="checkbox" name="sampleProof" checked />Gunakan bukti contoh</label
      ><label
        >Atau pilih berkas (maks. 10 MB)<input
          type="file"
          name="proof"
          accept="image/png,image/jpeg,application/pdf"
      /></label>
      <p class="field-hint">Berkas hanya dipilih di perangkat, tidak diunggah.</p>
    </div>`;
  }

  function depositDialog() {
    void workflowService?.savingsForm();
  }

  function applicationDialog(type) {
    const finance = type === 'Pembiayaan';
    dialog(
      finance ? 'Pengajuan pembiayaan' : 'Pengajuan penyertaan modal',
      /* HTML */ `<p class="muted">
          ${
            finance
              ? 'Isi kebutuhan barang untuk ditinjau tim koperasi.'
              : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra.'
          }
        </p>
        <form id="application-form" data-kind="${type}" style="margin-top:22px">
          ${field(finance ? 'Kebutuhan barang' : 'Tujuan penyertaan modal', 'purpose', '')}
          <div class="form-row">
            ${field(
              finance ? 'Estimasi harga barang (Rp)' : 'Nominal penyertaan (Rp)',
              'amount',
              '',
              { type: 'number', min: 1 },
            )}${selectField(
              'Usulan periode',
              'period',
              ['3 bulan', '6 bulan', '12 bulan'],
              '12 bulan',
            )}
          </div>
          ${field('Catatan tambahan', 'note', '', { required: false, placeholder: 'Jika ada' })}
          <div class="info-box">
            ${
              finance
                ? 'Harga jual, margin, dan jadwal pembayaran ditetapkan setelah peninjauan dan kesepakatan akad.'
                : 'Periode dan mekanisme bagi hasil mengikuti akad yang disepakati.'
            }
          </div>
          <p class="dialog-note">Pengajuan ini hanya simulasi, belum dikirim kepada koperasi.</p>
          <div class="form-actions">
            <button class="btn secondary" type="button" data-action="close-dialog">Batal</button
            ><button class="btn" type="submit">Buat pengajuan contoh</button>
          </div>
        </form>`,
    );
  }

  function download(name, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileValid(form) {
    const f = form.elements.proof?.files?.[0];
    const sample = form.elements.sampleProof?.checked;
    let error = '';
    if (!sample && !f) error = 'Pilih bukti pembayaran atau gunakan bukti contoh.';
    if (f && f.size > 10 * 1024 * 1024) error = 'Ukuran berkas maksimal 10 MB.';
    const e = $('#proof-error', form);
    e.textContent = error;
    e.hidden = !error;
    return !error;
  }
  return {
    capitalDetail,
    dialog,
    closeDialog,
    proofInput,
    depositDialog,
    applicationDialog,
    download,
    fileValid,
  };
}
