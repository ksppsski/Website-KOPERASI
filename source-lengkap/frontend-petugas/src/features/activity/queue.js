import {
  ContentView,
  Content2View,
  Content4View,
  Content5View,
  Content3View,
  QueueView,
} from './views/queue.svelte';
import { view, fallbackView, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Urutan tugas dan tujuan pemeriksaan masing-masing tahap.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createActivityQueue({ app, wf, state, esc, button }) {
  const newestFirst = (a, b) =>
    (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0) ||
    String(a.id).localeCompare(String(b.id));

  const stageRoutes = {
    registration: 'pendaftaran',
    capital: 'penyertaan',
    withdrawal: 'pengunduran',
    generate: 'akad',
    archive: 'akad',
    reconciliation: 'finance-rekonsiliasi',
    payout: 'finance-bagi-hasil',
    'principal-return': 'finance-pengembalian',
    'withdrawal-return': 'finance-pengunduran',
    'withdrawal-final': 'manager-pengunduran',
    'staff-access': 'manager-akses',
  };

  function queue() {
    const role = wf()?.getStaff()?.role;
    const tasks = state.queueTasks
      .filter(
        (t) =>
          t.role === role &&
          !(t.completed ?? !!t.completedAt) &&
          !(t.closed ?? !!t.closedAt) &&
          (!t.receivedAt || Date.parse(t.receivedAt) <= Date.now()),
      )
      .sort(newestFirst);
    const content = state.error
      ? snippetView(ContentView, {
          error: esc(state.error),
          button: button('refresh', 'Coba lagi'),
        })
      : !state.loaded
        ? snippetView(Content2View)
        : snippetView(Content3View, {
            fallbackView: fallbackView(
              tasks.map((t) =>
                snippetView(Content4View, {
                  label: esc(t.label),
                  memberName: esc(t.memberName || '—'),
                  startedContent:
                    (t.started ?? !!t.startedAt) ? 'Sedang dikerjakan' : 'Belum dimulai',
                  stage: stageRoutes[t.stage] || 'waktu-kerja',
                }),
              ),
              snippetView(Content5View),
            ),
          });
    return snippetView(QueueView, { content: content });
  }
  return { newestFirst, stageRoutes, queue };
}
