import {
  ShowView,
  ReconciliationDialog2View,
  ReconciliationDialog4View,
  ReconciliationDialog3View,
  ReconciliationDialog5View,
  ReconciliationDialogView,
  Detail3View,
  Detail2View,
  DetailView,
} from './views/reconciliation-dialog.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Pemeriksaan bukti transfer dan rincian jadwal bagi hasil.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createReconciliationDialog({
  app,
  $,
  action,
  state,
  badge,
  money,
  esc,
  date,
  today,
  table,
}) {
  function show(title, content) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    app.ui.render(
      $('#dialog-content'),
      snippetView(ShowView, { title: title, action: action('close', 'Tutup'), content: content }),
    );
    modal.showModal();
    app.services.activity?.mount();
  }

  function reconciliationDialog(id, kind) {
    const x = state.items.find((i) => i.id === id && i.kind === kind);
    if (!x) return;
    const r = x.reconciliation,
      done = ['approved', 'correction'].includes(r.status) || x.sourceStatus === 'correction';
    show(
      'Rekonsiliasi ' + x.label.toLowerCase(),
      snippetView(ReconciliationDialogView, {
        panel: app.services.activity?.panel(x.id, 'reconciliation') || '',
        badge: badge(r),
        Rows: [
          ...(x.projectCode
            ? [
                ['Kode project', x.projectCode],
                ['Penawaran', x.offerTitle],
              ]
            : []),
          ['Anggota', x.memberName],
          ['Nomor anggota', x.memberId || '—'],
          ['Nominal pengajuan', money(x.amount)],
          ['Bukti transfer', x.proofName],
        ].map(([a, b]) => snippetView(ReconciliationDialog2View, { a: a, b: esc(b) })),
        proofUrl: esc(x.proofUrl),
        doneContent: done
          ? snippetView(ReconciliationDialog3View, {
              Rows: [
                ['Dana diterima', money(r.receivedAmount)],
                ['Tanggal dana masuk', date(r.transferDate)],
                ['Referensi mutasi', r.reference],
                ['Direkonsiliasi', date(r.checkedAt)],
                ['Catatan', r.note || '—'],
              ].map(([a, b]) => snippetView(ReconciliationDialog4View, { a: a, b: esc(b) })),
              statusContent:
                r.status === 'approved'
                  ? x.kind === 'savings'
                    ? 'Setoran simpanan wajib sudah masuk ke saldo anggota.'
                    : 'Dana sudah direkonsiliasi oleh Finance. Admin dapat melanjutkan pemeriksaan.'
                  : 'Permintaan perbaikan sudah tampil di portal anggota. Bukti yang dikirim ulang akan masuk sebagai tugas baru.',
            })
          : snippetView(ReconciliationDialog5View, {
              id: esc(id),
              kind: kind,
              version: r.version || 0,
              sourceVersion: x.sourceVersion,
              today: today(),
              todayValue: today(),
              note: esc(r.note || ''),
            }),
      }),
    );
  }

  function detail(index) {
    const m = state.payout?.members[index];
    if (!m) return;
    show(
      'Rincian bagi hasil',
      snippetView(DetailView, {
        memberName: esc(m.memberName),
        bankName: esc(m.bankName),
        bankAccount: esc(m.bankAccount),
        date: date(state.date),
        table: table(
          ['AKAD / EFEKTIF NISBAH', 'MODAL', 'PERIODE', 'BAGI HASIL'],
          m.contracts.map((c) =>
            snippetView(Detail2View, {
              contractNumber: esc(c.contractNumber),
              date: date(c.effectiveDate),
              contractStatusContent:
                c.contractStatus === 'generated' ? snippetView(Detail3View) : '',
              money: money(c.principal),
              period: c.period,
              money2: money(c.amount),
            }),
          ),
          '',
        ),
        money: money(m.amount),
      }),
    );
  }
  return { show, reconciliationDialog, detail };
}
