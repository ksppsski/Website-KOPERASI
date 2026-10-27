import { Picker2View, PickerView, Picker3View, RolePickerView } from './views/navigation.svelte';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Menu dan tujuan halaman berdasarkan peran akun petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffNavigation({ app }) {
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
    keluhan: ['Keluhan Anggota', 'help'],
  };

  const financePages = {
    'finance-pengunduran': ['Simpanan Pokok Kembali', 'wallet'],
    'finance-ringkasan': ['Ringkasan Finance', 'home'],
    'finance-rekonsiliasi': ['Rekonsiliasi', 'wallet'],
    'finance-bagi-hasil': ['Bagi Hasil Harian', 'calendar'],
    'finance-avalist': ['Pembayaran Avalist', 'user'],
    'finance-pengembalian': ['Pengembalian Modal', 'wallet'],
    keluhan: ['Keluhan Anggota', 'help'],
  };

  const managerPages = {
    'manager-pengunduran': ['Pengunduran Diri', 'logout'],
    'waktu-kerja': ['Pekerjaan & Waktu Kerja', 'clock'],
    'manager-penawaran': ['Penawaran Modal', 'sprout'],
    'manager-laporan': ['Laporan Koperasi', 'file'],
    'manager-akses': ['Akses Petugas', 'shield'],
    'manager-avalist': ['Pengelolaan Avalist', 'user'],
    'manager-jatuh-tempo': ['Akad Jatuh Tempo', 'calendar'],
    keluhan: ['Keluhan Anggota', 'help'],
  };

  const customerRelationPages = {
    keluhan: ['Keluhan Anggota', 'help'],
  };

  const avalistPages = {
    'avalist-ringkasan': ['Ringkasan Avalist', 'home'],
    'avalist-anggota': ['Anggota Referensi', 'user'],
    'avalist-rincian': ['Rincian Bagian', 'wallet'],
    'avalist-riwayat': ['Riwayat Pembayaran', 'file'],
  };

  const pages = {
    ...adminPages,
    ...financePages,
    ...managerPages,
    ...customerRelationPages,
    ...avalistPages,
  };

  const activeRole = () => app.services.workflow?.getStaff()?.role || 'admin';

  const menusByRole = {
    admin: adminPages,
    finance: financePages,
    manager: managerPages,
    customer_relation: customerRelationPages,
    avalist: avalistPages,
  };
  const menuPages = () => menusByRole[activeRole()] || {};

  const roleName = () =>
    ({
      admin: 'Admin',
      finance: 'Finance',
      manager: 'Manajer',
      customer_relation: 'Customer Relation',
      avalist: 'Avalist',
    })[activeRole()];

  const homeFor = (role) =>
    ({
      avalist: 'avalist-ringkasan',
      manager: 'waktu-kerja',
      finance: 'finance-ringkasan',
      customer_relation: 'keluhan',
    })[role] || 'ringkasan';

  function rolePicker() {
    const s = app.services.workflow?.getStaff(),
      roles = (s?.allowedRoles || []).filter((r) => r !== 'avalist');
    const picker =
      roles.length > 1
        ? snippetView(PickerView, {
            rolesRows: roles.map((r) =>
              snippetView(Picker2View, {
                r: r,
                activeRoleContent: activeRole() === r ? { selected: true } : {},
                rValue: {
                  admin: 'Admin',
                  finance: 'Finance',
                  manager: 'Manajer',
                  customer_relation: 'Customer Relation',
                  avalist: 'Avalist',
                }[r],
              }),
            ),
          })
        : snippetView(Picker3View, { roleName: roleName() });
    return [picker, s?.allowedRoles?.includes('avalist') ? snippetView(RolePickerView) : ''];
  }
  return {
    adminPages,
    financePages,
    managerPages,
    customerRelationPages,
    avalistPages,
    pages,
    activeRole,
    menuPages,
    roleName,
    homeFor,
    rolePicker,
  };
}
