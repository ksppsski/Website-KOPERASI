import { RecentActivityView } from './views/queries.svelte';
import { formatDate } from '../../../../shared/lib/formatters.js';
import { view, fallbackView, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Pembacaan data anggota, simpanan, akad, dan notifikasi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createMemberQueries({ app, heading, rupiah, activity, esc }) {
  const workflowItems = () => app.services.workflow?.getItems() || [];

  const savingsEntries = () => app.services.workflow?.getSavingsEntries() || [];

  const shortDate = formatDate;

  const savingsState = () => app.services.workflow?.getSavings();

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
        status: app.services.workflow?.needsCorrection(x) ? 'Perlu perbaikan' : 'Menunggu Finance',
      }));
    return [...history, ...pending].sort((a, b) => b.at.localeCompare(a.at));
  }

  function memberAlerts() {
    return [
      app.services.maturity?.reminders() || null,
      app.services.workflow?.corrections() || null,
      savingsState()?.low ? app.services.workflow.savingsNotice() : '',
    ];
  }

  function serviceLocked(title) {
    return [
      [
        heading(title, 'Status simpanan harus aktif untuk mengajukan layanan.'),
        app.services.workflow?.accessPanel() || '',
      ],
      app.services.workflow?.corrections() || '',
    ];
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
    const p = app.services.workflow?.getProfile(),
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
        status: app.services.workflow?.needsCorrection(p)
          ? 'Perlu perbaikan'
          : {
              pending: 'Menunggu pemeriksaan',
              approved: 'Disetujui',
              correction: 'Perlu perbaikan',
            }[p.status],
        icon: 'user',
      });
    return fallbackView(
      rows
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 5)
        .map((x) => activity(esc(x.title), shortDate(x.at), esc(x.value), esc(x.status), x.icon)),
      snippetView(RecentActivityView),
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
