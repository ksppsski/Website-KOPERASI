/**
 * Presentasi ringkasan Finance dan daftar rekonsiliasi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createFinancePresentation({ esc, state, money, date }) {
  const badge = (r) =>
    /* HTML */ `<span class="badge ${statusColor(r?.status)}"
      >${esc(r?.label || 'Menunggu Finance')}</span
    >`;

  function heading(title, description, action = '') {
    return /* HTML */ `<div class="page-heading">
      <div>
        <h1>${title}</h1>
        <p class="subtext">${description}</p>
      </div>
      ${action}
    </div>`;
  }

  const action = (a, label, attrs = '') =>
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-finance-action="${a}"
      ${attrs}
    >
      ${label}
    </button>`;

  function table(headers, rows, empty) {
    return /* HTML */ `<div class="table-scroll">
      <table>
        <thead>
          <tr>
            ${headers.map((h) => /* HTML */ `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            /* HTML */ `<tr>
              <td colspan="${headers.length}"><div class="empty-state">${empty}</div></td>
            </tr>`
          }
        </tbody>
      </table>
    </div>`;
  }

  function loading() {
    if (state.error)
      return /* HTML */ `<div class="panel">
        <p class="form-error" role="alert">${esc(state.error)}</p>
        ${action('refresh', 'Coba lagi')}
      </div>`;
    return '<div class="panel"><p class="muted" role="status">Memuat data Finance…</p></div>';
  }

  function metrics() {
    const p = state.payout;
    return /* HTML */ `<div class="stats finance-stats">
      <div class="stat">
        <div class="stat-top">Total bagi hasil</div>
        <div class="stat-value finance-value">${money(p?.total)}</div>
        <div class="stat-bottom">${date(state.date)} · 5% per akad</div>
      </div>
      <div class="stat">
        <div class="stat-top">Anggota penerima</div>
        <div class="stat-value">${p?.memberCount || 0}</div>
        <div class="stat-bottom">${p?.transferCount || 0} rekening tujuan</div>
      </div>
      <div class="stat">
        <div class="stat-top">Akad terjadwal</div>
        <div class="stat-value">${p?.contractCount || 0}</div>
        <div class="stat-bottom">Pembayaran bulanan</div>
      </div>
    </div>`;
  }

  function queueTable(limit = 0) {
    const items = state.items.filter(
      (x) => !state.filter || x.reconciliation.status === state.filter,
    );
    return table(
      ['ANGGOTA / SETORAN', 'NOMINAL', 'REKONSILIASI', 'TINDAKAN'],
      (limit ? items.slice(0, limit) : items)
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td>
                <strong>${esc(x.memberName)}</strong
                ><small>${esc(x.memberId || '—')} · ${esc(x.label)}</small
                >${x.projectCode ? /* HTML */ `<small class="offer-code">${esc(x.projectCode)}</small>` : ''}
              </td>
              <td class="money">${money(x.amount)}</td>
              <td>${badge(x.reconciliation)}</td>
              <td>
                ${action('reconcile', x.reconciliation.status === 'approved' ? 'Lihat' : 'Periksa', `data-id="${esc(x.id)}" data-kind="${x.kind}"`)}
              </td>
            </tr>`,
        )
        .join(''),
      'Belum ada bukti transfer yang sesuai.',
    );
  }

  function datePicker() {
    return /* HTML */ `<div class="finance-date">
      <label for="finance-date">Tanggal pembayaran</label
      ><input
        id="finance-date"
        type="date"
        min="1901-01-01"
        max="9998-12-31"
        value="${esc(state.date)}"
      />${action('today', 'Hari ini')}
    </div>`;
  }
  return { badge, heading, action, table, loading, metrics, queueTable, datePicker };
}
