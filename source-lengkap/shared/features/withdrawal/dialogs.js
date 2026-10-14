import {
  ShowView,
  ErrorBlockView,
  Detail2View,
  Detail3View,
  DetailView,
  Record2View,
  RecordView,
  FinancingDetailView,
  FinancingDetail2View,
} from './views/dialogs.svelte';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Dialog pengembalian simpanan pokok dan pencatatan pembiayaan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWithdrawalDialogs({
  app,
  $,
  button,
  state,
  details,
  money,
  summary,
  esc,
  field,
  wf,
  date,
}) {
  function show(title, body) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    app.ui.render(
      $('#dialog-content'),
      snippetView(ShowView, { title: title, button: button('close', 'Tutup'), body: body }),
    );
    modal.showModal();
    app.services.activity?.mount();
  }

  const errorBlock = snippetView(ErrorBlockView);

  function detail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    const s = x.settlement,
      manager = location.hash === '#manager-pengunduran',
      can = manager ? x.status === 'manager_pending' : x.status === 'finance_pending';
    show(manager ? 'Persetujuan final' : 'Pengembalian simpanan pokok', [
      !manager && can ? app.services.activity?.panel(id, 'withdrawal-return') || '' : '',
      details([
        ['Anggota', x.memberName],
        ['Nomor anggota', x.memberNumber],
        ['Alasan pengunduran diri', x.reason],
        ['Bank tujuan', s?.bankName],
        ['Nomor rekening', s?.bankAccount],
        ['Atas nama', s?.accountName],
        ['Nominal pengembalian', money(s?.amount)],
      ]),
      summary(x),
      can
        ? snippetView(DetailView, {
            managerContent: manager ? 'close' : 'pay',
            id: esc(id),
            version: x.version,
            managerContent2: manager
              ? snippetView(Detail2View)
              : snippetView(Detail3View, {
                  field: field('Nominal (Rp)', 'amount', 'number', {
                    value: '100000',
                    readonly: true,
                  }),
                  fieldValue: field('Tanggal transfer', 'transferDate', 'date', {
                    min: s.adminAt.slice(0, 10),
                    max: state.today,
                    value: state.today,
                  }),
                  fieldValueValue: field('Referensi transfer', 'reference', 'text', {
                    minlength: '3',
                    maxlength: '160',
                  }),
                  fieldValueValueValue: field('Bukti transfer (JPG, PNG, PDF)', 'proof', 'file', {
                    accept: '.jpg,.jpeg,.png,.pdf',
                  }),
                }),
            managerContent3: manager
              ? 'Saya telah memeriksa persetujuan Admin dan bukti pengembalian Finance, serta menyetujui penutupan permanen keanggotaan.'
              : 'Saya memastikan Rp100.000 sudah dikembalikan ke rekening anggota di atas.',
            errorBlock: errorBlock,
            managerContent4: manager
              ? 'Setujui final & tutup keanggotaan'
              : 'Simpan pengembalian & kirim ke Manajer',
          })
        : '',
    ]);
  }

  function record() {
    const ps = (wf()?.getProfiles() || []).filter((p) => p.status === 'approved');
    show(
      'Catat kontrak pembiayaan',
      snippetView(RecordView, {
        psRows: ps.map((p) =>
          snippetView(Record2View, {
            id: esc(p.id),
            memberNumber: esc(p.memberNumber),
            fieldName: esc(p.data.name),
          }),
        ),
        field: field('Nomor kontrak', 'number', 'text', { maxlength: '120' }),
        fieldValue: field('Kebutuhan barang', 'purpose', 'text', {
          minlength: '3',
          maxlength: '200',
        }),
        fieldValueValue: field('Nilai kontrak (Rp)', 'amount', 'number', {
          min: '1',
          max: '1000000000000',
          step: '1',
        }),
        fieldValueValueValue: field('Tanggal mulai', 'startDate', 'date'),
        fieldValueValueValueValue: field('Tanggal selesai', 'endDate', 'date'),
        errorBlock: errorBlock,
      }),
    );
  }

  function financingDetail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    show('Kontrak pembiayaan', [
      details([
        ['Anggota', x.memberName],
        ['Nomor kontrak', x.number],
        ['Kebutuhan barang', x.purpose],
        ['Nilai kontrak', money(x.amount)],
        ['Tanggal mulai', date(x.startDate)],
        ['Tanggal selesai', date(x.endDate)],
        ['Status', x.status],
      ]),
      x.settledAt
        ? snippetView(FinancingDetailView, {
            date: date(x.settledAt),
            settlementNote: esc(x.settlementNote),
          })
        : snippetView(FinancingDetail2View, { id: esc(id), errorBlock: errorBlock }),
    ]);
  }
  return { show, errorBlock, detail, record, financingDetail };
}
