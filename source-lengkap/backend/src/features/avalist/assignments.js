/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { commit, rateValue, revision, rows, stamp, text } from './transactions.js';
import { Problem, stmt } from '../../membership.js';
import { availablePerson, peopleJoin } from '../../avalist-email.js';
import { calendarDate, makassarToday } from '../../finance.js';
import { actorId, requireStaffRole } from '../../access.js';
import { missingAssignmentFields } from '../../../../shared/lib/avalist-assignment.js';

export async function validateChange(env, body) {
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
      `
  SELECT id,contract_data FROM workflow_requests WHERE owner=? AND kind= 'capital' AND status
  IN ( 'generated' , 'signed' ) AND contract_data IS NOT NULL
`,
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

export function eventStatement(env, id, p, contractId, personId, rate) {
  return stmt(
    env,
    `
  INSERT INTO
  avalist_events(id,member_id,contract_id,effective_date,person_id,rate,reason,actor,created_at)
  VALUES(?,?,?,?,?,?,?,?,?)
`,
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

export async function requireCompleteChange(env, p, events) {
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
