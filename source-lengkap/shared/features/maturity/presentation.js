/**
 * Notifikasi akhir akad dan ringkasan keputusan anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMaturityPresentation({ esc, wf, money, date, state }) {
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
                ${
                  d.choice === 'extend'
                    ? 'Lanjut ke project baru · Efektif ' + date(d.effectiveDate)
                    : m.returnPaidAt
                      ? 'Modal dikembalikan ' + date(m.returnPaidAt)
                      : 'Pengembalian dijadwalkan ' + date(d.dueDate)
                }.
              </p>
              <small>Pilihan dikonfirmasi ${date(d.confirmedAt)} dan tidak dapat diganti.</small>`
          : m.needsDecision
            ? btn('decide', 'Tentukan pilihan', item.id)
            : /* HTML */ `<small>Pilihan tersedia mulai ${date(m.opensAt)}.</small>`
      }
    </div>`;
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
  return { btn, heading, table, reminders, summary, stats, loading };
}
