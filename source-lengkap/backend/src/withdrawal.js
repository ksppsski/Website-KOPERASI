import { Problem, stmt, getProfile } from './membership.js';
import { requireStaffRole, actorId } from './access.js';
import { trackedRun, receive, finish, closeTasks } from './activity.js';
import { localDate, BASIC } from './savings.js';

export const OPEN_WITHDRAWAL =
  "'pending','reviewing','correction','approved','finance_pending','manager_pending'";
const now = () => new Date().toISOString();
export const withdrawalLabels = {
  pending: 'Menunggu keputusan Admin',
  reviewing: 'Dalam peninjauan Admin',
  correction: 'Perlu perbaikan',
  approved: 'Perlu peninjauan ulang Admin',
  finance_pending: 'Menunggu pengembalian Finance',
  manager_pending: 'Menunggu persetujuan final Manajer',
  completed: 'Keanggotaan ditutup',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};
export async function membershipOwner(env, account) {
  return (
    (
      await stmt(
        env,
        'SELECT current_owner FROM membership_accounts WHERE account_id=?',
        account,
      ).first()
    )?.current_owner || account
  );
}
export async function restartMembership(env, account, body) {
  if (body.confirm !== true)
    throw new Problem(400, 'Konfirmasi pendaftaran ulang dengan nomor anggota baru.');
  const owner = await membershipOwner(env, account),
    p = await getProfile(env, owner);
  if (!p) return { ok: true };
  if (p.status !== 'closed')
    throw new Problem(
      409,
      'Pendaftaran ulang hanya tersedia setelah keanggotaan lama ditutup Manajer.',
    );
  const next = 'membership:' + crypto.randomUUID(),
    at = now();
  const result = await stmt(
    env,
    `
  INSERT INTO membership_accounts (account_id,current_owner,updated_at) SELECT ?,?,? WHERE
  EXISTS (SELECT 1 FROM member_profiles WHERE owner=? AND status= 'closed' ) ON
  CONFLICT(account_id) DO UPDATE SET
  current_owner=excluded.current_owner,updated_at=excluded.updated_at WHERE
  membership_accounts.current_owner=?
`,
    account,
    next,
    at,
    owner,
    owner,
  ).run();
  if (!result.meta?.changes)
    throw new Problem(409, 'Pendaftaran ulang telah dimulai. Perbarui halaman.');
  return { ok: true };
}
export async function withdrawalEligibility(env, owner) {
  const p = await getProfile(env, owner),
    today = localDate();
  const capital = (
    await stmt(
      env,
      `
  SELECT w.id,w.contract_number,w.project_code,w.status,w.contract_data,d.choice,cr.paid_at
  FROM workflow_requests w LEFT JOIN maturity_decisions d ON d.request_id=w.id LEFT JOIN
  capital_returns cr ON cr.request_id=w.id WHERE w.owner=? AND w.kind= 'capital' AND w.status
  NOT IN ( 'rejected' , 'cancelled' )
`,
      owner,
    ).all()
  ).results
    .filter((r) => {
      let d;
      try {
        d = JSON.parse(r.contract_data || 'null');
      } catch {}
      return !d?.endDate || d.endDate > today || !r.choice || (r.choice === 'return' && !r.paid_at);
    })
    .map((r) => ({
      id: r.id,
      label:
        (r.contract_number || r.project_code || 'Pengajuan penyertaan modal') +
        (r.choice === 'return' && !r.paid_at ? ' · menunggu pengembalian modal' : ''),
      kind: 'capital',
    }));
  const financing = (
    await stmt(
      env,
      'SELECT id,number FROM financing_contracts WHERE owner=? AND settled_at IS NULL',
      owner,
    ).all()
  ).results.map((r) => ({ id: r.id, label: r.number, kind: 'financing' }));
  const open = await stmt(
    env,
    `SELECT id,status FROM workflow_requests WHERE owner=? AND kind='withdrawal' AND status IN (${OPEN_WITHDRAWAL}) LIMIT 1`,
    owner,
  ).first();
  return {
    eligible: p?.status === 'approved' && !capital.length && !financing.length && !open,
    blockers: [...capital, ...financing],
    open: open || null,
    closed: p?.status === 'closed',
  };
}
export async function requireNoContracts(env, owner) {
  const s = await withdrawalEligibility(env, owner);
  if (s.blockers.length)
    throw new Problem(
      409,
      'Pengunduran diri belum dapat diproses. Selesaikan kontrak, pengajuan yang berjalan, dan pengembalian modal yang belum tuntas.',
    );
}
export async function requireMembershipOpen(env, owner) {
  const p = await getProfile(env, owner);
  if (p?.status === 'closed')
    throw new Problem(
      403,
      'Keanggotaan sudah ditutup. Nomor anggota lama tidak dapat digunakan; lakukan pendaftaran ulang.',
    );
  if (
    await stmt(
      env,
      `SELECT id FROM workflow_requests WHERE owner=? AND kind='withdrawal' AND status IN (${OPEN_WITHDRAWAL}) LIMIT 1`,
      owner,
    ).first()
  )
    throw new Problem(
      409,
      'Permohonan pengunduran diri sedang diproses. Pengajuan layanan baru ditutup sementara.',
    );
}
export async function settlementDTO(env, id) {
  const r = await stmt(env, 'SELECT * FROM withdrawal_settlements WHERE request_id=?', id).first();
  return r
    ? {
        amount: r.amount,
        bankName: r.bank_name,
        bankAccount: r.bank_account,
        accountName: r.account_name,
        adminAt: r.admin_at,
        paidAt: r.paid_at,
        transferDate: r.transfer_date,
        reference: r.reference,
        closedAt: r.closed_at,
        proofUrl: r.proof_key ? '/api/workflow/withdrawals/' + id + '/proof' : null,
      }
    : null;
}
export async function approveWithdrawal(env, owner, row, note) {
  await requireStaffRole(env, owner, 'admin');
  await requireNoContracts(env, owner);
  const p = await getProfile(env, owner),
    d = p ? JSON.parse(p.data) : {};
  if (p?.status !== 'approved') throw new Problem(409, 'Keanggotaan tidak aktif.');
  if (!d.bankName || !d.bankAccount)
    throw new Problem(409, 'Rekening tujuan anggota belum lengkap.');
  const at = now();
  const result = await trackedRun(
    env,
    stmt(
      env,
      `
  UPDATE workflow_requests SET status= 'finance_pending'
  ,note=?,updated_at=?,version=version+1 WHERE id=? AND owner=? AND version=? AND status IN (
  'pending' , 'reviewing' )
`,
      note,
      at,
      row.id,
      owner,
      row.version,
    ),
    owner,
    row.id,
    'admin',
    [
      finish(row.id, ['withdrawal'], 'approved'),
      receive(row.id, 'withdrawal-return', row.member_name, at),
    ],
    at,
    [
      stmt(
        env,
        `
  INSERT INTO withdrawal_settlements
  (request_id,owner,profile_id,amount,bank_name,bank_account,account_name,admin_at,admin_by)
  SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM workflow_requests WHERE id=? AND
  status= 'finance_pending' AND updated_at=? AND version=?) ON CONFLICT(request_id) DO
  NOTHING
`,
        row.id,
        owner,
        p.id,
        BASIC,
        d.bankName,
        d.bankAccount,
        d.name,
        at,
        actorId(env, owner),
        row.id,
        at,
        row.version + 1,
      ),
    ],
  );
  if (!result.meta?.changes) throw new Problem(409, 'Permohonan berubah. Perbarui daftar.');
}
export async function withdrawalQueue(env, actor, role) {
  await requireStaffRole(env, actor, role);
  const rows = (
    await stmt(
      env,
      `
  SELECT r.*,p.member_number,p.id profile_id FROM workflow_requests r JOIN member_profiles p
  ON p.owner=r.owner WHERE r.kind= 'withdrawal' AND r.status IN ( 'finance_pending' ,
  'manager_pending' , 'completed' ) ORDER BY r.created_at
`,
    ).all()
  ).results;
  const items = [];
  for (const r of rows) {
    if (role === 'manager' && r.status === 'finance_pending') continue;
    const settlement = await settlementDTO(env, r.id);
    items.push({
      id: r.id,
      version: r.version,
      memberName: r.member_name,
      memberNumber: r.member_number,
      memberProfileId: r.profile_id,
      reason: r.reason,
      note: r.note,
      status: r.status,
      statusLabel: withdrawalLabels[r.status],
      createdAt: r.created_at,
      settlement: settlement
        ? {
            ...settlement,
            proofUrl: settlement.proofUrl?.replace(
              '/api/workflow/',
              '/api/workflow/member/' + r.profile_id + '/',
            ),
          }
        : null,
    });
  }
  return { items, today: localDate() };
}
export async function payWithdrawal(env, actor, id, form, proof) {
  await requireStaffRole(env, actor, 'finance');
  const r = await stmt(
    env,
    "SELECT * FROM workflow_requests WHERE id=? AND kind='withdrawal'",
    id,
  ).first();
  if (!r || r.status !== 'finance_pending')
    throw new Problem(409, 'Pengembalian belum tersedia atau sudah dicatat.');
  const s = await stmt(env, 'SELECT * FROM withdrawal_settlements WHERE request_id=?', id).first();
  if (!s || s.paid_at) throw new Problem(409, 'Pengembalian belum tersedia atau sudah dicatat.');
  await requireNoContracts(env, r.owner);
  const total = await stmt(
    env,
    'SELECT COALESCE(SUM(basic),0) amount FROM savings_credits WHERE owner=?',
    r.owner,
  ).first();
  if (total.amount < BASIC)
    throw new Problem(
      409,
      'Simpanan pokok belum tercatat terverifikasi. Periksa rekonsiliasi terlebih dahulu.',
    );
  const date = String(form.get('transferDate') || ''),
    reference = String(form.get('reference') || '').trim();
  if (
    Number(form.get('amount')) !== BASIC ||
    form.get('confirm') !== 'true' ||
    reference.length < 3 ||
    reference.length > 160 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(Date.parse(date)) ||
    new Date(date).toISOString().slice(0, 10) !== date ||
    date < localDate(new Date(s.admin_at)) ||
    date > localDate()
  )
    throw new Problem(
      400,
      'Konfirmasi pengembalian Rp100.000, tanggal transfer, dan referensi yang benar.',
    );
  if (Number(form.get('version')) !== r.version)
    throw new Problem(409, 'Permohonan berubah. Perbarui daftar.');
  const at = now(),
    key = 'withdrawal-returns/' + crypto.randomUUID();
  await env.BUCKET.put(key, proof.bytes, { httpMetadata: { contentType: proof.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `
  UPDATE workflow_requests SET status= 'manager_pending' ,updated_at=?,version=version+1
  WHERE id=? AND version=? AND status= 'finance_pending' AND EXISTS (SELECT 1 FROM
  withdrawal_settlements WHERE request_id=? AND paid_at IS NULL)
`,
        at,
        id,
        r.version,
        id,
      ),
      r.owner,
      id,
      'finance',
      [
        finish(id, ['withdrawal-return'], 'paid'),
        receive(id, 'withdrawal-final', r.member_name, at),
      ],
      at,
      [
        stmt(
          env,
          `
  UPDATE withdrawal_settlements SET
  paid_at=?,paid_by=?,transfer_date=?,reference=?,proof_key=?,proof_name=?,proof_type=? WHERE
  request_id=? AND paid_at IS NULL AND EXISTS (SELECT 1 FROM workflow_requests WHERE id=? AND
  status= 'manager_pending' AND version=? AND updated_at=?)
`,
          at,
          actorId(env, actor),
          date,
          reference,
          key,
          proof.name,
          proof.type,
          id,
          id,
          r.version + 1,
          at,
        ),
      ],
    );
    if (!result.meta?.changes)
      throw new Problem(
        409,
        'Pengembalian sudah diproses. Jangan transfer ulang; perbarui daftar.',
      );
  } catch (e) {
    await env.BUCKET.delete(key);
    throw e;
  }
  return { ok: true };
}
export async function closeMembership(env, actor, id, body) {
  await requireStaffRole(env, actor, 'manager');
  const r = await stmt(
    env,
    "SELECT * FROM workflow_requests WHERE id=? AND kind='withdrawal'",
    id,
  ).first();
  if (!r || r.status !== 'manager_pending' || Number(body.version) !== r.version)
    throw new Problem(409, 'Permohonan belum siap atau sudah diputuskan.');
  if (body.confirm !== true)
    throw new Problem(400, 'Konfirmasi penutupan permanen nomor anggota ini.');
  await requireNoContracts(env, r.owner);
  const at = now();
  const result = await trackedRun(
    env,
    stmt(
      env,
      `
  UPDATE workflow_requests SET status= 'completed' ,updated_at=?,version=version+1 WHERE id=?
  AND version=? AND status= 'manager_pending' AND EXISTS (SELECT 1 FROM
  withdrawal_settlements s JOIN member_profiles p ON p.id=s.profile_id WHERE s.request_id=?
  AND s.paid_at IS NOT NULL AND s.proof_key IS NOT NULL AND s.closed_at IS NULL AND p.status=
  'approved' )
`,
      at,
      id,
      r.version,
      id,
    ),
    r.owner,
    id,
    'manager',
    [finish(id, ['withdrawal-final'], 'closed'), closeTasks(id, 'closed')],
    at,
    [
      stmt(
        env,
        `
  UPDATE withdrawal_settlements SET closed_at=?,closed_by=? WHERE request_id=? AND closed_at
  IS NULL AND EXISTS (SELECT 1 FROM workflow_requests WHERE id=? AND status= 'completed' AND
  updated_at=? AND version=?)
`,
        at,
        actorId(env, actor),
        id,
        id,
        at,
        r.version + 1,
      ),
      stmt(
        env,
        `
  UPDATE member_profiles SET status= 'closed' ,updated_at=?,version=version+1 WHERE owner=?
  AND status= 'approved' AND EXISTS (SELECT 1 FROM withdrawal_settlements WHERE request_id=?
  AND closed_at=?)
`,
        at,
        r.owner,
        id,
        at,
      ),
    ],
  );
  if (!result.meta?.changes)
    throw new Problem(
      409,
      'Persetujuan Admin dan bukti pengembalian Finance belum lengkap atau data berubah.',
    );
  return { ok: true };
}

