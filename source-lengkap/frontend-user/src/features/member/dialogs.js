import {
  CapitalDetailView,
  DialogView,
  ProofInputView,
  ApplicationDialogView,
} from './views/dialogs.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Dialog anggota, detail akad, dan unduhan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberDialogs({
  app,
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
      snippetView(CapitalDetailView, {
        badge: badge(
          x.status === 'Selesai' ? 'Periode selesai' : x.status,
          x.status === 'Aktif' ? 'green' : 'gray',
        ),
        review: review([
          ['Nomor akad', x.number],
          ['Tujuan', x.title],
          ['Nilai penyertaan modal', rupiah(x.amount)],
          ['Tanggal efektif nisbah', x.start],
          ['Akhir periode', x.end],
          ['Mekanisme bagi hasil', 'Sesuai akad kerja sama'],
        ]),
        summary: app.services.maturity?.summary(workflowItems().find((i) => i.id === id)) || '',
        icon: icon('arrow'),
      }),
    );
  }

  function dialog(title, content) {
    runtime.lastFocus = document.activeElement;
    app.ui.render(
      $('#dialog-content'),
      snippetView(DialogView, { title: title, icon: icon('close'), content: content }),
    );
    modal.showModal();
  }

  function closeDialog() {
    modal.close();
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  }

  function proofInput() {
    return snippetView(ProofInputView);
  }

  function depositDialog() {
    void app.services.workflow?.savingsForm();
  }

  function applicationDialog(type) {
    const finance = type === 'Pembiayaan';
    dialog(
      finance ? 'Pengajuan pembiayaan' : 'Pengajuan penyertaan modal',
      snippetView(ApplicationDialogView, {
        financeContent: finance
          ? 'Isi kebutuhan barang untuk ditinjau tim koperasi.'
          : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra.',
        type: type,
        field: field(finance ? 'Kebutuhan barang' : 'Tujuan penyertaan modal', 'purpose', ''),
        fieldValue: field(
          finance ? 'Estimasi harga barang (Rp)' : 'Nominal penyertaan (Rp)',
          'amount',
          '',
          { type: 'number', min: 1 },
        ),
        selectField: selectField(
          'Usulan periode',
          'period',
          ['3 bulan', '6 bulan', '12 bulan'],
          '12 bulan',
        ),
        fieldValueValue: field('Catatan tambahan', 'note', '', {
          required: false,
          placeholder: 'Jika ada',
        }),
        financeContent2: finance
          ? 'Harga jual, margin, dan jadwal pembayaran ditetapkan setelah peninjauan dan kesepakatan akad.'
          : 'Periode dan mekanisme bagi hasil mengikuti akad yang disepakati.',
      }),
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
    app.scope.timeout(() => URL.revokeObjectURL(url), 1000);
  }

  function fileValid(form) {
    const f = form.elements.proof?.files?.[0];
    let error = '';
    if (!f) error = 'Pilih bukti pembayaran.';
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
