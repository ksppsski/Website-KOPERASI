import { activityService } from '../../services/activity.js';
/**
 * Format label, elemen dialog, dan status pengajuan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWorkflowPresentation({ staff }) {
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );

  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

  const date = (value) =>
    new Date(value).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    });

  const shortId = (item) =>
    (item.kind === 'capital' ? 'PM-' : item.kind === 'savings' ? 'SW-' : 'PD-') +
    item.id.slice(0, 8).toUpperCase();

  const workPanel = (id, stage) => (staff ? activityService?.panel(id, stage) || '' : '');

  const workStage = (item) =>
    item.status === 'ready'
      ? 'generate'
      : ['generated', 'signed'].includes(item.status)
        ? 'archive'
        : item.kind;

  const needsCorrection = (item) =>
    item?.status === 'correction' ||
    (['pending', 'reviewing'].includes(item?.status) && item?.finance?.status === 'correction');

  const status = (item) =>
    /* HTML */ `<span
      class="badge ${statusColor(needsCorrection(item) ? 'correction' : item.statusLabel)}"
      >${esc(item.statusLabel)}</span
    >`;

  const action = (name, id, label, primary = false) =>
    /* HTML */ `<button
      type="button"
      class="btn ${primary ? '' : 'secondary'} small-btn"
      data-wf-action="${name}"
      data-id="${esc(id || '')}"
    >
      ${label}
    </button>`;

  const auth = () =>
    /* HTML */ `<div class="wf-empty">
      <strong>Simpan pengajuan demo Anda</strong>
      <p>Masuk dengan ChatGPT untuk menyimpan pengajuan dan melihat hasil pemeriksaan.</p>
      <a
        class="btn"
        target="_top"
        href="/signin-with-chatgpt?return_to=${encodeURIComponent(location.pathname + location.hash)}"
        >Lanjutkan dengan ChatGPT</a
      ><small>Gunakan data contoh untuk mencoba alur pendaftaran dan akad.</small>
    </div>`;

  function frame(key, title) {
    return /* HTML */ `<section class="panel wf-panel">
      <div class="panel-head">
        <h2>${title}</h2>
        ${action('refresh', '', 'Perbarui')}
      </div>
      <div data-workflow="${key}"></div>
    </section>`;
  }

  function empty(text) {
    return /* HTML */ `<div class="wf-empty"><strong>${text}</strong></div>`;
  }

  function links(item) {
    return `${
      item.proofUrl
        ? /* HTML */ `<a
            class="btn secondary small-btn"
            href="${item.proofUrl}"
            target="_blank"
            rel="noopener"
            >Lihat bukti</a
          >`
        : ''
    }${
      item.signedUrl
        ? /* HTML */ `<a class="btn small-btn" href="${item.signedUrl}?download=1"
            >Unduh akad lengkap</a
          >`
        : item.contractUrl && staff
          ? /* HTML */ `<a class="btn secondary small-btn" href="${item.contractUrl}?download=1"
              >Unduh PDF awal</a
            >`
          : ''
    }`;
  }

  function checks(items) {
    return /* HTML */ `<div class="review-checks">
      <h3>Pemeriksaan petugas</h3>
      ${items.map(([name, label]) => /* HTML */ `<label class="check"><input type="checkbox" name="${name}" required />${label}</label>`).join('')}
    </div>`;
  }

  function input(label, name, value = '', type = 'text', extra = '') {
    return /* HTML */ `<label class="form-field"
      ><span>${label} *</span
      ><input name="${name}" type="${type}" value="${esc(value)}" ${extra} required
    /></label>`;
  }
  return {
    esc,
    money,
    date,
    shortId,
    workPanel,
    workStage,
    needsCorrection,
    status,
    action,
    auth,
    frame,
    empty,
    links,
    checks,
    input,
  };
}
