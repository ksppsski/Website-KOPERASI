/**
 * Data pendaftaran, foto identitas, dan pemeriksaan admin.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWorkflowRegistration({
  needsCorrection,
  esc,
  date,
  state,
  show,
  staff,
  action,
  empty,
  workPanel,
  checks,
}) {
  const profileStatus = (p) =>
    needsCorrection(p)
      ? 'Perlu perbaikan'
      : {
          pending: 'Menunggu pemeriksaan',
          approved: 'Pendaftaran disetujui',
          correction: 'Perlu perbaikan',
          closed: 'Keanggotaan ditutup',
        }[p.status] || p.status;

  function profileDetails(p) {
    const d = p.data;
    return /* HTML */ `<dl class="review-list">
      ${[
        ['Nomor anggota', p.memberNumber || '—'],
        ['Nama lengkap', d.name],
        ['Identitas', d.identityType + ' · ' + d.identityNumber],
        ['Alamat sesuai identitas', d.identityAddress],
        ['Kelurahan', d.village],
        ['Kecamatan', d.district],
        ['Kota/kabupaten', d.city],
        ['Provinsi', d.province],
        ['Alamat domisili', d.address],
        ['Bank', d.bankName],
        ['Nomor rekening', d.bankAccount],
        ['Telepon', d.phone],
        ['Email', d.email],
      ]
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

  function identityMedia(p) {
    const version = p.version ? '?v=' + Number(p.version) : '',
      sig = p.signatureUrl ? esc(p.signatureUrl + version) : '',
      ktp = p.ktpUrl ? esc(p.ktpUrl + version) : '';
    return /* HTML */ `<div class="wf-identity-media">
      <div class="wf-signature">
        <span>Tanda tangan anggota</span>${
          sig
            ? /* HTML */ `<div class="wf-media-image">
                <img src="${sig}" alt="Tanda tangan anggota" width="250" height="85" />
              </div>`
            : '<p class="field-hint">Belum tersedia.</p>'
        }
      </div>
      <div class="wf-ktp">
        <span>Foto KTP</span>${
          ktp
            ? /* HTML */ `<a
                  class="wf-media-image"
                  href="${ktp}"
                  target="_blank"
                  rel="noopener"
                  aria-label="Lihat foto KTP ukuran penuh"
                  ><img src="${ktp}" alt="Foto KTP anggota" width="400" height="252"
                /></a>
                <p class="field-hint">
                  ${
                    p.ktpCheckedAt
                      ? 'Sudah diperiksa Admin · ' + date(p.ktpCheckedAt)
                      : 'Klik gambar untuk memperbesar.'
                  }
                </p>`
            : '<p class="field-hint">Foto KTP belum diunggah.</p>'
        }
      </div>
    </div>`;
  }

  function completeKtpDialog() {
    const p = state.profile;
    if (!p || p.ktpUrl) return;
    show(
      'Lengkapi foto KTP',
      /* HTML */ `<p class="subtext">
          Setelah diunggah, pendaftaran masuk kembali ke pemeriksaan Admin.
        </p>
        <form id="wf-ktp-form" data-version="${p.version}">
          <label class="form-field"
            ><span>Foto KTP *</span
            ><input type="file" name="ktp" accept=".jpg,.jpeg,.png,image/jpeg,image/png" required
          /></label>
          <p class="field-hint">JPG atau PNG · Maks. 10 MB · Seluruh KTP terlihat jelas.</p>
          <p class="form-error" id="wf-error" role="alert" hidden></p>
          <div class="form-actions"><button type="submit" class="btn">Unggah KTP</button></div>
        </form>`,
    );
  }

  function profilePanel() {
    const p = state.profile;
    if (!p)
      return /* HTML */ `<div class="wf-empty">
        <strong>Data akad belum tersedia</strong>
        <p>Lengkapi pendaftaran beserta rekening dan tanda tangan.</p>
        <a class="btn" href="anggota.html#daftar">Daftar anggota</a>
      </div>`;
    const adminNote = p.note ? /* HTML */ `<p class="wf-note">${esc(p.note)}</p>` : '';
    const financeNote = !staff && p.finance?.status === 'correction' ? financeStatus(p) : '';
    const letterLink = p.letter
      ? /* HTML */ `<div class="wf-actions">
          <a class="btn secondary" href="${esc(p.letter.url)}?download=1">
            Unduh surat keanggotaan
          </a>
        </div>`
      : '';
    const completeIdentity =
      !staff && !p.ktpUrl && p.status !== 'correction'
        ? action('complete-ktp', '', 'Lengkapi foto KTP', true)
        : '';
    const correctRegistration =
      !staff && needsCorrection(p)
        ? action('edit-registration', '', 'Perbaiki pendaftaran', true)
        : '';
    const reviewRegistration = staff
      ? /* HTML */ `<div class="wf-actions">
          ${action('registration-review', '', 'Periksa pendaftaran', true)}
        </div>`
      : '';

    return /* HTML */ `<div class="wf-profile">
      <div class="wf-card-head">
        <strong>${esc(p.data.name)}</strong
        ><span class="badge ${statusColor(profileStatus(p))}">${profileStatus(p)}</span>
      </div>
      ${adminNote}${financeNote}${profileDetails(p)}${identityMedia(p)}
      ${letterLink}${completeIdentity}${correctRegistration}${reviewRegistration}
    </div>`;
  }

  function staffRegistrationPanel() {
    return state.profiles.length
      ? state.profiles
          .map(
            (p) =>
              /* HTML */ `<div class="wf-card-head">
                <div>
                  <strong>${esc(p.data.name)}</strong>
                  <p class="field-hint">
                    ${esc(p.memberNumber || '—')} · Dikirim ${date(p.createdAt)} ·
                    ${profileStatus(p)}
                  </p>
                </div>
                ${action('registration-review', p.id, 'Lihat pendaftaran', true)}
              </div>`,
          )
          .join('')
      : empty('Belum ada pendaftaran anggota.');
  }

  function financeStatus(record) {
    const r = record?.finance;
    return /* HTML */ `<div class="wf-note">
      <strong>Rekonsiliasi Finance: ${esc(r?.label || 'Menunggu Finance')}</strong
      >${r?.reference ? /* HTML */ `<p>Referensi ${esc(r.reference)} · ${date(r.checkedAt)}</p>` : ''}${r?.note ? /* HTML */ `<p>${esc(r.note)}</p>` : ''}
    </div>`;
  }

  function registrationReview(id) {
    const p = state.profiles.find((x) => x.id === id);
    if (!p) return;
    show(
      'Pemeriksaan pendaftaran',
      /* HTML */ `${workPanel(p.id, 'registration')}${profileDetails(p)}${identityMedia(p)}<a
          class="btn secondary small-btn"
          href="${p.proofUrl}"
          target="_blank"
          rel="noopener"
          >Lihat bukti simpanan</a
        >${p.note ? /* HTML */ `<p class="wf-note">${esc(p.note)}</p>` : ''}${financeStatus(p)}${
          p.status === 'pending'
            ? /* HTML */ `<form
                id="wf-registration-review"
                data-id="${esc(p.id)}"
                data-version="${p.version}"
              >
                ${checks([
                  ['identity', 'Data identitas dan rekening sesuai.'],
                  ['ktp', 'Foto KTP terbaca dan sesuai data calon anggota.'],
                  ['signature', 'Tanda tangan dan persetujuan tersedia.'],
                ])}<label class="form-field"
                  ><span>Catatan perbaikan</span><textarea name="note" maxlength="1500"></textarea>
                </label>
                <p id="wf-error" class="form-error" hidden role="alert"></p>
                <div class="wf-actions">
                  <button
                    class="btn secondary"
                    type="submit"
                    name="action"
                    value="return"
                    formnovalidate
                  >
                    Minta perbaikan</button
                  ><button
                    class="btn"
                    type="submit"
                    name="action"
                    value="approve"
                    ${p.finance?.status !== 'approved' || !p.ktpUrl ? 'disabled' : ''}
                  >
                    ${!p.ktpUrl ? 'Menunggu foto KTP' : p.finance?.status === 'approved' ? 'Setujui pendaftaran' : 'Menunggu Finance'}
                  </button>
                </div>
              </form>`
            : /* HTML */ `<p class="wf-note">${profileStatus(p)}</p>`
        }`,
    );
  }
  return {
    profileStatus,
    profileDetails,
    identityMedia,
    completeKtpDialog,
    profilePanel,
    staffRegistrationPanel,
    financeStatus,
    registrationReview,
  };
}
