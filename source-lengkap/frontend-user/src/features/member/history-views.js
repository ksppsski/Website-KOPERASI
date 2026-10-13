import { workflowService } from '../../../../shared/services/workflow.js';
/**
 * Tabel riwayat simpanan, pengajuan, dan arsip dokumen anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberHistoryViews({
  savingsHistory,
  esc,
  rupiah,
  badge,
  state,
  icon,
  workflowItems,
  shortDate,
}) {
  function savingsRows(query = '', type = '') {
    const rows = savingsHistory().filter(
      (x) =>
        (!type || x.type === type) &&
        `${x.date} ${x.type} ${x.note}`.toLowerCase().includes(query.toLowerCase()),
    );
    return rows.length
      ? rows
          .map(
            (x) =>
              /* HTML */ `<tr>
                <td>${x.date}</td>
                <td>${esc(x.type)}<small>${esc(x.note)}</small></td>
                <td class="money">${rupiah(x.amount)}</td>
                <td>${badge(x.status, x.status === 'Terverifikasi' ? 'green' : 'amber')}</td>
              </tr>`,
          )
          .join('')
      : '<tr><td colspan="4"><div class="empty-state">Setoran yang dicari belum ditemukan.</div></td></tr>';
  }

  function requestPanel(type, always = false) {
    const rs = state.requests.filter((x) => x.type === type);
    if (!rs.length && !always) return '';
    return /* HTML */ `<section class="panel" style="margin-top:22px">
      <div class="panel-head">
        <h2>Pengajuan Anda</h2>
        ${badge('Simulasi', 'gray')}
      </div>
      ${
        rs.length
          ? /* HTML */ `<div class="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>NO. PENGAJUAN</th>
                    <th>KEBUTUHAN</th>
                    <th class="money">NILAI</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  ${rs
                    .map(
                      (x) =>
                        /* HTML */ `<tr>
                          <td>${x.id}</td>
                          <td>${esc(x.purpose)}</td>
                          <td class="money">${rupiah(x.amount)}</td>
                          <td>${badge('Menunggu verifikasi', 'amber')}</td>
                        </tr>`,
                    )
                    .join('')}
                </tbody>
              </table>
            </div>`
          : /* HTML */ `<div class="empty-state">
              ${icon('file')}<strong>Belum ada pengajuan contoh.</strong>Mulai dari tombol Ajukan
              pembiayaan di atas.
            </div>`
      }
    </section>`;
  }

  function documentCards(query = '', type = '') {
    const letter = workflowService?.getProfile()?.letter,
      docs = [
        ...(letter
          ? [
              {
                type: 'Keanggotaan',
                title: letter.filename.replace(/\.pdf$/, ''),
                number: letter.number,
                date: letter.effectiveDate + 'T12:00:00Z',
                url: letter.url,
                label: 'Surat keanggotaan',
              },
            ]
          : []),
        ...workflowItems()
          .filter((x) => x.kind === 'capital' && x.status === 'signed' && x.signedUrl)
          .map((x) => ({
            type: 'Penyertaan Modal',
            title: x.documentName || 'Akad Penyertaan Modal',
            number: x.contractNumber,
            date: x.signedAt,
            url: x.signedUrl,
            label: 'Akad lengkap',
          })),
      ],
      ds = docs.filter(
        (x) =>
          (!type || x.type === type) &&
          (x.title + ' ' + x.number).toLowerCase().includes(query.toLowerCase()),
      );
    return ds.length
      ? ds
          .map(
            (x) =>
              /* HTML */ `<article class="document-card">
                <div class="document-icon">${icon('file')}</div>
                <h2>${esc(x.title)}</h2>
                <p>${esc(x.number)} · ${shortDate(x.date)}</p>
                ${badge(x.label, 'green')}<a
                  class="btn secondary"
                  href="${esc(x.url)}"
                  target="_blank"
                  rel="noopener"
                  >${icon('eye')}Lihat PDF</a
                ><a class="small" href="${esc(x.url)}?download=1">Unduh PDF</a>
              </article>`,
          )
          .join('')
      : '<div class="empty-state">Belum ada dokumen yang sesuai. Surat keanggotaan tersedia setelah rekonsiliasi simpanan; akad setelah PDF lengkap diunggah petugas.</div>';
  }
  return { savingsRows, requestPanel, documentCards };
}
