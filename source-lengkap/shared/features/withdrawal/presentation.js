/**
 * Status pengunduran diri, daftar pemeriksaan, dan pembiayaan anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWithdrawalPresentation({ esc, date, money, wf }) {
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
  return { button, field, details, summary, closedPage, eligibility, table, memberFinancing };
}
