import { Problem, stmt, getProfile } from '../../membership.js';
import { membershipOwner } from '../../withdrawal.js';
import { shortText, requestId } from '../../http/validation.js';
import {
  canManage,
  canWork,
  complaintDTO,
  detail,
  divisionNames,
  hasAssignment,
  openStatuses,
  record,
  statusNames,
} from './records.js';

const stamp = () => new Date().toISOString();
const stale = () =>
  new Problem(409, 'Keluhan berubah saat diproses. Muat ulang dan periksa kembali.');
const closed = (row) => {
  if (row.status === 'closed')
    throw new Problem(409, 'Keluhan sudah ditutup dan tidak dapat diubah.');
};
const version = (body, row) => {
  if (!Number.isSafeInteger(body.version) || body.version !== row.version) throw stale();
};

function eventStatement(env, row, actor, person, context, kind, message, at, token) {
  return stmt(
    env,
    `INSERT INTO complaint_events
      (id,complaint_id,kind,message,actor_id,actor_name,actor_role,created_at)
      SELECT ?,id,?,?,?,?,?,? FROM complaints WHERE id=? AND mutation_token=?`,
    crypto.randomUUID(),
    kind,
    message,
    actor,
    person.name,
    context.accountRole || 'member',
    at,
    row.id,
    token,
  );
}

async function mutate(env, row, actor, person, context, changes, events) {
  const token = crypto.randomUUID();
  const at = stamp();
  const fields = { ...changes, updated_at: at, mutation_token: token };
  const result = await env.DB.batch([
    stmt(
      env,
      `UPDATE complaints SET ${Object.keys(fields)
        .map((key) => key + '=?')
        .join(',')},version=version+1
        WHERE id=? AND version=? AND status<>'closed'`,
      ...Object.values(fields),
      row.id,
      row.version,
    ),
    ...events.map(([kind, message]) =>
      eventStatement(env, row, actor, person, context, kind, message, at, token),
    ),
  ]);
  if (Number(result[0]?.meta?.changes) !== 1) throw stale();
  return detail(env, row.id, actor, context);
}

export async function createComplaint(env, actor, person, context, body) {
  if (context.accountRole === 'customer_relation')
    throw new Problem(
      403,
      'Customer Relation hanya dapat menindaklanjuti keluhan yang ditugaskan kepadanya.',
    );
  const id = requestId(body.id);
  const subject = shortText(body.subject, 5, 160, 'Subjek keluhan');
  const description = shortText(body.description, 10, 4000, 'Uraian keluhan');
  const prior = await stmt(env, 'SELECT * FROM complaints WHERE id=?', id).first();
  const repeat = (row) => {
    if (row.owner !== actor) throw new Problem(404, 'Keluhan tidak ditemukan.');
    if (row.subject !== subject || row.description !== description)
      throw new Problem(409, 'Nomor kiriman sudah digunakan untuk keluhan yang berbeda.');
    return { item: complaintDTO(row) };
  };
  if (prior) return repeat(prior);
  const profile = await getProfile(env, await membershipOwner(env, actor));
  const at = stamp();
  const token = crypto.randomUUID();
  let profileName = '';
  try {
    profileName = JSON.parse(profile?.data || '{}').name || '';
  } catch {
    profileName = '';
  }
  await env.DB.batch([
    stmt(
      env,
      'INSERT INTO complaint_numbers (complaint_id) VALUES (?) ON CONFLICT(complaint_id) DO NOTHING',
      id,
    ),
    stmt(
      env,
      `INSERT INTO complaints
        (id,owner,number,member_name,member_number,subject,description,created_at,updated_at,mutation_token)
        SELECT ?,?,printf('KLH-%s-%06d',strftime('%Y',?,'+8 hours'),serial),?,?,?,?,?,?,?
        FROM complaint_numbers WHERE complaint_id=? ON CONFLICT(id) DO NOTHING`,
      id,
      actor,
      at,
      String(profileName || person.name).slice(0, 160),
      profile?.member_number || null,
      subject,
      description,
      at,
      at,
      token,
      id,
    ),
    eventStatement(env, { id }, actor, person, context, 'created', 'Keluhan diterima.', at, token),
  ]);
  return repeat(await stmt(env, 'SELECT * FROM complaints WHERE id=?', id).first());
}

function deadline(value) {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value)
  )
    throw new Problem(400, 'Isi batas waktu dengan tanggal dan waktu yang valid.');
  const time = Date.parse(value);
  const day = new Date(value.slice(0, 10) + 'T12:00:00Z');
  if (
    !Number.isFinite(time) ||
    !Number.isFinite(day.getTime()) ||
    day.toISOString().slice(0, 10) !== value.slice(0, 10)
  )
    throw new Problem(400, 'Isi batas waktu dengan tanggal dan waktu yang valid.');
  if (time <= Date.now()) throw new Problem(400, 'Batas waktu harus sesudah waktu sekarang.');
  return new Date(time).toISOString();
}

