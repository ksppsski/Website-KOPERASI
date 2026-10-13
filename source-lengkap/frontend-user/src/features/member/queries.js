import { workflowService } from '../../../../shared/services/workflow.js';
import { maturityService } from '../../../../shared/services/maturity.js';
/**
 * Pembacaan data anggota, simpanan, akad, dan notifikasi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberQueries({ heading, rupiah, activity, esc }) {
  const workflowItems = () => workflowService?.getItems() || [];

  const savingsEntries = () => workflowService?.getSavingsEntries() || [];

  const shortDate = (value) =>
    value
      ? new Date(value).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Makassar',
        })
      : '—';

  const savingsState = () => workflowService?.getSavings();

  function savingsHistory() {
    const v = savingsState();
    if (!v) return [];
    const history = v.history.flatMap((x) =>
      [
        ['Simpanan Pokok', x.basic],
        ['Simpanan Wajib', x.mandatory],
        ['Simpanan Lainnya', x.other],
      ]
        .filter(([, n]) => n > 0)
        .map(([type, amount]) => ({
          date: shortDate(x.at),
          at: x.at,
          type,
          note: x.kind === 'registration' ? 'Setoran awal keanggotaan' : 'Setoran lanjutan',
          amount,
          status: 'Terverifikasi',
        })),
    );
    const pending = workflowItems()
      .filter((x) => x.kind === 'savings' && x.finance?.status !== 'approved')
      .map((x) => ({
        date: shortDate(x.createdAt),
        at: x.createdAt,
        type: 'Simpanan Wajib',
        note: x.finance?.note || 'Menunggu rekonsiliasi Finance',
        amount: x.amount,
        status: workflowService?.needsCorrection(x) ? 'Perlu perbaikan' : 'Menunggu Finance',
      }));
    return [...history, ...pending].sort((a, b) => b.at.localeCompare(a.at));
  }

  function memberAlerts() {
    return (
      (maturityService?.reminders() || '') +
      (workflowService?.corrections() || '') +
      (savingsState()?.low ? workflowService.savingsNotice() : '')
    );
  }

  function serviceLocked(title) {
    return (
      heading(title, 'Status simpanan harus aktif untuk mengajukan layanan.') +
      (workflowService?.accessPanel() || '') +
      (workflowService?.corrections() || '')
    );
  }

  function currentContracts() {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    return workflowItems()
      .filter((x) => x.kind === 'capital' && x.status === 'signed' && x.contractData)
      .map((x) => {
        const d = x.contractData,
          start = new Date(d.effectiveDate + 'T00:00:00Z'),
          end = new Date(d.endDate + 'T00:00:00Z'),
          progress = Math.max(
            0,
            Math.min(
              100,
              Math.round(((new Date(today + 'T00:00:00Z') - start) / (end - start)) * 100),
            ),
          );
        return {
          id: x.id,
          number: x.contractNumber,
          title: 'Pengadaan kebutuhan barang Mitra',
          amount: x.amount,
          start: shortDate(start),
          end: shortDate(end),
          status:
            today < d.effectiveDate ? 'Menunggu mulai' : today >= d.endDate ? 'Selesai' : 'Aktif',
          progress,
        };
      });
  }

  function recentActivity() {
    const p = workflowService?.getProfile(),
      rows = workflowItems().map((x) => ({
        title:
          x.kind === 'capital'
            ? 'Penyertaan modal'
            : x.kind === 'savings'
              ? 'Setoran simpanan wajib'
              : 'Pengunduran diri',
        at: x.updatedAt || x.createdAt,
        value: x.kind === 'capital' ? rupiah(x.amount) : '',
        status: x.statusLabel,
        icon: x.kind === 'capital' ? 'sprout' : 'file',
      }));
    if (p)
      rows.push({
        title: 'Pendaftaran anggota',
        at: p.updatedAt || p.createdAt,
        value: p.memberNumber || '',
        status: workflowService?.needsCorrection(p)
          ? 'Perlu perbaikan'
          : {
              pending: 'Menunggu pemeriksaan',
              approved: 'Disetujui',
              correction: 'Perlu perbaikan',
            }[p.status],
        icon: 'user',
      });
    return (
      rows
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 5)
        .map((x) => activity(esc(x.title), shortDate(x.at), esc(x.value), esc(x.status), x.icon))
        .join('') || '<li class="empty-state">Belum ada aktivitas keanggotaan.</li>'
    );
  }
  return {
    workflowItems,
    savingsEntries,
    shortDate,
    savingsState,
    savingsHistory,
    memberAlerts,
    serviceLocked,
    currentContracts,
    recentActivity,
  };
}
