import { statusColor } from '../../../../shared/lib/status-colors.js';

/**
 * Petugas: navigasi role, pemeriksaan dan tindakan antrean.
 * Tampilan halaman berada di frontend-petugas/src/components/staff/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Account-isolated staff concept. Admin and Finance transitions are checked by the API. */
export function initializeStaffPortal(renderView) {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const app = $('#app'),
    modal = $('#portal-dialog');
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
  const adminPages = {
    ringkasan: ['Ringkasan', 'home'],
    pendaftaran: ['Pendaftaran Anggota', 'user'],
    setoran: ['Verifikasi Setoran', 'wallet'],
    penyertaan: ['Penyertaan Modal', 'sprout'],
    pengajuan: ['Pembiayaan', 'store'],
    pengunduran: ['Pengunduran Diri', 'logout'],
    anggota: ['Data Anggota', 'card'],
    akad: ['Dokumen Akad', 'file'],
    'admin-avalist': ['Usulan Avalist', 'user'],
  };
  const financePages = {
    'finance-pengunduran': ['Simpanan Pokok Kembali', 'wallet'],
    'finance-ringkasan': ['Ringkasan Finance', 'home'],
    'finance-rekonsiliasi': ['Rekonsiliasi', 'wallet'],
    'finance-bagi-hasil': ['Bagi Hasil Harian', 'calendar'],
    'finance-avalist': ['Pembayaran Avalist', 'user'],
    'finance-pengembalian': ['Pengembalian Modal', 'wallet'],
  };
  const managerPages = {
    'manager-pengunduran': ['Pengunduran Diri', 'logout'],
    'waktu-kerja': ['Pekerjaan & Waktu Kerja', 'clock'],
    'manager-penawaran': ['Penawaran Modal', 'sprout'],
    'manager-laporan': ['Laporan Koperasi', 'file'],
    'manager-akses': ['Akses Petugas', 'shield'],
    'manager-avalist': ['Pengelolaan Avalist', 'user'],
    'manager-jatuh-tempo': ['Akad Jatuh Tempo', 'calendar'],
  };
  const avalistPages = {
    'avalist-ringkasan': ['Ringkasan Avalist', 'home'],
    'avalist-anggota': ['Anggota Referensi', 'user'],
    'avalist-rincian': ['Rincian Bagian', 'wallet'],
    'avalist-riwayat': ['Riwayat Pembayaran', 'file'],
  };
  const pages = { ...adminPages, ...financePages, ...managerPages, ...avalistPages };
  const activeRole = () => window.KsppsWorkflow?.getStaff()?.role || 'admin';
  const menuPages = () =>
    activeRole() === 'avalist'
      ? avalistPages
      : activeRole() === 'manager'
        ? managerPages
        : activeRole() === 'finance'
          ? financePages
          : adminPages;
  const roleName = () =>
    ({ admin: 'Admin', finance: 'Finance', manager: 'Manajer', avalist: 'Avalist' })[activeRole()];
  const homeFor = (role) =>
    role === 'avalist'
      ? 'avalist-ringkasan'
      : role === 'manager'
        ? 'waktu-kerja'
        : role === 'finance'
          ? 'finance-ringkasan'
          : 'ringkasan';
  function rolePicker() {
    const s = window.KsppsWorkflow?.getStaff(),
      roles = (s?.allowedRoles || []).filter((r) => r !== 'avalist');
    const picker =
      roles.length > 1
        ? /* HTML */ `<label class="staff-role-picker"
            ><span>Buka portal</span
            ><select id="staff-role" aria-label="Buka portal">
              ${roles.map((r) => /* HTML */ `<option value="${r}" ${activeRole() === r ? 'selected' : ''}>${{ admin: 'Admin', finance: 'Finance', manager: 'Manajer', avalist: 'Avalist' }[r]}</option>`).join('')}
            </select></label
          >`
        : /* HTML */ `<p class="staff-label">${roleName()}</p>`;
    return (
      picker +
      (s?.allowedRoles?.includes('avalist')
        ? '<a class="staff-label" href="/avalist.html">Portal Avalist ↗</a>'
        : '')
    );
  }

  function seed() {
    return {
      signedIn: false,
      query: '',
      filter: '',
      candidates: [],
      members: [],
      deposits: [],
      requests: [],
      contracts: [],
      logs: [],
    };
  }
  let state = seed(),
    lastRoute = '',
    lastFocus,
    toastTimer;
  const member = (id) => state.members.find((x) => x.id === id);
  const name = (id) => member(id)?.name || 'Anggota contoh';
  const workflowItems = () => window.KsppsWorkflow?.getItems() || [];
  const allProfiles = () => window.KsppsWorkflow?.getProfiles() || [];
  const dateLabel = (value) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';
  const reviewButton = (id = '', label = 'Periksa', registration = false) =>
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-wf-action="${registration ? 'registration-review' : 'review'}"
      data-id="${esc(id)}"
    >
      ${label} ${icon('chevron')}
    </button>`;
  function candidateRows() {
    return allProfiles().map((p) => {
      const d = p.data,
        special =
          d.special === 'Ya'
            ? Math.ceil(
                Number(d.specialAmount || 0) /
                  (d.specialPayment === 'Angsur' ? Math.max(1, Number(d.installments || 1)) : 1),
              )
            : 0;
      return {
        id: p.id,
        receivedAt: p.receivedAt || p.createdAt,
        number: p.memberNumber || '—',
        name: d.name,
        date: dateLabel(p.createdAt),
        amount:
          Number(d.basic || 0) +
          Number(d.monthly || 0) * (d.paymentOption === 'Tahunan' ? 12 : 1) +
          Number(d.transactionSaving || 0) +
          special +
          Number(d.admin || 0),
        status:
          {
            pending: 'Menunggu verifikasi',
            correction: 'Perlu perbaikan',
            approved: 'Disetujui',
            closed: 'Ditutup',
          }[p.status] || p.status,
      };
    });
  }
  function activityLogs() {
    const rows = workflowItems().map((x) => ({
      text:
        (x.kind === 'capital'
          ? 'Penyertaan modal'
          : x.kind === 'savings'
            ? 'Setoran simpanan wajib'
            : 'Pengunduran diri') +
        ' · ' +
        x.statusLabel,
      time: x.updatedAt || x.createdAt,
    }));
    for (const p of allProfiles())
      rows.push({
        text: 'Pendaftaran ' + p.data.name + ' · ' + p.status,
        time: p.updatedAt || p.createdAt,
      });
    return (
      rows
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)
        .map(
          (x) =>
            /* HTML */ `<div class="log-item">
              ${esc(x.text)}<small>${dateLabel(x.time)}</small>
            </div>`,
        )
        .join('') || '<div class="empty-state">Belum ada aktivitas pemeriksaan.</div>'
    );
  }
  const pending = () => ({
    pendaftaran: allProfiles().filter((p) => p.status === 'pending').length,
    setoran: state.deposits.filter((x) => x.status === 'Menunggu verifikasi').length,
    pengajuan: state.requests.filter((x) => x.status === 'Menunggu tinjauan').length,
    penyertaan: workflowItems().filter(
      (x) => x.kind === 'capital' && ['pending', 'reviewing'].includes(x.status),
    ).length,
    pengunduran: workflowItems().filter(
      (x) => x.kind === 'withdrawal' && ['pending', 'reviewing'].includes(x.status),
    ).length,
    akad: workflowItems().filter((x) => x.kind === 'capital' && x.status === 'ready').length,
  });
  function canDraft(r) {
    return (
      r.status === 'Disetujui' &&
      (r.type !== 'Penyertaan Modal' || r.funds) &&
      !state.contracts.some((c) => c.request === r.id)
    );
  }
  function toast(text) {
    const el = $('#toast');
    clearTimeout(toastTimer);
    el.textContent = text;
    el.hidden = false;
    toastTimer = setTimeout(() => (el.hidden = true), 4500);
  }
  function go(route) {
    if (location.hash.slice(1) === route) render();
    else location.hash = route;
  }
  function log(text) {
    state.logs.unshift({ text, time: 'Baru saja · Petugas KSPPS' });
  }
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
    return rows.filter((x) => (!state.filter || x.status === state.filter) && extra(x));
  }
  function toolbar(statuses) {
    return statuses.length
      ? /* HTML */ `<div class="toolbar">
          <select class="filter-select" id="staff-filter" aria-label="Filter status">
            <option value="">Semua status</option>
            ${statuses.map((s) => /* HTML */ `<option ${state.filter === s ? 'selected' : ''}>${s}</option>`).join('')}
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
  function queueRows() {
    return [
      ...candidateRows()
        .filter((x) => x.status === 'Menunggu verifikasi')
        .map((x) => ({ ...x, kind: 'Pendaftaran anggota', icon: 'user', registration: true })),
      ...workflowItems()
        .filter(
          (x) =>
            x.kind !== 'savings' &&
            ['pending', 'reviewing', 'ready', 'generated'].includes(x.status),
        )
        .map((x) => ({
          id: x.id,
          receivedAt: x.receivedAt || x.createdAt,
          reference: (x.kind === 'capital' ? 'PM-' : 'PD-') + x.id.slice(0, 8).toUpperCase(),
          name: x.memberName,
          kind:
            x.kind === 'capital'
              ? 'Penyertaan modal'
              : x.kind === 'savings'
                ? 'Setoran simpanan wajib'
                : 'Pengunduran diri',
          icon: x.kind === 'capital' ? 'sprout' : 'file',
          status: x.statusLabel,
        })),
    ].sort(
      (a, b) =>
        (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0) ||
        a.id.localeCompare(b.id),
    );
  }

  function candidatesTable() {
    return table(
      ['CALON ANGGOTA', 'DITERIMA', 'SETORAN AWAL', 'STATUS', ''],
      filtered(candidateRows())
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.number)}</small></td>
              <td>${x.date.replace(' · ', '<br>')}</td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>${badge(x.status)}</td>
              <td>${reviewButton(x.id, x.status === 'Disetujui' ? 'Lihat' : 'Periksa', true)}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  function depositsTable() {
    const rows = [
      ...allProfiles().map((p) => ({
        id: p.id,
        name: p.data.name,
        memberId: p.memberNumber,
        label: 'Simpanan pendaftaran',
        amount: candidateRows().find((x) => x.id === p.id).amount,
        finance: p.finance,
        registration: true,
      })),
      ...workflowItems()
        .filter((x) => ['capital', 'savings'].includes(x.kind) && !x.renewalOf)
        .map((x) => ({
          ...x,
          name: x.memberName,
          memberId: x.memberId,
          label: x.kind === 'savings' ? 'Simpanan wajib' : 'Penyertaan modal',
        })),
    ];
    return table(
      ['ANGGOTA', 'JENIS SETORAN', 'NOMINAL', 'FINANCE', ''],
      filtered(
        rows.map((x) => ({
          ...x,
          status:
            x.finance?.status === 'approved'
              ? 'Terverifikasi'
              : x.finance?.status === 'correction'
                ? 'Perlu perbaikan'
                : 'Menunggu verifikasi',
        })),
      )
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.memberId || '—')}</small></td>
              <td>${x.label}</td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>
                ${badge(x.status)}<small>${esc(x.finance?.reference || 'Menunggu Finance')}</small>
              </td>
              <td>
                ${x.kind === 'savings' ? /* HTML */ `<a class="btn secondary small-btn" href="${esc(x.proofUrl)}" target="_blank" rel="noopener">Lihat bukti</a>` : reviewButton(x.id, 'Lihat', x.registration)}
              </td>
            </tr>`,
        )
        .join(''),
    );
  }

  function requestsTable() {
    return table(
      ['PENGAJUAN', 'ANGGOTA', 'NILAI', 'STATUS', ''],
      filtered(state.requests)
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${x.type}</strong><small>${x.id}</small></td>
              <td>${esc(name(x.member))}<small>${esc(x.purpose)}</small></td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>${badge(x.status)}</td>
              <td>${button('request', x.id, x.status === 'Disetujui' ? 'Lihat' : 'Tinjau')}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  function membersTable() {
    const rows = allProfiles()
      .filter((p) => p.status === 'approved')
      .map((p) => ({
        id: p.id,
        number: p.memberNumber || '—',
        name: p.data.name,
        status: p.savings?.active ? 'Aktif' : 'Simpanan tidak aktif',
        savings: (p.savings?.basic || 0) + (p.savings?.paid || 0),
        capital: workflowItems()
          .filter(
            (x) =>
              x.memberProfileId === p.id &&
              x.kind === 'capital' &&
              x.status === 'signed' &&
              !x.maturity?.ended,
          )
          .reduce((n, x) => n + x.amount, 0),
      }));
    return table(
      ['ANGGOTA', 'SIMPANAN POKOK & WAJIB', 'PENYERTAAN MODAL', 'STATUS', ''],
      filtered(rows)
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.number)}</small></td>
              <td class="money">${rupiah(x.savings)}</td>
              <td class="money">${rupiah(x.capital)}</td>
              <td>${badge(x.status)}</td>
              <td>${reviewButton(x.id, 'Rincian', true)}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  function dialog(title, body) {
    lastFocus = document.activeElement;
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        <button type="button" class="icon-btn" data-action="close" aria-label="Tutup">
          ${icon('close')}
        </button>
      </div>
      ${body}
    </div>`;
    modal.showModal();
  }
  function closeDialog() {
    modal.close();
    if (lastFocus?.isConnected) lastFocus.focus();
  }
  function checks(items) {
    return /* HTML */ `<div class="review-checks">
      <h3>Daftar pemeriksaan</h3>
      ${items.map(([name, text]) => /* HTML */ `<label class="check"><input type="checkbox" name="${name}" required />${text}</label>`).join('')}
    </div>`;
  }
  function decisionForm(kind, id, items, label) {
    return /* HTML */ `<form
      class="decision-form"
      id="decision-form"
      data-kind="${kind}"
      data-id="${id}"
    >
      ${checks(items)}<label class="form-field"
        ><span>Catatan petugas</span
        ><textarea name="note" placeholder="Wajib diisi jika meminta perbaikan"></textarea>
      </label>
      <p class="form-error" id="decision-error" role="alert" hidden></p>
      <div class="decision-actions">
        <button type="submit" class="btn secondary" name="decision" value="return" formnovalidate>
          Minta perbaikan</button
        ><button type="submit" class="btn" name="decision" value="approve">${label}</button>
      </div>
      <p class="dialog-note">Perubahan ini hanya berlaku pada data contoh di portal petugas.</p>
    </form>`;
  }
  function statusHead(x) {
    return /* HTML */ `<div class="status-head">
      <span class="eyebrow">${x.id}</span>${badge(x.status)}
    </div>`;
  }
  function candidateDialog(id) {
    const x = state.candidates.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pemeriksaan calon anggota',
      `${statusHead(x)}${review([
        ['Nama lengkap', x.name],
        ['Nomor identitas', x.identity],
        ['WhatsApp', x.phone],
        ['Email', x.email],
        ['Alamat domisili', x.address],
        ['Pekerjaan', x.job],
        ['Ahli waris', x.heir],
        ['Setoran awal (contoh)', rupiah(x.amount)],
      ])}${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
        x.status === 'Disetujui'
          ? /* HTML */ `<div class="info-box">
              Keanggotaan contoh aktif dengan nomor <strong>${x.memberId}</strong>.
            </div>`
          : decisionForm(
              'candidate',
              id,
              [
                ['identity', 'Data identitas dan persyaratan sesuai.'],
                ['funds', 'Setoran keanggotaan sudah dicocokkan.'],
              ],
              'Setujui keanggotaan',
            )
      }`,
    );
  }
  function depositDialog(id) {
    const x = state.deposits.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pemeriksaan setoran',
      /* HTML */ `${statusHead(x)}${review([
          ['Anggota', name(x.member)],
          ['Nomor anggota', x.member],
          ['Jenis setoran', x.type],
          ['Periode / referensi', x.period],
          ['Nominal pengajuan', rupiah(x.amount)],
        ])}
        <div class="staff-proof">
          <div class="eyebrow">Bukti pembayaran · Contoh</div>
          <h3>${esc(name(x.member))}</h3>
          <div class="proof-amount">${rupiah(x.proof)}</div>
          <div class="proof-status">
            <span>Nominal pada pencatatan dana</span
            ><strong>${x.amount === x.proof ? 'Sesuai' : 'Berbeda'}</strong>
          </div>
        </div>
        ${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
          x.status === 'Terverifikasi'
            ? '<div class="info-box">Setoran contoh sudah diverifikasi. Pemeriksaan tidak dapat diulang.</div>'
            : decisionForm(
                'deposit',
                id,
                [
                  ['memberMatch', 'Pengirim dan data anggota cocok.'],
                  ['amountMatch', 'Nominal sesuai dengan pengajuan.'],
                  ['reconciled', 'Dana masuk sudah direkonsiliasi.'],
                ],
                'Verifikasi setoran',
              )
        }`,
    );
  }
  function requestDialog(id) {
    const x = state.requests.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Tinjauan pengajuan layanan',
      /* HTML */ `${statusHead(x)}${review([['Anggota', name(x.member)], ['Layanan', x.type], ['Kebutuhan', x.purpose], ['Nilai pengajuan', rupiah(x.amount)], ['Usulan periode', x.period], ...(x.type === 'Penyertaan Modal' ? [['Status dana', x.funds ? 'Terverifikasi' : 'Menunggu verifikasi']] : [])])}${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
          x.status === 'Disetujui'
            ? /* HTML */ `<div class="info-box">
                  Pengajuan sudah disetujui untuk proses penyiapan
                  akad.${x.type === 'Penyertaan Modal' && !x.funds ? ' Verifikasi setoran diperlukan sebelum draf dibuat.' : ''}
                </div>
                <div class="form-actions">
                  <a href="#akad" class="btn full">Lihat penyiapan akad ${icon('arrow')}</a>
                </div>`
            : decisionForm(
                'request',
                id,
                [
                  ['memberActive', 'Keanggotaan pemohon aktif.'],
                  ['purposeChecked', 'Kebutuhan dan rincian pengajuan sudah ditinjau.'],
                ],
                'Setujui pengajuan',
              )
        }
        <p class="staff-dialog-note">
          ${x.type === 'Pembiayaan' ? 'Harga jual, margin, dan jadwal final tetap memerlukan kesepakatan dalam akad.' : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra sesuai akad.'}
        </p>`,
    );
  }
  function memberDialog(id) {
    const x = member(id);
    if (!x) return;
    dialog(
      'Rincian anggota',
      /* HTML */ `${statusHead({ ...x, status: 'Aktif' })}
        <h3>${esc(x.name)}</h3>
        ${review([
          ['Nomor anggota', x.id],
          ['Tanggal bergabung', x.since],
          ['Status keanggotaan', 'Aktif'],
        ])}
        <div class="member-ledger">
          <div>
            <span>Simpanan pokok & wajib</span><strong>${rupiah(x.pokok + x.wajib)}</strong>
          </div>
          <div><span>Penyertaan modal aktif</span><strong>${rupiah(x.modal)}</strong></div>
          <div><span>Sisa tagihan pembiayaan</span><strong>${rupiah(x.tagihan)}</strong></div>
          <div><span>Status akses portal</span><strong>Aktif</strong></div>
        </div>
        <p class="staff-dialog-note">
          Ini gambaran data yang dikelola petugas untuk masing-masing anggota. Penyertaan modal dan
          pengunduran diri dapat dicoba melalui alur pengajuan yang tersambung. Saldo pada ringkasan
          ini tetap data contoh.
        </p>`,
    );
  }
  function draftDialog(id) {
    const x = state.requests.find((x) => x.id === id);
    if (!x) return;
    if (!canDraft(x)) {
      toast('Pengajuan atau verifikasi dana belum memenuhi syarat.');
      return;
    }
    dialog(
      'Siapkan draf akad',
      /* HTML */ `${review([
          ['Referensi pengajuan', x.id],
          ['Anggota', name(x.member)],
          ['Jenis akad', x.type === 'Pembiayaan' ? 'Murabahah' : 'Penyertaan Modal'],
          ['Nilai pengajuan', rupiah(x.amount)],
          ['Usulan periode', x.period],
        ])}
        <form id="draft-form" data-id="${id}">
          ${checks([['finalCheck', 'Data anggota dan rincian pengajuan sudah diperiksa.']])}
          <p class="form-error" id="decision-error" role="alert" hidden></p>
          <div class="decision-actions">
            <button type="button" class="btn secondary" data-action="close">Batal</button
            ><button type="submit" class="btn">Buat draf contoh</button>
          </div>
        </form>
        <p class="dialog-note">Draf ini hanya ringkasan contoh, bukan naskah akad resmi.</p>`,
    );
  }
  function contractDialog(id) {
    const x = state.contracts.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pratinjau dokumen akad',
      /* HTML */ `<article class="document-preview">
          ${logo()}
          <div class="watermark">Dokumen contoh · Tidak berlaku sebagai akad</div>
          <h3>${x.type === 'Pembiayaan' ? 'Akad Murabahah' : 'Akad Penyertaan Modal'}</h3>
          ${review([
            ['Nomor dokumen', x.id],
            ['Anggota', name(x.member)],
            ['Referensi pengajuan', x.request || 'PM-2026-001'],
            ['Nilai', rupiah(x.amount)],
            ['Tanggal', x.date],
            ['Status', x.status],
          ])}
          <p>Naskah dan ketentuan akad resmi akan disusun serta diperiksa oleh tim koperasi.</p>
        </article>
        <div class="form-actions">
          <button type="button" class="btn secondary full" data-action="close">
            Tutup pratinjau
          </button>
        </div>`,
    );
  }
  function decide(kind, id, decision, values) {
    const list =
      kind === 'candidate'
        ? state.candidates
        : kind === 'deposit'
          ? state.deposits
          : state.requests;
    const item = list.find((x) => x.id === id);
    if (!state.signedIn || !item) return { ok: false, error: 'Data tidak ditemukan.' };
    if (['Disetujui', 'Terverifikasi'].includes(item.status))
      return { ok: false, error: 'Pemeriksaan sudah selesai.' };
    const note = String(values.note || '').trim();
    if (decision === 'return') {
      if (!note) return { ok: false, error: 'Tuliskan alasan data perlu diperbaiki.' };
      item.status = 'Perlu perbaikan';
      item.note = note;
      log(`${id} dikembalikan untuk perbaikan.`);
      return { ok: true, message: 'Catatan perbaikan tersimpan pada data contoh.' };
    }
    const required =
      kind === 'candidate'
        ? ['identity', 'funds']
        : kind === 'deposit'
          ? ['memberMatch', 'amountMatch', 'reconciled']
          : ['memberActive', 'purposeChecked'];
    if (!required.every((key) => values[key]))
      return { ok: false, error: 'Lengkapi semua pemeriksaan terlebih dahulu.' };
    if (kind === 'deposit' && item.amount !== item.proof)
      return { ok: false, error: 'Nominal bukti dan pengajuan belum sesuai.' };
    item.note = note;
    if (kind === 'candidate') {
      item.status = 'Disetujui';
      item.memberId = 'SKI-2026-' + String(state.members.length + 1).padStart(3, '0');
      state.members.push({
        id: item.memberId,
        name: item.name,
        since: '16 Sep 2026',
        pokok: 100000,
        wajib: 10000,
        modal: 0,
        tagihan: 0,
      });
      log(`${item.name} disetujui. Keanggotaan ${item.memberId} aktif.`);
    }
    if (kind === 'deposit') {
      item.status = 'Terverifikasi';
      const m = member(item.member);
      if (item.type === 'Simpanan Wajib') m.wajib += item.amount;
      if (item.type === 'Angsuran Murabahah') m.tagihan = Math.max(0, m.tagihan - item.amount);
      if (item.request) {
        const r = state.requests.find((r) => r.id === item.request);
        if (r) r.funds = true;
      }
      log(`Setoran ${item.id} sebesar ${rupiah(item.amount)} diverifikasi.`);
    }
    if (kind === 'request') {
      item.status = 'Disetujui';
      log(`Pengajuan ${item.id} disetujui untuk penyiapan akad.`);
    }
    return {
      ok: true,
      message:
        kind === 'candidate'
          ? 'Keanggotaan contoh sudah aktif.'
          : kind === 'deposit'
            ? 'Setoran contoh berhasil diverifikasi.'
            : 'Pengajuan contoh disetujui.',
    };
  }
  function makeDraft(id, checked) {
    const r = state.requests.find((x) => x.id === id);
    if (!state.signedIn || !r || !checked || !canDraft(r)) return false;
    state.contracts.unshift({
      id: 'DRAF-CONTOH-' + String(state.contracts.length + 1).padStart(3, '0'),
      member: r.member,
      request: r.id,
      type: r.type,
      amount: r.amount,
      date: '16 Sep 2026',
      status: 'Draf',
    });
    log(`Draf akad untuk ${r.id} dibuat.`);
    return true;
  }

  const tables = {
    pendaftaran: candidatesTable,
    setoran: depositsTable,
    pengajuan: requestsTable,
    anggota: membersTable,
  };
  function render() {
    let route = location.hash.slice(1) || 'masuk';
    if (Object.hasOwn(avalistPages, route)) {
      location.replace('/avalist.html#' + route);
      return;
    }
    if (!state.signedIn || !window.KsppsWorkflow?.getStaff()?.accountRole) {
      state.signedIn = false;
      route = 'masuk';
    } else if (!menuPages()[route]) route = homeFor(activeRole());
    if (Object.hasOwn(avalistPages, route)) {
      location.replace('/avalist.html#' + route);
      return;
    }
    if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
    if (route !== lastRoute) {
      state.query = '';
      state.filter = '';
      window.scrollTo(0, 0);
    }
    if (modal.open && lastRoute !== route) modal.close();
    renderView({
      role: 'staff',
      route,
      context: {
        esc,
        icon,
        badge,
        name,
        dateLabel,
        reviewButton,
        activityLogs,
        pending,
        heading,
        table,
        queueRows,
        workflowItems,
        toolbar,
        depositsTable,
        candidatesTable,
        membersTable,
        pages,
        activeRole,
        menuPages,
        roleName,
        rolePicker,
        member,
        strip,
        button,
        state,
        render,
      },
    });
    document.title = (pages[route]?.[0] || 'Masuk') + ' · Portal Petugas KSPPS';
    lastRoute = route;
    window.KsppsWorkflow?.mount();
    window.KsppsFinance?.mount();
    window.KsppsActivity?.mount();
    window.KsppsReports?.mount();
    window.KsppsStaffAccess?.mount();
    window.KsppsMaturity?.mount();
    window.KsppsWithdrawal?.mount();
  }
  document.addEventListener('click', async (event) => {
    const b = event.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action,
      id = b.dataset.id;
    if (a === 'enter') {
      b.disabled = true;
      const requested = b.dataset.role || 'admin';
      if (await window.KsppsWorkflow.setStaffRole(requested)) {
        state.signedIn = true;
        go(homeFor(requested));
      }
      if (b.isConnected) b.disabled = false;
    }
    if (a === 'logout') {
      state = seed();
      go('masuk');
      toast('Anda keluar dari tampilan petugas.');
    }
    if (a === 'close') closeDialog();
    if (a === 'candidate') candidateDialog(id);
    if (a === 'deposit') depositDialog(id);
    if (a === 'request') requestDialog(id);
    if (a === 'member') memberDialog(id);
    if (a === 'draft') draftDialog(id);
    if (a === 'contract') contractDialog(id);
    if (a === 'open-menu') {
      $('#staff-sidebar').classList.add('open');
      $('.mobile-scrim').classList.add('show');
      b.setAttribute('aria-expanded', 'true');
    }
    if (a === 'close-menu') {
      $('#staff-sidebar').classList.remove('open');
      $('.mobile-scrim').classList.remove('show');
      $('[data-action="open-menu"]')?.setAttribute('aria-expanded', 'false');
    }
  });
  function refreshTable() {
    const fn = tables[location.hash.slice(1)];
    if (fn && $('#staff-table')) $('#staff-table').innerHTML = fn();
  }

  document.addEventListener('change', async (event) => {
    if (event.target.id === 'staff-role') {
      const select = event.target;
      select.disabled = true;
      if (!(await window.KsppsWorkflow.setStaffRole(select.value))) {
        select.value = activeRole();
        select.disabled = false;
      }
      return;
    }
    if (event.target.id === 'staff-filter') {
      state.filter = event.target.value;
      refreshTable();
    }
  });
  document.addEventListener('submit', (event) => {
    const f = event.target;
    if (!(f instanceof HTMLFormElement)) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    if (f.id === 'decision-form') {
      const action = event.submitter?.value || 'approve';
      if (action === 'approve' && !f.checkValidity()) {
        f.reportValidity();
        return;
      }
      const result = decide(f.dataset.kind, f.dataset.id, action, data);
      if (!result.ok) {
        const el = $('#decision-error');
        el.textContent = result.error;
        el.hidden = false;
        return;
      }
      closeDialog();
      render();
      toast(result.message);
    }
    if (f.id === 'draft-form') {
      if (!f.checkValidity()) {
        f.reportValidity();
        return;
      }
      if (makeDraft(f.dataset.id, data.finalCheck)) {
        closeDialog();
        go('akad');
        toast('Draf akad contoh dibuat.');
      } else {
        const el = $('#decision-error');
        el.textContent = 'Periksa persetujuan pengajuan dan verifikasi dana.';
        el.hidden = false;
      }
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('#staff-sidebar')?.classList.contains('open'))
      $('[data-action="close-menu"]').click();
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
  window.addEventListener('kspps-profile-loaded', () => {
    if (state.signedIn) render();
  });
  window.addEventListener('kspps-staff-role-changed', () => {
    if (state.signedIn) go(homeFor(activeRole()));
  });
  window.addEventListener('kspps-finance-loaded', () => {
    if (state.signedIn && activeRole() === 'finance') render();
  });
  window.addEventListener('kspps-activity-loaded', () => {
    if (state.signedIn && ['#waktu-kerja', '#finance-ringkasan'].includes(location.hash)) render();
  });
  window.addEventListener('kspps-access-loaded', () => {
    if (!state.signedIn) render();
  });
  window.addEventListener('kspps-maturity-loaded', () => {
    if (state.signedIn && ['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash))
      render();
  });
  window.addEventListener('kspps-withdrawal-loaded', render);
  window.addEventListener('hashchange', render);
  render();
  void window.KsppsStaffAccess?.load();
}
