/**
 * Antarmuka staff-access. Implementasi didaftarkan sekali oleh controller fitur.
 * Gunakan import ini untuk ketergantungan eksplisit, tanpa membaca window.
 * State tetap dimiliki controller; layanan ini bukan salinan data.
 */
export let staffAccessService = null;

export function registerStaffAccess(service) {
  staffAccessService = service;
}
