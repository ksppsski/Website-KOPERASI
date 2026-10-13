import { statusColor } from '../../lib/status-colors.js';

/**
 * Pengunduran diri, pengembalian pokok dan penutupan akun.
 * Tampilan petugas berada di frontend-petugas/src/components/withdrawal/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Resignation handoff and the registry of existing financing contracts. */
export function initializeWithdrawal() {
  'use strict';
  const wf = () => window.KsppsWorkflow,
    $ = (s) => document.querySelector(s),
    esc = (v) =>
      String(v ?? '').replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
      );
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID'),
    date = (s) =>
      s
        ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Makassar',
          })
        : '—';
  const state = {
    items: [],
    route: '',
    loading: false,
    loaded: false,
    error: '',
    busy: false,
    sequence: 0,
    today: '',
  };
  const routes = ['#finance-pengunduran', '#manager-pengunduran', '#pengajuan'];
  const button = (action, text, id = '') =>
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-resign-action="${action}"
      data-id="${esc(id)}"
    >
      ${text}
    </button>`;
  const field = (label, name, type = 'text', extra = '') =>
    /* HTML */ `<label class="form-field"
      ><span>${label} *</span><input name="${name}" type="${type}" ${extra} required
    /></label>`;
  const details = (rows) =>
    /* HTML */ `<dl class="review-list">
      ${rows
        .map(
          ([k, v]) =>
            /* HTML */ `<div>
              <dt>${k}</dt>
              <dd>${esc(v)}</dd>
            </div>`,
        )
        .join('')}
    </dl>`;
  function summary(item) {
    const s = item.settlement;
    if (!s) return '';
    return /* HTML */ `<ol class="timeline">
        <li>
          <span>1</span>
          <div>Admin menyetujui<small>${date(s.adminAt)}</small></div>
        </li>
        <li>
          <span>2</span>
          <div>
            ${s.paidAt ? 'Simpanan pokok dikembalikan' : 'Pengembalian oleh Finance'}<small
              >${money(s.amount)}${s.paidAt ? ' · ' + date(s.paidAt) : ''}</small
            >
          </div>
        </li>
        <li>
          <span>3</span>
          <div>
            ${s.closedAt ? 'Keanggotaan ditutup' : 'Persetujuan final Manajer'}<small
              >${s.closedAt ? date(s.closedAt) : s.paidAt ? 'Menunggu keputusan final' : 'Setelah pengembalian selesai'}</small
            >
          </div>
        </li>
      </ol>
      ${s.proofUrl ? /* HTML */ `<a class="btn secondary small-btn" href="${esc(s.proofUrl)}" target="_blank" rel="noopener">Bukti pengembalian</a>` : ''}`;
  }
  function closedPage() {
    const p = wf()?.getProfile();
    return /* HTML */ `<section class="panel">
      <span class="badge gray">Keanggotaan ditutup</span>
      <h1>Keanggotaan Anda telah berakhir.</h1>
      <p>
        Nomor <strong>${esc(p?.memberNumber)}</strong> dinonaktifkan permanen pada
        ${date(p?.closedAt)}.
      </p>
      <p>
        Untuk bergabung kembali, lakukan pendaftaran dari awal. Anda akan mendapatkan nomor anggota
        baru, termasuk jika menggunakan data diri yang sama.
      </p>
      ${button('restart', 'Daftar ulang sebagai anggota')}
      <p id="resign-restart-error" class="form-error" role="alert" hidden></p>
    </section>`;
  }
  function eligibility() {
    const s = wf()?.getWithdrawal();
    if (!s?.blockers?.length) return '';
    return /* HTML */ `<div class="info-box status-alert-red">
      <strong>Pengunduran diri belum tersedia.</strong>
      <p>Selesaikan kontrak, pengajuan, atau pengembalian modal berikut:</p>
      <ul>
        ${s.blockers.map((x) => /* HTML */ `<li>${x.kind === 'financing' ? 'Pembiayaan' : 'Penyertaan modal'} · ${esc(x.label)}</li>`).join('')}
      </ul>
    </div>`;
  }
  function table(rows, financing = false) {
    return /* HTML */ `<div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>ANGGOTA</th>
            <th>${financing ? 'KONTRAK' : 'SIMPANAN POKOK'}</th>
            <th>STATUS</th>
            <th>TINDAKAN</th>
          </tr>
        </thead>
        <tbody>
          ${
            rows
              .map(
                (x) =>
                  /* HTML */ `<tr>
                    <td>
                      <strong>${esc(x.memberName)}</strong><small>${esc(x.memberNumber)}</small>
                    </td>
                    <td>${financing ? esc(x.number) : money(x.settlement?.amount)}</td>
                    <td>
                      <span
                        class="badge ${x.settledAt ? 'green' : statusColor(x.statusLabel || x.status)}"
                        >${esc(x.statusLabel || x.status)}</span
                      >
                    </td>
                    <td>${button(financing ? 'financing-detail' : 'detail', 'Rincian', x.id)}</td>
                  </tr>`,
              )
              .join('') ||
            '<tr><td colspan="4"><div class="empty-state">Belum ada data.</div></td></tr>'
          }
        </tbody>
      </table>
    </div>`;
  }

  function show(title, body) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        ${button('close', 'Tutup')}
      </div>
      ${body}
    </div>`;
    modal.showModal();
    window.KsppsActivity?.mount();
  }
  const errorBlock = '<p id="resign-error" class="form-error" role="alert" hidden></p>';
  function detail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    const s = x.settlement,
      manager = location.hash === '#manager-pengunduran',
      can = manager ? x.status === 'manager_pending' : x.status === 'finance_pending';
    show(
      manager ? 'Persetujuan final' : 'Pengembalian simpanan pokok',
      `${!manager && can ? window.KsppsActivity?.panel(id, 'withdrawal-return') || '' : ''}${details(
        [
          ['Anggota', x.memberName],
          ['Nomor anggota', x.memberNumber],
          ['Alasan pengunduran diri', x.reason],
          ['Bank tujuan', s?.bankName],
          ['Nomor rekening', s?.bankAccount],
          ['Atas nama', s?.accountName],
          ['Nominal pengembalian', money(s?.amount)],
        ],
      )}${summary(x)}${
        can
          ? /* HTML */ `<form
              id="resign-${manager ? 'close' : 'pay'}-form"
              data-id="${esc(id)}"
              data-version="${x.version}"
            >
              ${
                manager
                  ? '<p class="info-box">Persetujuan ini menutup keanggotaan dan menonaktifkan nomor anggota secara permanen.</p>'
                  : /* HTML */ `${field('Nominal (Rp)', 'amount', 'number', 'value="100000" readonly')}${field('Tanggal transfer', 'transferDate', 'date', `min="${s.adminAt.slice(0, 10)}" max="${state.today}" value="${state.today}"`)}${field('Referensi transfer', 'reference', 'text', 'minlength="3" maxlength="160"')}${field('Bukti transfer (JPG, PNG, PDF)', 'proof', 'file', 'accept=".jpg,.jpeg,.png,.pdf"')}
                      <p class="field-hint">Maksimal 10 MB. Catat setelah transfer berhasil.</p>`
              }<label class="check"
                ><input
                  name="confirm"
                  type="checkbox"
                  required
                />${manager ? 'Saya telah memeriksa persetujuan Admin dan bukti pengembalian Finance, serta menyetujui penutupan permanen keanggotaan.' : 'Saya memastikan Rp100.000 sudah dikembalikan ke rekening anggota di atas.'}</label
              >${errorBlock}
              <div class="form-actions">
                <button class="btn" type="submit">
                  ${manager ? 'Setujui final & tutup keanggotaan' : 'Simpan pengembalian & kirim ke Manajer'}
                </button>
              </div>
            </form>`
          : ''
      }`,
    );
  }
  function record() {
    const ps = (wf()?.getProfiles() || []).filter((p) => p.status === 'approved');
    show(
      'Catat kontrak pembiayaan',
      /* HTML */ `<form id="resign-financing-form">
        <label class="form-field"
          ><span>Anggota *</span
          ><select name="profileId" required>
            <option value="">Pilih anggota</option>
            ${ps.map((p) => /* HTML */ `<option value="${esc(p.id)}">${esc(p.memberNumber)} · ${esc(p.data.name)}</option>`).join('')}
          </select></label
        >${field('Nomor kontrak', 'number', 'text', 'maxlength="120"')}${field('Kebutuhan barang', 'purpose', 'text', 'minlength="3" maxlength="200"')}${field('Nilai kontrak (Rp)', 'amount', 'number', 'min="1" max="1000000000000" step="1"')}
        <div class="form-row">
          ${field('Tanggal mulai', 'startDate', 'date')}${field('Tanggal selesai', 'endDate', 'date')}
        </div>
        <label class="check"
          ><input type="checkbox" name="confirm" required />Data sesuai kontrak pembiayaan yang
          telah disepakati anggota.</label
        >
        <p class="field-hint">
          Anggota tidak dapat mengundurkan diri sampai kontrak dicatat lunas, termasuk jika sudah
          lewat jatuh tempo.
        </p>
        ${errorBlock}<button class="btn" type="submit">Simpan kontrak</button>
      </form>`,
    );
  }
  function financingDetail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    show(
      'Kontrak pembiayaan',
      `${details([
        ['Anggota', x.memberName],
        ['Nomor kontrak', x.number],
        ['Kebutuhan barang', x.purpose],
        ['Nilai kontrak', money(x.amount)],
        ['Tanggal mulai', date(x.startDate)],
        ['Tanggal selesai', date(x.endDate)],
        ['Status', x.status],
      ])}${
        x.settledAt
          ? /* HTML */ `<p class="info-box">
              Dicatat lunas ${date(x.settledAt)} · ${esc(x.settlementNote)}
            </p>`
          : /* HTML */ `<form id="resign-settle-form" data-id="${esc(id)}">
              <label class="form-field"
                ><span>Referensi pemeriksaan pelunasan *</span
                ><textarea name="note" minlength="5" maxlength="1500" required></textarea></label
              ><label class="check"
                ><input type="checkbox" name="confirm" required />Seluruh kewajiban kontrak telah
                lunas dan sudah diperiksa.</label
              >${errorBlock}<button class="btn" type="submit">Catat lunas</button>
            </form>`
      }`,
    );
  }
  function memberFinancing() {
    const rows = wf()?.getFinancing() || [];
    return rows.length
      ? /* HTML */ `<section class="panel">
          <h2>Kontrak pembiayaan Anda</h2>
          ${rows
            .map(
              (x) =>
                /* HTML */ `<article class="wf-card">
                  <div class="wf-card-head">
                    <strong>${esc(x.number)}</strong
                    ><span class="badge ${x.settledAt ? 'green' : statusColor(x.status)}"
                      >${esc(x.status)}</span
                    >
                  </div>
                  <p>${esc(x.purpose)} · ${money(x.amount)}</p>
                  <p class="field-hint">${date(x.startDate)} — ${date(x.endDate)}</p>
                </article>`,
            )
            .join('')}
        </section>`
      : '';
  }
  async function load() {
    if (state.loading) return;
    const route = location.hash,
      seq = ++state.sequence;
    state.loading = true;
    state.route = route;
    state.error = '';
    try {
      const data = await wf().api(
        route === '#pengajuan'
          ? '/staff/financing'
          : route === '#manager-pengunduran'
            ? '/manager/withdrawals'
            : '/finance/withdrawals',
      );
      if (seq !== state.sequence) return;
      state.items = data.items;
      state.today = data.today || '';
      state.loaded = true;
    } catch (e) {
      if (seq === state.sequence) state.error = e.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        window.dispatchEvent(new CustomEvent('kspps-withdrawal-loaded'));
      }
    }
  }
  function mount() {
    if (!location.pathname.endsWith('petugas.html') || !routes.includes(location.hash)) return;
    if (state.route !== location.hash) {
      state.loaded = false;
      state.error = '';
    }
    if (!state.loaded && !state.loading && !state.error) void load();
  }
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-resign-action]');
    if (!b || state.busy) return;
    const a = b.dataset.resignAction;
    if (a === 'close') $('#portal-dialog').close();
    if (a === 'refresh') void load();
    if (a === 'detail') detail(b.dataset.id);
    if (a === 'record') record();
    if (a === 'financing-detail') financingDetail(b.dataset.id);
    if (a === 'restart') {
      state.busy = true;
      b.disabled = true;
      try {
        await wf().api('/profile/restart', {
          method: 'POST',
          body: JSON.stringify({ confirm: true }),
        });
        await wf().refresh();
        window.dispatchEvent(new CustomEvent('kspps-new-registration'));
      } catch (e) {
        const el = $('#resign-restart-error');
        if (el) {
          el.textContent = e.message;
          el.hidden = false;
        }
        b.disabled = false;
      } finally {
        state.busy = false;
      }
    }
  });
  document.addEventListener(
    'submit',
    async (e) => {
      const f = e.target;
      if (
        ![
          'resign-pay-form',
          'resign-close-form',
          'resign-financing-form',
          'resign-settle-form',
        ].includes(f.id)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (state.busy || !f.reportValidity()) return;
      if (
        f.id === 'resign-pay-form' &&
        !(await window.KsppsActivity.requireStarted(f.dataset.id, 'withdrawal-return'))
      )
        return;
      const data = new FormData(f),
        obj = Object.fromEntries(data);
      obj.confirm = data.get('confirm') === 'on';
      obj.version = Number(f.dataset.version);
      let path, body;
      if (f.id === 'resign-pay-form') {
        data.set('confirm', String(obj.confirm));
        data.set('version', String(obj.version));
        path = '/finance/withdrawals/' + f.dataset.id + '/pay';
        body = data;
      } else {
        path =
          f.id === 'resign-close-form'
            ? '/manager/withdrawals/' + f.dataset.id + '/close'
            : f.id === 'resign-settle-form'
              ? '/staff/financing/' + f.dataset.id + '/settle'
              : '/staff/financing';
        body = JSON.stringify(obj);
      }
      state.busy = true;
      f.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        await wf().api(path, { method: 'POST', body });
        $('#portal-dialog').close();
        window.KsppsActivity?.invalidate();
        await wf().refresh();
        state.loaded = false;
        await load();
      } catch (e) {
        const el = $('#resign-error');
        if (el) {
          el.textContent = e.message;
          el.hidden = false;
        }
      } finally {
        state.busy = false;
        f.querySelectorAll('button').forEach((x) => (x.disabled = false));
      }
    },
    true,
  );
  $('#portal-dialog').addEventListener('cancel', (e) => {
    if (state.busy) e.preventDefault();
  });
  window.addEventListener('kspps-staff-role-changed', () => {
    state.sequence++;
    state.loading = false;
    state.loaded = false;
    state.error = '';
    state.route = '';
    state.items = [];
  });
  window.KsppsWithdrawal = {
    getViewContext: () => ({ wf, state, button, table, record }),
    mount,
    summary,
    eligibility,
    closedPage,
    memberFinancing,
  };
}
