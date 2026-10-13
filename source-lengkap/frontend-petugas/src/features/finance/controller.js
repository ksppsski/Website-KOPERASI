import { statusColor } from '../../../../shared/lib/status-colors.js';

/**
 * Rekonsiliasi bukti transfer dan persiapan bagi hasil.
 * Tampilan halaman berada di frontend-petugas/src/components/finance/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Finance screens extend the approved staff portal and use its account-scoped API. */
export function initializeFinance() {
  'use strict';
  const $ = (s) => document.querySelector(s),
    wf = () => window.KsppsWorkflow;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const date = (s) =>
    s
      ? new Date(s.length === 10 ? s + 'T12:00:00Z' : s).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';
  const today = () => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day}`;
  };
  const state = {
    date: today(),
    followToday: true,
    items: [],
    payout: null,
    loaded: false,
    loading: false,
    error: '',
    query: '',
    filter: '',
    busy: false,
    sequence: 0,
  };
  const announce = () => window.dispatchEvent(new CustomEvent('kspps-finance-loaded'));
  const role = () => wf()?.getStaff()?.role || 'admin';
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

  function show(title, content) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        ${action('close', 'Tutup')}
      </div>
      ${content}
    </div>`;
    modal.showModal();
    window.KsppsActivity?.mount();
  }
  function reconciliationDialog(id, kind) {
    const x = state.items.find((i) => i.id === id && i.kind === kind);
    if (!x) return;
    const r = x.reconciliation,
      done = ['approved', 'correction'].includes(r.status) || x.sourceStatus === 'correction';
    show(
      'Rekonsiliasi ' + x.label.toLowerCase(),
      /* HTML */ `${window.KsppsActivity?.panel(x.id, 'reconciliation') || ''}
        <div class="status-head">${badge(r)}</div>
        <dl class="review-list">
          ${[
            ...(x.projectCode
              ? [
                  ['Kode project', x.projectCode],
                  ['Penawaran', x.offerTitle],
                ]
              : []),
            ['Anggota', x.memberName],
            ['Nomor anggota', x.memberId || '—'],
            ['Nominal pengajuan', money(x.amount)],
            ['Bukti transfer', x.proofName],
          ]
            .map(
              ([a, b]) =>
                /* HTML */ `<div>
                  <dt>${a}</dt>
                  <dd>${esc(b)}</dd>
                </div>`,
            )
            .join('')}
        </dl>
        <div class="wf-actions">
          <a class="btn secondary" href="${esc(x.proofUrl)}" target="_blank" rel="noopener"
            >Lihat bukti transfer</a
          >
        </div>
        ${
          done
            ? /* HTML */ `<dl class="review-list">
                  ${[
                    ['Dana diterima', money(r.receivedAmount)],
                    ['Tanggal dana masuk', date(r.transferDate)],
                    ['Referensi mutasi', r.reference],
                    ['Direkonsiliasi', date(r.checkedAt)],
                    ['Catatan', r.note || '—'],
                  ]
                    .map(
                      ([a, b]) =>
                        /* HTML */ `<div>
                          <dt>${a}</dt>
                          <dd>${esc(b)}</dd>
                        </div>`,
                    )
                    .join('')}
                </dl>
                <p class="wf-note">
                  ${r.status === 'approved' ? (x.kind === 'savings' ? 'Setoran simpanan wajib sudah masuk ke saldo anggota.' : 'Dana sudah direkonsiliasi oleh Finance. Admin dapat melanjutkan pemeriksaan.') : 'Permintaan perbaikan sudah tampil di portal anggota. Bukti yang dikirim ulang akan masuk sebagai tugas baru.'}
                </p>`
            : /* HTML */ `<form
                id="finance-reconcile-form"
                data-id="${esc(id)}"
                data-kind="${kind}"
                data-version="${r.version || 0}"
                data-source-version="${x.sourceVersion}"
              >
                <label class="form-field"
                  ><span>Nominal masuk di mutasi bank (Rp) *</span
                  ><input
                    name="receivedAmount"
                    type="number"
                    min="0"
                    max="10000000000000"
                    step="1"
                    inputmode="numeric"
                    required
                    placeholder="Isi sesuai mutasi bank" /></label
                ><label class="form-field"
                  ><span>Tanggal dana masuk *</span
                  ><input
                    name="transferDate"
                    type="date"
                    min="1901-01-01"
                    max="${today()}"
                    value="${today()}"
                    required /></label
                ><label class="form-field"
                  ><span>Referensi mutasi / transaksi bank *</span
                  ><input
                    name="reference"
                    minlength="3"
                    maxlength="160"
                    required
                    placeholder="Nomor referensi atau keterangan mutasi" /></label
                ><label class="form-field"
                  ><span>Catatan</span
                  ><textarea
                    name="note"
                    maxlength="1500"
                    placeholder="Wajib jika meminta perbaikan"
                  >
${esc(r.note || '')}</textarea></label
                ><label class="check"
                  ><input type="checkbox" name="confirm" required />Bukti transfer cocok dengan
                  mutasi bank dan dana sudah diterima.</label
                >
                <p class="form-error" id="finance-error" role="alert" hidden></p>
                <div class="decision-actions">
                  <button
                    class="btn secondary"
                    type="submit"
                    name="decision"
                    value="return"
                    formnovalidate
                  >
                    Perlu perbaikan</button
                  ><button class="btn" type="submit" name="decision" value="approve">
                    Simpan rekonsiliasi
                  </button>
                </div>
              </form>`
        }`,
    );
  }
  function detail(index) {
    const m = state.payout?.members[index];
    if (!m) return;
    show(
      'Rincian bagi hasil',
      /* HTML */ `<h3>${esc(m.memberName)}</h3>
        <p class="subtext">${esc(m.bankName)} · ${esc(m.bankAccount)}<br />${date(state.date)}</p>
        ${table(
          ['AKAD / EFEKTIF NISBAH', 'MODAL', 'PERIODE', 'BAGI HASIL'],
          m.contracts
            .map(
              (c) =>
                /* HTML */ `<tr>
                  <td>
                    <strong>${esc(c.contractNumber)}</strong
                    ><small
                      >${date(c.effectiveDate)}${c.contractStatus === 'generated' ? '<br>Menunggu tanda tangan koperasi' : ''}</small
                    >
                  </td>
                  <td class="money">${money(c.principal)}</td>
                  <td>${c.period}/12</td>
                  <td class="money">${money(c.amount)}</td>
                </tr>`,
            )
            .join(''),
          '',
        )}
        <div class="finance-total">
          <span>Total anggota</span><strong>${money(m.amount)}</strong>
        </div>`,
    );
  }
  function csvCell(value, text = false) {
    let s = String(value ?? '');
    if (text || /^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  function exportCsv() {
    const p = state.payout;
    if (!p?.members.length) return;
    const rows = [
      [
        'Tanggal',
        'Nomor anggota',
        'Nama anggota',
        'Bank',
        'Nomor rekening',
        'Nama pemilik rekening',
        'Jumlah akad',
        'Total modal (Rp)',
        'Bagi hasil (Rp)',
      ],
      ...p.members.map((m) => [
        p.date,
        m.memberId,
        m.memberName,
        m.bankName,
        m.bankAccount,
        m.accountName,
        m.contractCount,
        m.principal,
        m.amount,
      ]),
      ['TOTAL', '', '', '', '', '', p.contractCount, '', p.total],
    ];
    const text =
      '\ufeff' +
      rows
        .map((r, i) => r.map((v, j) => csvCell(v, i > 0 && j >= 1 && j <= 5 && v !== '')).join(';'))
        .join('\r\n');
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'KSPPS-Bagi-Hasil-' + p.date + '.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function load() {
    if (state.loading || role() !== 'finance') return;
    state.loading = true;
    state.error = '';
    const seq = ++state.sequence;
    announce();
    try {
      const [q, p] = await Promise.all([
        wf().api('/finance/reconciliations'),
        wf().api('/finance/payouts?date=' + encodeURIComponent(state.date)),
      ]);
      if (seq !== state.sequence) return;
      state.items = q.items;
      state.payout = p;
      state.loaded = true;
    } catch (error) {
      if (seq === state.sequence) state.error = error.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        announce();
      }
    }
  }
  function syncToday() {
    if (state.followToday && state.date !== today() && !state.busy && !$('#portal-dialog').open) {
      state.date = today();
      invalidate();
      return true;
    }
    return false;
  }
  function mount() {
    syncToday();
    if (
      role() === 'finance' &&
      location.hash.startsWith('#finance-') &&
      !state.loaded &&
      !state.loading &&
      !state.error
    )
      void load();
  }
  function invalidate() {
    state.loaded = false;
    state.error = '';
  }
  document.addEventListener('click', (event) => {
    const b = event.target.closest('[data-finance-action]');
    if (!b) return;
    const a = b.dataset.financeAction;
    if (a === 'close' && !state.busy) $('#portal-dialog').close();
    if (a === 'refresh') {
      invalidate();
      void load();
    }
    if (a === 'today' && !state.loading) {
      state.date = today();
      state.followToday = true;
      invalidate();
      void load();
    }
    if (a === 'reconcile') reconciliationDialog(b.dataset.id, b.dataset.kind);
    if (a === 'detail') detail(Number(b.dataset.index));
    if (a === 'csv') exportCsv();
    if (a === 'payout-complete' && state.payout?.task) {
      show(
        'Selesaikan persiapan bagi hasil',
        /* HTML */ `<p>Konfirmasi daftar untuk ${date(state.date)} sudah diperiksa.</p>
          <form id="finance-payout-complete">
            <label class="check"
              ><input name="confirm" type="checkbox" required />Nominal dan rekening tujuan sudah
              sesuai.</label
            >
            <p class="field-hint">
              Ini mencatat pekerjaan persiapan selesai. Status transfer bank tidak berubah.
            </p>
            <p id="finance-error" class="form-error" role="alert" hidden></p>
            <button type="submit" class="btn">Simpan waktu selesai</button>
          </form>`,
      );
    }
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'finance-filter') {
      state.filter = event.target.value;
      $('#finance-queue-table').innerHTML = queueTable();
    }
    if (event.target.id === 'finance-date' && event.target.checkValidity() && event.target.value) {
      state.date = event.target.value;
      state.followToday = false;
      invalidate();
      if (state.loading) {
        state.sequence++;
        state.loading = false;
      }
      void load();
    }
  });
  document.addEventListener(
    'submit',
    async (event) => {
      const form = event.target;
      if (form.id !== 'finance-reconcile-form') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy) return;
      const decision = event.submitter?.value || 'approve';
      if (decision === 'approve' && !form.checkValidity()) {
        form.reportValidity();
        return;
      }
      if (
        window.KsppsActivity &&
        !(await window.KsppsActivity.requireStarted(form.dataset.id, 'reconciliation'))
      )
        return;
      const f = new FormData(form),
        body = {
          id: form.dataset.id,
          kind: form.dataset.kind,
          version: Number(form.dataset.version),
          sourceVersion: Number(form.dataset.sourceVersion),
          receivedAmount: f.get('receivedAmount') === '' ? null : Number(f.get('receivedAmount')),
          transferDate: f.get('transferDate'),
          reference: f.get('reference'),
          note: f.get('note'),
          confirm: f.get('confirm') === 'on',
          decision,
        };
      state.busy = true;
      const error = $('#finance-error');
      error.hidden = true;
      form.querySelectorAll('button,input,textarea').forEach((x) => (x.disabled = true));
      try {
        await wf().api('/finance/reconcile', { method: 'POST', body: JSON.stringify(body) });
        state.busy = false;
        $('#portal-dialog').close();
        invalidate();
        await wf().refresh();
        void load();
      } catch (e) {
        state.busy = false;
        form.querySelectorAll('button,input,textarea').forEach((x) => (x.disabled = false));
        error.textContent = e.message;
        error.hidden = false;
      }
    },
    true,
  );
  document.addEventListener(
    'submit',
    async (event) => {
      const form = event.target;
      if (form.id !== 'finance-payout-complete') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (state.busy || !form.reportValidity()) return;
      state.busy = true;
      const b = form.querySelector('button');
      b.disabled = true;
      try {
        await wf().api('/finance/payouts/complete', {
          method: 'POST',
          body: JSON.stringify({
            date: state.date,
            taskId: state.payout.task.id,
            confirm: new FormData(form).get('confirm') === 'on',
          }),
        });
        state.busy = false;
        $('#portal-dialog').close();
        window.KsppsActivity?.invalidate();
        invalidate();
        void load();
      } catch (error) {
        state.busy = false;
        b.disabled = false;
        const el = $('#finance-error');
        el.hidden = false;
        el.textContent = error.message;
      }
    },
    true,
  );
  $('#portal-dialog').addEventListener('cancel', (event) => {
    if (state.busy) event.preventDefault();
  });
  window.addEventListener('kspps-profile-loaded', () => {
    if (!$('#portal-dialog').open && !state.busy) invalidate();
  });
  window.addEventListener('kspps-staff-role-changed', () => {
    state.sequence++;
    state.loading = false;
    invalidate();
  });
  window.addEventListener('kspps-member-changed', () => {
    state.sequence++;
    state.loading = false;
    state.items = [];
    state.payout = null;
    invalidate();
  });
  setInterval(() => {
    if (syncToday() && role() === 'finance' && location.hash.startsWith('#finance-')) void load();
  }, 60000);
  window.KsppsFinance = {
    getViewContext: () => ({
      wf,
      esc,
      money,
      date,
      state,
      heading,
      action,
      table,
      loading,
      metrics,
      datePicker,
      detail,
      badge,
      queueTable,
    }),
    mount,
  };
}
