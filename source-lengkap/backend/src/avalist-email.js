import { Problem, stmt } from './membership.js';

export function avalistEmail(value) {
  const email = String(value || '')
    .trim()
    .toLowerCase();
  if (email.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Problem(400, 'Masukkan alamat email avalist yang valid.');
  return email;
}

// Email is a one-time, manager-issued entitlement. After the first authenticated
// sign-in, ownership is permanently bound to the platform's stable user ID.
// Never read a claimed identity from a form, query parameter, or portal header.
export async function claimAvalistEmail(env, id, identity) {
  if (!identity.email) return;
  const email = identity.email.trim().toLowerCase();
  const grant = await stmt(
    env,
    'SELECT g.*,p.active,p.user_id FROM avalist_email_access g JOIN avalist_people p ON p.id=g.person_id WHERE g.email=?',
    email,
  ).first();
  if (!grant || grant.bound_user_id || !grant.active) return;
  // A second email cannot relocate an already-linked person's financial history.
  if (await stmt(env, 'SELECT id FROM avalist_people WHERE user_id=?', id).first()) return;
  const at = new Date().toISOString(),
    token = crypto.randomUUID();
  const won =
    'SELECT 1 FROM avalist_email_access WHERE email=? AND bound_user_id=? AND claim_token=?';
  await env.DB.batch([
    stmt(
      env,
      'UPDATE avalist_email_access SET bound_user_id=?,claimed_at=?,claim_token=? WHERE email=? AND bound_user_id IS NULL AND EXISTS (SELECT 1 FROM avalist_people WHERE id=person_id AND active=1 AND user_id=?)',
      id,
      at,
      token,
      email,
      'pending-email:' + grant.person_id,
    ),
    stmt(
      env,
      `UPDATE avalist_people SET user_id=?,version=version+1,updated_at=?,updated_by=? WHERE id=? AND user_id=? AND EXISTS (${won})`,
      id,
      at,
      id,
      grant.person_id,
      'pending-email:' + grant.person_id,
      email,
      id,
      token,
    ),
    stmt(
      env,
      `INSERT INTO staff_accounts(user_id,role,display_name,email,granted_by,created_at,updated_at) SELECT ?,'avalist',?,?,?,?,? WHERE EXISTS (${won}) ON CONFLICT(user_id) DO NOTHING`,
      id,
      identity.name,
      email,
      grant.created_by,
      at,
      at,
      email,
      id,
      token,
    ),
    stmt(
      env,
      `INSERT INTO staff_access_requests(user_id,request_code,display_name,email,status,requested_at) SELECT ?,?,?,?,'approved',? WHERE EXISTS (${won}) ON CONFLICT(user_id) DO UPDATE SET status='approved'`,
      id,
      crypto.randomUUID(),
      identity.name,
      email,
      at,
      email,
      id,
      token,
    ),
    stmt(
      env,
      `INSERT INTO staff_access_audit(id,target_user_id,role,actor_id,created_at) SELECT ?,?,'avalist',?,? WHERE EXISTS (${won})`,
      crypto.randomUUID(),
      id,
      grant.created_by,
      at,
      email,
      id,
      token,
    ),
  ]);
}

// Pending email registrations are assignable before their first sign-in. Once
// claimed, deleting staff access blocks payment and never re-grants it on login.
export const peopleJoin =
  'FROM avalist_people p LEFT JOIN staff_accounts a ON a.user_id=p.user_id LEFT JOIN avalist_email_access g ON g.person_id=p.id';
export const availablePerson =
  '(a.user_id IS NOT NULL OR (g.email IS NOT NULL AND g.bound_user_id IS NULL))';
