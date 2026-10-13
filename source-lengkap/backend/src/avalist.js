import { avalistEmail, peopleJoin, availablePerson } from './avalist-email.js';
import { missingAssignmentFields } from '../../shared/lib/avalist-assignment.js';
import { Problem, stmt, hash } from './membership.js';
import { requireStaffRole, staffContext, actorId } from './access.js';
import {
  buildPayoutSchedule,
  capitalFundingRecords,
  calendarDate,
  makassarToday,
  scheduledDate,
} from './finance.js';
import { disposition } from './document-names.js';

const stamp = () => new Date().toISOString();
const rows = async (env, sql, ...args) => (await stmt(env, sql, ...args).all()).results;
const revision = async (env) =>
  (await stmt(env, "SELECT revision FROM avalist_clock WHERE id='main'").first())?.revision || 0;
const text = (v, label, min = 1, max = 300) => {
  const s = String(v ?? '').trim();
  if (s.length < min || s.length > max)
    throw new Problem(400, `${label} harus berisi ${min}–${max} karakter.`);
  return s;
};
const rateValue = (v) => {
  if (![1, 2].includes(Number(v))) throw new Problem(400, 'Bagian avalist harus 1% atau 2%.');
  return Number(v);
};
const cents = (principal, rate) => Number((BigInt(principal) * BigInt(rate) + 50n) / 100n);
export function allocation(principal, rate) {
  const total = cents(principal, 10),
    member = cents(principal, 5),
    avalist = cents(principal, rate);
  // Allocate the rounding remainder to the cooperative, keeping the total exact.
  return {
    total,
    member,
    avalist,
    cooperative: total - member - avalist,
    memberRate: 5,
    rate,
    cooperativeRate: 5 - rate,
  };
}
async function commit(env, id, rev, kind, reason, statements) {
  try {
    return await env.DB.batch([
      stmt(
        env,
        'INSERT INTO avalist_operations(id,kind,actor,reason,expected_revision,created_at) VALUES(?,?,?,?,?,?)',
        crypto.randomUUID(),
        kind,
        actorId(env, id),
        reason,
        rev,
        stamp(),
      ),
      ...statements,
    ]);
  } catch (e) {
    if (String(e).includes('AVALIST_STALE'))
      throw new Problem(409, 'Data berubah saat diproses. Perbarui halaman dan periksa kembali.');
    throw e;
  }
}
const personDTO = (p) => ({
  id: p.id,
  userId: p.email && !p.bound_user_id ? null : p.user_id,
  email: p.email || p.account_email || '',
  pending: !!p.email && !p.bound_user_id,
  available: !!p.available,
  name: p.name,
  bankName: p.bank_name,
  bankAccount: p.bank_account,
  accountName: p.account_name,
  active: !!p.active,
  version: p.version,
  linked: !!p.linked,
});
const paymentDTO = (p) => ({
  id: p.id,
  kind: p.kind,
  originalId: p.original_id,
  contractId: p.contract_id,
  date: p.due_date,
  personId: p.person_id,
  amount: p.amount,
  detail: JSON.parse(p.snapshot),
  status: p.status,
  reason: p.reason,
  version: p.version,
  createdAt: p.created_at,
  paidAt: p.paid_at,
  transferDate: p.transfer_date,
  reference: p.reference,
  proofUrl: p.proof_key ? `/api/workflow/avalist/payments/${p.id}/proof` : null,
});
const eventDTO = (e) => ({
  id: e.id,
  seq: e.seq,
  memberId: e.member_id,
  contractId: e.contract_id,
  date: e.effective_date,
  personId: e.person_id,
  rate: e.rate,
  reason: e.reason,
  actor: e.actor,
  actorName: e.actor_name || e.actor,
  createdAt: e.created_at,
});
export function assignmentAt(events, contractId, date) {
  const eligible = events
    .filter((e) => e.contract_id === contractId && e.effective_date <= date)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date) || b.seq - a.seq);
  return {
    personId: eligible.find((e) => e.person_id)?.person_id || null,
    rate: eligible.find((e) => e.rate !== null)?.rate ?? null,
  };
}
async function dataset(env) {
  const rev = await revision(env);
  const [requests, events, people, payments] = await Promise.all([
    rows(
      env,
      "SELECT * FROM workflow_requests WHERE kind='capital' AND status IN ('generated','signed') AND contract_data IS NOT NULL",
    ),
    rows(
      env,
      'SELECT e.*,a.display_name AS actor_name FROM avalist_events e LEFT JOIN staff_accounts a ON a.user_id=e.actor ORDER BY e.seq',
    ),
    rows(
      env,
      `SELECT p.*,a.role AS linked,a.email AS account_email,g.email,g.bound_user_id,${availablePerson} AS available ${peopleJoin} ORDER BY p.name`,
    ),
    rows(env, 'SELECT * FROM avalist_payments ORDER BY due_date DESC,created_at DESC'),
  ]);
  const funding = await capitalFundingRecords(env, requests, null, true);
  return { rev, requests, events, people, payments, funding };
}
function scheduled(data, date) {
  return buildPayoutSchedule(data.requests, data.funding, date).items.map((item) => {
    const a = assignmentAt(data.events, item.id, date),
      person = data.people.find((p) => p.id === a.personId);
    const split = a.rate ? allocation(item.principal, a.rate) : null;
    const detail = {
      contractId: item.id,
      contractNumber: item.contractNumber,
      memberId: item.memberId,
      memberName: item.memberName,
      memberKey: item.memberKey,
      date,
      period: item.period,
      principal: item.principal,
      personId: a.personId,
      personName: person?.name || '',
      bankName: person?.bank_name || '',
      bankAccount: person?.bank_account || '',
      accountName: person?.account_name || '',
      ...split,
    };
    const blocked =
      !person || !split
        ? 'Belum ditetapkan Manajer'
        : !person.active || !person.available
          ? 'Avalist tidak aktif atau akses dicabut'
          : !person.bank_name || !person.bank_account || !person.account_name
            ? 'Rekening avalist belum lengkap'
            : '';
    const ledger = data.payments.find(
      (p) => p.kind === 'regular' && p.contract_id === item.id && p.due_date === date,
    );
    if (ledger?.status === 'paid')
      return {
        ...JSON.parse(ledger.snapshot),
        payment: paymentDTO(ledger),
        blocked: '',
        status: 'paid',
      };
    // Compare the stored preparation with today's authoritative assignment/bank details.
    const changed = ledger && ledger.snapshot !== JSON.stringify(detail);
    return {
      ...detail,
      blocked,
      status: ledger
        ? changed || ledger.status === 'needs_review'
          ? 'needs_review'
          : 'prepared'
        : 'pending',
      payment: ledger ? paymentDTO(ledger) : null,
    };
  });
}
function allPeriods(data) {
  const dates = new Set();
  for (const r of data.requests) {
    const c = JSON.parse(r.contract_data);
    if (!c.effectiveDate || !c.endDate) continue;
    for (let i = 1; i <= 12; i++) {
      const date = scheduledDate(c.effectiveDate, i);
      if (date <= c.endDate) dates.add(date);
    }
  }
  return [...dates].sort().flatMap((date) => scheduled(data, date));
}
async function requireOperations(env, id) {
  const s = await staffContext(env, id);
  if (!s.allowedRoles.some((r) => ['manager', 'admin', 'finance'].includes(r)))
    throw new Problem(403, 'Halaman ini hanya untuk petugas pengelola.');
  return s;
}
export function summarizeAvalistFees(items, payments, today) {
  // Inputs are already scoped to the signed-in recipient. Paid ledger snapshots
  // remain authoritative even after assignments or the original contracts change.
  const paid = payments.filter((p) => p.status === 'paid').reduce((n, p) => n + p.amount, 0);
  const scheduledDue = items
    .filter((x) => x.status !== 'paid' && x.date <= today)
    .reduce((n, x) => n + (x.avalist || 0), 0);
  const pendingAdjustments = payments
    .filter((p) => p.kind === 'adjustment' && p.status !== 'paid' && p.due_date <= today)
    .reduce((n, p) => n + p.amount, 0);
  const pending = scheduledDue + pendingAdjustments;
  return { asOf: today, total: paid + pending, paid, pending, scheduledDue, pendingAdjustments };
}
export function monthlyAvalistFees(items, payments, today) {
  // Entitlement follows the due month; cash follows the recorded bank transfer
  // date. Never subtract cash paid this month from this month's entitlement:
  // a transfer can settle an earlier month's fee.
  const months = new Map();
  const bucket = (date) => {
    const month = String(date || '').slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    if (!months.has(month))
      months.set(month, {
        month,
        total: 0,
        paid: 0,
        paidForPeriod: 0,
        pending: 0,
        notDueYet: 0,
      });
    return months.get(month);
  };
  bucket(today);
  for (const item of items) {
    if (item.status === 'paid') continue;
    const row = bucket(item.date);
    if (!row) continue;
    row.total += item.avalist || 0;
    if (item.date > today) row.notDueYet += item.avalist || 0;
  }
  for (const payment of payments) {
    const paid = payment.status === 'paid';
    // Prepared regular rows repeat the schedule; corrections are separate,
    // manager-approved rights, including negative recoveries.
    if (paid || payment.kind === 'adjustment') {
      const period = bucket(payment.due_date);
      if (period) {
        period.total += payment.amount;
        if (paid) period.paidForPeriod += payment.amount;
      }
    }
    if (paid) {
      const cash = bucket(payment.transfer_date);
      if (cash) cash.paid += payment.amount;
    }
  }
  return [...months.values()]
    .map((row) => ({ ...row, pending: row.total - row.paidForPeriod }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
export async function avalistView(env, id, date, personal = false) {
  calendarDate(date);
  const s = await staffContext(env, id);
  if (personal) {
    if (!s.accountRole) throw new Problem(403, 'Akses Avalist belum diberikan Manajer.');
    const data = await dataset(env),
      me = data.people.find((p) => p.user_id === actorId(env, id));
    if (!me) return { personal: true, person: null, items: [], history: [], members: [] };
    const items = allPeriods(data).filter((x) => x.personId === me.id);
    const ownPayments = data.payments.filter((p) => p.person_id === me.id);
    const history = ownPayments.filter((p) => p.status === 'paid').map(paymentDTO);
    const today = makassarToday();
    // Expose only the member's name/number and the recipient's own periods; never member files/bank details or other avalists.
    const ownItem = (x) => ({
      contractId: x.contractId,
      contractNumber: x.contractNumber,
      memberId: x.memberId,
      memberName: x.memberName,
      date: x.date,
      period: x.period,
      rate: x.rate,
      amount: x.avalist,
      status: x.status,
      blocked: x.blocked,
    });
    const ownHistory = history.map((p) => ({
      ...p,
      detail: ownItem({ ...p.detail, avalist: p.amount }),
      reason: p.kind === 'adjustment' ? 'Penyesuaian disetujui Manajer' : '',
    }));
    const members = [
      ...new Map(
        items.map((x) => [
          x.memberId + '|' + x.memberName,
          { number: x.memberId, name: x.memberName },
        ]),
      ).values(),
    ];
    return {
      personal: true,
      person: personDTO(me),
      items: items.map(ownItem),
      history: ownHistory,
      members,
      today,
      feeSummary: summarizeAvalistFees(items, ownPayments, today),
      monthlyFees: monthlyAvalistFees(items, ownPayments, today),
    };
  }
  const role = await requireOperations(env, id),
    data = await dataset(env);
  const members = await rows(
    env,
    'SELECT id,owner,member_number,data,status FROM member_profiles ORDER BY created_at DESC',
  );
  const defaults = members.map((m) => {
    const d = data.events.filter((e) => e.member_id === m.id && !e.contract_id).at(-1);
    return {
      id: m.id,
      number: m.member_number,
      name: JSON.parse(m.data).name,
      status: m.status,
      personId: d?.person_id || null,
      rate: d?.rate || null,
    };
  });
  const contracts = data.requests.map((r) => {
    const c = JSON.parse(r.contract_data),
      m = JSON.parse(r.member_snapshot || '{}');
    return {
      id: r.id,
      number: r.contract_number,
      memberId: m.id,
      memberName: r.member_name,
      effectiveDate: c.effectiveDate,
      endDate: c.endDate,
      amount: r.amount,
      ...assignmentAt(data.events, r.id, date),
    };
  });
  // Resolve membership by its stable owner; names may repeat.
  for (const c of contracts) {
    const r = data.requests.find((r) => r.id === c.id),
      p = members.find((m) => m.owner === r.owner);
    c.memberId = p?.id || c.memberId;
  }
  const manager = role.allowedRoles.includes('manager');
  const accounts = manager
    ? await rows(
        env,
        'SELECT user_id AS id,display_name AS name,role FROM staff_accounts ORDER BY display_name',
      )
    : [];
  const proposals = (
    await rows(env, 'SELECT * FROM avalist_proposals ORDER BY created_at DESC')
  ).map((p) => ({
    id: p.id,
    payload: JSON.parse(p.payload),
    completionNeeded:
      p.status === 'pending' ? missingAssignmentFields(JSON.parse(p.payload), data.events) : [],
    status: p.status,
    submittedBy: p.submitted_by,
    createdAt: p.created_at,
    decidedAt: p.decided_at,
    decisionNote: p.decision_note,
  }));
  return {
    personal: false,
    date,
    today: makassarToday(),
    revision: data.rev,
    people: data.people.map(personDTO),
    members: defaults,
    contracts,
    events: data.events.map(eventDTO).reverse(),
    proposals,
    accounts,
    items: scheduled(data, date),
    history: data.payments.map(paymentDTO),
    canManage: manager,
  };
}
export async function savePerson(env, id, body) {
  await requireStaffRole(env, id, 'manager');
  const rev = await revision(env);
  let prior = null;
  if (body.id) {
    prior = await stmt(env, 'SELECT * FROM avalist_people WHERE id=?', String(body.id)).first();
    if (!prior) throw new Problem(404, 'Avalist tidak ditemukan.');
  } else if (body.userId) {
    // Preserve existing internal account registrations without moving their history.
    const account = await stmt(
      env,
      'SELECT user_id FROM staff_accounts WHERE user_id=?',
      String(body.userId),
    ).first();
    if (!account) throw new Problem(400, 'Gunakan email untuk mendaftarkan avalist baru.');
    prior = await stmt(env, 'SELECT * FROM avalist_people WHERE user_id=?', body.userId).first();
  }
  if (prior && Number(body.version) !== prior.version)
    throw new Problem(409, 'Data avalist telah berubah. Perbarui halaman.');
  const grant = prior
    ? await stmt(env, 'SELECT * FROM avalist_email_access WHERE person_id=?', prior.id).first()
    : null;
  const email = !prior && !body.userId ? avalistEmail(body.email) : grant?.email || '';
  if (prior && body.email && avalistEmail(body.email) !== email) {
    const account = await stmt(
      env,
      'SELECT email FROM staff_accounts WHERE user_id=?',
      prior.user_id,
    ).first();
    if (grant || avalistEmail(body.email) !== account?.email?.trim().toLowerCase())
      throw new Problem(
        400,
        'Email yang terhubung tidak dapat diganti agar riwayat tetap dimiliki akun yang sama.',
      );
  }
  if (
    !prior &&
    email &&
    ((await stmt(env, 'SELECT person_id FROM avalist_email_access WHERE email=?', email).first()) ||
      (await stmt(
        env,
        'SELECT p.id FROM avalist_people p JOIN staff_accounts a ON a.user_id=p.user_id WHERE lower(trim(a.email))=?',
        email,
      ).first()))
  )
    throw new Problem(
      409,
      'Email ini sudah terdaftar sebagai avalist. Pilih avalist tersebut untuk mengubah datanya.',
    );
  const name = text(body.name || prior?.name || email.slice(0, 160), 'Nama', 2, 160),
    bank = text(body.bankName, 'Bank', body.bankName ? 2 : 0, 100),
    number = text(body.bankAccount, 'Nomor rekening', body.bankAccount ? 3 : 0, 60),
    holder = text(body.accountName, 'Nama pemilik rekening', body.accountName ? 2 : 0, 160),
    reason = prior
      ? text(body.reason, 'Alasan', 5, 500)
      : String(body.reason || 'Pendaftaran avalist oleh Manajer').slice(0, 500);
  const personId = prior?.id || crypto.randomUUID(),
    at = stamp();
  const statements = prior
    ? [
        stmt(
          env,
          'UPDATE avalist_people SET name=?,bank_name=?,bank_account=?,account_name=?,active=?,version=version+1,updated_at=?,updated_by=? WHERE id=?',
          name,
          bank,
          number,
          holder,
          body.active === false ? 0 : 1,
          at,
          actorId(env, id),
          personId,
        ),
      ]
    : [
        stmt(
          env,
          'INSERT INTO avalist_people(id,user_id,name,bank_name,bank_account,account_name,active,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?)',
          personId,
          body.userId || 'pending-email:' + personId,
          name,
          bank,
          number,
          holder,
          body.active === false ? 0 : 1,
          at,
          actorId(env, id),
        ),
      ];
  if (!prior && email)
    statements.push(
      stmt(
        env,
        'INSERT INTO avalist_email_access(email,person_id,created_by,created_at) VALUES(?,?,?,?)',
        email,
        personId,
        actorId(env, id),
        at,
      ),
    );
  await commit(env, id, rev, 'person', reason, statements);
  return { ok: true, id: personId };
}
async function validateChange(env, body) {
  const memberId = text(body.memberId, 'Anggota', 1, 100),
    scope = body.scope;
  if (!['new', 'selected', 'all'].includes(scope))
    throw new Problem(400, 'Pilih cakupan perubahan.');
  const member = await stmt(env, 'SELECT * FROM member_profiles WHERE id=?', memberId).first();
  if (!member) throw new Problem(404, 'Anggota tidak ditemukan.');
  const reason = text(body.reason, 'Alasan', 5, 500),
    personId = body.personId ? text(body.personId, 'Avalist', 1, 100) : null,
    rate = body.rate == null || body.rate === '' ? null : rateValue(body.rate);
  if (!personId && rate === null)
    throw new Problem(400, 'Pilih avalist pengganti atau perubahan persentase.');
  if (personId) {
    const p = await stmt(
      env,
      `SELECT p.id ${peopleJoin} WHERE p.id=? AND p.active=1 AND ${availablePerson}`,
      personId,
    ).first();
    if (!p) throw new Problem(400, 'Pilih avalist internal yang aktif.');
  }
  const effectiveDate = scope === 'new' ? makassarToday() : String(body.effectiveDate || '');
  calendarDate(effectiveDate);
  let contractIds = [];
  if (scope !== 'new') {
    const eligible = await rows(
      env,
      "SELECT id,contract_data FROM workflow_requests WHERE owner=? AND kind='capital' AND status IN ('generated','signed') AND contract_data IS NOT NULL",
      member.owner,
    );
    const running = eligible.filter((r) => JSON.parse(r.contract_data).endDate >= makassarToday());
    contractIds =
      scope === 'all'
        ? running.map((r) => r.id)
        : [...new Set(Array.isArray(body.contractIds) ? body.contractIds : [])];
    if (!contractIds.length || contractIds.length > 100)
      throw new Problem(400, 'Pilih 1–100 akad berjalan.');
    for (const contractId of contractIds) {
      const r = running.find((r) => r.id === contractId);
      if (!r) throw new Problem(400, 'Akad pilihan bukan akad berjalan milik anggota ini.');
      const c = JSON.parse(r.contract_data);
      if (effectiveDate > c.endDate)
        throw new Problem(400, 'Tanggal berlaku melewati akhir salah satu akad.');
    }
  }
  return { memberId, scope, personId, rate, effectiveDate, reason, contractIds };
}
function eventStatement(env, id, p, contractId, personId, rate) {
  return stmt(
    env,
    'INSERT INTO avalist_events(id,member_id,contract_id,effective_date,person_id,rate,reason,actor,created_at) VALUES(?,?,?,?,?,?,?,?,?)',
    crypto.randomUUID(),
    p.memberId,
    contractId,
    p.effectiveDate,
    personId,
    rate,
    p.reason,
    actorId(env, id),
    stamp(),
  );
}
async function requireCompleteChange(env, p, events) {
  const missing = missingAssignmentFields(p, events);
  if (!missing.length) return;
  const names = [];
  for (const m of missing.slice(0, 4)) {
    const row = m.contractId
      ? await stmt(
          env,
          'SELECT contract_number FROM workflow_requests WHERE id=?',
          m.contractId,
        ).first()
      : null;
    names.push(
      (m.contractId ? row?.contract_number || m.contractId : 'Pengajuan akad baru') +
        ': ' +
        [m.needsPerson ? 'nama avalist' : null, m.needsRate ? 'persentase' : null]
          .filter(Boolean)
          .join(' dan '),
    );
  }
  throw new Problem(
    400,
    'Lengkapi penetapan awal sebelum disetujui: ' +
      names.join('; ') +
      (missing.length > 4 ? ' dan ' + (missing.length - 4) + ' akad lainnya' : '') +
      '. Pilihan “pertahankan” hanya tersedia jika data sebelumnya sudah ada.',
  );
}
export async function changeAssignment(env, id, body, proposalId = null) {
  await requireStaffRole(env, id, 'manager');
  const rev = await revision(env);
  let proposal;
  const completion =
    proposalId && body.completion && typeof body.completion === 'object' ? body.completion : {};
  if (proposalId) {
    proposal = await stmt(
      env,
      "SELECT * FROM avalist_proposals WHERE id=? AND status='pending'",
      proposalId,
    ).first();
    if (!proposal) throw new Problem(409, 'Usulan sudah diputuskan atau tidak ditemukan.');
    body = JSON.parse(proposal.payload);
    if (body.scope === 'all') body = { ...body, scope: 'selected' };
  }
  const p = await validateChange(env, body),
    statements = [];
  const events = await rows(
    env,
    'SELECT * FROM avalist_events WHERE member_id=? ORDER BY seq',
    p.memberId,
  );
  const missing = missingAssignmentFields(p, events);
  const completedPerson = completion.personId ? text(completion.personId, 'Avalist', 1, 100) : null;
  const completedRate =
    completion.rate == null || completion.rate === '' ? null : rateValue(completion.rate);
  if (
    (completedPerson && !missing.some((m) => m.needsPerson)) ||
    (completedRate !== null && !missing.some((m) => m.needsRate))
  )
    throw new Problem(409, 'Data penetapan telah berubah. Perbarui usulan sebelum menyetujui.');
  let completionName = '';
  if (completedPerson) {
    const person = await stmt(
      env,
      `SELECT p.name ${peopleJoin} WHERE p.id=? AND p.active=1 AND ${availablePerson}`,
      completedPerson,
    ).first();
    if (!person)
      throw new Problem(400, 'Pilih avalist internal yang aktif untuk melengkapi usulan.');
    completionName = person.name;
  }
  // Completion only supplies absent fields. Existing per-contract percentages or
  // recipients remain independent even when one proposal includes mixed history.
  await requireCompleteChange(
    env,
    { ...p, personId: p.personId || completedPerson, rate: p.rate ?? completedRate },
    events,
  );
  const note =
    'Disetujui Manajer' +
    (completedPerson || completedRate !== null
      ? '. Data awal dilengkapi untuk ' +
        missing.length +
        ' penetapan: ' +
        [
          completedPerson ? 'avalist ' + completionName : null,
          completedRate !== null
            ? 'bagian avalist ' + completedRate + '% (koperasi ' + (5 - completedRate) + '%)'
            : null,
        ]
          .filter(Boolean)
          .join('; ') +
        '.'
      : '');
  if (p.scope === 'new') {
    const prior = events.filter((e) => !e.contract_id).at(-1);
    statements.push(
      eventStatement(
        env,
        id,
        { ...p, reason: p.reason + (missing.length ? ' · ' + note : '') },
        null,
        p.personId || prior?.person_id || completedPerson,
        p.rate ?? prior?.rate ?? completedRate,
      ),
    );
  } else {
    for (const cid of p.contractIds) {
      const need = missing.find((m) => m.contractId === cid);
      statements.push(
        eventStatement(
          env,
          id,
          { ...p, reason: p.reason + (need ? ' · ' + note : '') },
          cid,
          p.personId || (need?.needsPerson ? completedPerson : null),
          p.rate ?? (need?.needsRate ? completedRate : null),
        ),
      );
    }
  }
  if (proposal)
    statements.push(
      stmt(
        env,
        "UPDATE avalist_proposals SET status='approved',decided_by=?,decided_at=?,decision_note=? WHERE id=? AND status='pending'",
        actorId(env, id),
        stamp(),
        note,
        proposalId,
      ),
    );
  await commit(env, id, rev, 'assignment', p.reason, statements);
  return { ok: true, count: p.scope === 'new' ? 1 : p.contractIds.length };
}
export async function proposeAssignment(env, id, body) {
  await requireStaffRole(env, id, 'admin');
  const rev = await revision(env),
    p = await validateChange(env, body),
    key = crypto.randomUUID();
  await requireCompleteChange(
    env,
    p,
    await rows(env, 'SELECT * FROM avalist_events WHERE member_id=? ORDER BY seq', p.memberId),
  );
  await commit(env, id, rev, 'proposal', p.reason, [
    stmt(
      env,
      'INSERT INTO avalist_proposals(id,payload,submitted_by,created_at) VALUES(?,?,?,?)',
      key,
      JSON.stringify(p),
      actorId(env, id),
      stamp(),
    ),
  ]);
  return { ok: true, id: key };
}
export async function rejectProposal(env, id, key, body) {
  await requireStaffRole(env, id, 'manager');
  const rev = await revision(env),
    reason = text(body.reason, 'Alasan penolakan', 5, 500);
  const p = await stmt(
    env,
    "SELECT id FROM avalist_proposals WHERE id=? AND status='pending'",
    key,
  ).first();
  if (!p) throw new Problem(409, 'Usulan sudah diputuskan atau tidak ditemukan.');
  await commit(env, id, rev, 'reject', reason, [
    stmt(
      env,
      "UPDATE avalist_proposals SET status='rejected',decided_by=?,decided_at=?,decision_note=? WHERE id=?",
      actorId(env, id),
      stamp(),
      reason,
      key,
    ),
  ]);
  return { ok: true };
}
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
      "INSERT INTO avalist_payments(id,contract_id,due_date,person_id,amount,snapshot,fingerprint,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(contract_id,due_date) WHERE kind='regular' DO UPDATE SET person_id=excluded.person_id,amount=excluded.amount,snapshot=excluded.snapshot,fingerprint=excluded.fingerprint,status='prepared',version=version+1,created_by=excluded.created_by,created_at=excluded.created_at WHERE avalist_payments.status<>'paid'",
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
      "INSERT INTO avalist_payments(id,kind,original_id,contract_id,due_date,person_id,amount,snapshot,fingerprint,reason,created_by,created_at) VALUES(?,'adjustment',?,?,?,?,?,?,?,?,?,?)",
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
          "UPDATE avalist_payments SET status='paid',paid_at=?,paid_by=?,transfer_date=?,reference=?,proof_key=?,proof_name=?,proof_type=?,version=version+1 WHERE id=? AND status='prepared' AND version=?",
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
  const s = await staffContext(env, id),
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
