import { Problem } from '../../membership.js';
import { json, readJson } from '../response.js';
import { detail, list } from '../../features/complaints/records.js';
import {
  assignComplaint,
  changeComplaintStatus,
  createComplaint,
  replyComplaint,
} from '../../features/complaints/service.js';

async function bodyOf(request) {
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Problem(400, 'Data keluhan tidak valid.');
  return body;
}

/** Cases always use the verified account. Member selectors never change their owner. */
export async function handleComplaintRoutes({
  pathname,
  request,
  env,
  signedIn,
  person,
  context,
  url,
  scopedPath,
}) {
  if (!pathname.startsWith('/api/workflow/complaints')) return null;
  if (scopedPath || request.headers.has('x-kspps-member') || url.searchParams.has('member'))
    throw new Problem(403, 'Keluhan hanya dapat dibuka dengan identitas akun yang masuk.');
  if (context.accountRole === 'avalist')
    throw new Problem(403, 'Avalist hanya dapat membuka portal dan riwayat miliknya.');
  if (pathname === '/api/workflow/complaints') {
    if (request.method === 'GET')
      return json(await list(env, signedIn, context, url.searchParams.get('view') === 'staff'));
    if (request.method === 'POST')
      return json(
        await createComplaint(env, signedIn, person, context, await bodyOf(request)),
        201,
      );
    throw new Problem(405, 'Metode tidak diizinkan.');
  }
  const match = pathname.match(
    /^\/api\/workflow\/complaints\/([0-9a-f-]{36})(?:\/(assign|reply|status))?$/i,
  );
  if (!match) throw new Problem(404, 'Layanan keluhan tidak ditemukan.');
  const [, id, action] = match;
  if (!action && request.method === 'GET') return json(await detail(env, id, signedIn, context));
  if (request.method !== 'POST' || !action) throw new Problem(405, 'Metode tidak diizinkan.');
  const handler = { assign: assignComplaint, reply: replyComplaint, status: changeComplaintStatus }[
    action
  ];
  return json(await handler(env, signedIn, person, context, id, await bodyOf(request)));
}
