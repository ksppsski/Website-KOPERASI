/**
 * Antarmuka withdrawal. Implementasi didaftarkan sekali oleh controller fitur.
 * Gunakan import ini untuk ketergantungan eksplisit, tanpa membaca window.
 * State tetap dimiliki controller; layanan ini bukan salinan data.
 */
export let withdrawalService = null;

export function registerWithdrawal(service) {
  withdrawalService = service;
}
