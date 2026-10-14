import {
  ShowView,
  Decide2View,
  Decide3View,
  DecideView,
  ReturnDialog2View,
  ReturnDialog3View,
  ReturnDialog4View,
  ReturnDialog5View,
  ReturnDialogView,
} from './views/dialogs.svelte';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Dialog keputusan akhir akad dan pencatatan pengembalian modal.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMaturityDialogs({ app, $, btn, wf, esc, money, date, state }) {
  function show(title, body) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    app.ui.render(
      $('#dialog-content'),
      snippetView(ShowView, { title: title, btn: btn('close', 'Tutup'), body: body }),
    );
    modal.showModal();
    app.services.activity?.mount();
  }

  function decide(id) {
    const item = wf()
      .getItems()
      .find((x) => x.id === id);
    if (!item?.maturity?.needsDecision) return;
    const choices = wf()
      .getOffers()
      .filter(
        (o) =>
          o.id !== item.offerId && o.projectCode !== item.projectCode && o.remaining >= item.amount,
      );
    const canExtend = !!wf().getSavings()?.active && choices.length > 0;
    show(
      'Pilihan akhir akad',
      snippetView(DecideView, {
        projectCode: esc(item.projectCode || 'Penyertaan modal'),
        contractNumber: esc(item.contractNumber),
        money: money(item.amount),
        date: date(item.maturity.endDate),
        id: esc(id),
        canExtendContent: canExtend ? {} : { disabled: true },
        canExtendContent2: !canExtend
          ? snippetView(Decide2View, {
              activeContent: wf().getSavings()?.active
                ? 'Belum ada project baru dengan kuota yang cukup.'
                : 'Simpanan harus aktif untuk melanjutkan modal.',
            })
          : '',
        choicesRows: choices.map((o) =>
          snippetView(Decide3View, {
            id: esc(o.id),
            projectCode: esc(o.projectCode),
            title: esc(o.title),
          }),
        ),
        date2: date(item.maturity.endDate),
      }),
    );
  }

  function returnDialog(id) {
    const x = state.returns?.items.find((x) => x.id === id);
    if (!x) return;
    show(
      'Pengembalian modal',
      snippetView(ReturnDialogView, {
        statusContent:
          x.status === 'due' ? app.services.activity?.panel(id, 'principal-return') || '' : '',
        Rows: [
          ['Anggota', x.memberName],
          ['Nomor akad', x.contractNumber],
          ['Jatuh tempo', date(x.dueDate)],
          ['Modal', money(x.amount)],
          ['Bank', x.bankName],
          ['Rekening tujuan', x.bankAccount],
          ['Atas nama', x.accountName],
        ].map(([k, v]) => snippetView(ReturnDialog2View, { k: k, v: esc(v) })),
        statusContent2:
          x.status === 'scheduled'
            ? snippetView(ReturnDialog3View, { date: date(x.dueDate) })
            : x.status === 'paid'
              ? snippetView(ReturnDialog4View, {
                  date: date(x.paidAt),
                  reference: esc(x.reference),
                  proofUrl: esc(x.proofUrl),
                })
              : snippetView(ReturnDialog5View, {
                  id: esc(id),
                  amount: x.amount,
                  dueDate: x.dueDate,
                  today: state.returns.today,
                  todayValue: state.returns.today,
                }),
      }),
    );
  }

  function error(e) {
    const el = $('#maturity-error');
    if (el) {
      el.hidden = false;
      el.textContent = e.message;
    }
  }
  return { show, decide, returnDialog, error };
}
