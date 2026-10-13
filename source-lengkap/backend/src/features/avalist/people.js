/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { actorId, requireStaffRole } from '../../access.js';
import { commit, revision, stamp, text } from './transactions.js';
import { Problem, stmt } from '../../membership.js';
import { avalistEmail } from '../../avalist-email.js';

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
          `
  UPDATE avalist_people SET
  name=?,bank_name=?,bank_account=?,account_name=?,active=?,version=version+1,updated_at=?,updated_by=?
  WHERE id=?
`,
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
          `
  INSERT INTO
  avalist_people(id,user_id,name,bank_name,bank_account,account_name,active,updated_at,updated_by)
  VALUES(?,?,?,?,?,?,?,?,?)
`,
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