export async function assignComplaint(env, actor, person, context, id, body) {
  if (!canManage(context))
    throw new Problem(403, 'Penanggung jawab hanya dapat ditetapkan oleh Admin atau Manajer.');
  const row = await record(env, id, actor, context);
  closed(row);
  version(body, row);
  if (row.status === 'resolved')
    throw new Problem(409, 'Keluhan yang terselesaikan menunggu penutupan atau tanggapan anggota.');
  if (!Object.hasOwn(divisionNames, body.division))
    throw new Problem(400, 'Pilih divisi penanggung jawab.');
  const assignee = await stmt(
    env,
    'SELECT user_id,display_name,role FROM staff_accounts WHERE user_id=?',
    String(body.assigneeId || ''),
  ).first();
  if (!assignee || !['admin', 'finance', 'manager', 'customer_relation'].includes(assignee.role))
    throw new Problem(400, 'Pilih PIC yang masih memiliki akses petugas.');
  if (assignee.role !== body.division)
    throw new Problem(400, 'PIC harus memiliki akses sesuai divisi penanggung jawab.');
  const dueAt = deadline(body.dueAt);
  const changed =
    row.assignee_id !== assignee.user_id || row.division !== body.division || row.due_at !== dueAt;
  const reason =
    row.assignee_id && changed
      ? shortText(body.reason, 1, 1000, 'Alasan perubahan')
      : String(body.reason || '').trim();
  if (reason.length > 1000) throw new Problem(400, 'Alasan perubahan maksimal 1000 karakter.');
  if (!changed) return detail(env, id, actor, context);
  const time = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(dueAt));
  const message = `PIC: ${assignee.display_name}. Divisi: ${divisionNames[body.division]}. Batas waktu: ${time} WITA.`;
  return mutate(
    env,
    row,
    actor,
    person,
    context,
    {
      assignee_id: assignee.user_id,
      assignee_name: assignee.display_name,
      division: body.division,
      due_at: dueAt,
    },
    [['assigned', message + (reason ? ' Alasan: ' + reason : '')]],
  );
}

export async function replyComplaint(env, actor, person, context, id, body) {
  const row = await record(env, id, actor, context);
  closed(row);
  version(body, row);
  const own = row.owner === actor;
  const asStaff = canWork(row, actor, context);
  if (!own && !asStaff)
    throw new Problem(403, 'Tetapkan PIC dan batas waktu sebelum memberi tanggapan.');
  const message = shortText(body.message, 1, 4000, 'Tanggapan');
  if (
    body.status !== undefined &&
    (!['in_progress', 'waiting_member'].includes(body.status) || !asStaff)
  )
    throw new Problem(400, 'Pilih status tanggapan yang sesuai.');
  const status =
    own && body.status === undefined && ['waiting_member', 'resolved'].includes(row.status)
      ? 'in_progress'
      : body.status || row.status;
  if (row.status === 'new' && status === 'waiting_member')
    throw new Problem(409, 'Mulai penanganan sebelum meminta tanggapan anggota.');
  const reopening = row.status === 'resolved' && status !== 'resolved';
  const events = [['reply', message]];
  if (status !== row.status) events.push(['status', 'Status: ' + statusNames[status] + '.']);
  return mutate(
    env,
    row,
    actor,
    person,
    context,
    {
      status,
      ...(reopening ? { resolution: null, resolved_at: null } : {}),
    },
    events,
  );
}

export async function changeComplaintStatus(env, actor, person, context, id, body) {
  const row = await record(env, id, actor, context);
  closed(row);
  version(body, row);
  const target = body.status;
  if (target === 'closed') {
    if (!canManage(context))
      throw new Problem(403, 'Keluhan hanya dapat ditutup oleh Admin atau Manajer.');
    if (row.status !== 'resolved' || !row.resolution)
      throw new Problem(409, 'Catat hasil penyelesaian sebelum menutup keluhan.');
    return mutate(env, row, actor, person, context, { status: target, closed_at: stamp() }, [
      ['status', 'Keluhan ditutup. Hasil penyelesaian: ' + row.resolution],
    ]);
  }
  if (!hasAssignment(row))
    throw new Problem(409, 'Tetapkan PIC dan batas waktu sebelum menindaklanjuti keluhan.');
  if (!canWork(row, actor, context))
    throw new Problem(403, 'Tindak lanjut hanya dapat dilakukan oleh PIC, Admin, atau Manajer.');
  if (target === 'resolved') {
    if (!['in_progress', 'waiting_member'].includes(row.status))
      throw new Problem(409, 'Mulai penanganan sebelum mencatat hasil penyelesaian.');
    const resolution = shortText(body.resolution, 10, 4000, 'Catatan hasil penyelesaian');
    return mutate(
      env,
      row,
      actor,
      person,
      context,
      { status: target, resolution, resolved_at: stamp() },
      [['status', 'Keluhan terselesaikan. Hasil penyelesaian: ' + resolution]],
    );
  }
  if (!['in_progress', 'waiting_member'].includes(target))
    throw new Problem(400, 'Pilih status keluhan yang valid.');
  if (!openStatuses.includes(row.status) || (row.status === 'new' && target !== 'in_progress'))
    throw new Problem(409, 'Perubahan status keluhan tidak sesuai tahap penanganan.');
  if (target === row.status) return detail(env, id, actor, context);
  return mutate(env, row, actor, person, context, { status: target }, [
    ['status', 'Status: ' + statusNames[target] + '.'],
  ]);
}
