/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { json, now, readJson, readMultipart } from '../../http/response.js';
import { MAX_PROOF, proofCheck, requestId, shortText } from '../../http/validation.js';
import { MAX_KTP, ktpCheck } from '../../identity-photo.js';
import {
  Problem,
  hash,
  profileDTO,
  signatureCheck,
  stmt,
  validateProfile,
} from '../../membership.js';
import { getProfile } from '../workflow/records.js';
import { correctionAllowed } from '../workflow/requests.js';
import { finish, receive, submission, trackedRun } from '../../activity.js';
import { requireReconciled, requireStaffRole } from '../../finance.js';
import { actorId } from '../../access.js';

export async function saveProfile(request, env, owner) {
  const form = await readMultipart(request, MAX_PROOF + MAX_KTP + 700 * 1024);
  let raw;
  try {
    raw = JSON.parse(form.get('data'));
  } catch {
    throw new Problem(400, 'Data pendaftaran tidak dapat dibaca.');
  }
  const data = await validateProfile(raw),
    signature = await signatureCheck(form.get('signature')),
    proof = await proofCheck(form.get('proof')),
    ktp = await ktpCheck(form.get('ktp'));
  const old = await getProfile(env, owner),
    id = requestId(form.get('id'));
  const used = await stmt(env, 'SELECT owner FROM member_profiles WHERE id=?', id).first();
  if (used && used.owner !== owner)
    throw new Problem(
      409,
      'Gunakan formulir pendaftaran baru. Nomor keanggotaan lama tidak dapat dipakai ulang.',
    );
  if (old && !correctionAllowed(old)) {
    if (old.id === id) return json({ profile: profileDTO(old) });
    throw new Problem(
      409,
      'Pendaftaran Anda sudah tersimpan. Buka Profil Anggota untuk melihat status.',
    );
  }
  if (old && (old.id !== id || Number(form.get('version')) !== old.version))
    throw new Problem(409, 'Data pendaftaran berubah. Muat ulang sebelum memperbaiki.');
  const credit = old
    ? await stmt(
        env,
        "SELECT * FROM savings_credits WHERE owner=? AND source_kind='registration' AND source_id=?",
        owner,
        old.id,
      ).first()
    : null;
  if (credit) {
    const before = JSON.parse(old.data);
    if (
      [
        'basic',
        'monthly',
        'paymentOption',
        'transactionSaving',
        'special',
        'specialAmount',
        'specialPayment',
        'installments',
        'admin',
      ].some((k) => String(before[k] ?? '') !== String(data[k] ?? ''))
    )
      throw new Problem(
        409,
        'Setoran awal sudah direkonsiliasi. Nominalnya tidak dapat diubah; gunakan setoran lanjutan untuk menambah simpanan wajib.',
      );
  }
  const priorProof =
    old?.finance?.status === 'approved' ? await env.BUCKET.get(old.proof_key) : null;
  const sameProof =
    priorProof &&
    (await hash(new Uint8Array(await new Response(priorProof.body).arrayBuffer()))) ===
      (await hash(proof.bytes));
  const sigKey = 'signatures/' + crypto.randomUUID() + '.png',
    proofKey = sameProof ? old.proof_key : 'registration/' + crypto.randomUUID(),
    ktpKey = 'identity/' + crypto.randomUUID(),
    time = now(),
    digest = await hash(signature);
  await env.BUCKET.put(sigKey, signature, { httpMetadata: { contentType: 'image/png' } });
  try {
    if (!sameProof)
      await env.BUCKET.put(proofKey, proof.bytes, { httpMetadata: { contentType: proof.type } });
    await env.BUCKET.put(ktpKey, ktp.bytes, { httpMetadata: { contentType: ktp.type } });
    const result = await trackedRun(
      env,
      old
        ? stmt(
            env,
            `
  UPDATE member_profiles SET data = ?, signature_key = ?, signature_sha256 = ?, proof_key =
  ?, proof_name = ?, proof_type = ?, ktp_key = ?, ktp_name = ?, ktp_type = ?, ktp_checked_at
  = NULL, ktp_checked_by = NULL, status = ?, note = ?, consent_at = ?, updated_at = ?,
  version = version + 1 WHERE owner = ? AND id = ? AND version = ? AND status = ?
` +
              (old.finance?.status === 'correction'
                ? " AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=member_profiles.owner AND target_id=member_profiles.id AND status='correction' AND version=" +
                  Number(old.finance.version) +
                  ')'
                : ''),
            JSON.stringify(data),
            sigKey,
            digest,
            proofKey,
            proof.name,
            proof.type,
            ktpKey,
            ktp.name,
            ktp.type,
            'pending',
            '',
            time,
            time,
            owner,
            id,
            old.version,
            old.status,
          )
        : stmt(
            env,
            `
  INSERT INTO member_profiles
  (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,ktp_key,
      ktp_name,ktp_type,status,note,consent_at,created_at,updated_at,version)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`,
            owner,
            id,
            JSON.stringify(data),
            sigKey,
            digest,
            proofKey,
            proof.name,
            proof.type,
            ktpKey,
            ktp.name,
            ktp.type,
            'pending',
            '',
            time,
            time,
            time,
            1,
          ),
      owner,
      id,
      null,
      submission(id, 'registration', data.name, time).filter(
        (op) => !(sameProof && op.type === 'receive' && op.task.stage === 'reconciliation'),
      ),
      time,
    );
    if (!result.meta?.changes) throw new Problem(409, 'Pendaftaran berubah. Muat ulang formulir.');
  } catch (error) {
    const latest = await getProfile(env, owner);
    if (latest?.signature_key === sigKey) return json({ profile: profileDTO(latest) });
    await env.BUCKET.delete(sigKey);
    if (!sameProof) await env.BUCKET.delete(proofKey);
    await env.BUCKET.delete(ktpKey);
    if (latest && latest.version !== old?.version)
      throw new Problem(
        409,
        'Pendaftaran berubah saat disimpan. Muat ulang dan periksa data terbaru.',
      );
    throw error;
  }
  // Keep historical signature assets immutable: a submitted contract may reference them.
  return json({ profile: profileDTO(await getProfile(env, owner)) }, 201);
}

