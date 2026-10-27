/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { actorId, requireStaffRole, staffContext, requireOperationalAccess } from '../../access.js';
import { calendarDate, makassarToday } from '../../finance.js';
import { dataset } from './records.js';
import { scheduled } from './schedule.js';
import { Problem, hash, stmt } from '../../membership.js';
import { commit, revision, stamp, text } from './transactions.js';
import { availablePerson, peopleJoin } from '../../avalist-email.js';
import { disposition } from '../../document-names.js';

export async function preparePayment(env, id, body) {
  await requireStaffRole(env, id, 'finance');
  const date = String(body.date || '');
  calendarDate(date);
  const data = await dataset(env),
    item = scheduled(data, date).find((x) => x.contractId === body.contractId);
  if (!item) throw new Problem(404, 'Tidak ada bagi hasil yang memenuhi syarat pada tanggal ini.');
  if (item.status === 'paid')
    throw new Problem(409, 'Pembayaran sudah selesai dan tidak dapat diubah.');
  if (item.blocked) throw new Problem(409, item.blocked);
  const { payment, status, blocked, ...detail } = item,
    snapshot = JSON.stringify(detail),
    fingerprint = await hash(new TextEncoder().encode(snapshot)),
    key = payment?.id || crypto.randomUUID();
  await commit(env, id, data.rev, 'prepare', 'Persiapan pembayaran avalist', [
    stmt(
      env,
      `
  INSERT INTO
  avalist_payments(id,contract_id,due_date,person_id,amount,snapshot,fingerprint,created_by,created_at)
  VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(contract_id,due_date) WHERE kind= 'regular' DO UPDATE
  SET
  person_id=excluded.person_id,amount=excluded.amount,snapshot=excluded.snapshot,fingerprint=excluded.fingerprint,status=
  'prepared' ,version=version+1,created_by=excluded.created_by,created_at=excluded.created_at
  WHERE avalist_payments.status<> 'paid'
`,
      key,
      item.contractId,
      date,
      item.personId,
      item.avalist,
      snapshot,
      fingerprint,
      actorId(env, id),
      stamp(),
    ),
  ]);
  return { ok: true, id: key };
}

export async function createAdjustment(env, id, body) {
  await requireStaffRole(env, id, 'manager');
  const rev = await revision(env),
    original = await stmt(
      env,
      "SELECT * FROM avalist_payments WHERE id=? AND status='paid' AND kind='regular'",
      String(body.originalId || ''),
    ).first();
  if (!original) throw new Problem(400, 'Pilih pembayaran bagi hasil yang sudah selesai.');
  const amount = Number(body.amount),
    reason = text(body.reason, 'Alasan koreksi', 5, 500),
    old = JSON.parse(original.snapshot);
  if (!Number.isSafeInteger(amount) || !amount || Math.abs(amount) > old.principal)
    throw new Problem(
      400,
      'Nominal koreksi harus rupiah bulat, tidak nol, dan tidak melebihi modal akad.',
    );
  const p = await stmt(
    env,
    `SELECT p.* ${peopleJoin} WHERE p.id=? AND p.active=1 AND ${availablePerson}`,
    String(body.personId || ''),
  ).first();
  if (!p) throw new Problem(400, 'Pilih penerima atau pengembali dana yang aktif.');
  const detail = {
      ...old,
      personId: p.id,
      personName: p.name,
      bankName: p.bank_name,
      bankAccount: p.bank_account,
      accountName: p.account_name,
      avalist: amount,
      cooperative: -amount,
    },
    snapshot = JSON.stringify(detail),
    key = text(body.id, 'Referensi koreksi', 36, 36);
  if (!/^[0-9a-f-]{36}$/i.test(key)) throw new Problem(400, 'Referensi koreksi tidak valid.');
  const prior = await stmt(env, 'SELECT id FROM avalist_payments WHERE id=?', key).first();
  if (prior) throw new Problem(409, 'Koreksi ini sudah tercatat. Perbarui halaman.');
  await commit(env, id, rev, 'adjustment', reason, [
    stmt(
      env,
      `
  INSERT INTO
  avalist_payments(id,kind,original_id,contract_id,due_date,person_id,amount,snapshot,fingerprint,reason,created_by,created_at)
  VALUES(?, 'adjustment' ,?,?,?,?,?,?,?,?,?,?)
`,
      key,
      original.id,
      original.contract_id,
      original.due_date,
      p.id,
      amount,
      snapshot,
      await hash(new TextEncoder().encode(snapshot)),
      reason,
      actorId(env, id),
      stamp(),
    ),
  ]);
  return { ok: true, id: key };
}

