/**
 * Urutan tugas dan tujuan pemeriksaan masing-masing tahap.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createActivityQueue({ wf, state, esc, button }) {
  const newestFirst = (a, b) =>
    (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0) ||
    String(a.id).localeCompare(String(b.id));

  const stageRoutes = {
    registration: 'pendaftaran',
    capital: 'penyertaan',
    withdrawal: 'pengunduran',
    generate: 'akad',
    archive: 'akad',
    reconciliation: 'finance-rekonsiliasi',
    payout: 'finance-bagi-hasil',
    'principal-return': 'finance-pengembalian',
    'withdrawal-return': 'finance-pengunduran',
    'withdrawal-final': 'manager-pengunduran',
    'staff-access': 'manager-akses',
  };

  function queue() {
    const role = wf()?.getStaff()?.role;
    const tasks = state.queueTasks
      .filter(
        (t) =>
          t.role === role &&
          !(t.completed ?? !!t.completedAt) &&
          !(t.closed ?? !!t.closedAt) &&
          (!t.receivedAt || Date.parse(t.receivedAt) <= Date.now()),
      )
      .sort(newestFirst);
    const content = state.error
      ? /* HTML */ `<p class="form-error" role="alert">${esc(state.error)}</p>
          ${button('refresh', 'Coba lagi')}`
      : !state.loaded
        ? '<p role="status">Memuat antrean tugas…</p>'
        : /* HTML */ `<div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TUGAS / ANGGOTA</th>
                  <th>STATUS</th>
                  <th>TINDAKAN</th>
                </tr>
              </thead>
              <tbody>
                ${
                  tasks
                    .map(
                      (t) =>
                        /* HTML */ `<tr>
                          <td>
                            <strong>${esc(t.label)}</strong
                            ><small>${esc(t.memberName || '—')}</small>
                          </td>
                          <td>
                            <span class="badge blue"
                              >${(t.started ?? !!t.startedAt) ? 'Sedang dikerjakan' : 'Belum dimulai'}</span
                            >
                          </td>
                          <td>
                            <a
                              class="btn secondary small-btn"
                              href="#${stageRoutes[t.stage] || 'waktu-kerja'}"
                              >Buka tugas</a
                            >
                          </td>
                        </tr>`,
                    )
                    .join('') ||
                  '<tr><td colspan="3"><div class="empty-state">Belum ada tugas yang perlu dikerjakan.</div></td></tr>'
                }
              </tbody>
            </table>
          </div>`;
    return /* HTML */ `<section class="panel" data-task-summary>
      <div class="panel-head">
        <h2>Antrean tugas</h2>
        <span class="field-hint">Terbaru di atas</span>
      </div>
      ${content}
    </section>`;
  }
  return { newestFirst, stageRoutes, queue };
}
