/**
 * Antarmuka workflow. Implementasi didaftarkan sekali oleh controller fitur.
 * Gunakan import ini untuk ketergantungan eksplisit, tanpa membaca window.
 * State tetap dimiliki controller; layanan ini bukan salinan data.
 */
export let workflowService = null;

export function registerWorkflow(service) {
  workflowService = service;
}