export async function completeKtp(request, env, owner) {
  const p = await getProfile(env, owner);
  if (!p) throw new Problem(404, 'Pendaftaran belum tersedia.');
  if (p.ktp_key)
    throw new Problem(
      409,
      'Foto KTP sudah tersimpan. Penggantian dilakukan melalui perbaikan pendaftaran dari Admin.',
    );
  if (!['pending', 'approved'].includes(p.status))
    throw new Problem(409, 'Lengkapi seluruh perbaikan melalui formulir pendaftaran.');
  const form = await readMultipart(request, MAX_KTP + 128 * 1024);
  if (Number(form.get('version')) !== p.version)
    throw new Problem(409, 'Data pendaftaran berubah. Muat ulang profil.');
  const ktp = await ktpCheck(form.get('ktp')),
    key = 'identity/' + crypto.randomUUID(),
    time = now();
  await env.BUCKET.put(key, ktp.bytes, { httpMetadata: { contentType: ktp.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE member_profiles SET
  ktp_key=?,ktp_name=?,ktp_type=?,ktp_checked_at=NULL,ktp_checked_by=NULL,status= 'pending'
  ,updated_at=?,version=version+1 WHERE owner=? AND version=? AND ktp_key IS NULL
`,
        key,
        ktp.name,
        ktp.type,
        time,
        owner,
        p.version,
      ),
      owner,
      p.id,
      null,
      [
        { type: 'close', targetId: p.id, stages: ['registration'], outcome: 'superseded' },
        receive(p.id, 'registration', JSON.parse(p.data).name, time),
      ],
      time,
    );
    if (!result.meta?.changes)
      throw new Problem(409, 'Data berubah. Muat ulang profil sebelum melanjutkan.');
  } catch (error) {
    const latest = await getProfile(env, owner);
    if (latest?.ktp_key === key) return json({ profile: profileDTO(latest) });
    await env.BUCKET.delete(key);
    throw error;
  }
  return json({ profile: profileDTO(await getProfile(env, owner)) });
}

export async function reviewProfile(request, env, owner) {
  await requireStaffRole(env, owner, 'admin');
  const p = await getProfile(env, owner);
  if (!p) throw new Problem(404, 'Pendaftaran belum tersedia.');
  const body = await readJson(request);
  if (p.status !== 'pending' || Number(body.version) !== p.version)
    throw new Problem(409, 'Pendaftaran sudah diperiksa atau berubah. Muat ulang daftar.');
  const correction = body.action === 'return';
  if (!correction && body.action !== 'approve') throw new Problem(400, 'Tindakan tidak sesuai.');
  const note = correction ? shortText(body.note, 5, 1500, 'Catatan petugas') : '';
  if (!correction) await requireReconciled(env, owner, 'registration', p);
  if (!correction && !p.ktp_key)
    throw new Problem(
      409,
      'Foto KTP belum tersedia. Minta anggota melengkapinya sebelum menyetujui pendaftaran.',
    );
  if (!correction && !['identity', 'signature', 'ktp'].every((k) => body.checks?.[k] === true))
    throw new Problem(
      400,
      'Periksa kecocokan foto KTP, data identitas, setoran, dan tanda tangan.',
    );
  const checkedAt = now();
  const result = await trackedRun(
    env,
    stmt(
      env,
      `
  UPDATE member_profiles SET status = ?, note = ?, ktp_checked_at = ?, ktp_checked_by = ?,
  updated_at = ?, version = version + 1 WHERE owner = ? AND version = ? AND status = ?
`,
      correction ? 'correction' : 'approved',
      note,
      correction ? null : checkedAt,
      correction ? null : actorId(env, owner),
      checkedAt,
      owner,
      p.version,
      'pending',
    ),
    owner,
    p.id,
    'admin',
    [
      finish(p.id, ['registration'], correction ? 'correction' : 'approved'),
      ...(correction
        ? [{ type: 'close', targetId: p.id, stages: ['reconciliation'], outcome: 'withdrawn' }]
        : []),
    ],
  );
  if (!result.meta?.changes) throw new Problem(409, 'Pendaftaran sudah berubah.');
  return json({ profile: profileDTO(await getProfile(env, owner)) });
}
