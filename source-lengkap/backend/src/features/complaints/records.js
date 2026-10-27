import { Problem, stmt } from '../../membership.js';
import {
  complaintStatusLabels,
  complaintDivisionLabels,
} from '../../../../shared/lib/complaints.js';

export const openStatuses = ['new', 'in_progress', 'waiting_member'];
export const statusNames = complaintStatusLabels;
export const divisionNames = complaintDivisionLabels;
export const canManage = (context) => ['admin', 'manager'].includes(context.accountRole);
export const hasAssignment = (row) => !!(row.assignee_id && row.division && row.due_at);
export const canWork = (row, id, context) =>
  hasAssignment(row) &&
  (canManage(context) || (row.assignee_id === id && context.accountRole === row.division));

export function complaintDTO(row) {
  return {
    id: row.id,
    number: row.number,
    subject: row.subject,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    division: row.division,
    assignee: row.assignee_id ? { id: row.assignee_id, name: row.assignee_name } : null,
    dueAt: row.due_at,
    resolution: row.resolution,
    resolvedAt: row.resolved_at,
    closedAt: row.closed_at,
    version: row.version,
    memberName: row.member_name,
    memberNumber: row.member_number,
    overdue:
      openStatuses.includes(row.status) && !!row.due_at && Date.parse(row.due_at) < Date.now(),
  };
}

export async function record(env, id, actor, context) {
  const row = await stmt(env, 'SELECT * FROM complaints WHERE id=?', id).first();
  const visible =
    row &&
    ((context.accountRole !== 'customer_relation' && row.owner === actor) ||
      canManage(context) ||
      (['finance', 'customer_relation'].includes(context.accountRole) &&
        row.assignee_id === actor));
  if (!visible) throw new Problem(404, 'Keluhan tidak ditemukan.');
  return row;
}

export async function detail(env, id, actor, context) {
  const row = await record(env, id, actor, context);
  const events = (
    await stmt(
      env,
      'SELECT id,kind,message,actor_name,actor_role,created_at FROM complaint_events WHERE complaint_id=? ORDER BY sequence',
      id,
    ).all()
  ).results.map((event) => ({
    id: event.id,
    kind: event.kind,
    message: event.message,
    actorName: event.actor_name,
    actorRole: event.actor_role,
    createdAt: event.created_at,
  }));
  return {
    item: complaintDTO(row),
    events,
    canManage: canManage(context) && row.status !== 'closed',
    canReply: row.status !== 'closed' && (row.owner === actor || canWork(row, actor, context)),
    canReplyAsStaff: row.status !== 'closed' && canWork(row, actor, context),
    canResolve:
      ['in_progress', 'waiting_member'].includes(row.status) && canWork(row, actor, context),
    canClose: row.status === 'resolved' && !!row.resolution && canManage(context),
  };
}

export async function list(env, actor, context, staffView) {
  if (
    staffView &&
    !['admin', 'manager', 'finance', 'customer_relation'].includes(context.accountRole)
  )
    throw new Problem(403, 'Daftar keluhan hanya dapat dibuka oleh petugas pengelola.');
  const condition =
    context.accountRole === 'customer_relation'
      ? 'WHERE assignee_id=?'
      : !staffView
        ? 'WHERE owner=?'
        : canManage(context)
          ? ''
          : 'WHERE assignee_id=?';
  const rows = (
    await stmt(
      env,
      `SELECT * FROM complaints ${condition} ORDER BY created_at DESC,number DESC`,
      ...(condition ? [actor] : []),
    ).all()
  ).results;
  const assignees =
    staffView && canManage(context)
      ? (
          await stmt(
            env,
            `SELECT user_id,display_name,role FROM staff_accounts
              WHERE role IN ('admin','finance','manager','customer_relation') ORDER BY display_name,user_id`,
          ).all()
        ).results.map((row) => ({ id: row.user_id, name: row.display_name, role: row.role }))
      : [];
  return { items: rows.map(complaintDTO), assignees, canManage: staffView && canManage(context) };
}
