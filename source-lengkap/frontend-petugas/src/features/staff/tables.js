/**
 * Tabel antrean, setoran, pengajuan, dan direktori anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffTables({
  candidateRows,
  workflowItems,
  table,
  filtered,
  esc,
  rupiah,
  badge,
  reviewButton,
  allProfiles,
  runtime,
  name,
  button,
}) {
  function queueRows() {
    return [
      ...candidateRows()
        .filter((x) => x.status === 'Menunggu verifikasi')
        .map((x) => ({ ...x, kind: 'Pendaftaran anggota', icon: 'user', registration: true })),
      ...workflowItems()
        .filter(
          (x) =>
            x.kind !== 'savings' &&
            ['pending', 'reviewing', 'ready', 'generated'].includes(x.status),
        )
        .map((x) => ({
          id: x.id,
          receivedAt: x.receivedAt || x.createdAt,
          reference: (x.kind === 'capital' ? 'PM-' : 'PD-') + x.id.slice(0, 8).toUpperCase(),
          name: x.memberName,
          kind:
            x.kind === 'capital'
              ? 'Penyertaan modal'
              : x.kind === 'savings'
                ? 'Setoran simpanan wajib'
                : 'Pengunduran diri',
          icon: x.kind === 'capital' ? 'sprout' : 'file',
          status: x.statusLabel,
        })),
    ].sort(
      (a, b) =>
        (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0) ||
        a.id.localeCompare(b.id),
    );
  }

  function candidatesTable() {
    return table(
      ['CALON ANGGOTA', 'DITERIMA', 'SETORAN AWAL', 'STATUS', ''],
      filtered(candidateRows())
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.number)}</small></td>
              <td>${x.date.replace(' · ', '<br>')}</td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>${badge(x.status)}</td>
              <td>${reviewButton(x.id, x.status === 'Disetujui' ? 'Lihat' : 'Periksa', true)}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  function depositsTable() {
    const rows = [
      ...allProfiles().map((p) => ({
        id: p.id,
        name: p.data.name,
        memberId: p.memberNumber,
        label: 'Simpanan pendaftaran',
        amount: candidateRows().find((x) => x.id === p.id).amount,
        finance: p.finance,
        registration: true,
      })),
      ...workflowItems()
        .filter((x) => ['capital', 'savings'].includes(x.kind) && !x.renewalOf)
        .map((x) => ({
          ...x,
          name: x.memberName,
          memberId: x.memberId,
          label: x.kind === 'savings' ? 'Simpanan wajib' : 'Penyertaan modal',
        })),
    ];
    return table(
      ['ANGGOTA', 'JENIS SETORAN', 'NOMINAL', 'FINANCE', ''],
      filtered(
        rows.map((x) => ({
          ...x,
          status:
            x.finance?.status === 'approved'
              ? 'Terverifikasi'
              : x.finance?.status === 'correction'
                ? 'Perlu perbaikan'
                : 'Menunggu verifikasi',
        })),
      )
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.memberId || '—')}</small></td>
              <td>${x.label}</td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>
                ${badge(x.status)}<small>${esc(x.finance?.reference || 'Menunggu Finance')}</small>
              </td>
              <td>
                ${
                  x.kind === 'savings'
                    ? /* HTML */ `<a
                        class="btn secondary small-btn"
                        href="${esc(x.proofUrl)}"
                        target="_blank"
                        rel="noopener"
                        >Lihat bukti</a
                      >`
                    : reviewButton(x.id, 'Lihat', x.registration)
                }
              </td>
            </tr>`,
        )
        .join(''),
    );
  }

  function requestsTable() {
    return table(
      ['PENGAJUAN', 'ANGGOTA', 'NILAI', 'STATUS', ''],
      filtered(runtime.state.requests)
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${x.type}</strong><small>${x.id}</small></td>
              <td>${esc(name(x.member))}<small>${esc(x.purpose)}</small></td>
              <td class="money">${rupiah(x.amount)}</td>
              <td>${badge(x.status)}</td>
              <td>${button('request', x.id, x.status === 'Disetujui' ? 'Lihat' : 'Tinjau')}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  function membersTable() {
    const rows = allProfiles()
      .filter((p) => p.status === 'approved')
      .map((p) => ({
        id: p.id,
        number: p.memberNumber || '—',
        name: p.data.name,
        status: p.savings?.active ? 'Aktif' : 'Simpanan tidak aktif',
        savings: (p.savings?.basic || 0) + (p.savings?.paid || 0),
        capital: workflowItems()
          .filter(
            (x) =>
              x.memberProfileId === p.id &&
              x.kind === 'capital' &&
              x.status === 'signed' &&
              !x.maturity?.ended,
          )
          .reduce((n, x) => n + x.amount, 0),
      }));
    return table(
      ['ANGGOTA', 'SIMPANAN POKOK & WAJIB', 'PENYERTAAN MODAL', 'STATUS', ''],
      filtered(rows)
        .map(
          (x) =>
            /* HTML */ `<tr>
              <td><strong>${esc(x.name)}</strong><small>${esc(x.number)}</small></td>
              <td class="money">${rupiah(x.savings)}</td>
              <td class="money">${rupiah(x.capital)}</td>
              <td>${badge(x.status)}</td>
              <td>${reviewButton(x.id, 'Rincian', true)}</td>
            </tr>`,
        )
        .join(''),
    );
  }

  const tables = {
    pendaftaran: candidatesTable,
    setoran: depositsTable,
    pengajuan: requestsTable,
    anggota: membersTable,
  };
  return { queueRows, candidatesTable, depositsTable, requestsTable, membersTable, tables };
}
