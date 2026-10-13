/** Endpoint accounts; autentikasi umum dilakukan oleh router sebelum handler ini. */
import { json, readJson } from '../response.js';
import {
  accessState,
  activateManager,
  requestStaffAccess,
  accessDirectory,
  assignAccess,
} from '../../access.js';
import { changeStaffRole } from '../../finance.js';

export async function handleAccountRoutes({ pathname, request, env, signedIn, person }) {
  if (pathname === '/api/workflow/staff/access' && request.method === 'GET')
    return json(await accessState(env, signedIn, person));

  if (pathname === '/api/workflow/staff/activate' && request.method === 'POST')
    return json({ staff: await activateManager(env, signedIn, await readJson(request), person) });

  if (pathname === '/api/workflow/staff/access-request' && request.method === 'POST')
    return json({ request: await requestStaffAccess(env, signedIn, person) });

  if (pathname === '/api/workflow/staff/accounts' && request.method === 'GET')
    return json({ accounts: await accessDirectory(env, signedIn) });

  if (pathname === '/api/workflow/staff/accounts' && request.method === 'POST')
    return json(await assignAccess(env, signedIn, await readJson(request)));

  if (pathname === '/api/workflow/staff/role' && request.method === 'POST')
    return json({ staff: await changeStaffRole(env, signedIn, (await readJson(request)).role) });
  return null;
}
