/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { Problem, stmt } from '../../membership.js';
import { actorId, staffContext } from '../../access.js';

export const stamp = () => new Date().toISOString();

export const rows = async (env, sql, ...args) => (await stmt(env, sql, ...args).all()).results;

export const revision = async (env) =>
  (await stmt(env, "SELECT revision FROM avalist_clock WHERE id='main'").first())?.revision || 0;

export const text = (v, label, min = 1, max = 300) => {
  const s = String(v ?? '').trim();
  if (s.length < min || s.length > max)
    throw new Problem(400, `${label} harus berisi ${min}–${max} karakter.`);
  return s;
};

export const rateValue = (v) => {
  if (![1, 2].includes(Number(v))) throw new Problem(400, 'Bagian avalist harus 1% atau 2%.');
  return Number(v);
};

export const cents = (principal, rate) => Number((BigInt(principal) * BigInt(rate) + 50n) / 100n);

export async function commit(env, id, rev, kind, reason, statements) {
  try {
    return await env.DB.batch([
      stmt(
        env,
        'INSERT INTO avalist_operations(id,kind,actor,reason,expected_revision,created_at) VALUES(?,?,?,?,?,?)',
        crypto.randomUUID(),
        kind,
        actorId(env, id),
        reason,
        rev,
        stamp(),
      ),
      ...statements,
    ]);
  } catch (e) {
    if (String(e).includes('AVALIST_STALE'))
      throw new Problem(409, 'Data berubah saat diproses. Perbarui halaman dan periksa kembali.');
    throw e;
  }
}

export async function requireOperations(env, id) {
  const s = await staffContext(env, id);
  if (!s.allowedRoles.some((r) => ['manager', 'admin', 'finance'].includes(r)))
    throw new Problem(403, 'Halaman ini hanya untuk petugas pengelola.');
  return s;
}
