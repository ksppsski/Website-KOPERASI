import {
  ButtonView,
  FieldView,
  Details2View,
  DetailsView,
  Summary2View,
  SummaryView,
  ClosedPageView,
  Eligibility2View,
  EligibilityView,
  Table2View,
  Table3View,
  TableView,
  MemberFinancing2View,
  MemberFinancingView,
} from './views/presentation.svelte';
import { view, fallbackView, snippetView } from '../../runtime/view.js';

/**
 * Status pengunduran diri, daftar pemeriksaan, dan pembiayaan anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWithdrawalPresentation({ app, esc, date, money, wf }) {
  const button = (action, text, id = '') =>
    snippetView(ButtonView, { action: action, id: esc(id), text: text });

  const field = (label, name, type = 'text', extra = '') =>
    snippetView(FieldView, { label: label, fieldName: name, type: type, extra: extra });

  const details = (rows) =>
    snippetView(DetailsView, {
      rowsRows: rows.map(([k, v]) => snippetView(Details2View, { k: k, v: esc(v) })),
    });

  function summary(item) {
    const s = item.settlement;
    if (!s) return '';
    return snippetView(SummaryView, {
      date: date(s.adminAt),
      paidAtContent: s.paidAt ? 'Simpanan pokok dikembalikan' : 'Pengembalian oleh Finance',
      money: money(s.amount),
      paidAtContent2: s.paidAt ? ' · ' + date(s.paidAt) : '',
      closedAtContent: s.closedAt ? 'Keanggotaan ditutup' : 'Persetujuan final Manajer',
      closedAtContent2: s.closedAt
        ? date(s.closedAt)
        : s.paidAt
          ? 'Menunggu keputusan final'
          : 'Setelah pengembalian selesai',
      proofUrlContent: s.proofUrl ? snippetView(Summary2View, { proofUrl: esc(s.proofUrl) }) : '',
    });
  }

  function closedPage() {
    const p = wf()?.getProfile();
    return snippetView(ClosedPageView, {
      memberNumber: esc(p?.memberNumber),
      date: date(p?.closedAt),
      button: button('restart', 'Daftar ulang sebagai anggota'),
    });
  }

  function eligibility() {
    const s = wf()?.getWithdrawal();
    if (!s?.blockers?.length) return '';
    return snippetView(EligibilityView, {
      blockersRows: s.blockers.map((x) =>
        snippetView(Eligibility2View, {
          kindContent: x.kind === 'financing' ? 'Pembiayaan' : 'Penyertaan modal',
          label: esc(x.label),
        }),
      ),
    });
  }

  function table(rows, financing = false) {
    return snippetView(TableView, {
      financingContent: financing ? 'KONTRAK' : 'SIMPANAN POKOK',
      fallbackView: fallbackView(
        rows.map((x) =>
          snippetView(Table2View, {
            memberName: esc(x.memberName),
            memberNumber: esc(x.memberNumber),
            financingContent: financing ? esc(x.number) : money(x.settlement?.amount),
            settledAtContent: x.settledAt ? 'green' : statusColor(x.statusLabel || x.status),
            statusLabel: esc(x.statusLabel || x.status),
            button: button(financing ? 'financing-detail' : 'detail', 'Rincian', x.id),
          }),
        ),
        snippetView(Table3View),
      ),
    });
  }

  function memberFinancing() {
    const rows = wf()?.getFinancing() || [];
    return rows.length
      ? snippetView(MemberFinancingView, {
          rowsRows: rows.map((x) =>
            snippetView(MemberFinancing2View, {
              number: esc(x.number),
              settledAtContent: x.settledAt ? 'green' : statusColor(x.status),
              status: esc(x.status),
              purpose: esc(x.purpose),
              money: money(x.amount),
              date: date(x.startDate),
              date2: date(x.endDate),
            }),
          ),
        })
      : '';
  }
  return { button, field, details, summary, closedPage, eligibility, table, memberFinancing };
}
