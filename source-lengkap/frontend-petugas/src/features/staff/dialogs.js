import {
  DialogView,
  DecisionFormView,
  CandidateDialogView,
  CandidateDialog2View,
  DepositDialog2View,
  DepositDialog3View,
  DepositDialogView,
  RequestDialog2View,
  RequestDialog3View,
  RequestDialogView,
  MemberDialogView,
  DraftDialogView,
  ContractDialogView,
} from './views/dialogs.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Dialog pemeriksaan petugas dan detail dokumen.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffDialogs({
  app,
  runtime,
  $,
  icon,
  modal,
  checks,
  statusHead,
  review,
  rupiah,
  esc,
  name,
  member,
  canDraft,
  toast,
  logo,
}) {
  function dialog(title, body) {
    runtime.lastFocus = document.activeElement;
    app.ui.render(
      $('#dialog-content'),
      snippetView(DialogView, { title: title, icon: icon('close'), body: body }),
    );
    modal.showModal();
  }

  function closeDialog() {
    modal.close();
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  }

  function decisionForm(kind, id, items, label) {
    return snippetView(DecisionFormView, {
      kind: kind,
      id: id,
      checks: checks(items),
      label: label,
    });
  }

  function candidateDialog(id) {
    const x = runtime.state.candidates.find((x) => x.id === id);
    if (!x) return;
    dialog('Pemeriksaan calon anggota', [
      statusHead(x),
      review([
        ['Nama lengkap', x.name],
        ['Nomor identitas', x.identity],
        ['WhatsApp', x.phone],
        ['Email', x.email],
        ['Alamat domisili', x.address],
        ['Pekerjaan', x.job],
        ['Ahli waris', x.heir],
        ['Setoran awal (contoh)', rupiah(x.amount)],
      ]),
      x.note ? snippetView(CandidateDialogView, { note: esc(x.note) }) : '',
      x.status === 'Disetujui'
        ? snippetView(CandidateDialog2View, { memberId: x.memberId })
        : decisionForm(
            'candidate',
            id,
            [
              ['identity', 'Data identitas dan persyaratan sesuai.'],
              ['funds', 'Setoran keanggotaan sudah dicocokkan.'],
            ],
            'Setujui keanggotaan',
          ),
    ]);
  }

  function depositDialog(id) {
    const x = runtime.state.deposits.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pemeriksaan setoran',
      snippetView(DepositDialogView, {
        statusHead: statusHead(x),
        review: review([
          ['Anggota', name(x.member)],
          ['Nomor anggota', x.member],
          ['Jenis setoran', x.type],
          ['Periode / referensi', x.period],
          ['Nominal pengajuan', rupiah(x.amount)],
        ]),
        fieldName: esc(name(x.member)),
        rupiah: rupiah(x.proof),
        amountContent: x.amount === x.proof ? 'Sesuai' : 'Berbeda',
        noteContent: x.note ? snippetView(DepositDialog2View, { note: esc(x.note) }) : '',
        statusContent:
          x.status === 'Terverifikasi'
            ? snippetView(DepositDialog3View)
            : decisionForm(
                'deposit',
                id,
                [
                  ['memberMatch', 'Pengirim dan data anggota cocok.'],
                  ['amountMatch', 'Nominal sesuai dengan pengajuan.'],
                  ['reconciled', 'Dana masuk sudah direkonsiliasi.'],
                ],
                'Verifikasi setoran',
              ),
      }),
    );
  }

  function requestDialog(id) {
    const x = runtime.state.requests.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Tinjauan pengajuan layanan',
      snippetView(RequestDialogView, {
        statusHead: statusHead(x),
        review: review([
          ['Anggota', name(x.member)],
          ['Layanan', x.type],
          ['Kebutuhan', x.purpose],
          ['Nilai pengajuan', rupiah(x.amount)],
          ['Usulan periode', x.period],
          ...(x.type === 'Penyertaan Modal'
            ? [['Status dana', x.funds ? 'Terverifikasi' : 'Menunggu verifikasi']]
            : []),
        ]),
        noteContent: x.note ? snippetView(RequestDialog2View, { note: esc(x.note) }) : '',
        statusContent:
          x.status === 'Disetujui'
            ? snippetView(RequestDialog3View, {
                typeContent:
                  x.type === 'Penyertaan Modal' && !x.funds
                    ? ' Verifikasi setoran diperlukan sebelum draf dibuat.'
                    : '',
                icon: icon('arrow'),
              })
            : decisionForm(
                'request',
                id,
                [
                  ['memberActive', 'Keanggotaan pemohon aktif.'],
                  ['purposeChecked', 'Kebutuhan dan rincian pengajuan sudah ditinjau.'],
                ],
                'Setujui pengajuan',
              ),
        typeContent:
          x.type === 'Pembiayaan'
            ? 'Harga jual, margin, dan jadwal final tetap memerlukan kesepakatan dalam akad.'
            : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra sesuai akad.',
      }),
    );
  }

  function memberDialog(id) {
    const x = member(id);
    if (!x) return;
    dialog(
      'Rincian anggota',
      snippetView(MemberDialogView, {
        statusHead: statusHead({ ...x, status: 'Aktif' }),
        fieldName: esc(x.name),
        review: review([
          ['Nomor anggota', x.id],
          ['Tanggal bergabung', x.since],
          ['Status keanggotaan', 'Aktif'],
        ]),
        rupiah: rupiah(x.pokok + x.wajib),
        rupiahValue: rupiah(x.modal),
        rupiahValueValue: rupiah(x.tagihan),
      }),
    );
  }

  function draftDialog(id) {
    const x = runtime.state.requests.find((x) => x.id === id);
    if (!x) return;
    if (!canDraft(x)) {
      toast('Pengajuan atau verifikasi dana belum memenuhi syarat.');
      return;
    }
    dialog(
      'Siapkan draf akad',
      snippetView(DraftDialogView, {
        review: review([
          ['Referensi pengajuan', x.id],
          ['Anggota', name(x.member)],
          ['Jenis akad', x.type === 'Pembiayaan' ? 'Murabahah' : 'Penyertaan Modal'],
          ['Nilai pengajuan', rupiah(x.amount)],
          ['Usulan periode', x.period],
        ]),
        id: id,
        checks: checks([['finalCheck', 'Data anggota dan rincian pengajuan sudah diperiksa.']]),
      }),
    );
  }

  function contractDialog(id) {
    const x = runtime.state.contracts.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pratinjau dokumen akad',
      snippetView(ContractDialogView, {
        logo: logo(),
        typeContent: x.type === 'Pembiayaan' ? 'Akad Murabahah' : 'Akad Penyertaan Modal',
        review: review([
          ['Nomor dokumen', x.id],
          ['Anggota', name(x.member)],
          ['Referensi pengajuan', x.request || 'PM-2026-001'],
          ['Nilai', rupiah(x.amount)],
          ['Tanggal', x.date],
          ['Status', x.status],
        ]),
      }),
    );
  }
  return {
    dialog,
    closeDialog,
    decisionForm,
    candidateDialog,
    depositDialog,
    requestDialog,
    memberDialog,
    draftDialog,
    contractDialog,
  };
}
