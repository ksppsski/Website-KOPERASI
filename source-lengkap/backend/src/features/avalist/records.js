/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { revision, rows } from './transactions.js';
import { availablePerson, peopleJoin } from '../../avalist-email.js';
import { capitalFundingRecords } from '../../finance.js';

export const personDTO = (p) => ({
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

export const paymentDTO = (p) => ({
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

export const eventDTO = (e) => ({
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

export async function dataset(env) {
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
