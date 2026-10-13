import { activityService } from '../../../../shared/services/activity.js';
/**
 * Pemeriksaan bukti transfer dan rincian jadwal bagi hasil.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createReconciliationDialog({
  $,
  action,
  state,
  badge,
  money,
  esc,
  date,
  today,
  table,
}) {
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
    activityService?.mount();
  }

  function reconciliationDialog(id, kind) {
    const x = state.items.find((i) => i.id === id && i.kind === kind);
    if (!x) return;
    const r = x.reconciliation,
      done = ['approved', 'correction'].includes(r.status) || x.sourceStatus === 'correction';
    show(
      'Rekonsiliasi ' + x.label.toLowerCase(),
      /* HTML */ `${activityService?.panel(x.id, 'reconciliation') || ''}
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
                  ${
                    r.status === 'approved'
                      ? x.kind === 'savings'
                        ? 'Setoran simpanan wajib sudah masuk ke saldo anggota.'
                        : 'Dana sudah direkonsiliasi oleh Finance. Admin dapat melanjutkan pemeriksaan.'
                      : 'Permintaan perbaikan sudah tampil di portal anggota. Bukti yang dikirim ulang akan masuk sebagai tugas baru.'
                  }
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
  return { show, reconciliationDialog, detail };
}
