/**
 * Elemen presentasi anggota dan format nilai; tidak mengambil data server.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createMemberPresentation({}) {
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
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

  const badge = (text, type = '') =>
    /* HTML */ `<span class="badge ${statusColor(text, type)}">${esc(text)}</span>`;

  const navLink = (route, label, ico, extra = '') =>
    /* HTML */ `<a href="#${route}" ${extra}>${ico ? icon(ico) : ''}${label}</a>`;

  const demoStrip = () =>
    /* HTML */ `<div class="prototype-strip">
      ${icon('info')}<strong>Pratinjau konsep</strong
      ><span>Pendaftaran, pengajuan, dan akad tersimpan dalam ruang pribadi Anda</span>
    </div>`;

  function field(label, name, value = '', options = {}) {
    const {
      type = 'text',
      required = true,
      placeholder = '',
      readonly = false,
      min,
      max,
      pattern,
      maxlength,
    } = options;
    return /* HTML */ `<label class="form-field"
      ><span>${label}${required ? ' <span aria-hidden="true">*</span>' : ''}</span
      ><input
        name="${name}"
        type="${type}"
        value="${esc(value)}"
        ${required ? 'required' : ''}
        ${readonly ? 'readonly' : ''}
        ${placeholder ? `placeholder="${esc(placeholder)}"` : ''}
        ${min !== undefined ? `min="${min}"` : ''}
        ${max !== undefined ? `max="${max}"` : ''}
        ${pattern ? `pattern="${pattern}"` : ''}
        ${maxlength ? `maxlength="${maxlength}"` : ''}
        autocomplete="off"
    /></label>`;
  }

  function selectField(label, name, items, value, required = true) {
    return /* HTML */ `<label class="form-field"
      ><span>${label}${required ? ' *' : ''}</span
      ><select name="${name}" ${required ? 'required' : ''}>
        ${items.map((x) => /* HTML */ `<option value="${esc(x)}" ${x === value ? 'selected' : ''}>${esc(x || 'Pilih salah satu')}</option>`).join('')}
      </select></label
    >`;
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

  function heading(title, description, action = '') {
    return /* HTML */ `<div class="page-heading">
      <div>
        <h1>${title}</h1>
        <p class="subtext">${description}</p>
      </div>
      ${action}
    </div>`;
  }

  function stat(label, value, ico, note, route) {
    return /* HTML */ `<div class="stat">
      <div class="stat-top">${label}<span class="stat-icon">${icon(ico)}</span></div>
      <div class="stat-value">${value}</div>
      <div class="stat-bottom"><span>${note}</span><a href="#${route}">Lihat rincian ↗</a></div>
    </div>`;
  }

  function activity(title, date, value, status, ico) {
    return /* HTML */ `<li class="activity-item">
      <span class="activity-symbol">${icon(ico)}</span>
      <div class="activity-info"><strong>${title}</strong><small>${date}</small></div>
      <div class="activity-value">${value}<small>${status}</small></div>
    </li>`;
  }

  function tabs(items, current, name) {
    return /* HTML */ `<div class="tabs" role="group" aria-label="Filter ${name}">
      ${items.map((item) => /* HTML */ `<button type="button" aria-pressed="${current === item}" data-tab="${name}" data-value="${item}">${item}</button>`).join('')}
    </div>`;
  }
  return {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    navLink,
    demoStrip,
    field,
    selectField,
    review,
    heading,
    stat,
    activity,
    tabs,
  };
}
