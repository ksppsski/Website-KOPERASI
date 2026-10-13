/**
 * Antarmuka finance. Implementasi didaftarkan sekali oleh controller fitur.
 * Gunakan import ini untuk ketergantungan eksplisit, tanpa membaca window.
 * State tetap dimiliki controller; layanan ini bukan salinan data.
 */
export let financeService = null;

export function registerFinance(service) {
  financeService = service;
}
