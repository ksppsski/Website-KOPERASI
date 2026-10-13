import { withdrawalService } from '../../services/withdrawal.js';
/**
 * Dialog pemeriksaan satu pengajuan beserta tindakan yang tersedia.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowReviewDialog({
  state,
  shortId,
  date,
  money,
  status,
  esc,
  checks,
  generationForm,
  profileDetails,
  show,
  workPanel,
  workStage,
  financeStatus,
  links,
  uploadForm,
}) {
  function reviewDialog(id) {
    const item = state.items.find((x) => x.id === id);
    if (!item) return;
    const capital = item.kind === 'capital';
    const rows = [
      ...(item.projectCode
        ? [
            ['Kode project', item.projectCode],
            ['Penawaran', item.offerTitle],
          ]
        : []),
      ['Nomor pengajuan', shortId(item)],
      ['Nama anggota', item.memberName],
      ['Nomor anggota', item.memberId],
      ['Diterima', date(item.createdAt)],
      ...(capital
        ? [
            ['Nominal setoran', money(item.amount)],
            ['Tujuan', 'Pengadaan kebutuhan barang Mitra'],
            ['Bukti transfer', item.proofName],
          ]
        : [['Alasan', item.reason]]),
    ];
    const details = /* HTML */ `<div class="status-head">${status(item)}</div>
      <dl class="review-list">
        ${rows
          .map(
            ([a, b]) =>
              /* HTML */ `<div>
                <dt>${a}</dt>
                <dd>${esc(b)}</dd>
              </div>`,
          )
          .join('')}
      </dl>`;
    const terminal = [
      'generated',
      'signed',
      'approved',
      'finance_pending',
      'manager_pending',
      'completed',
      'rejected',
      'cancelled',
      'generating',
      'correction',
    ].includes(item.status);
    const form = terminal
      ? ''
      : /* HTML */ `<form id="wf-review-form" data-id="${item.id}" data-version="${item.version}">
          ${
            capital
              ? checks([
                  ['identity', 'Identitas anggota sesuai.'],
                  ['amount', 'Nominal pengajuan dan data akad sesuai.'],
                ])
              : ''
          }<label class="form-field"
            ><span>Catatan petugas</span
            ><textarea
              name="note"
              rows="3"
              maxlength="1500"
              placeholder="${
                capital
                  ? 'Wajib diisi jika meminta perbaikan.'
                  : 'Wajib diisi jika menolak permohonan.'
              }"
            >
${esc(item.note)}</textarea>
          </label>
          <p id="wf-error" class="form-error" role="alert" hidden></p>
          <div class="wf-actions">
            ${
              capital && !item.renewalOf
                ? '<button type="submit" class="btn secondary" name="action" value="return" formnovalidate>Minta perbaikan</button>'
                : ''
            }${
              !capital
                ? '<button type="submit" class="btn secondary" name="action" value="reject" formnovalidate>Tolak</button>'
                : ''
            }<button
              type="submit"
              class="btn"
              name="action"
              value="approve"
              ${capital && item.finance?.status !== 'approved' ? 'disabled' : ''}
            >
              ${capital ? 'Setujui draf' : 'Setujui permohonan'}
            </button>
          </div>
        </form>`;
    const ready =
      item.status === 'ready'
        ? item.finance?.status !== 'approved'
          ? '<p class="wf-note">Pembuatan PDF menunggu rekonsiliasi Finance.</p>'
          : item.signatureAvailable
            ? generationForm(item)
            : '<p class="wf-note">Pengajuan lama belum memiliki data pendaftaran dan tanda tangan. Buat pengajuan baru setelah pendaftaran disetujui.</p>'
        : form;
    const signature =
      capital && item.signatureUrl
        ? /* HTML */ `<details class="wf-detail">
            <summary>Data anggota dan tanda tangan</summary>
            ${profileDetails({ data: item.member, memberNumber: item.memberId })}
            <div class="wf-signature">
              <img
                src="${item.signatureUrl}"
                alt="Tanda tangan anggota untuk akad ini"
                width="250"
                height="85"
              />
            </div>
          </details>`
        : '';
    show(
      capital ? 'Pemeriksaan penyertaan modal' : 'Pemeriksaan pengunduran diri',
      /* HTML */ `${workPanel(item.id, workStage(item))}${details}${capital ? financeStatus(item) : withdrawalService?.summary(item) || ''}${signature}
        <div class="wf-actions">${links(item)}</div>
        ${item.note && terminal ? /* HTML */ `<div class="wf-note">${esc(item.note)}</div>` : ''}${
          item.kind === 'withdrawal' && ['approved', 'rejected'].includes(item.status)
            ? /* HTML */ `<p class="field-hint">Keputusan tersimpan · ${date(item.updatedAt)}</p>`
            : ''
        }${ready}${item.status === 'generated' && item.contractData ? uploadForm(item) : ''}${
          item.status === 'signed'
            ? /* HTML */ `<p class="wf-note">
                Akad lengkap diunggah ${date(item.signedAt)} dan tersedia di Dokumen Akad anggota.
              </p>`
            : ''
        }`,
    );
  }
  return { reviewDialog };
}
