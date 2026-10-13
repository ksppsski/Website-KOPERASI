/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { json, now, readJson } from '../../http/response.js';
import { requestId, shortText } from '../../http/validation.js';
import { Problem, profileDTO, stmt } from '../../membership.js';
import { dto, getProfile, getRecord } from './records.js';
import { approveWithdrawal, requireNoContracts } from '../../withdrawal.js';
import { closeTasks, finish, receive, submission, trackedRun } from '../../activity.js';
import { requireReconciled, requireStaffRole } from '../../finance.js';
import { readCapital } from '../capital/service.js';
import { readSavings } from '../savings/service.js';
import { reservedSql } from '../../offers.js';

export async function createWithdrawal(request, env, owner) {
  const body = await readJson(request),
    id = requestId(body.id),
    reason = shortText(body.reason, 10, 1500, 'Alasan pengunduran diri');
  if (body.consent !== true)
    throw new Problem(400, 'Konfirmasi pengiriman permohonan pengunduran diri.');
  const existing = await getRecord(env, owner, id);
  if (existing) {
    if (existing.kind !== 'withdrawal') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(existing) });
  }
  const profile = await getProfile(env, owner);
  if (!profile || profile.status !== 'approved')
    throw new Problem(409, 'Keanggotaan perlu disetujui sebelum mengajukan pengunduran diri.');
  await requireNoContracts(env, owner);
  const time = now();
  try {
    await trackedRun(
      env,
      stmt(
        env,
        `
  INSERT INTO workflow_requests
  (id,owner,kind,member_name,reason,status,note,created_at,updated_at,version) VALUES
  (?,?,?,?,?,?,?,?,?,?)
`,
        id,
        owner,
        'withdrawal',
        JSON.parse(profile.data).name,
        reason,
        'pending',
        '',
        time,
        time,
        1,
      ),
      owner,
      id,
      null,
      submission(id, 'withdrawal', JSON.parse(profile.data).name, time),
      time,
    );
  } catch (error) {
    const prior = await getRecord(env, owner, id);
    if (prior) return json({ item: dto(prior) });
    if (String(error).includes('UNIQUE'))
      throw new Problem(409, 'Masih ada permohonan pengunduran diri yang sedang diproses.');
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, id)) }, 201);
}

export async function updateStatus(env, owner, row, status, note) {
  const time = now(),
    ops =
      status === 'reviewing'
        ? [{ type: 'start', targetId: row.id, stages: [row.kind] }]
        : status === 'cancelled'
          ? [closeTasks(row.id, 'cancelled')]
          : [
              finish(row.id, [row.kind], status),
              ...(status === 'ready' ? [receive(row.id, 'generate', row.member_name, time)] : []),
              ...(['correction', 'rejected'].includes(status)
                ? [
                    {
                      type: 'close',
                      targetId: row.id,
                      stages: ['reconciliation'],
                      outcome: 'withdrawn',
                    },
                  ]
                : []),
            ];
  const result = await trackedRun(
    env,
    stmt(
      env,
      `
  UPDATE workflow_requests SET status = ?, note = ?, updated_at = ?, version = version + 1
  WHERE id = ? AND owner = ? AND version = ?
`,
      status,
      note,
      now(),
      row.id,
      owner,
      row.version,
    ),
    owner,
    row.id,
    status === 'cancelled' ? null : 'admin',
    ops,
    time,
  );
  if (!result.meta?.changes)
    throw new Problem(409, 'Status sudah berubah. Muat ulang daftar sebelum melanjutkan.');
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}