export async function financingList(env, owner, staff = false) {
  if (staff) await requireStaffRole(env, owner, 'admin');
  return (
    await (
      staff
        ? stmt(
            env,
            `
  SELECT f.*,p.member_number,p.id profile_id,p.data FROM financing_contracts f JOIN
  member_profiles p ON p.owner=f.owner ORDER BY f.created_at DESC
`,
          )
        : stmt(
            env,
            `
  SELECT f.*,p.member_number,p.id profile_id,p.data FROM financing_contracts f JOIN
  member_profiles p ON p.owner=f.owner WHERE f.owner=? ORDER BY f.created_at DESC
`,
            owner,
          )
    ).all()
  ).results.map((r) => ({
    id: r.id,
    memberProfileId: r.profile_id,
    memberNumber: r.member_number,
    memberName: JSON.parse(r.data).name,
    number: r.number,
    purpose: r.purpose,
    amount: r.amount,
    startDate: r.start_date,
    endDate: r.end_date,
    settledAt: r.settled_at,
    settlementNote: r.settlement_note,
    status: r.settled_at ? 'Lunas' : r.end_date < localDate() ? 'Lewat jatuh tempo' : 'Aktif',
  }));
}
export async function recordFinancing(env, actor, body) {
  await requireStaffRole(env, actor, 'admin');
  const p = await stmt(
    env,
    "SELECT * FROM member_profiles WHERE id=? AND status='approved'",
    String(body.profileId || ''),
  ).first();
  if (!p) throw new Problem(409, 'Pilih anggota aktif.');
  await requireMembershipOpen(env, p.owner);
  const number = String(body.number || '').trim(),
    purpose = String(body.purpose || '').trim(),
    amount = Number(body.amount),
    start = String(body.startDate || ''),
    end = String(body.endDate || '');
  const validDate = (s) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    Number.isFinite(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  if (
    !number ||
    number.length > 120 ||
    purpose.length < 3 ||
    purpose.length > 200 ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    amount > 1e12 ||
    !validDate(start) ||
    !validDate(end) ||
    end < start ||
    body.confirm !== true
  )
    throw new Problem(400, 'Lengkapi data kontrak pembiayaan yang telah disepakati.');
  const id = crypto.randomUUID(),
    at = now();
  try {
    await trackedRun(
      env,
      stmt(
        env,
        `
  INSERT INTO financing_contracts
  (id,owner,number,purpose,amount,start_date,end_date,created_at,created_by) VALUES
  (?,?,?,?,?,?,?,?,?)
`,
        id,
        p.owner,
        number,
        purpose,
        amount,
        start,
        end,
        at,
        actorId(env, actor),
      ),
      p.owner,
      id,
      'admin',
      [
        receive(id, 'financing-record', JSON.parse(p.data).name, at),
        finish(id, ['financing-record'], 'recorded'),
      ],
      at,
    );
  } catch (e) {
    if (String(e).includes('UNIQUE'))
      throw new Problem(409, 'Nomor kontrak pembiayaan sudah tercatat.');
    throw e;
  }
  return { ok: true };
}
export async function settleFinancing(env, actor, id, body) {
  await requireStaffRole(env, actor, 'admin');
  const r = await stmt(env, 'SELECT * FROM financing_contracts WHERE id=?', id).first(),
    note = String(body.note || '').trim();
  if (!r || r.settled_at) throw new Problem(409, 'Kontrak tidak tersedia atau sudah lunas.');
  if (body.confirm !== true || note.length < 5 || note.length > 1500)
    throw new Problem(400, 'Konfirmasi pelunasan dan isi referensi pemeriksaannya.');
  const at = now(),
    result = await trackedRun(
      env,
      stmt(
        env,
        'UPDATE financing_contracts SET settled_at=?,settled_by=?,settlement_note=? WHERE id=? AND settled_at IS NULL',
        at,
        actorId(env, actor),
        note,
        id,
      ),
      r.owner,
      id,
      'admin',
      [
        receive(id, 'financing-settle', 'Pelunasan ' + r.number, at),
        finish(id, ['financing-settle'], 'settled'),
      ],
      at,
    );
  if (!result.meta?.changes) throw new Problem(409, 'Kontrak sudah berubah.');
  return { ok: true };
}
