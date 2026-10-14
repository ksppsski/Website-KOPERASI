import {
  BtnView,
  HeadingView,
  Table2View,
  Table3View,
  TableView,
  Reminders2View,
  RemindersView,
  Summary2View,
  Summary3View,
  SummaryView,
  Stats2View,
  StatsView,
  LoadingView,
} from './views/presentation.svelte';
import { headingView, tableView } from '../../lib/view-helpers.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Notifikasi akhir akad dan ringkasan keputusan anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMaturityPresentation({ app, esc, wf, money, date, state }) {
  const btn = (action, label, id = '', extra = '') =>
    snippetView(BtnView, { action: action, id: esc(id), extra: extra, label: label });

  const heading = headingView;

  const table = tableView;

  function reminders() {
    const rows = (wf()?.getItems() || []).filter((x) => x.maturity?.needsDecision);
    if (!rows.length) return '';
    return snippetView(RemindersView, {
      length: rows.length,
      rowsRows: rows.map((x) =>
        snippetView(Reminders2View, {
          projectCode: esc(x.projectCode || 'Penyertaan modal'),
          money: money(x.amount),
          date: date(x.maturity.endDate),
          contractNumber: esc(x.contractNumber),
          btn: btn('decide', 'Tentukan pilihan', x.id),
        }),
      ),
    });
  }

  function summary(item) {
    const m = item.maturity;
    if (!m) return '';
    const d = m.decision;
    return snippetView(SummaryView, {
      status: esc(m.status),
      date: date(m.endDate),
      dContent: d
        ? snippetView(Summary2View, {
            choiceContent:
              d.choice === 'extend'
                ? 'Lanjut ke project baru · Efektif ' + date(d.effectiveDate)
                : m.returnPaidAt
                  ? 'Modal dikembalikan ' + date(m.returnPaidAt)
                  : 'Pengembalian dijadwalkan ' + date(d.dueDate),
            date: date(d.confirmedAt),
          })
        : m.needsDecision
          ? btn('decide', 'Tentukan pilihan', item.id)
          : snippetView(Summary3View, { date: date(m.opensAt) }),
    });
  }

  function stats(items) {
    return snippetView(StatsView, {
      itemsRows: items.map(([label, amount, detail]) =>
        snippetView(Stats2View, { label: label, money: money(amount), detail: detail }),
      ),
    });
  }

  function loading() {
    return snippetView(LoadingView, {
      errorContent: state.error ? { class: 'form-error', role: 'alert' } : { role: 'status' },
      error: esc(state.error || 'Memuat data…'),
    });
  }
  return { btn, heading, table, reminders, summary, stats, loading };
}
