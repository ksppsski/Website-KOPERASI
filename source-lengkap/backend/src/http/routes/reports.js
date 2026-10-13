/** Endpoint reports; autentikasi umum dilakukan oleh router sebelum handler ini. */
import { json } from '../response.js';
import { reportList, uploadReport, reportFile } from '../../reports.js';

export async function handleReportRoutes({ pathname, request, env, ownMembership, signedIn, url }) {
  if (pathname === '/api/workflow/reports' && request.method === 'GET')
    return json({ reports: await reportList(env, ownMembership) });

  if (pathname === '/api/workflow/reports' && request.method === 'POST')
    return json({ report: await uploadReport(request, env, signedIn) }, 201);

  const reportMatch = pathname.match(/^\/api\/workflow\/reports\/([0-9a-f-]{36})\/file$/i);

  if (reportMatch && request.method === 'GET')
    return reportFile(env, ownMembership, reportMatch[1], url.searchParams.has('download'));
  return null;
}
