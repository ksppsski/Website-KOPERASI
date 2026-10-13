/** Endpoint settlements; autentikasi umum dilakukan oleh router sebelum handler ini. */
import { json, readMultipart, readJson } from '../response.js';
import {
  withdrawalQueue,
  payWithdrawal,
  closeMembership,
  financingList,
  recordFinancing,
  settleFinancing,
} from '../../withdrawal.js';
import { requireStaffRole } from '../../finance.js';
import { MAX_PROOF, proofCheck } from '../validation.js';
import { Problem } from '../../membership.js';
import { maturityReport, returnQueue, completeReturn } from '../../maturity.js';

export async function handleSettlementRoutes({ pathname, request, env, signedIn, url }) {
  if (pathname === '/api/workflow/finance/withdrawals' && request.method === 'GET')
    return json(await withdrawalQueue(env, signedIn, 'finance'));

  if (pathname === '/api/workflow/manager/withdrawals' && request.method === 'GET')
    return json(await withdrawalQueue(env, signedIn, 'manager'));

  const withdrawalAction = pathname.match(
    /^\/api\/workflow\/(finance|manager)\/withdrawals\/([0-9a-f-]{36})\/(pay|close)$/i,
  );

  if (withdrawalAction && request.method === 'POST') {
    if (withdrawalAction[1] === 'finance' && withdrawalAction[3] === 'pay') {
      await requireStaffRole(env, signedIn, 'finance');
      const f = await readMultipart(request, MAX_PROOF + 128 * 1024);
      return json(
        await payWithdrawal(
          env,
          signedIn,
          withdrawalAction[2],
          f,
          await proofCheck(f.get('proof')),
        ),
      );
    }
    if (withdrawalAction[1] === 'manager' && withdrawalAction[3] === 'close')
      return json(
        await closeMembership(env, signedIn, withdrawalAction[2], await readJson(request)),
      );
    throw new Problem(404, 'Layanan tidak ditemukan.');
  }

  if (pathname === '/api/workflow/staff/financing' && request.method === 'GET')
    return json({ items: await financingList(env, signedIn, true) });

  if (pathname === '/api/workflow/staff/financing' && request.method === 'POST')
    return json(await recordFinancing(env, signedIn, await readJson(request)), 201);

  const settle = pathname.match(/^\/api\/workflow\/staff\/financing\/([0-9a-f-]{36})\/settle$/i);

  if (settle && request.method === 'POST')
    return json(await settleFinancing(env, signedIn, settle[1], await readJson(request)));

  if (pathname === '/api/workflow/maturity/report' && request.method === 'GET')
    return json(await maturityReport(env, signedIn, url.searchParams));

  if (pathname === '/api/workflow/finance/returns' && request.method === 'GET')
    return json(await returnQueue(env, signedIn));

  const returnMatch = pathname.match(
    /^\/api\/workflow\/finance\/returns\/([0-9a-f-]{36})\/complete$/i,
  );

  if (returnMatch && request.method === 'POST') {
    await requireStaffRole(env, signedIn, 'finance');
    const form = await readMultipart(request, MAX_PROOF + 128 * 1024);
    return json(
      await completeReturn(
        env,
        signedIn,
        returnMatch[1],
        form,
        await proofCheck(form.get('proof')),
      ),
    );
  }
  return null;
}
