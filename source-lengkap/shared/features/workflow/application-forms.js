import { withdrawalService } from '../../services/withdrawal.js';
/**
 * Form penyertaan modal dan permohonan pengunduran diri.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowApplicationForms({
  ensureReady,
  state,
  show,
  profilePanel,
  checkAccess,
  offerCards,
  runtime,
  esc,
  money,
  financeStatus,
  notice,
  api,
}) {
  async function capitalForm(item = null, offerId = '') {
    if (!(await ensureReady())) return;
    if (!item && (!state.profile || state.profile.status !== 'approved')) {
      show(
        'Lengkapi pendaftaran',
        profilePanel() +
          '<p class="dialog-note">Pendaftaran perlu disetujui pada portal petugas sebelum mengajukan penyertaan modal.</p>',
      );
      return;
    }
    if (!item && !(await checkAccess())) return;
    const offer = state.offers.find((o) => o.id === (item?.offerId || offerId));
    if (!item && !offer) {
      show('Pilih penawaran', offerCards());
      return;
    }
    if (!item && offer.remaining <= 0) {
      show(
        'Kuota penuh',
        '<p>Kuota penawaran ini sudah terpenuhi. Pilih penawaran lain yang masih dibuka.</p>',
      );
      return;
    }
    const available = offer ? offer.remaining + (item?.amount || 0) : 1000000000000;
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki penyertaan modal' : 'Ajukan penyertaan modal',
      /* HTML */ `<div class="wf-identity">
          <strong>${esc(item?.memberName || state.profile?.data.name || 'Anggota')}</strong
          ><span
            >${esc(item?.memberId || state.profile?.memberNumber || 'Nomor belum tersedia')}</span
          >
        </div>
        <p class="muted small">Untuk pengadaan kebutuhan barang Mitra.</p>
        ${
          offer || item?.projectCode
            ? /* HTML */ `<div class="offer-form-heading">
                <strong>${esc(offer?.title || item.offerTitle)}</strong
                ><span class="offer-code">${esc(offer?.projectCode || item.projectCode)}</span
                ><small>Batas nominal pengajuan: ${money(available)}</small>
              </div>`
            : ''
        }${item?.note ? /* HTML */ `<div class="wf-note">${esc(item.note)}</div>` : ''}${item?.finance?.status === 'correction' ? financeStatus(item) : ''}
        <form
          id="wf-capital-form"
          data-revise="${item ? 'yes' : ''}"
          data-version="${item?.version || 0}"
          data-offer-id="${esc(offer?.id || item?.offerId || '')}"
        >
          <label class="form-field"
            ><span>Nominal setoran (Rp) *</span
            ><input
              name="amount"
              type="number"
              min="1"
              max="${available}"
              step="1"
              inputmode="numeric"
              value="${item?.amount || ''}"
              placeholder="Contoh: 25000000"
              required
          /></label>
          <div class="file-picker">
            <label class="field-label" for="wf-proof">Bukti transfer *</label
            ><input
              id="wf-proof"
              type="file"
              name="proof"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              required
            />
            <p class="field-hint">JPG, PNG, atau PDF · Maks. 10 MB</p>
          </div>
          <p class="wf-upload-name" id="wf-file-name" aria-live="polite"></p>
          <label class="check"
            ><input type="checkbox" name="signatureConsent" required />Saya menyetujui penggunaan
            tanda tangan terdaftar pada akad pengajuan ini.</label
          >
          <p class="form-error" id="wf-error" role="alert" hidden></p>
          <p class="dialog-note">Pengajuan dan bukti transfer dikirim kepada petugas koperasi.</p>
          <div class="form-actions">
            <button type="button" class="btn secondary" data-wf-action="close">Batal</button
            ><button class="btn" type="submit">Kirim ke petugas</button>
          </div>
        </form>`,
    );
  }

  async function withdrawalForm(item = null) {
    if (!(await ensureReady())) return;
    if (!item && (!state.profile || state.profile.status !== 'approved')) {
      show('Lengkapi pendaftaran', profilePanel());
      return;
    }
    if (
      !item &&
      state.items.some(
        (x) =>
          x.kind === 'withdrawal' &&
          [
            'pending',
            'reviewing',
            'correction',
            'approved',
            'finance_pending',
            'manager_pending',
          ].includes(x.status),
      )
    ) {
      notice('Masih ada permohonan yang sedang diproses.');
      return;
    }
    try {
      state.withdrawal = await api('/withdrawal/eligibility');
      if (state.withdrawal.blockers?.length) {
        show(
          'Selesaikan kontrak terlebih dahulu',
          withdrawalService?.eligibility() ||
            '<p>Masih ada kontrak atau pengajuan yang berjalan.</p>',
        );
        return;
      }
    } catch (e) {
      notice(e.message);
      return;
    }
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki permohonan' : 'Pengunduran diri anggota',
      /* HTML */ `<div class="wf-identity">
          <strong>${esc(item?.memberName || state.profile?.data.name || 'Anggota')}</strong
          ><span
            >${esc(item?.memberId || state.profile?.memberNumber || 'Nomor belum tersedia')}</span
          >
        </div>
        ${item?.note ? /* HTML */ `<div class="wf-note">${esc(item.note)}</div>` : ''}
        <p class="field-hint">
          Admin memeriksa permohonan, Finance mengembalikan simpanan pokok Rp100.000, lalu Manajer
          memberikan persetujuan final penutupan keanggotaan.
        </p>
        <form
          id="wf-withdrawal-form"
          data-revise="${item ? 'yes' : ''}"
          data-version="${item?.version || 0}"
        >
          <label class="form-field"
            ><span>Alasan pengunduran diri *</span
            ><textarea
              name="reason"
              rows="4"
              minlength="10"
              maxlength="1500"
              required
              placeholder="Sampaikan alasan pengunduran diri Anda."
            >
${esc(item?.reason || '')}</textarea></label
          ><label class="check"
            ><input type="checkbox" name="consent" required />Saya mengajukan permohonan pengunduran
            diri untuk ditinjau Admin.</label
          >
          <p class="form-error" id="wf-error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn secondary" type="button" data-wf-action="close">Batal</button
            ><button class="btn" type="submit">Kirim permohonan</button>
          </div>
        </form>`,
    );
  }
  return { capitalForm, withdrawalForm };
}
