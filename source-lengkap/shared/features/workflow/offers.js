/**
 * Penawaran modal dan batas tampil tiga hari setelah terpenuhi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { offerVisibleToMember } from '../../lib/offer-visibility.js';
export function createWorkflowOffers({
  runtime,
  staff,
  state,
  empty,
  esc,
  money,
  date,
  ensureReady,
  show,
  action,
}) {
  function scheduleOfferExpiry() {
    clearTimeout(runtime.offerExpiryTimer);
    if (staff) return;
    const now = Date.now();
    const deadlines = state.offers
      .filter((o) => o.remaining <= 0 && o.memberVisibleUntil)
      .map((o) => Date.parse(o.memberVisibleUntil))
      .filter((at) => at > now);
    if (!deadlines.length) return;
    runtime.offerExpiryTimer = setTimeout(
      () => {
        // Hanya perbarui daftar penawaran; jangan menutup formulir yang sedang diisi.
        document.querySelectorAll('[data-workflow="member-offers"]').forEach((el) => {
          el.innerHTML = offerCards(false);
        });
        scheduleOfferExpiry();
      },
      Math.min(2147483647, Math.min(...deadlines) - now),
    );
  }

  function offerCards(manager = false) {
    const visibleOffers = manager
      ? state.offers
      : state.offers.filter((o) => offerVisibleToMember(o));
    if (!visibleOffers.length)
      return empty(
        manager
          ? 'Belum ada penawaran. Buat penawaran pertama untuk anggota.'
          : 'Belum ada penawaran penyertaan modal yang dibuka.',
      );
    return (
      /* HTML */ `<div class="offer-grid">
      ` +
      visibleOffers
        .map((o) => {
          const full = o.remaining <= 0,
            active = !!state.profile?.savings?.active,
            pct = Math.min(100, Math.round((o.reserved / o.quota) * 100));
          return (
            /* HTML */ `<article class="offer-card">
            <div class="wf-card-head">
              <span class="offer-code">${esc(o.projectCode)}</span
              ><span class="badge ${full ? 'blue' : 'green'}"
                >${full ? 'Kuota penuh' : 'Dibuka'}</span
              >
            </div>
            <h3>${esc(o.title)}</h3>
            <div class="offer-remaining">
              <span>Sisa kuota</span><strong>${money(o.remaining)}</strong>
            </div>
            <div
              class="progress"
              role="progressbar"
              aria-label="Kuota terisi"
              aria-valuenow="${pct}"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <span style="width:${pct}%"></span>
            </div>
            <div class="split-line small muted">
              <span>${money(o.reserved)} terisi</span><span>dari ${money(o.quota)}</span>
            </div>
            ` +
            (manager
              ? /* HTML */ `<p class="field-hint">
                  Dibuka
                  ${date(o.createdAt)}${o.fulfilledAt ? '<br>Terpenuhi ' + date(o.fulfilledAt) : ''}${!offerVisibleToMember(o) ? '<br>Tidak ditampilkan di portal anggota' : ''}
                </p>`
              : /* HTML */ `<button
                  type="button"
                  class="btn full"
                  data-wf-action="capital"
                  data-id="${esc(o.id)}"
                  ${full || !active ? 'disabled' : ''}
                >
                  ${full ? 'Kuota penuh' : !active ? 'Simpanan belum aktif' : 'Ikuti penawaran'}
                </button>`) +
            `
          </article>`
          );
        })
        .join('') +
      `
    </div>`
    );
  }

  async function offerForm() {
    if (!(await ensureReady())) return;
    if (state.staff.role !== 'manager') return;
    runtime.formId = crypto.randomUUID();
    show(
      'Buat penawaran',
      /* HTML */ `<form id="wf-offer-form">
        <label class="form-field"
          ><span>Nama penawaran *</span
          ><input
            name="title"
            maxlength="80"
            placeholder="Pengadaan Barang Mitra"
            required /></label
        ><label class="form-field"
          ><span>Kode project *</span
          ><input name="projectCode" maxlength="60" placeholder="MRBH-2026-09-01" required /><small
            class="field-hint"
            >Gunakan kode berbeda untuk setiap penawaran.</small
          ></label
        ><label class="form-field"
          ><span>Kuota penerimaan (Rp) *</span
          ><input
            name="quota"
            type="number"
            min="1"
            max="1000000000000"
            step="1"
            inputmode="numeric"
            placeholder="1000000000"
            required
        /></label>
        <p id="wf-error" class="form-error" role="alert" hidden></p>
        <div class="form-actions">
          ${action('close', '', 'Batal')}<button type="submit" class="btn">Buka penawaran</button>
        </div>
      </form>`,
    );
  }
  return { scheduleOfferExpiry, offerCards, offerForm };
}
