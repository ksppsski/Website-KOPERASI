export const complaintStatusLabels = Object.freeze({
  new: 'Baru',
  in_progress: 'Dalam penanganan',
  waiting_member: 'Menunggu tanggapan anggota',
  resolved: 'Selesai',
  closed: 'Ditutup',
});

export const complaintDivisionLabels = Object.freeze({
  admin: 'Administrasi',
  finance: 'Keuangan',
  manager: 'Manajemen',
  customer_relation: 'Customer Relation',
});

export const complaintRoleLabels = Object.freeze({
  member: 'Anggota',
  admin: 'Admin',
  finance: 'Finance',
  manager: 'Manajer',
  customer_relation: 'Customer Relation',
});

export const complaintEventLabels = Object.freeze({
  created: 'Keluhan diterima',
  assigned: 'Penugasan',
  reply: 'Tanggapan',
  status: 'Perubahan status',
});

export function formatComplaintTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '—';
  return (
    new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Makassar',
    }).format(new Date(value)) + ' WITA'
  );
}

export function toComplaintInputTime(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZone: 'Asia/Makassar',
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
