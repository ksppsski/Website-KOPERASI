/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { requireReconciled, requireStaffRole } from '../../finance.js';
import { json, now, readJson, readMultipart } from '../../http/response.js';
import { dto, getRecord } from '../workflow/records.js';
import { Problem, hash, stmt } from '../../membership.js';
import { agreementRules } from '../../contract-rules.js';
import { renewalDates } from '../../maturity.js';
import { TEMPLATE_VERSION, buildContractPdf } from '../../contract-pdf.js';
import { finish, receive, trackedRun } from '../../activity.js';
import { MAX_PROOF, proofCheck } from '../../http/validation.js';
import { PDFDocument } from 'pdf-lib';
import { contractDocumentName, disposition, safeFilename } from '../../document-names.js';

export async function generateContract(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  if (['generated', 'signed'].includes(row.status) && row.contract_data)
    return json({ item: dto(row) });
  if (row.kind !== 'capital' || row.status !== 'ready')
    throw new Problem(409, 'Periksa dan setujui data serta bukti transfer sebelum membuat akad.');
  if (!row.member_snapshot)
    throw new Problem(
      409,
      'Data dan tanda tangan pendaftaran belum tersedia. Buat pengajuan baru.',
    );
  await requireReconciled(env, owner, 'capital', row);
  const body = await readJson(request);
  if (Number(body.version) !== row.version)
    throw new Problem(409, 'Data berubah. Muat ulang pemeriksaan.');
  const details = {
    ...agreementRules(body.agreementDate),
    ...(row.renewal_of ? renewalDates(row.renewal_effective_date) : {}),
    templateVersion: TEMPLATE_VERSION,
  };
  if (body.confirm !== true)
    throw new Problem(400, 'Konfirmasi data akad dan tanda tangan anggota terlebih dahulu.');
  const member = JSON.parse(row.member_snapshot),
    sig = await env.BUCKET.get(member.signatureKey);
  if (!sig) throw new Problem(409, 'Tanda tangan anggota tidak ditemukan.');
  const signatureBytes = new Uint8Array(await new Response(sig.body).arrayBuffer());
  if ((await hash(signatureBytes)) !== member.signatureSha256)
    throw new Problem(409, 'Tanda tangan tidak sesuai data pendaftaran.');
  const reserved =
    (await stmt(
      env,
      `
  INSERT INTO contract_numbers (request_id) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM
  contract_numbers WHERE request_id = ?) RETURNING serial
`,
      row.id,
      row.id,
    ).first()) ||
    (await stmt(env, 'SELECT serial FROM contract_numbers WHERE request_id = ?', row.id).first());
  details.serial = String(reserved.serial).padStart(4, '0');
  const number = details.serial + '/' + details.code,
    key = 'contracts/' + crypto.randomUUID() + '.pdf';
  const bytes = await buildContractPdf(row, details, signatureBytes);
  details.sha256 = await hash(bytes);
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
  const time = now();
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE workflow_requests SET status = ?, contract_key = ?, contract_number = ?,
  contract_data = ?, generated_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND
  owner = ? AND version = ? AND status = ?
`,
        'generated',
        key,
        number,
        JSON.stringify(details),
        time,
        time,
        row.id,
        owner,
        row.version,
        'ready',
      ),
      owner,
      row.id,
      'admin',
      [finish(row.id, ['generate']), receive(row.id, 'archive', row.member_name, time)],
      time,
    );
    if (!result.meta?.changes) {
      const latest = await getRecord(env, owner, row.id);
      if (latest?.contract_data) {
        await env.BUCKET.delete(key);
        return json({ item: dto(latest) });
      }
      throw new Problem(409, 'Pengajuan berubah saat akad dibuat. Muat ulang pemeriksaan.');
    }
  } catch (error) {
    const latest = await getRecord(env, owner, row.id);
    if (latest?.contract_key === key) return json({ item: dto(latest) });
    await env.BUCKET.delete(key);
    if (String(error).includes('UNIQUE'))
      throw new Problem(409, 'Nomor akad belum dapat ditetapkan. Muat ulang dan coba lagi.');
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}

export async function uploadSigned(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  if (row.kind !== 'capital' || !row.contract_data || !['generated', 'signed'].includes(row.status))
    throw new Problem(409, 'Buat PDF akad berdasarkan template sebelum mengunggah akad lengkap.');
  const data = await readMultipart(request, MAX_PROOF + 128 * 1024),
    file = await proofCheck(data.get('signed'));
  if (file.type !== 'application/pdf') throw new Problem(400, 'Akad lengkap harus berupa PDF.');
  if (data.get('confirm') !== 'true')
    throw new Problem(400, 'Konfirmasi kedua tanda tangan dan kecocokan dokumen.');
  const digest = await hash(file.bytes);
  if (row.status === 'signed') {
    if (digest === row.signed_sha256) return json({ item: dto(row) });
    throw new Problem(409, 'Akad lengkap sudah tersimpan. Dokumen tidak ditimpa.');
  }
  if (Number(data.get('version')) !== row.version)
    throw new Problem(409, 'Data berubah. Muat ulang sebelum mengunggah.');
  if (digest === JSON.parse(row.contract_data).sha256)
    throw new Problem(
      400,
      'Ini PDF awal yang belum berubah. Unggah PDF setelah ditandatangani koperasi.',
    );
  try {
    const doc = await PDFDocument.load(file.bytes, { updateMetadata: false });
    if (!doc.getPageCount() || doc.getPageCount() > 100) throw Error();
  } catch {
    throw new Problem(
      400,
      'PDF tidak dapat dibaca atau dilindungi kata sandi. Unggah PDF yang dapat dibuka.',
    );
  }
  const key = 'signed/' + crypto.randomUUID() + '.pdf',
    time = now();
  await env.BUCKET.put(key, file.bytes, { httpMetadata: { contentType: 'application/pdf' } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE workflow_requests SET status = ?, signed_key = ?, signed_name = ?, signed_sha256 =
  ?, signed_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND
  version = ? AND status = ?
`,
        'signed',
        key,
        file.name,
        digest,
        time,
        time,
        row.id,
        owner,
        row.version,
        'generated',
      ),
      owner,
      row.id,
      'admin',
      [finish(row.id, ['archive'])],
      time,
    );
    if (!result.meta?.changes) throw new Problem(409, 'Akad sudah berubah. Muat ulang daftar.');
  } catch (error) {
    const latest = await getRecord(env, owner, row.id);
    if (latest?.signed_key === key) return json({ item: dto(latest) });
    await env.BUCKET.delete(key);
    if (latest?.signed_sha256 === digest) return json({ item: dto(latest) });
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}

export async function serveFile(env, key, type, name, download) {
  if (!key) throw new Problem(404, 'Berkas belum tersedia.');
  const object = await env.BUCKET.get(key);
  if (!object) throw new Problem(404, 'Berkas tidak ditemukan.');
  const filename = safeFilename(name);
  return new Response(object.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': disposition(filename, download),
      'Content-Security-Policy':
        "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}

export async function fileResponse(env, row, part, download) {
  if (part === 'signature') {
    const m = row.member_snapshot ? JSON.parse(row.member_snapshot) : null;
    return serveFile(env, m?.signatureKey, 'image/png', 'tanda-tangan.png', false);
  }
  const type = part === 'proof' ? row.proof_type : 'application/pdf',
    key = part === 'proof' ? row.proof_key : part === 'signed' ? row.signed_key : row.contract_key;
  const name =
    part === 'proof'
      ? 'bukti-transfer.' +
        (type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg')
      : contractDocumentName(row) + '.pdf';
  return serveFile(env, key, type, name, download);
}