export async function refreshAdjustment(env, id, key) {
  await requireStaffRole(env, id, 'finance');
  const rev = await revision(env);
  const row = await stmt(
    env,
    "SELECT * FROM avalist_payments WHERE id=? AND kind='adjustment' AND status<>'paid'",
    key,
  ).first();
  if (!row) throw new Problem(409, 'Koreksi tidak tersedia untuk diperiksa.');
  const p = await stmt(
    env,
    `SELECT p.* ${peopleJoin} WHERE p.id=? AND p.active=1 AND ${availablePerson}`,
    row.person_id,
  ).first();
  if (!p) throw new Problem(409, 'Avalist tidak aktif atau akses dicabut.');
  const detail = {
      ...JSON.parse(row.snapshot),
      bankName: p.bank_name,
      bankAccount: p.bank_account,
      accountName: p.account_name,
      personName: p.name,
    },
    snapshot = JSON.stringify(detail);
  await commit(env, id, rev, 'review-adjustment', 'Finance memeriksa rekening koreksi', [
    stmt(
      env,
      "UPDATE avalist_payments SET snapshot=?,fingerprint=?,status='prepared',version=version+1 WHERE id=?",
      snapshot,
      await hash(new TextEncoder().encode(snapshot)),
      key,
    ),
  ]);
  return { ok: true };
}

export async function payAvalist(env, id, key, body, file) {
  await requireStaffRole(env, id, 'finance');
  const data = await dataset(env),
    row = data.payments.find((p) => p.id === key);
  if (!row) throw new Problem(404, 'Pembayaran tidak ditemukan.');
  if (row.status !== 'prepared' || row.version !== Number(body.version))
    throw new Problem(409, 'Pembayaran perlu diperiksa ulang atau sudah selesai.');
  if (row.kind === 'regular') {
    const item = scheduled(data, row.due_date).find((x) => x.contractId === row.contract_id);
    if (!item || item.blocked || item.status !== 'prepared')
      throw new Problem(
        409,
        'Penetapan atau data akad berubah. Periksa ulang persiapan pembayaran.',
      );
  }
  const recipient = data.people.find((p) => p.id === row.person_id),
    snapshot = JSON.parse(row.snapshot);
  if (
    !recipient?.active ||
    !recipient.available ||
    !recipient.bank_name ||
    !recipient.bank_account ||
    !recipient.account_name ||
    recipient.bank_account !== snapshot.bankAccount ||
    recipient.bank_name !== snapshot.bankName ||
    recipient.account_name !== snapshot.accountName
  )
    throw new Problem(409, 'Periksa kembali avalist dan rekening penerima.');
  if (Number(body.amount) !== Math.abs(row.amount) || body.confirm !== 'yes')
    throw new Problem(400, 'Konfirmasi penerima, nominal, dan bukti transaksi terlebih dahulu.');
  const date = String(body.transferDate || '');
  calendarDate(date);
  if (date > makassarToday() || date < row.due_date)
    throw new Problem(400, 'Tanggal transaksi harus sejak jadwal bagi hasil sampai hari ini.');
  const reference = text(body.reference, 'Referensi transaksi', 3, 160),
    proofKey = `avalist/${key}/${crypto.randomUUID()}`;
  await env.BUCKET.put(proofKey, file.bytes, { httpMetadata: { contentType: file.type } });
  try {
    await commit(
      env,
      id,
      data.rev,
      'payment',
      row.amount < 0 ? 'Penerimaan pengembalian koreksi' : 'Pencatatan transfer avalist',
      [
        stmt(
          env,
          `
  UPDATE avalist_payments SET status= 'paid'
  ,paid_at=?,paid_by=?,transfer_date=?,reference=?,proof_key=?,proof_name=?,proof_type=?,version=version+1
  WHERE id=? AND status= 'prepared' AND version=?
`,
          stamp(),
          actorId(env, id),
          date,
          reference,
          proofKey,
          file.name,
          file.type,
          key,
          row.version,
        ),
      ],
    );
  } catch (e) {
    await env.BUCKET.delete(proofKey);
    throw e;
  }
  return { ok: true };
}

export async function paymentProof(env, id, key) {
  const s = requireOperationalAccess(await staffContext(env, id)),
    row = await stmt(env, 'SELECT * FROM avalist_payments WHERE id=?', key).first();
  if (!row?.proof_key) throw new Problem(404, 'Bukti tidak ditemukan.');
  const personal = await stmt(
    env,
    'SELECT id FROM avalist_people WHERE user_id=?',
    actorId(env, id),
  ).first();
  if (
    !s.allowedRoles.some((r) => ['manager', 'finance'].includes(r)) &&
    !(s.accountRole && personal?.id === row.person_id)
  )
    throw new Problem(403, 'Bukti ini bukan milik Anda.');
  const file = await env.BUCKET.get(row.proof_key);
  if (!file) throw new Problem(404, 'Bukti belum tersedia.');
  return new Response(file.body, {
    headers: {
      'Content-Type': row.proof_type,
      'Content-Disposition': disposition(row.proof_name, true),
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
