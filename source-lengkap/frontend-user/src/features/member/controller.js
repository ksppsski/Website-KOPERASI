import { statusColor } from '../../../../shared/lib/status-colors.js';

/**
 * Anggota: navigasi, pendaftaran, unggahan dan dialog.
 * Tampilan halaman berada di frontend-user/src/components/member/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Member concept. Persistent registration and contract data come from workflow.js. */
export function initializeMemberPortal(renderView) {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const app = $('#app');
  const modal = $('#portal-dialog');
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
  const state = {
    signedIn: false,
    registrationId: crypto.randomUUID(),
    registrationVersion: 0,
    registrationStep: 1,
    registrationKtp: null,
    registrationKtpUrl: '',
    registrationKtpBusy: false,
    registrationKtpError: '',
    registrationProof: null,
    registrationProofBusy: false,
    registrationProofError: '',
    registration: {
      office: 'Kantor KSPPS Makassar',
      identityType: 'KTP',
      religion: 'Islam',
      monthly: 10000,
      paymentOption: 'Bulanan',
      basic: 100000,
      transactionSaving: 50000,
      special: 'Tidak',
      specialAmount: 1000000,
      specialPayment: 'Tunai',
      installments: 10,
      admin: 30000,
    },
    signature: false,
    profile: {},
    savedProfile: false,
    requests: [],
    deposits: [],
    requestCounter: 1,
    modalTab: 'Semua',
    financeTab: 'Semua',
  };
  // Restore the approved page structure using the current workflow records.
  const workflowItems = () => window.KsppsWorkflow?.getItems() || [];
  const savingsEntries = () => window.KsppsWorkflow?.getSavingsEntries() || [];
  const shortDate = (value) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';
  const savingsState = () => window.KsppsWorkflow?.getSavings();
  function savingsHistory() {
    const v = savingsState();
    if (!v) return [];
    const history = v.history.flatMap((x) =>
      [
        ['Simpanan Pokok', x.basic],
        ['Simpanan Wajib', x.mandatory],
        ['Simpanan Lainnya', x.other],
      ]
        .filter(([, n]) => n > 0)
        .map(([type, amount]) => ({
          date: shortDate(x.at),
          at: x.at,
          type,
          note: x.kind === 'registration' ? 'Setoran awal keanggotaan' : 'Setoran lanjutan',
          amount,
          status: 'Terverifikasi',
        })),
    );
    const pending = workflowItems()
      .filter((x) => x.kind === 'savings' && x.finance?.status !== 'approved')
      .map((x) => ({
        date: shortDate(x.createdAt),
        at: x.createdAt,
        type: 'Simpanan Wajib',
        note: x.finance?.note || 'Menunggu rekonsiliasi Finance',
        amount: x.amount,
        status: window.KsppsWorkflow?.needsCorrection(x) ? 'Perlu perbaikan' : 'Menunggu Finance',
      }));
    return [...history, ...pending].sort((a, b) => b.at.localeCompare(a.at));
  }
  function memberAlerts() {
    return (
      (window.KsppsMaturity?.reminders() || '') +
      (window.KsppsWorkflow?.corrections() || '') +
      (savingsState()?.low ? window.KsppsWorkflow.savingsNotice() : '')
    );
  }
  function serviceLocked(title) {
    return (
      heading(title, 'Status simpanan harus aktif untuk mengajukan layanan.') +
      (window.KsppsWorkflow?.accessPanel() || '') +
      (window.KsppsWorkflow?.corrections() || '')
    );
  }
  function currentContracts() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    return workflowItems()
      .filter((x) => x.kind === 'capital' && x.status === 'signed' && x.contractData)
      .map((x) => {
        const d = x.contractData,
          start = new Date(d.effectiveDate + 'T00:00:00Z'),
          end = new Date(d.endDate + 'T00:00:00Z'),
          progress = Math.max(
            0,
            Math.min(
              100,
              Math.round(((new Date(today + 'T00:00:00Z') - start) / (end - start)) * 100),
            ),
          );
        return {
          id: x.id,
          number: x.contractNumber,
          title: 'Pengadaan kebutuhan barang Mitra',
          amount: x.amount,
          start: shortDate(start),
          end: shortDate(end),
          status:
            today < d.effectiveDate ? 'Menunggu mulai' : today >= d.endDate ? 'Selesai' : 'Aktif',
          progress,
        };
      });
  }
  function recentActivity() {
    const p = window.KsppsWorkflow?.getProfile(),
      rows = workflowItems().map((x) => ({
        title:
          x.kind === 'capital'
            ? 'Penyertaan modal'
            : x.kind === 'savings'
              ? 'Setoran simpanan wajib'
              : 'Pengunduran diri',
        at: x.updatedAt || x.createdAt,
        value: x.kind === 'capital' ? rupiah(x.amount) : '',
        status: x.statusLabel,
        icon: x.kind === 'capital' ? 'sprout' : 'file',
      }));
    if (p)
      rows.push({
        title: 'Pendaftaran anggota',
        at: p.updatedAt || p.createdAt,
        value: p.memberNumber || '',
        status: window.KsppsWorkflow?.needsCorrection(p)
          ? 'Perlu perbaikan'
          : {
              pending: 'Menunggu pemeriksaan',
              approved: 'Disetujui',
              correction: 'Perlu perbaikan',
            }[p.status],
        icon: 'user',
      });
    return (
      rows
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 5)
        .map((x) => activity(esc(x.title), shortDate(x.at), esc(x.value), esc(x.status), x.icon))
        .join('') || '<li class="empty-state">Belum ada aktivitas keanggotaan.</li>'
    );
  }

  let toastTimer,
    lastFocus,
    lastRoute = '',
    registrationProofSequence = 0,
    registrationKtpSequence = 0;
  function toast(message) {
    const t = $('#toast');
    clearTimeout(toastTimer);
    t.textContent = message;
    t.hidden = false;
    toastTimer = setTimeout(() => (t.hidden = true), 4500);
  }
  function go(route) {
    if (location.hash.slice(1) === route) render();
    else location.hash = route;
  }
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

  function registrationKtpInput() {
    return /* HTML */ `<div class="file-picker registration-proof">
      <label class="field-label" for="registration-ktp">Foto KTP *</label>
      <p class="field-hint" id="registration-ktp-help">
        Wajib · JPG atau PNG · Maks. 10 MB · Seluruh KTP terlihat jelas.
      </p>
      <input
        type="file"
        id="registration-ktp"
        name="registrationKtp"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        ${state.registrationKtp ? '' : 'required'}
        aria-describedby="registration-ktp-help registration-ktp-error"
      />
      <div id="registration-ktp-selected" aria-live="polite">${registrationKtpStatus()}</div>
      <p
        class="form-error"
        id="registration-ktp-error"
        role="alert"
        ${state.registrationKtpError ? '' : 'hidden'}
      >
        ${esc(state.registrationKtpError)}
      </p>
    </div>`;
  }
  function registrationKtpStatus() {
    if (state.registrationKtpBusy) return '<p class="field-hint">Memeriksa foto KTP…</p>';
    const file = state.registrationKtp;
    if (!file) return '';
    return /* HTML */ `<div class="registration-proof-file">
        <div><strong>${esc(file.name)}</strong><span>Foto KTP terlampir</span></div>
        <button class="link-button" type="button" data-action="remove-registration-ktp">
          Hapus
        </button>
      </div>
      <img
        class="registration-ktp-preview"
        src="${esc(state.registrationKtpUrl)}"
        alt="Pratinjau foto KTP"
        width="400"
        height="252"
      />`;
  }
  function resetRegistrationKtp() {
    registrationKtpSequence++;
    if (state.registrationKtpUrl) URL.revokeObjectURL(state.registrationKtpUrl);
    state.registrationKtp = null;
    state.registrationKtpUrl = '';
    state.registrationKtpError = '';
    state.registrationKtpBusy = false;
  }
  function updateRegistrationKtpView() {
    const input = $('#registration-ktp');
    if (!input) return;
    input.required = !state.registrationKtp;
    input.setCustomValidity(state.registrationKtpError);
    input.setAttribute('aria-invalid', String(Boolean(state.registrationKtpError)));
    $('#registration-ktp-selected').innerHTML = registrationKtpStatus();
    const error = $('#registration-ktp-error');
    error.textContent = state.registrationKtpError;
    error.hidden = !state.registrationKtpError;
    const button = $('#registration-form button[type="submit"]');
    if (button) button.disabled = state.registrationKtpBusy;
  }
  async function selectRegistrationKtp(input) {
    const file = input.files?.[0];
    if (!file) {
      updateRegistrationKtpView();
      return;
    }
    resetRegistrationKtp();
    const sequence = registrationKtpSequence;
    state.registrationKtpBusy = true;
    updateRegistrationKtpView();
    let error = !/\.(jpe?g|png)$/i.test(file.name)
        ? 'Gunakan foto KTP JPG atau PNG.'
        : (await registrationProofFileError(file))
            .replaceAll('bukti transfer pembayaran simpanan', 'foto KTP')
            .replaceAll('bukti transfer', 'foto KTP')
            .replaceAll('JPG, PNG, atau PDF', 'JPG atau PNG'),
      url = '';
    if (!error) {
      url = URL.createObjectURL(file);
      error = await new Promise((resolve) => {
        const photo = new Image();
        photo.onload = () => {
          const png = /\.png$/i.test(file.name),
            pixels = photo.naturalWidth * photo.naturalHeight;
          resolve(
            !pixels
              ? 'Foto KTP tidak dapat dibaca.'
              : png && pixels > 8000000
                ? 'Resolusi PNG maksimal 8 megapiksel. Gunakan JPG untuk foto lebih besar.'
                : !png && pixels > 50000000
                  ? 'Resolusi JPG maksimal 50 megapiksel.'
                  : '',
          );
        };
        photo.onerror = () => resolve('Foto KTP tidak dapat dibaca. Pilih gambar yang valid.');
        photo.src = url;
      });
    }
    if (sequence !== registrationKtpSequence) {
      if (url) URL.revokeObjectURL(url);
      return;
    }
    state.registrationKtpBusy = false;
    state.registrationKtpError = error;
    if (error) {
      if (url) URL.revokeObjectURL(url);
      input.value = '';
    } else {
      state.registrationKtp = file;
      state.registrationKtpUrl = url;
    }
    updateRegistrationKtpView();
  }
  function requireRegistrationKtp() {
    if (state.registrationKtp && !state.registrationKtpBusy) return true;
    if (state.registrationStep !== 1) {
      saveRegistration($('#registration-form'));
      state.registrationStep = 1;
      render();
    }
    if (!state.registrationKtpBusy)
      state.registrationKtpError = state.registrationKtpError || 'Foto KTP wajib diunggah.';
    updateRegistrationKtpView();
    const input = $('#registration-ktp');
    input?.focus();
    if (!state.registrationKtpBusy) input?.reportValidity();
    return false;
  }
  function specialFirst() {
    const r = state.registration;
    return r.special === 'Ya'
      ? r.specialPayment === 'Angsur'
        ? Math.ceil(Number(r.specialAmount) / Math.max(1, Number(r.installments)))
        : Number(r.specialAmount)
      : 0;
  }
  function registrationTotal() {
    const r = state.registration;
    return (
      Number(r.basic) +
      Number(r.monthly) * (r.paymentOption === 'Tahunan' ? 12 : 1) +
      Number(r.transactionSaving) +
      specialFirst() +
      Number(r.admin)
    );
  }

  function registrationProofInput() {
    return /* HTML */ `<div class="file-picker registration-proof">
      <label class="field-label" for="registration-proof"
        >Bukti transfer pembayaran simpanan <span aria-hidden="true">*</span></label
      >
      <p class="field-hint" id="registration-proof-help">
        Wajib dilampirkan · JPG, PNG, atau PDF · Maks. 10 MB
      </p>
      <input
        type="file"
        id="registration-proof"
        name="registrationProof"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        ${state.registrationProof ? '' : 'required'}
        aria-describedby="registration-proof-help registration-proof-error"
        aria-invalid="${Boolean(state.registrationProofError)}"
      />
      <div id="registration-proof-selected" aria-live="polite">${registrationProofStatus()}</div>
      <p
        class="form-error"
        id="registration-proof-error"
        role="alert"
        ${state.registrationProofError ? '' : 'hidden'}
      >
        ${esc(state.registrationProofError)}
      </p>
      <p class="field-hint">Bukti simpanan tersimpan bersama pendaftaran.</p>
    </div>`;
  }
  function registrationProofStatus() {
    if (state.registrationProofBusy) return '<p class="field-hint">Memeriksa berkas…</p>';
    const file = state.registrationProof;
    if (!file) return '';
    const size =
      file.size < 1024 * 1024
        ? Math.max(1, Math.ceil(file.size / 1024)) + ' KB'
        : (file.size / 1024 / 1024).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' MB';
    return /* HTML */ `<div class="registration-proof-file">
      ${icon('check')}
      <div><strong>${esc(file.name)}</strong><span>${size} · Berkas terlampir</span></div>
      <button class="link-button" type="button" data-action="remove-registration-proof">
        Hapus
      </button>
    </div>`;
  }
  function updateRegistrationProofView() {
    const input = $('#registration-proof');
    if (!input) return;
    input.required = !state.registrationProof;
    input.setCustomValidity(state.registrationProofError);
    input.setAttribute('aria-invalid', String(Boolean(state.registrationProofError)));
    $('#registration-proof-selected').innerHTML = registrationProofStatus();
    const error = $('#registration-proof-error');
    error.textContent = state.registrationProofError;
    error.hidden = !state.registrationProofError;
    const next = $('#registration-form button[type="submit"]');
    if (next) next.disabled = state.registrationProofBusy;
  }
  async function registrationProofFileError(file) {
    if (!file) return 'Lampirkan bukti transfer pembayaran simpanan.';
    if (file.size === 0) return 'Berkas kosong. Pilih bukti transfer yang lain.';
    if (file.size > 10 * 1024 * 1024) return 'Ukuran berkas maksimal 10 MB.';
    const extension = file.name.split('.').pop().toLowerCase();
    const types = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
    };
    const expected = types[extension];
    if (
      !Object.hasOwn(types, extension) ||
      (file.type && file.type !== 'application/octet-stream' && file.type !== expected)
    )
      return 'Gunakan berkas JPG, PNG, atau PDF.';
    try {
      const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
      const header =
        expected === 'image/jpeg'
          ? [255, 216, 255]
          : expected === 'image/png'
            ? [137, 80, 78, 71, 13, 10, 26, 10]
            : [37, 80, 68, 70, 45];
      if (!header.every((byte, index) => bytes[index] === byte))
        return 'Isi berkas tidak sesuai formatnya. Pilih JPG, PNG, atau PDF yang valid.';
    } catch {
      return 'Berkas tidak dapat dibaca. Silakan pilih ulang.';
    }
    return '';
  }
  async function selectRegistrationProof(input) {
    const file = input.files?.[0];
    if (!file) {
      updateRegistrationProofView();
      return;
    }
    const sequence = ++registrationProofSequence;
    state.registrationProof = null;
    state.registrationProofBusy = true;
    state.registrationProofError = '';
    updateRegistrationProofView();
    const error = await registrationProofFileError(file);
    if (sequence !== registrationProofSequence) return;
    state.registrationProofBusy = false;
    state.registrationProofError = error;
    state.registrationProof = error ? null : file;
    if (error) input.value = '';
    updateRegistrationProofView();
  }
  function requireRegistrationProof() {
    if (state.registrationProof && !state.registrationProofBusy) return true;
    if (state.registrationStep !== 2) {
      state.registrationStep = 2;
      render();
    }
    if (!state.registrationProofBusy)
      state.registrationProofError =
        state.registrationProofError || 'Lampirkan bukti transfer pembayaran simpanan.';
    updateRegistrationProofView();
    const input = $('#registration-proof');
    input?.focus();
    if (!state.registrationProofBusy) input?.reportValidity();
    return false;
  }

  const pages = {
    ringkasan: ['Ringkasan', 'home'],
    simpanan: ['Simpanan Saya', 'wallet'],
    modal: ['Penyertaan Modal', 'sprout'],
    pembiayaan: ['Pembiayaan', 'store'],
    dokumen: ['Dokumen Akad', 'file'],
    laporan: ['Laporan Koperasi', 'file'],
    profil: ['Profil Anggota', 'user'],
    bantuan: ['Bantuan', 'help'],
    pengunduran: ['Pengunduran Diri', 'logout'],
  };

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

  function savingsRows(query = '', type = '') {
    const rows = savingsHistory().filter(
      (x) =>
        (!type || x.type === type) &&
        `${x.date} ${x.type} ${x.note}`.toLowerCase().includes(query.toLowerCase()),
    );
    return rows.length
      ? rows
          .map(
            (x) =>
              /* HTML */ `<tr>
                <td>${x.date}</td>
                <td>${esc(x.type)}<small>${esc(x.note)}</small></td>
                <td class="money">${rupiah(x.amount)}</td>
                <td>${badge(x.status, x.status === 'Terverifikasi' ? 'green' : 'amber')}</td>
              </tr>`,
          )
          .join('')
      : '<tr><td colspan="4"><div class="empty-state">Setoran yang dicari belum ditemukan.</div></td></tr>';
  }
  function tabs(items, current, name) {
    return /* HTML */ `<div class="tabs" role="group" aria-label="Filter ${name}">
      ${items.map((item) => /* HTML */ `<button type="button" aria-pressed="${current === item}" data-tab="${name}" data-value="${item}">${item}</button>`).join('')}
    </div>`;
  }

  function requestPanel(type, always = false) {
    const rs = state.requests.filter((x) => x.type === type);
    if (!rs.length && !always) return '';
    return /* HTML */ `<section class="panel" style="margin-top:22px">
      <div class="panel-head">
        <h2>Pengajuan Anda</h2>
        ${badge('Simulasi', 'gray')}
      </div>
      ${
        rs.length
          ? /* HTML */ `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>NO. PENGAJUAN</th>
                    <th>KEBUTUHAN</th>
                    <th class="money">NILAI</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${rs
                    .map(
                      (x) =>
                        /* HTML */ `<tr>
                          <td>${x.id}</td>
                          <td>${esc(x.purpose)}</td>
                          <td class="money">${rupiah(x.amount)}</td>
                          <td>${badge('Menunggu verifikasi', 'amber')}</td>
                        </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : /* HTML */ `<div class="empty-state">
              ${icon('file')}<strong>Belum ada pengajuan contoh.</strong>Mulai dari tombol Ajukan
              pembiayaan di atas.
            </div>`
      }
    </section>`;
  }

  function documentCards(query = '', type = '') {
    const letter = window.KsppsWorkflow?.getProfile()?.letter,
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
      ? ds
          .map(
            (x) =>
              /* HTML */ `<article class="document-card">
                <div class="document-icon">${icon('file')}</div>
                <h2>${esc(x.title)}</h2>
                <p>${esc(x.number)} · ${shortDate(x.date)}</p>
                ${badge(x.label, 'green')}<a
                  class="btn secondary"
                  href="${esc(x.url)}"
                  target="_blank"
                  rel="noopener"
                  >${icon('eye')}Lihat PDF</a
                ><a class="small" href="${esc(x.url)}?download=1">Unduh PDF</a>
              </article>`,
          )
          .join('')
      : '<div class="empty-state">Belum ada dokumen yang sesuai. Surat keanggotaan tersedia setelah rekonsiliasi simpanan; akad setelah PDF lengkap diunggah petugas.</div>';
  }
  function capitalDetail(id) {
    const x = currentContracts().find((c) => c.id === id);
    if (!x) return;
    dialog(
      'Rincian penyertaan modal',
      /* HTML */ `${badge(x.status === 'Selesai' ? 'Periode selesai' : x.status, x.status === 'Aktif' ? 'green' : 'gray')}${review(
          [
            ['Nomor akad', x.number],
            ['Tujuan', x.title],
            ['Nilai penyertaan modal', rupiah(x.amount)],
            ['Tanggal efektif nisbah', x.start],
            ['Akhir periode', x.end],
            ['Mekanisme bagi hasil', 'Sesuai akad kerja sama'],
          ],
        )}${window.KsppsMaturity?.summary(workflowItems().find((i) => i.id === id)) || ''}
        <div class="form-actions">
          <a class="btn full" href="#dokumen">Lihat dokumen akad ${icon('arrow')}</a>
        </div>`,
    );
  }

  function render() {
    let route = location.hash.slice(1) || 'masuk';
    if (pages[route] && !state.signedIn) {
      history.replaceState(null, '', '#masuk');
      route = 'masuk';
    }
    if (!pages[route] && !['masuk', 'daftar', 'lupa-sandi', 'daftar-selesai'].includes(route)) {
      history.replaceState(null, '', '#masuk');
      route = 'masuk';
    }
    if (modal.open && lastRoute !== route) modal.close();
    renderView({
      role: 'member',
      route,
      context: {
        icon,
        stat,
        demoStrip,
        esc,
        rupiah,
        badge,
        state,
        savingsState,
        serviceLocked,
        currentContracts,
        heading,
        savingsEntries,
        shortDate,
        memberAlerts,
        recentActivity,
        activity,
        documentCards,
        requestPanel,
        navLink,
        pages,
        field,
        registrationKtpInput,
        specialFirst,
        registrationTotal,
        review,
        savingsRows,
        download,
        registrationProofInput,
        render,
      },
    });
    document.title =
      (pages[route]?.[0] ||
        {
          masuk: 'Masuk Anggota',
          daftar: 'Daftar Anggota',
          'lupa-sandi': 'Pemulihan Akun',
          'daftar-selesai': 'Pengajuan Contoh',
        }[route]) + ' · KSPPS Syirkah Kebaikan Indonesia';
    if (route === 'daftar' && state.registrationStep === 1) updateRegistrationKtpView();
    if (route === 'daftar' && state.registrationStep === 3) setupSignature();
    if (route === 'daftar' && state.registrationStep === 2) {
      updateSavingsForm($('#registration-form'));
      updateRegistrationProofView();
    }
    if (lastRoute !== route) {
      window.scrollTo(0, 0);
      lastRoute = route;
    }
    window.KsppsWorkflow?.mount();
    window.KsppsReports?.mount();
  }
  function dialog(title, content) {
    lastFocus = document.activeElement;
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        <button type="button" class="icon-btn" data-action="close-dialog" aria-label="Tutup">
          ${icon('close')}
        </button>
      </div>
      ${content}
    </div>`;
    modal.showModal();
  }
  function closeDialog() {
    modal.close();
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function proofInput() {
    return /* HTML */ `<div class="file-picker">
      <strong>Bukti pembayaran</strong
      ><label class="check" style="margin:10px 0"
        ><input type="checkbox" name="sampleProof" checked />Gunakan bukti contoh</label
      ><label
        >Atau pilih berkas (maks. 10 MB)<input
          type="file"
          name="proof"
          accept="image/png,image/jpeg,application/pdf"
      /></label>
      <p class="field-hint">Berkas hanya dipilih di perangkat, tidak diunggah.</p>
    </div>`;
  }
  function depositDialog() {
    void window.KsppsWorkflow?.savingsForm();
  }
  function applicationDialog(type) {
    const finance = type === 'Pembiayaan';
    dialog(
      finance ? 'Pengajuan pembiayaan' : 'Pengajuan penyertaan modal',
      /* HTML */ `<p class="muted">
          ${finance ? 'Isi kebutuhan barang untuk ditinjau tim koperasi.' : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra.'}
        </p>
        <form id="application-form" data-kind="${type}" style="margin-top:22px">
          ${field(finance ? 'Kebutuhan barang' : 'Tujuan penyertaan modal', 'purpose', '')}
          <div class="form-row">
            ${field(finance ? 'Estimasi harga barang (Rp)' : 'Nominal penyertaan (Rp)', 'amount', '', { type: 'number', min: 1 })}${selectField('Usulan periode', 'period', ['3 bulan', '6 bulan', '12 bulan'], '12 bulan')}
          </div>
          ${field('Catatan tambahan', 'note', '', { required: false, placeholder: 'Jika ada' })}
          <div class="info-box">
            ${finance ? 'Harga jual, margin, dan jadwal pembayaran ditetapkan setelah peninjauan dan kesepakatan akad.' : 'Periode dan mekanisme bagi hasil mengikuti akad yang disepakati.'}
          </div>
          <p class="dialog-note">Pengajuan ini hanya simulasi, belum dikirim kepada koperasi.</p>
          <div class="form-actions">
            <button class="btn secondary" type="button" data-action="close-dialog">Batal</button
            ><button class="btn" type="submit">Buat pengajuan contoh</button>
          </div>
        </form>`,
    );
  }
  function download(name, text, type = 'text/plain;charset=utf-8') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function fileValid(form) {
    const f = form.elements.proof?.files?.[0];
    const sample = form.elements.sampleProof?.checked;
    let error = '';
    if (!sample && !f) error = 'Pilih bukti pembayaran atau gunakan bukti contoh.';
    if (f && f.size > 10 * 1024 * 1024) error = 'Ukuran berkas maksimal 10 MB.';
    const e = $('#proof-error', form);
    e.textContent = error;
    e.hidden = !error;
    return !error;
  }
  function saveRegistration(form) {
    const r = state.registration;
    for (const [k, v] of new FormData(form)) {
      if (typeof v === 'string') r[k] = v;
    }
    for (const check of form.querySelectorAll('input[type="checkbox"]'))
      r[check.name] = check.checked;
    if (r.sameAddress) r.address = r.identityAddress;
    if (r.name) r.name = r.name.toUpperCase();
  }
  function updateSavingsForm(form) {
    saveRegistration(form);
    const r = state.registration;
    $('#special-fields').hidden = r.special !== 'Ya';
    $('#installment-fields').hidden = r.specialPayment !== 'Angsur';
    form.elements.specialAmount.required = r.special === 'Ya';
    form.elements.specialAmount.disabled = r.special !== 'Ya';
    form.elements.installments.required = r.special === 'Ya' && r.specialPayment === 'Angsur';
    form.elements.installments.disabled = r.special !== 'Ya' || r.specialPayment !== 'Angsur';
    $('#special-monthly').textContent = 'Angsuran per bulan: ' + rupiah(specialFirst());
    $('#registration-total').textContent = rupiah(registrationTotal());
  }
  function setupSignature() {
    const canvas = $('#signature');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#183e7c';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (state.registration.signatureImage) {
      const im = new Image();
      im.onload = () => ctx.drawImage(im, 0, 0);
      im.src = state.registration.signatureImage;
    }
    let down = false;
    function point(e) {
      const rect = canvas.getBoundingClientRect();
      return [
        ((e.clientX - rect.left) * canvas.width) / rect.width,
        ((e.clientY - rect.top) * canvas.height) / rect.height,
      ];
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      down = true;
      canvas.setPointerCapture(e.pointerId);
      const [x, y] = point(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!down) return;
      e.preventDefault();
      const [x, y] = point(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      state.signature = true;
    });
    function finish() {
      if (!down) return;
      down = false;
      state.registration.signatureImage = canvas.toDataURL('image/png');
    }
    canvas.addEventListener('pointerup', finish);
    canvas.addEventListener('pointercancel', finish);
  }
  document.addEventListener('click', async (event) => {
    const tab = event.target.closest('[data-tab]');
    if (tab) {
      state[tab.dataset.tab === 'modal' ? 'modalTab' : 'financeTab'] = tab.dataset.value;
      render();
      return;
    }
    const b = event.target.closest('[data-action]');
    if (!b) return;
    const action = b.dataset.action;
    if (action === 'enter-portal') {
      state.signedIn = true;
      const p = window.KsppsWorkflow?.getProfile();
      state.profile = p ? { ...p.data } : {};
      state.savedProfile = !!p;
      go('ringkasan');
    }
    if (action === 'show-password') {
      const p = $('#login-password');
      const show = p.type === 'password';
      p.type = show ? 'text' : 'password';
      b.setAttribute('aria-pressed', String(show));
      b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
    }
    if (action === 'open-sidebar') {
      $('#sidebar').classList.add('open');
      $('.mobile-scrim').classList.add('show');
      b.setAttribute('aria-expanded', 'true');
    }
    if (action === 'close-sidebar') {
      $('#sidebar').classList.remove('open');
      $('.mobile-scrim').classList.remove('show');
      $('[data-action="open-sidebar"]')?.setAttribute('aria-expanded', 'false');
    }
    if (action === 'logout') {
      state.signedIn = false;
      state.requests = [];
      state.deposits = [];
      state.financePaymentPending = false;
      state.profile = {};
      state.savedProfile = false;
      go('masuk');
      toast('Anda sudah keluar dari akun demo.');
    }
    if (action === 'registration-back') {
      saveRegistration($('#registration-form'));
      state.registrationStep = Math.max(1, state.registrationStep - 1);
      render();
      window.scrollTo(0, 0);
    }
    if (action === 'remove-registration-ktp') {
      resetRegistrationKtp();
      const input = $('#registration-ktp');
      if (input) input.value = '';
      updateRegistrationKtpView();
      input?.focus();
    }
    if (action === 'remove-registration-proof') {
      registrationProofSequence++;
      state.registrationProof = null;
      state.registrationProofBusy = false;
      state.registrationProofError = '';
      const input = $('#registration-proof');
      if (input) input.value = '';
      updateRegistrationProofView();
      input?.focus();
    }
    if (action === 'clear-signature') {
      const c = $('#signature');
      c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
      state.signature = false;
      delete state.registration.signatureImage;
    }
    if (action === 'close-dialog') closeDialog();
    if (action === 'deposit') depositDialog();
    if (action === 'apply-capital') void window.KsppsWorkflow?.capitalForm();
    if (action === 'apply-finance' && (await window.KsppsWorkflow?.checkAccess()))
      applicationDialog('Pembiayaan');
    if (action === 'capital-detail') capitalDetail(b.dataset.id);
    if (action === 'notifications') {
      dialog(
        'Pemberitahuan',
        memberAlerts() || '<p>Tidak ada pengingat atau permintaan perbaikan saat ini.</p>',
      );
    }
    if (action === 'export-savings') {
      const rows = [
        ['Tanggal', 'Jenis', 'Keterangan', 'Nominal', 'Status'],
        ...savingsHistory().map((x) => [x.date, x.type, x.note, x.amount, x.status]),
      ];
      download(
        'simpanan-anggota.csv',
        '\uFEFF' +
          rows
            .map((row) => row.map((v) => '"' + String(v).replaceAll('"', '""') + '"').join(';'))
            .join('\r\n'),
        'text/csv;charset=utf-8',
      );
      toast('Riwayat setoran diunduh.');
    }
  });
  document.addEventListener('input', (event) => {
    const target = event.target;
    if (target.id === 'savings-search')
      $('#savings-rows').innerHTML = savingsRows(target.value, $('#savings-filter').value);
    if (target.id === 'document-search')
      $('#document-list').innerHTML = documentCards(target.value, $('#document-filter').value);
    if (
      target.type !== 'file' &&
      target.form?.id === 'registration-form' &&
      state.registrationStep === 2
    )
      updateSavingsForm(target.form);
  });
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.id === 'registration-ktp') {
      void selectRegistrationKtp(target);
      return;
    }
    if (target.id === 'registration-proof') {
      void selectRegistrationProof(target);
      return;
    }
    if (target.id === 'savings-filter')
      $('#savings-rows').innerHTML = savingsRows($('#savings-search').value, target.value);
    if (target.id === 'document-filter')
      $('#document-list').innerHTML = documentCards($('#document-search').value, target.value);
    if (target.form?.id === 'registration-form') {
      if (state.registrationStep === 2) updateSavingsForm(target.form);
      else if (target.name === 'sameAddress') {
        if (target.checked)
          target.form.elements.address.value = target.form.elements.identityAddress.value;
        saveRegistration(target.form);
      } else if (target.name === 'identityType') {
        saveRegistration(target.form);
        render();
      }
    }
  });
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    event.preventDefault();
    if (form.id === 'registration-form' && !requireRegistrationKtp()) return;
    if (
      form.id === 'registration-form' &&
      state.registrationStep >= 2 &&
      !requireRegistrationProof()
    )
      return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    if (form.id === 'login-form') {
      state.signedIn = true;
      const p = window.KsppsWorkflow?.getProfile();
      state.profile = p ? { ...p.data } : {};
      state.savedProfile = !!p;
      go('ringkasan');
    }
    if (form.id === 'forgot-form') {
      dialog(
        'Simulasi pemulihan akun',
        /* HTML */ `<div class="success-icon">${icon('mail')}</div>
          <p>Di sistem yang sudah aktif, petunjuk pemulihan akan dikirim ke email terdaftar.</p>
          <p class="dialog-note">Tidak ada email yang dikirim dalam demo ini.</p>
          <div class="form-actions">
            <a class="btn full" href="#masuk">Kembali ke halaman masuk</a>
          </div>`,
      );
    }
    if (form.id === 'registration-form') {
      saveRegistration(form);
      if (
        state.registrationStep === 3 &&
        (!state.signature || !state.registration.signatureImage)
      ) {
        $('#signature-error').hidden = false;
        return;
      }
      if (state.registrationStep < 4) {
        state.registrationStep++;
        render();
        window.scrollTo(0, 0);
      } else {
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        const error = $('#registration-submit-error');
        error.hidden = true;
        try {
          await window.KsppsWorkflow.saveRegistration(
            state.registration,
            state.registrationProof,
            state.registrationId,
            state.registrationVersion,
            state.registrationKtp,
          );
          go('daftar-selesai');
        } catch (e) {
          error.textContent = e.message;
          error.hidden = false;
          button.disabled = false;
        }
      }
    }
    if (form.id === 'profile-form') {
      for (const key of ['name', 'email', 'phone', 'address', 'job'])
        state.profile[key] = data[key];
      render();
      toast('Perubahan profil tersimpan dalam demo ini.');
    }
    if (form.id === 'deposit-form') {
      if (!fileValid(form)) return;
      const date = new Date(data.period + '-01T12:00:00');
      const period = date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      state.deposits.unshift({
        date: new Date().toLocaleDateString('id-ID'),
        type: data.type,
        note: 'Setoran ' + period + ' (contoh)',
        amount: Number(data.amount),
        status: 'Menunggu verifikasi',
      });
      closeDialog();
      go('simpanan');
      toast('Konfirmasi setoran contoh menunggu verifikasi.');
    }
    if (form.id === 'application-form') {
      if (!(await window.KsppsWorkflow?.checkAccess())) return;
      const type = form.dataset.kind;
      state.requests.unshift({
        id: 'DEMO-' + String(state.requestCounter++).padStart(3, '0'),
        type,
        purpose: data.purpose,
        amount: Number(data.amount),
        period: data.period,
      });
      closeDialog();
      state.financeTab = type === 'Pembiayaan' ? 'Pengajuan' : state.financeTab;
      go(type === 'Pembiayaan' ? 'pembiayaan' : 'modal');
      toast('Pengajuan contoh dibuat dan menunggu verifikasi.');
    }
    if (form.id === 'finance-payment-form') {
      if (!fileValid(form)) return;
      state.financePaymentPending = true;
      closeDialog();
      go('pembiayaan');
      toast('Konfirmasi pembayaran contoh menunggu verifikasi.');
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('#sidebar')?.classList.contains('open')) {
      document.querySelector('[data-action="close-sidebar"]').click();
    }
  });
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeDialog();
    }
  });
  modal.addEventListener('close', () => {
    if (lastFocus?.isConnected) lastFocus.focus();
  });
  window.addEventListener('kspps-profile-loaded', (event) => {
    state.profile = event.detail ? { ...event.detail.data } : {};
    state.savedProfile = !!event.detail;
    if (state.signedIn && location.hash !== '#daftar') render();
  });
  let editingRegistration = false;
  window.addEventListener('kspps-edit-registration', async (event) => {
    if (editingRegistration) return;
    editingRegistration = true;
    const p = event.detail;
    toast('Memuat data pendaftaran…');
    try {
      const fetchFile = async (url, name) => {
        if (!url) return null;
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) throw new Error('Berkas tersimpan belum dapat dimuat. Coba lagi.');
        return new File([await response.blob()], name, {
          type: response.headers.get('content-type') || '',
        });
      };
      const [signature, proof, ktp] = await Promise.all([
        fetchFile(p.signatureUrl, 'tanda-tangan.png'),
        fetchFile(p.proofUrl, p.proofName),
        fetchFile(p.ktpUrl, p.ktpName || 'ktp.png'),
      ]);
      const signatureImage = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(signature);
      });
      state.registration = {
        ...p.data,
        paymentOption: p.data.paymentOption || 'Bulanan',
        signatureImage,
      };
      state.registrationId = p.id;
      state.registrationVersion = p.version;
      state.registrationStep = 1;
      state.signature = true;
      registrationProofSequence++;
      state.registrationProofBusy = false;
      state.registrationProof = proof;
      state.registrationProofError = '';
      resetRegistrationKtp();
      state.registrationKtp = ktp;
      state.registrationKtpUrl = ktp ? URL.createObjectURL(ktp) : '';
      if (modal.open) modal.close();
      go('daftar');
      render();
    } catch (error) {
      toast(error.message || 'Data belum dapat dimuat. Coba lagi.');
    } finally {
      editingRegistration = false;
    }
  });
  window.addEventListener('kspps-new-registration', () => {
    resetRegistrationKtp();
    registrationProofSequence++;
    state.registrationProof = null;
    state.registrationProofError = '';
    state.registrationProofBusy = false;
    state.registrationId = crypto.randomUUID();
    state.registrationVersion = 0;
    state.registrationStep = 1;
    state.signature = false;
    state.profile = {};
    state.savedProfile = false;
    state.requests = [];
    state.deposits = [];
    state.registration = {
      office: 'Kantor KSPPS Makassar',
      identityType: 'KTP',
      religion: 'Islam',
      monthly: 10000,
      paymentOption: 'Bulanan',
      basic: 100000,
      transactionSaving: 50000,
      special: 'Tidak',
      specialAmount: 1000000,
      specialPayment: 'Tunai',
      installments: 10,
      admin: 30000,
    };
    go('daftar');
    render();
  });
  window.addEventListener('hashchange', render);
  render();
}
