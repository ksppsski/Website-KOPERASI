import { Problem, stmt, getProfile, snapshot } from './membership.js';
import { makassarToday, calendarDate, requireReconciled } from './finance.js';
import { requireStaffRole, cooperativeOwner, actorId } from './access.js';
import { requireActiveSavings } from './savings.js';
import { reservedSql } from './offers.js';
import { receive, finish, trackedRun, eventStatement } from './activity.js';

export function addDays(value, n) {
  const d = calendarDate(value);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function renewalDates(effectiveDate) {
  const d = calendarDate(effectiveDate);
  if (d.getUTCDate() === 31) d.setUTCDate(d.getUTCDate() + 1);
  const effective = d.toISOString().slice(0, 10);
  return { effectiveDate: effective, endDate: addDays(effective, 365) };
}
export function maturityView(row, decision, today = makassarToday()) {
  if (row.kind !== 'capital' || !row.contract_data || !['generated', 'signed'].includes(row.status))
    return null;
  const c = JSON.parse(row.contract_data),
    opensAt = addDays(c.endDate, -30),
    ended = today >= c.endDate;
  return {
    endDate: c.endDate,
    opensAt,
    needsDecision: !decision && today >= opensAt,
    ended,
    status: ended
      ? 'Selesai'
      : decision?.choice === 'return'
        ? 'Menunggu jatuh tempo untuk pengembalian'
        : decision?.choice === 'extend'
          ? 'Perpanjangan dikonfirmasi'
          : 'Berjalan',
    decision: decision
      ? {
          choice: decision.choice,
          confirmedAt: decision.confirmed_at,
          renewalId: decision.renewal_id,
          effectiveDate: decision.effective_date,
          dueDate: decision.due_date,
        }
      : null,
  };
}
export async function decideMaturity(env, owner, id, body) {
  const row = await stmt(
    env,
    "SELECT * FROM workflow_requests WHERE id=? AND owner=? AND kind='capital'",
    id,
    owner,
  ).first();
  if (!row || !row.contract_data || !['generated', 'signed'].includes(row.status))
    throw new Problem(404, 'Akad tidak ditemukan.');
  const prior = await stmt(env, 'SELECT * FROM maturity_decisions WHERE request_id=?', id).first();
  if (prior) throw new Problem(409, 'Pilihan sudah dikonfirmasi dan tidak dapat diganti.');
  const today = makassarToday(),
    view = maturityView(row, null, today);
  if (today < view.opensAt)
    throw new Problem(409, 'Pilihan tersedia mulai 30 hari sebelum akad berakhir.');
  if (!['extend', 'return'].includes(body.choice) || body.confirm !== true)
    throw new Problem(
      400,
      'Pilih lanjut atau pengembalian, lalu konfirmasi bahwa pilihan tidak dapat diubah.',
    );
  await requireReconciled(env, owner, 'capital', row);
  const profile = await getProfile(env, owner),
    at = new Date().toISOString(),
    member = JSON.parse(row.member_snapshot).data;
  let renewalId = null,
    effective = null,
    offerId = null;
  if (body.choice === 'extend') {
    if (!profile || profile.status !== 'approved')
      throw new Problem(409, 'Keanggotaan harus aktif untuk melanjutkan penyertaan modal.');
    await requireActiveSavings(env, owner, profile);
    if (body.signatureConsent !== true)
      throw new Problem(400, 'Setujui penggunaan tanda tangan terdaftar untuk akad baru.');
    offerId = String(body.offerId || '');
    const offer = await stmt(
      env,
      'SELECT * FROM capital_offers WHERE id=? AND owner=?',
      offerId,
      await cooperativeOwner(env, owner),
    ).first();
    if (!offer || offer.id === row.offer_id || offer.project_code === row.project_code)
      throw new Problem(400, 'Pilih project baru yang dibuka Manajer.');
    renewalId = crypto.randomUUID();
    effective = renewalDates(today > view.endDate ? today : view.endDate).effectiveDate;
    // First reserve the immutable decision only if quota still fits. The dependent
    // insert and audit share one D1 transaction, so concurrent choices cannot double reserve.
    const decision = stmt(
      env,
      `INSERT INTO maturity_decisions (request_id,owner,choice,amount,due_date,offer_id,renewal_id,effective_date,confirmed_at,confirmed_by)
   SELECT ?,?,'extend',?,?,?,?,?,?,? FROM capital_offers o WHERE o.id=? AND o.quota>=?+${reservedSql}
   AND NOT EXISTS (SELECT 1 FROM maturity_decisions WHERE request_id=?) ON CONFLICT(request_id) DO NOTHING`,
      id,
      owner,
      row.amount,
      view.endDate,
      offerId,
      renewalId,
      effective,
      at,
      owner,
      offerId,
      row.amount,
      '',
      id,
    );
    const next = stmt(
      env,
      `
  INSERT INTO workflow_requests
  (id,owner,kind,member_name,amount,status,note,created_at,updated_at,version,member_snapshot,
      offer_id,offer_title,project_code,renewal_of,renewal_effective_date)
  SELECT ?,?, 'capital' ,?,?, 'pending' , '' ,?,?,1,?,o.id,o.title,o.project_code,?,?
      FROM
  capital_offers o WHERE o.id=? AND EXISTS (SELECT 1 FROM maturity_decisions WHERE
  request_id=? AND renewal_id=?)
`,
      renewalId,
      owner,
      JSON.parse(profile.data).name,
      row.amount,
      at,
      at,
      snapshot(profile),
      id,
      effective,
      offerId,
      id,
      renewalId,
    );
    const ops = [receive(renewalId, 'capital', row.member_name, at)];
    const results = await env.DB.batch([
      decision,
      next,
      eventStatement(env, owner, renewalId, null, ops, {
        key: 'renewal:' + id,
        at,
        guard: 'WHERE changes()>0',
      }),
    ]);
    if (!results[0].meta?.changes)
      throw new Problem(
        409,
        'Pilihan sudah tercatat atau kuota project tidak mencukupi. Muat ulang penawaran.',
      );
  } else {
    if (!member.bankName || !member.bankAccount)
      throw new Problem(
        409,
        'Rekening pada akad belum lengkap. Hubungi petugas untuk pemeriksaan.',
      );
    const decision = stmt(
      env,
      `
  INSERT INTO maturity_decisions
  (request_id,owner,choice,amount,due_date,confirmed_at,confirmed_by) VALUES (?,?, 'return'
  ,?,?,?,?) ON CONFLICT(request_id) DO NOTHING
`,
      id,
      owner,
      row.amount,
      view.endDate,
      at,
      owner,
    );
    const payment = stmt(
      env,
      `
  INSERT INTO capital_returns
  (request_id,owner,amount,due_date,bank_name,bank_account,account_name) SELECT ?,?,?,?,?,?,?
  WHERE EXISTS (SELECT 1 FROM maturity_decisions WHERE request_id=? AND choice= 'return' ) ON
  CONFLICT(request_id) DO NOTHING
`,
      id,
      owner,
      row.amount,
      view.endDate,
      member.bankName,
      member.bankAccount,
      member.name || row.member_name,
      id,
    );
    const dueAt = new Date(view.endDate + 'T00:00:00+08:00').toISOString();
    const task = receive(id, 'principal-return', row.member_name, at > dueAt ? at : dueAt, {
      scheduledAt: at,
    });
    const results = await env.DB.batch([
      decision,
      payment,
      eventStatement(env, owner, id, null, [task], {
        key: 'principal-return:' + id,
        at,
        guard: 'WHERE changes()>0',
      }),
    ]);
    if (!results[0].meta?.changes)
      throw new Problem(409, 'Pilihan sudah dikonfirmasi dan tidak dapat diganti.');
  }
  return { choice: body.choice, renewalId, effectiveDate: effective, dueDate: view.endDate };
}
export async function returnQueue(env, actor) {
  await requireStaffRole(env, actor, 'finance');
  const today = makassarToday();
  const rows = (
    await stmt(
      env,
      `
  SELECT p.*,w.member_name,w.contract_number,w.project_code,m.id AS
  profile_id,m.member_number FROM capital_returns p JOIN workflow_requests w ON
  w.id=p.request_id LEFT JOIN member_profiles m ON m.owner=p.owner ORDER BY p.paid_at IS NOT
  NULL,p.due_date,w.created_at
`,
    ).all()
  ).results;
  return {
    today,
    items: rows.map((r) => ({
      id: r.request_id,
      memberProfileId: r.profile_id,
      memberName: r.member_name,
      memberNumber: r.member_number,
      amount: r.amount,
      dueDate: r.due_date,
      bankName: r.bank_name,
      bankAccount: r.bank_account,
      accountName: r.account_name,
      projectCode: r.project_code,
      contractNumber: r.contract_number,
      status: r.paid_at ? 'paid' : r.due_date <= today ? 'due' : 'scheduled',
      paidAt: r.paid_at,
      reference: r.reference,
      transferDate: r.transfer_date,
      proofUrl: r.proof_key
        ? `/api/workflow/member/${r.profile_id}/returns/${r.request_id}/proof`
        : null,
    })),
    totalDue: rows
      .filter((r) => !r.paid_at && r.due_date <= today)
      .reduce((n, r) => n + r.amount, 0),
    totalScheduled: rows
      .filter((r) => !r.paid_at && r.due_date > today)
      .reduce((n, r) => n + r.amount, 0),
  };
}
export async function completeReturn(env, actor, id, data, proof) {
  await requireStaffRole(env, actor, 'finance');
  const row = await stmt(env, 'SELECT * FROM capital_returns WHERE request_id=?', id).first();
  if (!row) throw new Problem(404, 'Jadwal pengembalian tidak ditemukan.');
  if (row.paid_at) throw new Problem(409, 'Pengembalian sudah tercatat.');
  const today = makassarToday();
  if (today < row.due_date)
    throw new Problem(409, 'Pengembalian baru dapat dilakukan pada tanggal jatuh tempo.');
  const transferDate = String(data.get('transferDate') || ''),
    reference = String(data.get('reference') || '').trim();
  calendarDate(transferDate);
  if (transferDate < row.due_date || transferDate > today)
    throw new Problem(400, 'Tanggal transfer harus antara tanggal jatuh tempo dan hari ini.');
  if (
    Number(data.get('amount')) !== row.amount ||
    data.get('confirm') !== 'true' ||
    reference.length < 3 ||
    reference.length > 160
  )
    throw new Problem(400, 'Konfirmasi nominal yang sama dengan modal dan isi referensi transfer.');
  const key = 'principal-returns/' + crypto.randomUUID(),
    at = new Date().toISOString();
  await env.BUCKET.put(key, proof.bytes, { httpMetadata: { contentType: proof.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE capital_returns SET
  paid_at=?,paid_by=?,transfer_date=?,reference=?,proof_key=?,proof_name=?,proof_type=? WHERE
  request_id=? AND paid_at IS NULL
`,
        at,
        actorId(env, actor),
        transferDate,
        reference,
        key,
        proof.name,
        proof.type,
        id,
      ),
      row.owner,
      id,
      'finance',
      [finish(id, ['principal-return'], 'returned')],
      at,
    );
    if (!result.meta?.changes)
      throw new Problem(409, 'Pengembalian sudah dicatat oleh petugas lain.');
  } catch (e) {
    await env.BUCKET.delete(key);
    throw e;
  }
  return { ok: true };
}
export async function maturityReport(env, actor, params) {
  await requireStaffRole(env, actor, 'manager');
  const today = makassarToday(),
    from = params.get('from') || today.slice(0, 7) + '-01',
    to =
      params.get('to') ||
      new Date(Date.UTC(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0, 12))
        .toISOString()
        .slice(0, 10);
  calendarDate(from);
  calendarDate(to);
  if (from > to) throw new Problem(400, 'Rentang tanggal tidak valid.');
  const rows = (
    await stmt(
      env,
      `
  SELECT w.*,d.choice,d.confirmed_at,d.renewal_id,p.paid_at,m.member_number FROM
  workflow_requests w LEFT JOIN maturity_decisions d ON d.request_id=w.id LEFT JOIN
  capital_returns p ON p.request_id=w.id LEFT JOIN member_profiles m ON m.owner=w.owner WHERE
  w.kind= 'capital' AND w.status IN ( 'generated' , 'signed' ) AND w.contract_data IS NOT
  NULL AND json_extract(w.contract_data, '$.endDate' ) BETWEEN ? AND ? ORDER BY
  json_extract(w.contract_data, '$.endDate' ),w.created_at
`,
      from,
      to,
    ).all()
  ).results;
  const group = (choice) => {
    const r = choice === 'all' ? rows : rows.filter((x) => (x.choice || 'pending') === choice);
    return {
      count: r.length,
      memberCount: new Set(r.map((x) => x.owner)).size,
      amount: r.reduce((n, x) => n + x.amount, 0),
    };
  };
  return {
    from,
    to,
    total: group('all'),
    extended: group('extend'),
    returned: group('return'),
    pending: group('pending'),
    items: rows.map((r) => ({
      id: r.id,
      memberName: r.member_name,
      memberNumber: r.member_number,
      amount: r.amount,
      projectCode: r.project_code,
      contractNumber: r.contract_number,
      endDate: JSON.parse(r.contract_data).endDate,
      choice: r.choice || 'pending',
      confirmedAt: r.confirmed_at,
      paidAt: r.paid_at,
    })),
  };
}
