import { handleAccountRoutes } from './routes/accounts.js';
import { handleAvalistRoutes } from './routes/avalist.js';
import { handleReportRoutes } from './routes/reports.js';
import { handleSettlementRoutes } from './routes/settlements.js';
import { handleFinanceRoutes } from './routes/finance.js';
/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { Problem, getProfile as rawProfile, profileDTO, stmt } from '../membership.js';
import { resetPreviousDemo } from '../reset-demo.js';
import { json, readJson } from './response.js';
import {
  financingList,
  membershipOwner,
  requireMembershipOpen,
  restartMembership,
  withdrawalEligibility,
} from '../withdrawal.js';
import { cooperativeOwner, identity, requireStaff, selectedOwner } from '../access.js';
import { claimAvalistEmail } from '../avalist-email.js';
import { changeStaffRole, payouts, staffContext } from '../finance.js';

import { decideMaturity } from '../maturity.js';

import {
  dto,
  enrichRow,
  getProfile,
  getRecord,
  staffPayload,
} from '../features/workflow/records.js';
import {
  fileResponse,
  generateContract,
  serveFile,
  uploadSigned,
} from '../features/contracts/service.js';
import { bootstrapActivity, finishPayoutTask } from '../activity.js';
import { managerActivity } from '../manager.js';
import { createOffer, offers } from '../offers.js';
import { membershipLetterResponse } from '../membership-letter.js';
import { completeKtp, reviewProfile, saveProfile } from '../features/registration/service.js';
import { createSavings } from '../features/savings/service.js';
import { requireActiveSavings } from '../savings.js';
import { createCapital } from '../features/capital/service.js';
import {
  createWithdrawal,
  reviewRequest,
  reviseRequest,
  updateStatus,
} from '../features/workflow/requests.js';

