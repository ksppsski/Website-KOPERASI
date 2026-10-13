/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { calendarDate, makassarToday } from '../../finance.js';
import { actorId, staffContext } from '../../access.js';
import { Problem } from '../../membership.js';
import { dataset, eventDTO, paymentDTO, personDTO } from './records.js';
import {
  allPeriods,
  assignmentAt,
  monthlyAvalistFees,
  scheduled,
  summarizeAvalistFees,
} from './schedule.js';
import { requireOperations, rows } from './transactions.js';
import { missingAssignmentFields } from '../../../../shared/lib/avalist-assignment.js';

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