export async function reviewRequest(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  const body = await readJson(request);
  if (!['pending', 'reviewing'].includes(row.status))
    throw new Problem(409, 'Pengajuan ini sudah selesai diproses.');
  if (Number(body.version) !== row.version)
    throw new Problem(409, 'Data sudah berubah. Muat ulang pemeriksaan.');
  const note = String(body.note || '')
    .trim()
    .slice(0, 1500);
  if (body.action === 'start') return updateStatus(env, owner, row, 'reviewing', row.note);
  if (row.kind === 'withdrawal') {
    if (!['approve', 'reject'].includes(body.action))
      throw new Problem(400, 'Pilih Setujui atau Tolak untuk permohonan pengunduran diri.');
    if (body.action === 'approve') {
      await approveWithdrawal(env, owner, row, note);
      return json({ item: dto(await getRecord(env, owner, row.id)) });
    }
    return updateStatus(
      env,
      owner,
      row,
      'rejected',
      shortText(body.note, 5, 1500, 'Alasan penolakan'),
    );
  }
  if (row.renewal_of && ['return', 'reject'].includes(body.action))
    throw new Problem(
      409,
      'Pilihan perpanjangan terkunci. Periksa data sebelum menyetujui akad lanjutan.',
    );
  if (body.action === 'return' || body.action === 'reject')
    return updateStatus(
      env,
      owner,
      row,
      body.action === 'return' ? 'correction' : 'rejected',
      shortText(body.note, 5, 1500, 'Catatan petugas'),
    );
  if (body.action !== 'approve') throw new Problem(400, 'Tindakan pemeriksaan tidak valid.');
  if (!['capital', 'withdrawal'].includes(row.kind))
    throw new Problem(409, 'Setoran simpanan diperiksa melalui rekonsiliasi Finance.');
  if (row.kind === 'capital' && !row.member_snapshot)
    throw new Problem(
      409,
      'Pengajuan lama belum memiliki data dan tanda tangan anggota. Buat pengajuan baru setelah pendaftaran disetujui.',
    );
  if (row.kind === 'capital') await requireReconciled(env, owner, 'capital', row);
  const keys = ['identity', 'amount'];
  if (!keys.every((key) => body.checks?.[key] === true))
    throw new Problem(400, 'Lengkapi semua pemeriksaan terlebih dahulu.');
  return updateStatus(env, owner, row, row.kind === 'capital' ? 'ready' : 'approved', note);
}

export function correctionAllowed(row) {
  return (
    row.status === 'correction' ||
    (['pending', 'reviewing'].includes(row.status) && row.finance?.status === 'correction')
  );
}

export function revisionGuard(row) {
  return row.finance?.status === 'correction'
    ? " AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=workflow_requests.owner AND target_id=workflow_requests.id AND status='correction' AND version=" +
        Number(row.finance.version) +
        ')'
    : '';
}

export async function reviseRequest(request, env, owner, row) {
  if (row.renewal_of)
    throw new Problem(409, 'Pilihan project dan nominal perpanjangan tidak dapat diganti.');
  if (!correctionAllowed(row))
    throw new Problem(409, 'Pengajuan hanya dapat diperbaiki jika diminta Admin atau Finance.');
  if (['capital', 'savings'].includes(row.kind)) {
    const data = row.kind === 'capital' ? await readCapital(request) : await readSavings(request);
    if (data.id !== row.id || data.version !== row.version)
      throw new Problem(409, 'Pengajuan berubah. Muat ulang formulir perbaikan.');
    const key = 'proof/' + crypto.randomUUID();
    await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
    try {
      const result = await trackedRun(
        env,
        stmt(
          env,
          `
  UPDATE workflow_requests SET amount = ?, proof_key = ?, proof_name = ?, proof_type = ?,
  proof_size = ?, status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ?
  AND owner = ? AND version = ? AND status = ?
` +
            revisionGuard(row) +
            (row.offer_id
              ? ` AND EXISTS (SELECT 1 FROM capital_offers o WHERE o.id=workflow_requests.offer_id AND o.quota>=?+${reservedSql})`
              : ''),
          data.amount,
          key,
          data.proof.name,
          data.proof.type,
          data.proof.bytes.length,
          'pending',
          '',
          now(),
          row.id,
          owner,
          row.version,
          row.status,
          ...(row.offer_id ? [data.amount, row.id] : []),
        ),
        owner,
        row.id,
        null,
        submission(row.id, row.kind, row.member_name),
      );
      if (!result.meta?.changes)
        throw new Problem(
          409,
          'Pengajuan berubah atau sisa kuota tidak mencukupi. Periksa nominal dan muat ulang daftar.',
        );
    } catch (error) {
      await env.BUCKET.delete(key);
      throw error;
    }
    // Retain prior proof objects; financial review history must stay recoverable.
  } else {
    const data = await readJson(request);
    if (data.consent !== true)
      throw new Problem(400, 'Konfirmasi pengiriman permohonan pengunduran diri.');
    if (Number(data.version) !== row.version)
      throw new Problem(409, 'Pengajuan berubah. Muat ulang formulir perbaikan.');
    await requireNoContracts(env, owner);
    const reason = shortText(data.reason, 10, 1500, 'Alasan pengunduran diri');
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE workflow_requests SET reason = ?, status = ?, note = ?, updated_at = ?, version =
  version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?
`,
        reason,
        'pending',
        '',
        now(),
        row.id,
        owner,
        row.version,
        'correction',
      ),
      owner,
      row.id,
      null,
      submission(row.id, 'withdrawal', row.member_name),
    );
    if (!result.meta?.changes)
      throw new Problem(409, 'Pengajuan sudah berubah. Muat ulang daftar.');
  }
  return json({
    item: dto(await getRecord(env, owner, row.id)),
    profile: profileDTO(await getProfile(env, owner)),
  });
}
