import {
  Details2View,
  DetailsView,
  Form2View,
  Form3View,
  FormView,
  ReadyView,
  Ready2View,
  SignatureView,
  ReviewDialog2View,
  ReviewDialog3View,
  ReviewDialog4View,
  ReviewDialogView,
} from './views/review-dialog.svelte';
import { shortId, date, money, status, esc, checks, workStage } from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Dialog pemeriksaan satu pengajuan beserta tindakan yang tersedia.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowReviewDialog({
  app,
  state,
  generationForm,
  profileDetails,
  show,
  workPanel,
  financeStatus,
  links,
  uploadForm,
}) {
  function reviewDialog(id) {
    const item = state.items.find((x) => x.id === id);
    if (!item) return;
    const capital = item.kind === 'capital';
    const rows = [
      ...(item.projectCode
        ? [
            ['Kode project', item.projectCode],
            ['Penawaran', item.offerTitle],
          ]
        : []),
      ['Nomor pengajuan', shortId(item)],
      ['Nama anggota', item.memberName],
      ['Nomor anggota', item.memberId],
      ['Diterima', date(item.createdAt)],
      ...(capital
        ? [
            ['Nominal setoran', money(item.amount)],
            ['Tujuan', 'Pengadaan kebutuhan barang Mitra'],
            ['Bukti transfer', item.proofName],
          ]
        : [['Alasan', item.reason]]),
    ];
    const details = snippetView(DetailsView, {
      status: status(item),
      rowsRows: rows.map(([a, b]) => snippetView(Details2View, { a: a, b: esc(b) })),
    });
    const terminal = [
      'generated',
      'signed',
      'approved',
      'finance_pending',
      'manager_pending',
      'completed',
      'rejected',
      'cancelled',
      'generating',
      'correction',
    ].includes(item.status);
    const form = terminal
      ? ''
      : snippetView(FormView, {
          id: item.id,
          version: item.version,
          capitalContent: capital
            ? checks([
                ['identity', 'Identitas anggota sesuai.'],
                ['amount', 'Nominal pengajuan dan data akad sesuai.'],
              ])
            : '',
          capitalContent2: capital
            ? 'Wajib diisi jika meminta perbaikan.'
            : 'Wajib diisi jika menolak permohonan.',
          note: esc(item.note),
          capitalContent3: capital && !item.renewalOf ? snippetView(Form2View) : '',
          capitalContent4: !capital ? snippetView(Form3View) : '',
          capitalContent5: capital && item.finance?.status !== 'approved' ? { disabled: true } : {},
          capitalContent6: capital ? 'Setujui draf' : 'Setujui permohonan',
        });
    const ready =
      item.status === 'ready'
        ? item.finance?.status !== 'approved'
          ? snippetView(ReadyView)
          : item.signatureAvailable
            ? generationForm(item)
            : snippetView(Ready2View)
        : form;
    const signature =
      capital && item.signatureUrl
        ? snippetView(SignatureView, {
            profileDetails: profileDetails({ data: item.member, memberNumber: item.memberId }),
            signatureUrl: item.signatureUrl,
          })
        : '';
    show(
      capital ? 'Pemeriksaan penyertaan modal' : 'Pemeriksaan pengunduran diri',
      snippetView(ReviewDialogView, {
        workPanel: workPanel(item.id, workStage(item)),
        details: details,
        capitalContent: capital
          ? financeStatus(item)
          : app.services.withdrawal?.summary(item) || '',
        signature: signature,
        links: links(item),
        noteContent:
          item.note && terminal ? snippetView(ReviewDialog2View, { note: esc(item.note) }) : '',
        kindContent:
          item.kind === 'withdrawal' && ['approved', 'rejected'].includes(item.status)
            ? snippetView(ReviewDialog3View, { date: date(item.updatedAt) })
            : '',
        ready: ready,
        statusContent: item.status === 'generated' && item.contractData ? uploadForm(item) : '',
        statusContent2:
          item.status === 'signed'
            ? snippetView(ReviewDialog4View, { date: date(item.signedAt) })
            : '',
      }),
    );
  }
  return { reviewDialog };
}
