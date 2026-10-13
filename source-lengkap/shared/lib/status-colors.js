/** Label solid: toska untuk terdaftar/selesai, biru untuk aktif/proses, merah untuk peringatan. */
const warningStatuses = new Set([
  'correction',
  'rejected',
  'due',
  'overdue',
  'inactive',
  'perlu perbaikan',
  'perlu peninjauan ulang admin',
  'ditolak',
  'tidak aktif',
  'simpanan tidak aktif',
  'simpanan belum aktif',
  'belum terpenuhi',
  'jatuh tempo',
  'tertunggak',
  'terlambat',
]);

const successStatuses = new Set([
  'approved',
  'signed',
  'completed',
  'paid',
  'settled',
  'anggota terdaftar',
  'pendaftaran disetujui',
  'disetujui',
  'terverifikasi',
  'terbit',
  'akad lengkap',
  'terpenuhi',
  'dibuka',
  'selesai',
  'periode selesai',
  'lunas',
  'sudah dikembalikan',
  'persiapan selesai',
]);

const activeStatuses = new Set(['active', 'aktif', 'simpanan aktif']);

const neutralStatuses = new Set([
  'closed',
  'cancelled',
  'ditutup',
  'dibatalkan',
  'keanggotaan ditutup',
  'belum ada',
  'belum terdaftar',
  'simulasi',
  'diganti pengajuan baru',
]);

export function statusColor(status, fallback = 'blue') {
  const value = String(status ?? '')
    .trim()
    .toLocaleLowerCase('id-ID');
  if (warningStatuses.has(value)) return 'red';
  if (activeStatuses.has(value)) return 'blue';
  if (successStatuses.has(value)) return 'green';
  if (neutralStatuses.has(value)) return 'gray';
  if (
    /^(menunggu|dalam |sedang |siap |belum dimulai|dikerjakan|terjadwal|kuota penuh)/.test(value)
  ) {
    return 'blue';
  }
  // Kelas amber lama menunjukkan proses menunggu, kini ditampilkan biru.
  return ['green', 'blue', 'red', 'gray'].includes(fallback) ? fallback : 'blue';
}
