/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { json, limitedBody, now } from '../../http/response.js';
import { MAX_PROOF, proofCheck, requestId } from '../../http/validation.js';
import { Problem, snapshot, stmt } from '../../membership.js';
import { dto, getProfile, getRecord } from '../workflow/records.js';
import { requireActiveSavings } from '../../savings.js';
import { submission, trackedRun } from '../../activity.js';
import { reservedSql } from '../../offers.js';
import { cooperativeOwner } from '../../access.js';

export async function readCapital(request) {
  const bytes = await limitedBody(request, MAX_PROOF + 128 * 1024);
  let data;
  try {
    data = await new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new Problem(400, 'Formulir tidak dapat dibaca.');
  }
  const amount = Number(data.get('amount'));
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000000)
    throw new Problem(400, 'Isi nominal rupiah bulat antara Rp1 dan Rp1 triliun.');
  if (data.get('signatureConsent') !== 'true')
    throw new Problem(400, 'Setujui penggunaan tanda tangan terdaftar pada akad pengajuan ini.');
  return {
    offerId: String(data.get('offerId') || ''),
    id: requestId(data.get('id')),
    version: Number(data.get('version')),
    amount,
    proof: await proofCheck(data.get('proof')),
  };
}

export async function createCapital(request, env, owner) {
  const data = await readCapital(request);
  const existing = await getRecord(env, owner, data.id);
  if (existing) {
    if (existing.kind !== 'capital') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(existing) });
  }
  const profile = await getProfile(env, owner);
  if (!profile || profile.status !== 'approved')
    throw new Problem(
      409,
      'Lengkapi pendaftaran dan tunggu persetujuan petugas sebelum mengajukan penyertaan modal.',
    );
  await requireActiveSavings(env, owner, profile);
  const key = 'proof/' + crypto.randomUUID();
  const time = now();
  await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,
      proof_type,proof_size,status,note,created_at,updated_at,version,member_snapshot,
      offer_id,offer_title,project_code) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,o.id,o.title,
      o.project_code FROM capital_offers o WHERE o.id=? AND o.owner=? AND o.quota>=?+${reservedSql}`,
        data.id,
        owner,
        'capital',
        JSON.parse(profile.data).name,
        data.amount,
        key,
        data.proof.name,
        data.proof.type,
        data.proof.bytes.length,
        'pending',
        '',
        time,
        time,
        1,
        snapshot(profile),
        data.offerId,
        await cooperativeOwner(env, owner),
        data.amount,
        '',
      ),
      owner,
      data.id,
      null,
      submission(data.id, 'capital', JSON.parse(profile.data).name, time),
      time,
    );
    if (!result.meta?.changes)
      throw new Problem(
        409,
        'Penawaran tidak tersedia atau sisa kuota tidak mencukupi. Periksa sisa kuota dan sesuaikan nominal pengajuan.',
      );
  } catch (error) {
    await env.BUCKET.delete(key);
    const prior = await getRecord(env, owner, data.id);
    if (prior) return json({ item: dto(prior) });
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, data.id)) }, 201);
}
