import { stmt, Problem } from './membership.js';
import {
  requireOperationalStaff,
  requireStaffRole,
  accessDirectory,
  cooperativeOwner,
} from './access.js';
import { bootstrapActivity, activityState, startTask } from './activity.js';
import { reconciliationQueue, syncDuePayoutTasks } from './finance.js';

export function scopedUrls(value, profileId) {
  if (Array.isArray(value)) return value.map((v) => scopedUrls(v, profileId));
  if (value && typeof value === 'object')
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scopedUrls(v, profileId)]));
  if (
    typeof value === 'string' &&
    value.startsWith('/api/workflow/') &&
    !value.includes('/member/') &&
    !value.includes('/reports/')
  )
    return value.replace('/api/workflow/', `/api/workflow/member/${profileId}/`);
  return value;
}
export async function allReconciliations(env, actor) {
  await requireStaffRole(env, actor, 'finance');
  const profiles = (
    await stmt(env, 'SELECT id,owner FROM member_profiles ORDER BY created_at').all()
  ).results;
  const items = [];
  for (const p of profiles)
    for (const r of await reconciliationQueue(env, p.owner))
      items.push(scopedUrls({ ...r, memberProfileId: p.id }, p.id));
  const { tasks } = await activityState(env, null),
    arrivals = new Map();
  for (const t of tasks) if (t.stage === 'reconciliation') arrivals.set(t.targetId, t.receivedAt);
  for (const item of items) item.receivedAt = arrivals.get(item.id) || item.createdAt;
  return items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || a.id.localeCompare(b.id));
}
export async function allStaffTasks(env, actor) {
  const { role } = await requireOperationalStaff(env, actor);
  if (!['admin', 'finance', 'manager'].includes(role))
    throw new Problem(403, 'Antrean ini khusus petugas.');
  const profiles = (await stmt(env, 'SELECT owner FROM member_profiles').all()).results;
  for (const p of profiles) await bootstrapActivity(env, p.owner);
  await syncDuePayoutTasks(env, await cooperativeOwner(env, actor), true);
  const { tasks } = await activityState(env, null);
  const items = tasks
    .filter((t) => t.role === role)
    .map((t) => ({
      id: t.id,
      targetId: t.targetId,
      stage: t.stage,
      label: t.label,
      role: t.role,
      memberName: t.memberName,
      receivedAt: t.receivedAt,
      status: t.status,
      started: !!t.startedAt,
      completed: !!t.completedAt,
      closed: !!t.closedAt,
    }));
  if (role === 'manager')
    for (const r of await accessDirectory(env, actor))
      if (r.status === 'pending')
        items.push({
          id: 'access:' + r.code,
          targetId: r.code,
          stage: 'staff-access',
          label: 'Persetujuan akses petugas',
          role,
          memberName: r.name,
          receivedAt: r.requestedAt,
          status: 'queued',
          started: false,
          completed: false,
          closed: false,
        });
  return items;
}
export async function startStaffTask(env, actor, body) {
  await requireOperationalStaff(env, actor);
  const event = await stmt(
    env,
    "SELECT a.owner FROM staff_activity a,json_each(a.payload) j WHERE json_extract(j.value,'$.task.id')=? LIMIT 1",
    String(body.taskId || ''),
  ).first();
  if (!event) throw new Problem(404, 'Tugas tidak ditemukan.');
  return startTask(env, event.owner, body);
}
