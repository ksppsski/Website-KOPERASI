/**
 * Pilihan jatuh tempo, pengembalian modal dan laporan manajer.
 * Tampilan petugas berada di frontend-petugas/src/components/maturity/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Contract maturity choices, finance returns and manager reports. */
export function initializeMaturity() {
  'use strict';
  const wf = () => window.KsppsWorkflow,
    $ = (s) => document.querySelector(s);
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
          month: 'long',
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
    sequence: 0,
    busy: false,
    loading: false,
    loaded: false,
    error: '',
    returns: null,
    report: null,
    from: '',
    to: '',
    filter: '',
    route: '',
  };
  const btn = (action, label, id = '', extra = '') =>
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-maturity-action="${action}"
      data-id="${esc(id)}"
      ${extra}
    >
      ${label}
    </button>`;
  const heading = (title, description) =>
    /* HTML */ `<div class="page-heading">
      <div>
        <h1>${title}</h1>
        <p class="subtext">${description}</p>
      </div>
      ${btn('refresh', 'Perbarui')}
    </div>`;
  const table = (heads, rows, empty) =>
    /* HTML */ `<div class="table-scroll">
      <table>
        <thead>
          <tr>
            ${heads.map((h) => /* HTML */ `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${
            rows ||
            /* HTML */ `<tr>
              <td colspan="${heads.length}"><div class="empty-state">${empty}</div></td>
            </tr>`
          }
        </tbody>
      </table>
    </div>`;
  function reminders() {
    const rows = (wf()?.getItems() || []).filter((x) => x.maturity?.needsDecision);
    if (!rows.length) return '';
    return /* HTML */ `<section
      class="panel maturity-reminders status-alert-red"
      aria-label="Pengingat akad berakhir"
    >
      <div class="panel-head">
        <h2>Konfirmasi kelanjutan modal</h2>
        <span class="badge red">${rows.length} akad</span>
      </div>
      ${rows
        .map(
          (x) =>
            /* HTML */ `<div class="wf-card">
              <strong>${esc(x.projectCode || 'Penyertaan modal')}</strong>
              <p>${money(x.amount)} · Berakhir ${date(x.maturity.endDate)}</p>
              <p class="field-hint">${esc(x.contractNumber)}</p>
              ${btn('decide', 'Tentukan pilihan', x.id)}
            </div>`,
        )
        .join('')}
    </section>`;
  }
  function summary(item) {
    const m = item.maturity;
    if (!m) return '';
    const d = m.decision;
    return /* HTML */ `<div class="wf-note">
      <strong>${esc(m.status)}</strong>
      <p>Akad berakhir ${date(m.endDate)}.</p>
      ${
        d
          ? /* HTML */ `<p>
                ${d.choice === 'extend' ? 'Lanjut ke project baru · Efektif ' + date(d.effectiveDate) : m.returnPaidAt ? 'Modal dikembalikan ' + date(m.returnPaidAt) : 'Pengembalian dijadwalkan ' + date(d.dueDate)}.
              </p>
              <small>Pilihan dikonfirmasi ${date(d.confirmedAt)} dan tidak dapat diganti.</small>`
          : m.needsDecision
            ? btn('decide', 'Tentukan pilihan', item.id)
            : /* HTML */ `<small>Pilihan tersedia mulai ${date(m.opensAt)}.</small>`
      }
    </div>`;
  }
  function show(title, body) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        ${btn('close', 'Tutup')}
      </div>
      ${body}
    </div>`;
    modal.showModal();
    window.KsppsActivity?.mount();
  }
  function decide(id) {
    const item = wf()
      .getItems()
      .find((x) => x.id === id);
    if (!item?.maturity?.needsDecision) return;
    const choices = wf()
      .getOffers()
      .filter(
        (o) =>
          o.id !== item.offerId && o.projectCode !== item.projectCode && o.remaining >= item.amount,
      );
    const canExtend = !!wf().getSavings()?.active && choices.length > 0;
    show(
      'Pilihan akhir akad',
      /* HTML */ `<div class="wf-identity">
          <strong>${esc(item.projectCode || 'Penyertaan modal')}</strong
          ><span>${esc(item.contractNumber)}</span>
        </div>
        <dl class="review-list">
          <div>
            <dt>Modal</dt>
            <dd>${money(item.amount)}</dd>
          </div>
          <div>
            <dt>Jatuh tempo</dt>
            <dd>${date(item.maturity.endDate)}</dd>
          </div>
        </dl>
        <form id="maturity-choice-form" data-id="${esc(id)}">
          <fieldset class="maturity-options">
            <legend>Pilih satu</legend>
            <label class="check"
              ><input
                type="radio"
                name="choice"
                value="extend"
                required
                ${canExtend ? '' : 'disabled'}
              />Lanjut ke project baru</label
            ><label class="check"
              ><input type="radio" name="choice" value="return" required />Pengembalian modal</label
            >
          </fieldset>
          ${!canExtend ? /* HTML */ `<p class="field-hint">${wf().getSavings()?.active ? 'Belum ada project baru dengan kuota yang cukup.' : 'Simpanan harus aktif untuk melanjutkan modal.'}</p>` : ''}
          <div id="maturity-project" hidden>
            <label class="form-field"
              ><span>Project baru *</span
              ><select name="offerId">
                <option value="">Pilih project</option>
                ${choices.map((o) => /* HTML */ `<option value="${esc(o.id)}">${esc(o.projectCode)} · ${esc(o.title)}</option>`).join('')}
              </select></label
            >
            <p class="field-hint">
              Modal yang sama dialihkan tanpa setoran baru dan tanpa tambahan masa tunggu 10 hari.
              Efektif pada jatuh tempo; jika konfirmasi terlambat, efektif sejak tanggal konfirmasi.
              Tanggal 31 dialihkan ke tanggal 1.
            </p>
            <label class="check"
              ><input type="checkbox" name="signatureConsent" />Saya menyetujui penggunaan tanda
              tangan terdaftar pada akad lanjutan.</label
            >
          </div>
          <p id="maturity-return-note" class="info-box" hidden>
            Pengembalian tetap dijadwalkan pada ${date(item.maturity.endDate)}, meskipun
            dikonfirmasi lebih awal.
          </p>
          <label class="check"
            ><input type="checkbox" name="confirm" required />Saya memahami pilihan ini hanya dapat
            dikonfirmasi satu kali dan tidak dapat diganti.</label
          >
          <p class="form-error" id="maturity-error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn" type="submit">Konfirmasi pilihan</button>
          </div>
        </form>`,
    );
  }
  function stats(items) {
    return /* HTML */ `<div class="stats maturity-stats">
      ${items
        .map(
          ([label, amount, detail]) =>
            /* HTML */ `<div class="stat">
              <div class="stat-top">${label}</div>
              <div class="stat-value finance-value">${money(amount)}</div>
              <div class="stat-bottom">${detail}</div>
            </div>`,
        )
        .join('')}
    </div>`;
  }
  function loading() {
    return /* HTML */ `<section class="panel">
      <p ${state.error ? 'class="form-error" role="alert"' : 'role="status"'}>
        ${esc(state.error || 'Memuat data…')}
      </p>
    </section>`;
  }

  function returnDialog(id) {
    const x = state.returns?.items.find((x) => x.id === id);
    if (!x) return;
    show(
      'Pengembalian modal',
      /* HTML */ `${x.status === 'due' ? window.KsppsActivity?.panel(id, 'principal-return') || '' : ''}
        <dl class="review-list">
          ${[
            ['Anggota', x.memberName],
            ['Nomor akad', x.contractNumber],
            ['Jatuh tempo', date(x.dueDate)],
            ['Modal', money(x.amount)],
            ['Bank', x.bankName],
            ['Rekening tujuan', x.bankAccount],
            ['Atas nama', x.accountName],
          ]
            .map(
              ([k, v]) =>
                /* HTML */ `<div>
                  <dt>${k}</dt>
                  <dd>${esc(v)}</dd>
                </div>`,
            )
            .join('')}
        </dl>
        ${
          x.status === 'scheduled'
            ? /* HTML */ `<p class="info-box">Dapat diproses mulai ${date(x.dueDate)}.</p>`
            : x.status === 'paid'
              ? /* HTML */ `<p class="info-box">
                    Pengembalian dicatat ${date(x.paidAt)}. Referensi: ${esc(x.reference)}.
                  </p>
                  <a class="btn secondary" href="${esc(x.proofUrl)}" target="_blank" rel="noopener"
                    >Lihat bukti pengembalian</a
                  >`
              : /* HTML */ `<form id="maturity-return-form" data-id="${esc(id)}">
                  <label class="form-field"
                    ><span>Nominal pengembalian (Rp)</span
                    ><input
                      type="number"
                      name="amount"
                      value="${x.amount}"
                      readonly
                      required /></label
                  ><label class="form-field"
                    ><span>Tanggal transfer *</span
                    ><input
                      type="date"
                      name="transferDate"
                      min="${x.dueDate}"
                      max="${state.returns.today}"
                      value="${state.returns.today}"
                      required /></label
                  ><label class="form-field"
                    ><span>Referensi transfer *</span
                    ><input name="reference" minlength="3" maxlength="160" required /></label
                  ><label class="form-field"
                    ><span>Bukti pengembalian *</span
                    ><input type="file" name="proof" accept=".jpg,.jpeg,.png,.pdf" required
                  /></label>
                  <p class="field-hint">JPG, PNG, atau PDF · Maks. 10 MB</p>
                  <label class="check"
                    ><input type="checkbox" name="confirm" required />Modal sudah ditransfer ke
                    rekening anggota sesuai nominal dan bukti.</label
                  >
                  <p class="form-error" id="maturity-error" role="alert" hidden></p>
                  <button class="btn" type="submit">Catat pengembalian selesai</button>
                </form>`
        }`,
    );
  }

  async function load() {
    if (state.loading) return;
    const route = location.hash,
      sequence = ++state.sequence;
    state.route = route;
    state.loading = true;
    state.error = '';
    try {
      if (route === '#finance-pengembalian') {
        const r = await wf().api('/finance/returns');
        if (sequence !== state.sequence) return;
        state.returns = r;
      } else if (route === '#manager-jatuh-tempo') {
        const r = await wf().api(
          '/maturity/report?' + new URLSearchParams({ from: state.from, to: state.to }),
        );
        if (sequence !== state.sequence) return;
        state.report = r;
        state.from = r.from;
        state.to = r.to;
      } else return;
      state.loaded = true;
    } catch (e) {
      if (sequence === state.sequence) state.error = e.message;
    } finally {
      if (sequence === state.sequence) {
        state.loading = false;
        window.dispatchEvent(new CustomEvent('kspps-maturity-loaded'));
      }
    }
  }
  function mount() {
    if (!['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash)) return;
    if (state.route !== location.hash) {
      state.loaded = false;
      state.error = '';
    }
    if (!state.loaded && !state.loading && !state.error) void load();
  }
  function error(e) {
    const el = $('#maturity-error');
    if (el) {
      el.hidden = false;
      el.textContent = e.message;
    }
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-maturity-action]');
    if (!b || state.busy) return;
    const a = b.dataset.maturityAction;
    if (a === 'close') $('#portal-dialog').close();
    if (a === 'decide') decide(b.dataset.id);
    if (a === 'return-detail') returnDialog(b.dataset.id);
    if (a === 'refresh') void load();
  });
  document.addEventListener('change', (e) => {
    if (e.target.name === 'choice' && e.target.form?.id === 'maturity-choice-form') {
      const extend = e.target.value === 'extend';
      $('#maturity-project').hidden = !extend;
      $('#maturity-return-note').hidden = extend;
      for (const el of $('#maturity-project').querySelectorAll('input,select')) {
        el.required = extend;
        el.disabled = !extend;
      }
    }
    if (e.target.id === 'maturity-return-filter') {
      state.filter = e.target.value;
      window.dispatchEvent(new CustomEvent('kspps-maturity-loaded'));
    }
  });
  document.addEventListener(
    'submit',
    async (e) => {
      const form = e.target;
      if (
        !['maturity-choice-form', 'maturity-return-form', 'maturity-period-form'].includes(form.id)
      )
        return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (state.busy || !form.reportValidity()) return;
      const data = new FormData(form);
      if (form.id === 'maturity-period-form') {
        state.from = data.get('from');
        state.to = data.get('to');
        if (state.from > state.to) {
          form.elements.to.setCustomValidity('Tanggal akhir harus setelah tanggal awal.');
          form.elements.to.reportValidity();
          form.elements.to.setCustomValidity('');
          return;
        }
        void load();
        return;
      }
      if (
        form.id === 'maturity-return-form' &&
        !(await window.KsppsActivity.requireStarted(form.dataset.id, 'principal-return'))
      )
        return;
      state.busy = true;
      form.querySelectorAll('button').forEach((x) => (x.disabled = true));
      try {
        if (form.id === 'maturity-choice-form')
          await wf().api('/' + form.dataset.id + '/maturity', {
            method: 'POST',
            body: JSON.stringify({
              choice: data.get('choice'),
              offerId: data.get('offerId'),
              confirm: data.get('confirm') === 'on',
              signatureConsent: data.get('signatureConsent') === 'on',
            }),
          });
        else {
          data.set('confirm', String(data.get('confirm') === 'on'));
          await wf().api('/finance/returns/' + form.dataset.id + '/complete', {
            method: 'POST',
            body: data,
          });
        }
        $('#portal-dialog').close();
        state.loaded = false;
        window.KsppsActivity?.invalidate();
        await wf().refresh();
        if (location.pathname.endsWith('petugas.html')) await load();
      } catch (e) {
        error(e);
      } finally {
        state.busy = false;
        form.querySelectorAll('button').forEach((x) => (x.disabled = false));
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
  });
  function idleRefresh() {
    if (
      ['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash) &&
      state.loaded &&
      !state.busy &&
      !state.loading &&
      !$('#portal-dialog').open &&
      !document.activeElement?.matches('input,textarea,select')
    )
      void load();
  }
  setInterval(() => {
    if (document.visibilityState === 'visible') idleRefresh();
  }, 60000);
  window.addEventListener('focus', idleRefresh);
  window.KsppsMaturity = {
    getViewContext: () => ({ esc, money, date, state, btn, heading, table, stats, loading, error }),
    reminders,
    summary,
    mount,
  };
}
