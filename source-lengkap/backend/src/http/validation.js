/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { Problem } from '../membership.js';

export const MAX_PROOF = 10 * 1024 * 1024;

export function shortText(value, min, max, label) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max)
    throw new Problem(400, label + ' harus berisi ' + min + '–' + max + ' karakter.');
  return text;
}

export function requestId(value) {
  const id = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new Problem(400, 'Nomor pengajuan tidak valid. Muat ulang formulir.');
  return id;
}

export async function proofCheck(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size)
    throw new Problem(400, 'Lampirkan bukti transfer yang dapat dibaca.');
  if (file.size > MAX_PROOF) throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
  const extension = String(file.name || '')
    .split('.')
    .pop()
    .toLowerCase();
  const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
  if (
    !Object.hasOwn(types, extension) ||
    (file.type && file.type !== 'application/octet-stream' && file.type !== types[extension])
  )
    throw new Problem(400, 'Gunakan bukti transfer JPG, PNG, atau PDF.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature =
    extension === 'pdf'
      ? [37, 80, 68, 70, 45]
      : extension === 'png'
        ? [137, 80, 78, 71, 13, 10, 26, 10]
        : [255, 216, 255];
  if (!signature.every((b, i) => bytes[i] === b))
    throw new Problem(400, 'Isi berkas tidak sesuai format JPG, PNG, atau PDF.');
  return {
    bytes,
    type: types[extension],
    name: String(file.name)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 180),
  };
}
