import { workflowService } from '../../../../shared/services/workflow.js';
/**
 * Pembacaan antrean anggota, aktivitas, dan persyaratan draf.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffQueries({ runtime, esc, icon }) {
  const member = (id) => runtime.state.members.find((x) => x.id === id);

  const name = (id) => member(id)?.name || 'Anggota contoh';

  const workflowItems = () => workflowService?.getItems() || [];

  const allProfiles = () => workflowService?.getProfiles() || [];

  const dateLabel = (value) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';

  const reviewButton = (id = '', label = 'Periksa', registration = false) =>
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-wf-action="${registration ? 'registration-review' : 'review'}"
      data-id="${esc(id)}"
    >
      ${label} ${icon('chevron')}
    </button>`;

  function candidateRows() {
    return allProfiles().map((p) => {
      const d = p.data,
        special =
          d.special === 'Ya'
            ? Math.ceil(
                Number(d.specialAmount || 0) /
                  (d.specialPayment === 'Angsur' ? Math.max(1, Number(d.installments || 1)) : 1),
              )
            : 0;
      return {
        id: p.id,
        receivedAt: p.receivedAt || p.createdAt,
        number: p.memberNumber || '—',
        name: d.name,
        date: dateLabel(p.createdAt),
        amount:
          Number(d.basic || 0) +
          Number(d.monthly || 0) * (d.paymentOption === 'Tahunan' ? 12 : 1) +
          Number(d.transactionSaving || 0) +
          special +
          Number(d.admin || 0),
        status:
          {
            pending: 'Menunggu verifikasi',
            correction: 'Perlu perbaikan',
            approved: 'Disetujui',
            closed: 'Ditutup',
          }[p.status] || p.status,
      };
    });
  }

  function activityLogs() {
    const rows = workflowItems().map((x) => ({
      text:
        (x.kind === 'capital'
          ? 'Penyertaan modal'
          : x.kind === 'savings'
            ? 'Setoran simpanan wajib'
            : 'Pengunduran diri') +
        ' · ' +
        x.statusLabel,
      time: x.updatedAt || x.createdAt,
    }));
    for (const p of allProfiles())
      rows.push({
        text: 'Pendaftaran ' + p.data.name + ' · ' + p.status,
        time: p.updatedAt || p.createdAt,
      });
    return (
      rows
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 5)
        .map(
          (x) =>
            /* HTML */ `<div class="log-item">
              ${esc(x.text)}<small>${dateLabel(x.time)}</small>
            </div>`,
        )
        .join('') || '<div class="empty-state">Belum ada aktivitas pemeriksaan.</div>'
    );
  }

  const pending = () => ({
    pendaftaran: allProfiles().filter((p) => p.status === 'pending').length,
    setoran: runtime.state.deposits.filter((x) => x.status === 'Menunggu verifikasi').length,
    pengajuan: runtime.state.requests.filter((x) => x.status === 'Menunggu tinjauan').length,
    penyertaan: workflowItems().filter(
      (x) => x.kind === 'capital' && ['pending', 'reviewing'].includes(x.status),
    ).length,
    pengunduran: workflowItems().filter(
      (x) => x.kind === 'withdrawal' && ['pending', 'reviewing'].includes(x.status),
    ).length,
    akad: workflowItems().filter((x) => x.kind === 'capital' && x.status === 'ready').length,
  });

  function canDraft(r) {
    return (
      r.status === 'Disetujui' &&
      (r.type !== 'Penyertaan Modal' || r.funds) &&
      !runtime.state.contracts.some((c) => c.request === r.id)
    );
  }
  return {
    member,
    name,
    workflowItems,
    allProfiles,
    dateLabel,
    reviewButton,
    candidateRows,
    activityLogs,
    pending,
    canDraft,
  };
}
