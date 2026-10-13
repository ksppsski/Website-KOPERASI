/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { json, now, readMultipart } from '../../http/response.js';
import { MAX_PROOF, proofCheck, requestId } from '../../http/validation.js';
import { Problem, profileDTO, stmt } from '../../membership.js';
import { dto, getProfile, getRecord } from '../workflow/records.js';
import { submission, trackedRun } from '../../activity.js';

export async function readSavings(request) {
  const form = await readMultipart(request, MAX_PROOF + 128 * 1024),
    amount = Number(form.get('amount'));
  if (![10000, 120000].includes(amount))
    throw new Problem(400, 'Pilih simpanan wajib Rp10.000 per bulan atau Rp120.000 per tahun.');
  return {
    id: requestId(form.get('id')),
    amount,
    version: Number(form.get('version')),
    proof: await proofCheck(form.get('proof')),
  };
}

export async function createSavings(request, env, owner) {
  const data = await readSavings(request),
    prior = await getRecord(env, owner, data.id);
  if (prior) {
    if (prior.kind !== 'savings') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(prior) });
  }
  const p = await getProfile(env, owner);
  if (!p || p.status !== 'approved')
    throw new Problem(409, 'Tunggu pendaftaran disetujui sebelum mengirim setoran lanjutan.');
  const key = 'proof/' + crypto.randomUUID(),
    time = now();
  await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
  try {
    await trackedRun(
      env,
      stmt(
        env,
        `
  INSERT INTO workflow_requests
  (id,owner,kind,member_name,amount,proof_key,proof_name,proof_type,proof_size,status,note,created_at,updated_at,version)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)
`,
        data.id,
        owner,
        'savings',
        JSON.parse(p.data).name,
        data.amount,
        key,
        data.proof.name,
        data.proof.type,
        data.proof.bytes.length,
        'pending',
        '',
        time,
        time,
      ),
      owner,
      data.id,
      null,
      submission(data.id, 'savings', JSON.parse(p.data).name, time),
      time,
    );
  } catch (error) {
    await env.BUCKET.delete(key);
    const existing = await getRecord(env, owner, data.id);
    if (existing?.kind === 'savings') return json({ item: dto(existing) });
    throw error;
  }
  return json(
    {
      item: dto(await getRecord(env, owner, data.id)),
      profile: profileDTO(await getProfile(env, owner)),
    },
    201,
  );
}
