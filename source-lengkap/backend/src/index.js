/** Titik masuk publik. Implementasi dipisahkan per fitur. */
import { appFetch } from './http/router.js';
import { Problem } from './membership.js';
import { json } from './http/response.js';

export { appFetch };
export { proofCheck } from './http/validation.js';
export { buildContractPdf } from './contract-pdf.js';

export default {
  async fetch(request, env) {
    try {
      return await appFetch(request, env);
    } catch (error) {
      if (error instanceof Problem) return json({ error: error.message }, error.status);
      if (String(error).includes('MEMBERSHIP_LOCKED') || String(error).includes('ACTIVE_CONTRACT'))
        return json(
          {
            error:
              'Keanggotaan sedang ditutup atau masih memiliki kontrak/pengajuan aktif. Perbarui data sebelum melanjutkan.',
          },
          409,
        );
      console.error('KSPPS workflow error', error?.name, String(error?.message || error));
      return json(
        {
          error:
            'Pengajuan belum dapat diproses. Data pada formulir tetap tersedia; silakan coba lagi.',
        },
        503,
      );
    }
  },
};
