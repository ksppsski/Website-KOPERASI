import {
  CandidatesTable2View,
  CandidatesTableView,
  DepositsTable2View,
  DepositsTableView,
  RequestsTableView,
  MembersTableView,
} from './views/tables.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Tabel antrean, setoran, pengajuan, dan direktori anggota.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffTables({
  app,
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
      filtered(candidateRows()).map((x) =>
        snippetView(CandidatesTableView, {
          fieldName: esc(x.name),
          number: esc(x.number),
          replace: x.date.replace(' · ', snippetView(CandidatesTable2View)),
          rupiah: rupiah(x.amount),
          badge: badge(x.status),
          reviewButton: reviewButton(x.id, x.status === 'Disetujui' ? 'Lihat' : 'Periksa', true),
        }),
      ),
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
      ).map((x) =>
        snippetView(DepositsTableView, {
          fieldName: esc(x.name),
          memberId: esc(x.memberId || '—'),
          label: x.label,
          rupiah: rupiah(x.amount),
          badge: badge(x.status),
          reference: esc(x.finance?.reference || 'Menunggu Finance'),
          kindContent:
            x.kind === 'savings'
              ? snippetView(DepositsTable2View, { proofUrl: esc(x.proofUrl) })
              : reviewButton(x.id, 'Lihat', x.registration),
        }),
      ),
    );
  }

  function requestsTable() {
    return table(
      ['PENGAJUAN', 'ANGGOTA', 'NILAI', 'STATUS', ''],
      filtered(runtime.state.requests).map((x) =>
        snippetView(RequestsTableView, {
          type: x.type,
          id: x.id,
          fieldName: esc(name(x.member)),
          purpose: esc(x.purpose),
          rupiah: rupiah(x.amount),
          badge: badge(x.status),
          button: button('request', x.id, x.status === 'Disetujui' ? 'Lihat' : 'Tinjau'),
        }),
      ),
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
      filtered(rows).map((x) =>
        snippetView(MembersTableView, {
          fieldName: esc(x.name),
          number: esc(x.number),
          rupiah: rupiah(x.savings),
          rupiahValue: rupiah(x.capital),
          badge: badge(x.status),
          reviewButton: reviewButton(x.id, 'Rincian', true),
        }),
      ),
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
