import { workflowService } from '../../../../shared/services/workflow.js';
/**
 * Menu dan tujuan halaman berdasarkan peran akun petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffNavigation({}) {
  const adminPages = {
    ringkasan: ['Ringkasan', 'home'],
    pendaftaran: ['Pendaftaran Anggota', 'user'],
    setoran: ['Verifikasi Setoran', 'wallet'],
    penyertaan: ['Penyertaan Modal', 'sprout'],
    pengajuan: ['Pembiayaan', 'store'],
    pengunduran: ['Pengunduran Diri', 'logout'],
    anggota: ['Data Anggota', 'card'],
    akad: ['Dokumen Akad', 'file'],
    'admin-avalist': ['Usulan Avalist', 'user'],
  };

  const financePages = {
    'finance-pengunduran': ['Simpanan Pokok Kembali', 'wallet'],
    'finance-ringkasan': ['Ringkasan Finance', 'home'],
    'finance-rekonsiliasi': ['Rekonsiliasi', 'wallet'],
    'finance-bagi-hasil': ['Bagi Hasil Harian', 'calendar'],
    'finance-avalist': ['Pembayaran Avalist', 'user'],
    'finance-pengembalian': ['Pengembalian Modal', 'wallet'],
  };

  const managerPages = {
    'manager-pengunduran': ['Pengunduran Diri', 'logout'],
    'waktu-kerja': ['Pekerjaan & Waktu Kerja', 'clock'],
    'manager-penawaran': ['Penawaran Modal', 'sprout'],
    'manager-laporan': ['Laporan Koperasi', 'file'],
    'manager-akses': ['Akses Petugas', 'shield'],
    'manager-avalist': ['Pengelolaan Avalist', 'user'],
    'manager-jatuh-tempo': ['Akad Jatuh Tempo', 'calendar'],
  };

  const avalistPages = {
    'avalist-ringkasan': ['Ringkasan Avalist', 'home'],
    'avalist-anggota': ['Anggota Referensi', 'user'],
    'avalist-rincian': ['Rincian Bagian', 'wallet'],
    'avalist-riwayat': ['Riwayat Pembayaran', 'file'],
  };

  const pages = { ...adminPages, ...financePages, ...managerPages, ...avalistPages };

  const activeRole = () => workflowService?.getStaff()?.role || 'admin';

  const menuPages = () =>
    activeRole() === 'avalist'
      ? avalistPages
      : activeRole() === 'manager'
        ? managerPages
        : activeRole() === 'finance'
          ? financePages
          : adminPages;

  const roleName = () =>
    ({ admin: 'Admin', finance: 'Finance', manager: 'Manajer', avalist: 'Avalist' })[activeRole()];

  const homeFor = (role) =>
    role === 'avalist'
      ? 'avalist-ringkasan'
      : role === 'manager'
        ? 'waktu-kerja'
        : role === 'finance'
          ? 'finance-ringkasan'
          : 'ringkasan';

  function rolePicker() {
    const s = workflowService?.getStaff(),
      roles = (s?.allowedRoles || []).filter((r) => r !== 'avalist');
    const picker =
      roles.length > 1
        ? /* HTML */ `<label class="staff-role-picker"
            ><span>Buka portal</span
            ><select id="staff-role" aria-label="Buka portal">
              ${roles
                .map(
                  (r) =>
                    /* HTML */ `<option value="${r}" ${activeRole() === r ? 'selected' : ''}>
                      ${{ admin: 'Admin', finance: 'Finance', manager: 'Manajer', avalist: 'Avalist' }[r]}
                    </option>`,
                )
                .join('')}
            </select></label
          >`
        : /* HTML */ `<p class="staff-label">${roleName()}</p>`;
    return (
      picker +
      (s?.allowedRoles?.includes('avalist')
        ? '<a class="staff-label" href="/avalist.html">Portal Avalist ↗</a>'
        : '')
    );
  }
  return {
    adminPages,
    financePages,
    managerPages,
    avalistPages,
    pages,
    activeRole,
    menuPages,
    roleName,
    homeFor,
    rolePicker,
  };
}
