/** Endpoint avalist; autentikasi umum dilakukan oleh router sebelum handler ini. */
import { json, readJson, readMultipart } from '../response.js';
import {
  avalistView,
  savePerson,
  changeAssignment,
  proposeAssignment,
  preparePayment,
  createAdjustment,
  rejectProposal,
  paymentProof,
  refreshAdjustment,
  payAvalist,
} from '../../avalist.js';
import { makassarToday, requireStaffRole } from '../../finance.js';
import { MAX_PROOF, proofCheck } from '../validation.js';

export async function handleAvalistRoutes({ pathname, request, env, signedIn, url, context }) {
  if (pathname === '/api/workflow/avalist' && request.method === 'GET')
    return json(
      await avalistView(
        env,
        signedIn,
        url.searchParams.get('date') || makassarToday(),
        url.searchParams.get('view') === 'personal' || context.accountRole === 'avalist',
      ),
    );

  const avalistActions = {
    people: savePerson,
    assignments: changeAssignment,
    proposals: proposeAssignment,
    prepare: preparePayment,
    adjustments: createAdjustment,
  };

  const avAction = pathname.match(
    /^\/api\/workflow\/avalist\/(people|assignments|proposals|prepare|adjustments)$/,
  );

  if (avAction && request.method === 'POST')
    return json(await avalistActions[avAction[1]](env, signedIn, await readJson(request)));

  const avProposal = pathname.match(
    /^\/api\/workflow\/avalist\/proposals\/([0-9a-f-]{36})\/(approve|reject)$/i,
  );

  if (avProposal && request.method === 'POST')
    return json(
      avProposal[2] === 'approve'
        ? await changeAssignment(env, signedIn, await readJson(request), avProposal[1])
        : await rejectProposal(env, signedIn, avProposal[1], await readJson(request)),
    );

  const avPayment = pathname.match(
    /^\/api\/workflow\/avalist\/payments\/([0-9a-f-]{36})\/(pay|proof|review)$/i,
  );

  if (avPayment && request.method === 'GET' && avPayment[2] === 'proof')
    return paymentProof(env, signedIn, avPayment[1]);

  if (avPayment && request.method === 'POST' && avPayment[2] === 'review')
    return json(await refreshAdjustment(env, signedIn, avPayment[1]));

  if (avPayment && request.method === 'POST' && avPayment[2] === 'pay') {
    await requireStaffRole(env, signedIn, 'finance');
    const f = await readMultipart(request, MAX_PROOF + 128 * 1024);
    return json(
      await payAvalist(
        env,
        signedIn,
        avPayment[1],
        Object.fromEntries(f),
        await proofCheck(f.get('proof')),
      ),
    );
  }
  return null;
}
