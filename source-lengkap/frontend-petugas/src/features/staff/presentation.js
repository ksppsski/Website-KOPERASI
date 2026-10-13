/**
 * Elemen presentasi petugas, filter tabel, dan format nilai.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createStaffPresentation({ runtime }) {
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>\"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[c],
    );

  const rupiah = (n) => 'Rp' + Number(n).toLocaleString('id-ID');

  const paths = {
    arrow: 'M5 12h14m-5-5 5 5-5 5',
    back: 'M19 12H5m5-5-5 5 5 5',
    chevron: 'm9 5 7 7-7 7',
    check: 'm5 12 4 4L19 6',
    close: 'm6 6 12 12M6 18 18 6',
    menu: 'M4 6h16M4 12h16M4 18h16',
    home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10m6 11v-8h6v8',
    wallet: 'M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7m17 6h-5v4h5',
    sprout: 'M12 21v-8m0 3C5 16 3 12 3 6c7 0 9 3 9 10m0-3c0-7 3-10 9-10 0 6-3 10-9 10',
    store:
      'M3 10V4h18v6M3 10c0 3 4 3 4 0 0 3 5 3 5 0 0 3 5 3 5 0 0 3 4 3 4 0M5 13v8h14v-8M9 21v-6h6v6',
    file: 'M14 2H5v20h14V7l-5-5v5h5M8 12h8M8 16h8',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-3a8 6 0 0 1 16 0v3',
    help: 'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    logout: 'M9 3H4v18h5m-1-9h13m-5-5 5 5-5 5',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12m13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
    shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3m-4 9 3 3 5-6',
    search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
    plus: 'M12 5v14M5 12h14',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    calendar: 'M4 5h16v16H4V5m3-3v6m10-6v6M4 10h16',
    mail: 'M3 5h18v14H3V5m0 0 9 8 9-8',
    phone: 'M6 3 3 5c0 8 8 16 16 16l2-3-5-4-3 3-6-6 3-3-4-5',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8M10 20h4',
    info: 'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    card: 'M3 4h18v16H3V4m0 6h18M6 15h4',
    clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    upload: 'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',
    building: 'M5 21V3h14v18M9 7h1m4 0h1M9 11h1m4 0h1M9 15h1m4 0h1M10 21v-3h4v3',
  };

  const icon = (name) =>
    /* HTML */ `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="${paths[name] || paths.file}" />
    </svg>`;

  const logo = (white = false) =>
    /* HTML */ `<img
      class="brand-logo"
      src="assets/kspps-logo-${white ? 'white' : 'color'}-web.png"
      alt="KSPPS Syirkah Kebaikan Indonesia"
      width="720"
      height="${white ? 256 : 255}"
    />`;

  const badge = (s) => /* HTML */ `<span class="badge ${statusColor(s)}">${esc(s)}</span>`;

  function strip() {
    return /* HTML */ `<div class="prototype-strip">
      ${icon('shield')}<strong>Portal Petugas</strong
      ><span>Akses sesuai akun yang disetujui Manajer</span>
    </div>`;
  }

  function heading(title, description, action = '') {
    return /* HTML */ `<div class="page-heading">
      <div>
        <h1>${title}</h1>
        <p class="subtext">${description}</p>
      </div>
      ${action}
    </div>`;
  }

  function review(rows) {
    return /* HTML */ `<dl class="review-list">
      ${rows
        .map(
          ([a, b]) =>
            /* HTML */ `<div>
              <dt>${a}</dt>
              <dd>${esc(b)}</dd>
            </div>`,
        )
        .join('')}
    </dl>`;
  }

  function button(action, id, label = 'Periksa') {
    return /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-action="${action}"
      data-id="${id}"
    >
      ${label} ${icon('chevron')}
    </button>`;
  }

  function filtered(rows, extra = () => true) {
    return rows.filter(
      (x) => (!runtime.state.filter || x.status === runtime.state.filter) && extra(x),
    );
  }

  function toolbar(statuses) {
    return statuses.length
      ? /* HTML */ `<div class="toolbar">
          <select class="filter-select" id="staff-filter" aria-label="Filter status">
            <option value="">Semua status</option>
            ${statuses.map((s) => /* HTML */ `<option ${runtime.state.filter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>`
      : '';
  }

  function table(headers, body) {
    return /* HTML */ `<div class="table-scroll">
      <table>
        <thead>
          <tr>
            ${headers.map((h) => /* HTML */ `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${
            body ||
            /* HTML */ `<tr>
              <td colspan="${headers.length}">
                <div class="empty-state">Tidak ada data yang sesuai.</div>
              </td>
            </tr>`
          }
        </tbody>
      </table>
    </div>`;
  }

  function checks(items) {
    return /* HTML */ `<div class="review-checks">
      <h3>Daftar pemeriksaan</h3>
      ${items.map(([name, text]) => /* HTML */ `<label class="check"><input type="checkbox" name="${name}" required />${text}</label>`).join('')}
    </div>`;
  }

  function statusHead(x) {
    return /* HTML */ `<div class="status-head">
      <span class="eyebrow">${x.id}</span>${badge(x.status)}
    </div>`;
  }
  return {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    strip,
    heading,
    review,
    button,
    filtered,
    toolbar,
    table,
    checks,
    statusHead,
  };
}
