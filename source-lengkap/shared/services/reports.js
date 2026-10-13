/**
 * Antarmuka reports. Implementasi didaftarkan sekali oleh controller fitur.
 * Gunakan import ini untuk ketergantungan eksplisit, tanpa membaca window.
 * State tetap dimiliki controller; layanan ini bukan salinan data.
 */
export let reportsService = null;

export function registerReports(service) {
  reportsService = service;
}
