import { activityService } from '../../services/activity.js';
/**
 * Dialog keputusan akhir akad dan pencatatan pengembalian modal.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMaturityDialogs({ $, btn, wf, esc, money, date, state }) {
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
    activityService?.mount();
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
          ${
            !canExtend
              ? /* HTML */ `<p class="field-hint">
                  ${
                    wf().getSavings()?.active
                      ? 'Belum ada project baru dengan kuota yang cukup.'
                      : 'Simpanan harus aktif untuk melanjutkan modal.'
                  }
                </p>`
              : ''
          }
          <div id="maturity-project" hidden>
            <label class="form-field"
              ><span>Project baru *</span
              ><select name="offerId">
                <option value="">Pilih project</option>
                ${choices
                  .map(
                    (o) =>
                      /* HTML */ `<option value="${esc(o.id)}">
                        ${esc(o.projectCode)} · ${esc(o.title)}
                      </option>`,
                  )
                  .join('')}
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

  function returnDialog(id) {
    const x = state.returns?.items.find((x) => x.id === id);
    if (!x) return;
    show(
      'Pengembalian modal',
      /* HTML */ `${x.status === 'due' ? activityService?.panel(id, 'principal-return') || '' : ''}
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

  function error(e) {
    const el = $('#maturity-error');
    if (el) {
      el.hidden = false;
      el.textContent = e.message;
    }
  }
  return { show, decide, returnDialog, error };
}
