import { maturityService } from '../../services/maturity.js';
import { withdrawalService } from '../../services/withdrawal.js';
/**
 * Daftar pengajuan anggota serta antrean pemeriksaan petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowRequestViews({
  state,
  empty,
  shortId,
  date,
  status,
  money,
  esc,
  links,
  needsCorrection,
  action,
}) {
  function memberCards(kind) {
    const items = state.items.filter((x) => x.kind === kind);
    if (!items.length)
      return empty(
        kind === 'capital'
          ? 'Belum ada pengajuan penyertaan modal.'
          : kind === 'savings'
            ? 'Belum ada setoran simpanan wajib lanjutan.'
            : 'Belum ada permohonan pengunduran diri.',
      );
    return /* HTML */ `<div class="wf-cards">
      ${items
        .map(
          (item) =>
            /* HTML */ `<article class="wf-card">
              <div class="wf-card-head">
                <div><strong>${shortId(item)}</strong><small>${date(item.createdAt)}</small></div>
                ${status(item)}
              </div>
              ${
                ['capital', 'savings'].includes(kind)
                  ? /* HTML */ `<div class="wf-amount">${money(item.amount)}</div>
                      <p class="wf-proof-name">${esc(item.proofName)}</p>
                      ${
                        item.projectCode
                          ? /* HTML */ `<p class="offer-code">
                              ${esc(item.projectCode)} · ${esc(item.offerTitle)}
                            </p>`
                          : ''
                      }`
                  : /* HTML */ `<p class="wf-reason">${esc(item.reason)}</p>`
              }${
                item.finance?.status === 'correction'
                  ? /* HTML */ `<div class="wf-note">
                      <strong>Catatan Finance</strong>
                      <p>${esc(item.finance.note)}</p>
                    </div>`
                  : ''
              }${
                item.note
                  ? /* HTML */ `<div class="wf-note">
                      <strong
                        >${
                          kind === 'withdrawal' && item.status === 'rejected'
                            ? 'Alasan penolakan'
                            : 'Catatan Admin'
                        }</strong
                      >
                      <p>${esc(item.note)}</p>
                    </div>`
                  : ''
              }${
                kind === 'capital'
                  ? maturityService?.summary(item) || ''
                  : kind === 'withdrawal'
                    ? withdrawalService?.summary(item) || ''
                    : ''
              }${
                kind === 'withdrawal' && ['approved', 'rejected'].includes(item.status)
                  ? /* HTML */ `<p class="field-hint">Keputusan Admin · ${date(item.updatedAt)}</p>`
                  : ''
              }
              <div class="wf-actions">
                ${links(item)}${needsCorrection(item) ? action('revise', item.id, 'Perbaiki pengajuan') : ''}${
                  kind === 'withdrawal' && ['pending', 'correction'].includes(item.status)
                    ? action('cancel', item.id, 'Batalkan permohonan')
                    : ''
                }
              </div>
            </article>`,
        )
        .join('')}
    </div>`;
  }

  function staffTable(kind, documents = false) {
    let items = state.items.filter((x) => x.kind === kind);
    const filter = state.filters[documents ? 'documents' : kind] || '';
    if (filter) items = items.filter((x) => x.status === filter);
    const filterKey = documents ? 'documents' : kind;
    const statuses =
      kind === 'capital'
        ? [
            ['pending', 'Menunggu pemeriksaan'],
            ['reviewing', 'Dalam pemeriksaan'],
            ['correction', 'Perlu perbaikan'],
            ['ready', 'Siap dibuat'],
            ['generated', 'Menunggu tanda tangan koperasi'],
            ['signed', 'Akad lengkap'],
          ]
        : [
            ['pending', 'Menunggu keputusan Admin'],
            ['reviewing', 'Dalam peninjauan Admin'],
            ['correction', 'Perlu perbaikan'],
            ['approved', 'Disetujui'],
            ['rejected', 'Ditolak'],
            ['cancelled', 'Dibatalkan'],
          ];
    return /* HTML */ `<div class="toolbar">
        <label class="wf-filter"
          >Status
          <select class="filter-select" data-wf-filter="${filterKey}">
            <option value="">Semua status</option>
            ${statuses.map(([value, label]) => /* HTML */ `<option value="${value}" ${value === filter ? 'selected' : ''}>${label}</option>`).join('')}
          </select></label
        >
      </div>
      ${
        items.length
          ? /* HTML */ `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>ANGGOTA / PENGAJUAN</th>
                    <th>${kind === 'capital' ? 'NOMINAL' : 'DITERIMA'}</th>
                    <th>STATUS</th>
                    <th>TINDAKAN</th>
                  </tr>
                </thead>
                <tbody>
                  ${items
                    .map(
                      (item) =>
                        /* HTML */ `<tr>
                          <td>
                            <strong>${esc(item.memberName)}</strong
                            ><small>${shortId(item)} · ${item.memberId}</small
                            >${item.projectCode ? /* HTML */ `<small class="offer-code">${esc(item.projectCode)}</small>` : ''}
                          </td>
                          <td>${kind === 'capital' ? money(item.amount) : date(item.createdAt)}</td>
                          <td>
                            ${status(item)}${kind === 'capital' ? /* HTML */ `<small>${esc(item.finance?.label || 'Menunggu Finance')}</small>` : ''}
                          </td>
                          <td>
                            ${action('review', item.id, ['generated', 'signed'].includes(item.status) ? 'Lihat akad' : 'Periksa')}
                          </td>
                        </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : empty('Belum ada pengajuan yang sesuai.')
      }`;
  }

  function overview() {
    const capital = state.items.filter(
      (x) => x.kind === 'capital' && !['signed', 'rejected', 'cancelled'].includes(x.status),
    ).length;
    const withdrawal = state.items.filter(
      (x) => x.kind === 'withdrawal' && !['completed', 'rejected', 'cancelled'].includes(x.status),
    ).length;
    return /* HTML */ `<div class="wf-overview">
      <a href="#penyertaan"><strong>${capital}</strong><span>Draf penyertaan modal</span></a
      ><a href="#pengunduran"><strong>${withdrawal}</strong><span>Pengunduran diri</span></a>
    </div>`;
  }
  return { memberCards, staffTable, overview };
}
