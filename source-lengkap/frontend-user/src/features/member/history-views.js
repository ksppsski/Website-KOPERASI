import {
  SavingsRowsView,
  SavingsRows2View,
  RequestPanel3View,
  RequestPanel2View,
  RequestPanel4View,
  RequestPanelView,
  DocumentCardsView,
  DocumentCards2View,
} from './views/history-views.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Tabel riwayat simpanan, pengajuan, dan arsip dokumen anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberHistoryViews({
  app,
  savingsHistory,
  esc,
  rupiah,
  badge,
  state,
  icon,
  workflowItems,
  shortDate,
}) {
  function savingsRows(query = '', type = '') {
    const rows = savingsHistory().filter(
      (x) =>
        (!type || x.type === type) &&
        `${x.date} ${x.type} ${x.note}`.toLowerCase().includes(query.toLowerCase()),
    );
    return rows.length
      ? rows.map((x) =>
          snippetView(SavingsRowsView, {
            date: x.date,
            type: esc(x.type),
            note: esc(x.note),
            rupiah: rupiah(x.amount),
            badge: badge(x.status, x.status === 'Terverifikasi' ? 'green' : 'amber'),
          }),
        )
      : snippetView(SavingsRows2View);
  }

  function requestPanel(type, always = false) {
    const rs = state.requests.filter((x) => x.type === type);
    if (!rs.length && !always) return '';
    return snippetView(RequestPanelView, {
      badge: badge('Belum dikirim', 'gray'),
      lengthContent: rs.length
        ? snippetView(RequestPanel2View, {
            rsRows: rs.map((x) =>
              snippetView(RequestPanel3View, {
                id: x.id,
                purpose: esc(x.purpose),
                rupiah: rupiah(x.amount),
                badge: badge('Belum dikirim', 'gray'),
              }),
            ),
          })
        : snippetView(RequestPanel4View, { icon: icon('file') }),
    });
  }

  function documentCards(query = '', type = '') {
    const letter = app.services.workflow?.getProfile()?.letter,
      docs = [
        ...(letter
          ? [
              {
                type: 'Keanggotaan',
                title: letter.filename.replace(/\.pdf$/, ''),
                number: letter.number,
                date: letter.effectiveDate + 'T12:00:00Z',
                url: letter.url,
                label: 'Surat keanggotaan',
              },
            ]
          : []),
        ...workflowItems()
          .filter((x) => x.kind === 'capital' && x.status === 'signed' && x.signedUrl)
          .map((x) => ({
            type: 'Penyertaan Modal',
            title: x.documentName || 'Akad Penyertaan Modal',
            number: x.contractNumber,
            date: x.signedAt,
            url: x.signedUrl,
            label: 'Akad lengkap',
          })),
      ],
      ds = docs.filter(
        (x) =>
          (!type || x.type === type) &&
          (x.title + ' ' + x.number).toLowerCase().includes(query.toLowerCase()),
      );
    return ds.length
      ? ds.map((x) =>
          snippetView(DocumentCardsView, {
            icon: icon('file'),
            title: esc(x.title),
            number: esc(x.number),
            shortDate: shortDate(x.date),
            badge: badge(x.label, 'green'),
            url: esc(x.url),
            iconValue: icon('eye'),
            urlValue: esc(x.url),
          }),
        )
      : snippetView(DocumentCards2View);
  }
  return { savingsRows, requestPanel, documentCards };
}
