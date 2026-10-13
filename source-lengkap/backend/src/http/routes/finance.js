/** Endpoint finance; autentikasi umum dilakukan oleh router sebelum handler ini. */
import { json, readJson } from '../response.js';
import { allReconciliations, allStaffTasks, startStaffTask } from '../../staff-queue.js';
import { requireStaffRole, reconcile } from '../../finance.js';
import { Problem, stmt } from '../../membership.js';

export async function handleFinanceRoutes({ pathname, request, env, signedIn }) {
  if (pathname === '/api/workflow/finance/reconciliations' && request.method === 'GET')
    return json({ items: await allReconciliations(env, signedIn) });

  if (pathname === '/api/workflow/finance/reconcile' && request.method === 'POST') {
    await requireStaffRole(env, signedIn, 'finance');
    const body = await readJson(request);
    if (!['registration', 'capital', 'savings'].includes(body.kind))
      throw new Problem(400, 'Jenis setoran tidak valid.');
    const table = body.kind === 'registration' ? 'member_profiles' : 'workflow_requests';
    const source = await stmt(
      env,
      `SELECT owner FROM ${table} WHERE id=?`,
      String(body.id || ''),
    ).first();
    if (!source) throw new Problem(404, 'Setoran tidak ditemukan.');
    return json({ reconciliation: await reconcile(env, source.owner, body) });
  }

  if (pathname === '/api/workflow/staff/tasks' && request.method === 'GET')
    return json({ tasks: await allStaffTasks(env, signedIn) });

  if (pathname === '/api/workflow/staff/activity/start' && request.method === 'POST')
    return json(await startStaffTask(env, signedIn, await readJson(request)));
  return null;
}
