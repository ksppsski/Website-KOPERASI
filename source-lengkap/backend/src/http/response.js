/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { Problem } from '../membership.js';

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const now = () => new Date().toISOString();

export async function limitedBody(request, limit) {
  if (Number(request.headers.get('content-length') || 0) > limit)
    throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export async function readJson(request) {
  try {
    return JSON.parse(new TextDecoder().decode(await limitedBody(request, 16384)));
  } catch (error) {
    if (error instanceof Problem) throw error;
    throw new Problem(400, 'Data pengajuan tidak valid.');
  }
}

export async function readMultipart(request, limit) {
  const bytes = await limitedBody(request, limit);
  try {
    return await new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new Problem(400, 'Formulir tidak dapat dibaca.');
  }
}
