import {
  BadgeView,
  HeadingView,
  ActionView,
  Table2View,
  Table3View,
  TableView,
  LoadingView,
  Loading2View,
  MetricsView,
  QueueTable2View,
  QueueTableView,
  DatePickerView,
} from './views/presentation.svelte';
import { headingView, tableView } from '../../../../shared/lib/view-helpers.js';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Presentasi ringkasan Finance dan daftar rekonsiliasi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createFinancePresentation({ app, esc, state, money, date }) {
  const badge = (r) =>
    snippetView(BadgeView, {
      statusColor: statusColor(r?.status),
      label: esc(r?.label || 'Menunggu Finance'),
    });

  const heading = headingView;

  const action = (a, label, attrs = '') =>
    snippetView(ActionView, { a: a, attrs: attrs, label: label });

  const table = tableView;

  function loading() {
    if (state.error)
      return snippetView(LoadingView, {
        error: esc(state.error),
        action: action('refresh', 'Coba lagi'),
      });
    return snippetView(Loading2View);
  }

  function metrics() {
    const p = state.payout;
    return snippetView(MetricsView, {
      money: money(p?.total),
      date: date(state.date),
      memberCount: p?.memberCount || 0,
      transferCount: p?.transferCount || 0,
      contractCount: p?.contractCount || 0,
    });
  }

  function queueTable(limit = 0) {
    const items = state.items.filter(
      (x) => !state.filter || x.reconciliation.status === state.filter,
    );
    return table(
      ['ANGGOTA / SETORAN', 'NOMINAL', 'REKONSILIASI', 'TINDAKAN'],
      (limit ? items.slice(0, limit) : items).map((x) =>
        snippetView(QueueTableView, {
          memberName: esc(x.memberName),
          memberId: esc(x.memberId || '—'),
          label: esc(x.label),
          projectCodeContent: x.projectCode
            ? snippetView(QueueTable2View, { projectCode: esc(x.projectCode) })
            : '',
          money: money(x.amount),
          badge: badge(x.reconciliation),
          action: action(
            'reconcile',
            x.reconciliation.status === 'approved' ? 'Lihat' : 'Periksa',
            { 'data-id': esc(x.id), 'data-kind': x.kind },
          ),
        }),
      ),
      'Belum ada bukti transfer yang sesuai.',
    );
  }

  function datePicker() {
    return snippetView(DatePickerView, {
      date: esc(state.date),
      action: action('today', 'Hari ini'),
    });
  }
  return { badge, heading, action, table, loading, metrics, queueTable, datePicker };
}