export async function appFetch(request, env) {
  if (!env.DB || !env.BUCKET)
    throw new Problem(503, 'Penyimpanan pengajuan belum tersedia. Coba lagi sebentar.');
  await resetPreviousDemo(env);
  const url = new URL(request.url),
    scopedPath = url.pathname.match(/^\/api\/workflow\/member\/([a-z0-9-]+)\/(.+)$/i),
    pathname = scopedPath ? '/api/workflow/' + scopedPath[2] : url.pathname;
  if (!pathname.startsWith('/api/workflow')) {
    if (!['GET', 'HEAD'].includes(request.method))
      return new Response('Method not allowed', { status: 405 });
    const asset = (typeof STATIC_ASSETS === 'undefined' ? {} : STATIC_ASSETS)[
      pathname === '/' ? '/index.html' : pathname
    ];
    if (!asset) return new Response('Halaman tidak ditemukan', { status: 404 });
    const body = Uint8Array.from(atob(asset.body), (c) => c.charCodeAt(0));
    return new Response(request.method === 'HEAD' ? null : body, {
      headers: {
        'Content-Type': asset.type,
        'Cache-Control': ['/petugas.html', '/avalist.html'].includes(pathname)
          ? 'private, no-store'
          : 'no-cache',
        'X-Content-Type-Options': 'nosniff',
        ...(['/petugas.html', '/avalist.html'].includes(pathname)
          ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer' }
          : {}),
      },
    });
  }
  const signedIn = request.headers.get('oai-authenticated-user-id');
  let owner = signedIn;
  if (!owner)
    return json(
      {
        error: 'Masuk dengan ChatGPT untuk menyimpan dan mencoba alur pengajuan demo.',
        signInRequired: true,
      },
      401,
    );
  if (!env.DB || !env.BUCKET)
    throw new Problem(503, 'Penyimpanan pengajuan belum tersedia. Coba lagi sebentar.');
  if (request.method !== 'GET' && request.headers.get('origin') !== url.origin)
    throw new Problem(403, 'Permintaan harus berasal dari website KSPPS.');
  env = { ...env, ACTOR_ID: signedIn };
  const ownMembership = await membershipOwner(env, signedIn);
  const person = identity(request);
  await claimAvalistEmail(env, signedIn, person);
  const context = await staffContext(env, signedIn);
  env.ACTOR_ROLE = context.accountRole;
  env.ACTOR_NAME = person.name;
  if (pathname === '/api/workflow/avalist/access' && request.method === 'GET')
    return json({ identity: person, allowed: context.allowedRoles.includes('avalist') });
  const accountsResponse = await handleAccountRoutes({ pathname, request, env, signedIn, person });
  if (accountsResponse) return accountsResponse;
  const avalistResponse = await handleAvalistRoutes({
    pathname,
    request,
    env,
    signedIn,
    url,
    context,
  });
  if (avalistResponse) return avalistResponse;
  if (
    context.accountRole === 'avalist' &&
    !(
      pathname === '/api/workflow' &&
      request.method === 'GET' &&
      request.headers.get('x-kspps-portal') === 'staff'
    )
  )
    throw new Problem(403, 'Avalist hanya dapat membuka portal dan riwayat miliknya.');
  const reportsResponse = await handleReportRoutes({
    pathname,
    request,
    env,
    ownMembership,
    signedIn,
    url,
  });
  if (reportsResponse) return reportsResponse;
  const staffView = request.headers.get('x-kspps-portal') === 'staff';
  if (staffView) await requireStaff(env, signedIn);

  const settlementsResponse = await handleSettlementRoutes({
    pathname,
    request,
    env,
    signedIn,
    url,
  });
  if (settlementsResponse) return settlementsResponse;
  const financeResponse = await handleFinanceRoutes({ pathname, request, env, signedIn });
  if (financeResponse) return financeResponse;
  if (pathname === '/api/workflow' && request.method === 'GET' && staffView)
    return json(await staffPayload(env, signedIn, context));
  const selected = await selectedOwner(request, env, signedIn);
  owner =
    scopedPath || request.headers.has('x-kspps-member') || url.searchParams.has('member')
      ? selected
      : ownMembership;
  const own = owner === ownMembership;
  if (pathname === '/api/workflow/profile/restart' && request.method === 'POST') {
    if (!own || staffView || scopedPath || request.headers.has('x-kspps-member'))
      throw new Problem(403, 'Pendaftaran ulang hanya dapat dilakukan oleh pemilik akun.');
    return json(await restartMembership(env, signedIn, await readJson(request)));
  }
  if (pathname === '/api/workflow/withdrawal/eligibility' && request.method === 'GET')
    return json(await withdrawalEligibility(env, owner));
  if (own && !staffView && !scopedPath && !request.headers.has('x-kspps-member')) {
    const member = await rawProfile(env, owner);
    if (
      member?.status === 'closed' &&
      pathname !== '/api/workflow' &&
      !pathname.startsWith('/api/workflow/staff/')
    )
      throw new Problem(
        403,
        'Keanggotaan sudah ditutup. Nomor anggota lama tidak dapat digunakan; lakukan pendaftaran ulang.',
      );
    if (
      request.method === 'POST' &&
      (/\/(capital|savings|financing|eligibility)$/.test(pathname) ||
        pathname.endsWith('/maturity'))
    )
      await requireMembershipOpen(env, owner);
  }
  if (pathname === '/api/workflow/financing' && request.method === 'GET')
    return json({ items: await financingList(env, owner) });
  const withdrawalProof = pathname.match(/^\/api\/workflow\/withdrawals\/([0-9a-f-]{36})\/proof$/i);
  if (withdrawalProof && request.method === 'GET') {
    const s = await stmt(
      env,
      'SELECT * FROM withdrawal_settlements WHERE request_id=? AND owner=?',
      withdrawalProof[1],
      owner,
    ).first();
    if (!s?.proof_key) throw new Problem(404, 'Bukti pengembalian belum tersedia.');
    return serveFile(
      env,
      s.proof_key,
      s.proof_type,
      s.proof_name,
      url.searchParams.has('download'),
    );
  }

  if (
    !own &&
    context.accountRole === 'finance' &&
    /\/(ktp|signature|contract|signed|letter)$/.test(pathname)
  )
    throw new Problem(403, 'Dokumen identitas dan akad diperiksa melalui portal Admin.');
  await bootstrapActivity(env, owner);
  if (pathname === '/api/workflow/staff/activity' && request.method === 'GET')
    return json(await managerActivity(env, owner, url.searchParams));
  if (pathname === '/api/workflow/offers' && request.method === 'GET')
    return json({
      offers: await offers(env, await cooperativeOwner(env, signedIn), {
        audience: staffView && context.role === 'manager' ? 'staff' : 'member',
      }),
    });
  if (pathname === '/api/workflow/offers' && request.method === 'POST')
    return json(
      {
        offer: await createOffer(
          env,
          await cooperativeOwner(env, signedIn),
          await readJson(request),
        ),
      },
      201,
    );

  if (pathname === '/api/workflow' && request.method === 'GET') {
    if (!own && context.accountRole === 'finance')
      return json({
        profile: null,
        items: [],
        offers: [],
        staff: context,
        profiles: [],
        members: [],
      });
    const profile = await getProfile(env, owner),
      rows = (
        await stmt(
          env,
          'SELECT * FROM workflow_requests WHERE owner=? ORDER BY created_at DESC',
          owner,
        ).all()
      ).results;
    const items = [];
    for (const row of rows) items.push(dto(await enrichRow(env, row, profile)));
    return json({
      withdrawal: await withdrawalEligibility(env, owner),
      financing: await financingList(env, owner),
      offers:
        profile?.status === 'closed'
          ? []
          : await offers(env, await cooperativeOwner(env, signedIn), { audience: 'member' }),
      items,
      profile: profileDTO(profile),
      staff: context,
      profiles: [],
      members: [],
      demo: true,
    });
  }
  if (pathname === '/api/workflow/staff/role' && request.method === 'POST') {
    const body = await readJson(request);
    return json({ staff: await changeStaffRole(env, owner, body.role) });
  }

  if (pathname === '/api/workflow/finance/payouts' && request.method === 'GET')
    return json(await payouts(env, owner, url.searchParams.get('date')));
  if (pathname === '/api/workflow/finance/payouts/complete' && request.method === 'POST') {
    const body = await readJson(request),
      schedule = await payouts(env, owner, body.date);
    if (schedule.missingAccountCount)
      throw new Problem(409, 'Lengkapi rekening anggota sebelum menyelesaikan persiapan.');
    return json({
      task: await finishPayoutTask(env, await cooperativeOwner(env, owner), schedule.task, body),
    });
  }
  if (pathname === '/api/workflow/profile/letter' && request.method === 'GET')
    return membershipLetterResponse(
      env,
      await getProfile(env, owner),
      url.searchParams.has('download'),
    );
  const maturityMatch = pathname.match(/^\/api\/workflow\/([0-9a-f-]{36})\/maturity$/i);
  if (maturityMatch && request.method === 'POST') {
    if (!own) throw new Problem(403, 'Pilihan hanya dapat dikonfirmasi oleh anggota pemilik akad.');
    return json(await decideMaturity(env, owner, maturityMatch[1], await readJson(request)));
  }
  const proofReturn = pathname.match(/^\/api\/workflow\/returns\/([0-9a-f-]{36})\/proof$/i);
  if (proofReturn && request.method === 'GET') {
    const payment = await stmt(
      env,
      'SELECT * FROM capital_returns WHERE request_id=? AND owner=?',
      proofReturn[1],
      owner,
    ).first();
    if (!payment?.proof_key) throw new Problem(404, 'Bukti pengembalian tidak ditemukan.');
    return serveFile(
      env,
      payment.proof_key,
      payment.proof_type,
      payment.proof_name,
      url.searchParams.has('download'),
    );
  }
  if (pathname === '/api/workflow/profile' && request.method === 'POST')
    return saveProfile(request, env, owner);
  if (pathname === '/api/workflow/profile/ktp' && request.method === 'POST')
    return completeKtp(request, env, owner);
  if (pathname === '/api/workflow/profile/ktp' && request.method === 'GET') {
    const p = await getProfile(env, owner);
    if (!p?.ktp_key) throw new Problem(404, 'Foto KTP belum tersedia.');
    return serveFile(
      env,
      p.ktp_key,
      p.ktp_type,
      p.ktp_name || 'foto-ktp',
      url.searchParams.has('download'),
    );
  }
  if (pathname === '/api/workflow/profile/review' && request.method === 'POST')
    return reviewProfile(request, env, owner);
  if (
    ['/api/workflow/profile/signature', '/api/workflow/profile/proof'].includes(pathname) &&
    request.method === 'GET'
  ) {
    const p = await getProfile(env, owner);
    if (!p) throw new Problem(404, 'Pendaftaran belum tersedia.');
    const sig = pathname.endsWith('/signature');
    return serveFile(
      env,
      sig ? p.signature_key : p.proof_key,
      sig ? 'image/png' : p.proof_type,
      sig ? 'tanda-tangan.png' : p.proof_name,
      url.searchParams.has('download'),
    );
  }
  if (pathname === '/api/workflow/savings' && request.method === 'POST')
    return createSavings(request, env, owner);
  if (pathname === '/api/workflow/eligibility' && request.method === 'GET') {
    await requireMembershipOpen(env, owner);
    return json({ savings: await requireActiveSavings(env, owner, await getProfile(env, owner)) });
  }
  if (pathname === '/api/workflow/capital' && request.method === 'POST')
    return createCapital(request, env, owner);
  if (pathname === '/api/workflow/withdrawal' && request.method === 'POST')
    return createWithdrawal(request, env, owner);
  const match = pathname.match(
    /^\/api\/workflow\/([0-9a-f-]{36})\/(proof|contract|signed|signature|review|generate|revise|cancel|upload-signed)$/i,
  );
  if (!match) throw new Problem(404, 'Layanan tidak ditemukan.');
  const row = await getRecord(env, owner, match[1]);
  if (!row) throw new Problem(404, 'Pengajuan tidak ditemukan.');
  const action = match[2];
  if (request.method === 'GET' && ['proof', 'contract', 'signed', 'signature'].includes(action))
    return fileResponse(env, row, action, url.searchParams.has('download'));
  if (request.method !== 'POST') throw new Problem(405, 'Metode tidak diizinkan.');
  if (action === 'review') return reviewRequest(request, env, owner, row);
  if (action === 'generate') return generateContract(request, env, owner, row);
  if (action === 'upload-signed') return uploadSigned(request, env, owner, row);
  if (action === 'revise') {
    if (row.kind !== 'withdrawal') await requireMembershipOpen(env, owner);
    return reviseRequest(request, env, owner, row);
  }
  if (action === 'cancel') {
    if (row.kind !== 'withdrawal' || !['pending', 'correction'].includes(row.status))
      throw new Problem(
        409,
        'Permohonan yang sedang ditinjau atau selesai tidak dapat dibatalkan.',
      );
    return updateStatus(env, owner, row, 'cancelled', row.note);
  }
  throw new Problem(404, 'Layanan tidak ditemukan.');
}
