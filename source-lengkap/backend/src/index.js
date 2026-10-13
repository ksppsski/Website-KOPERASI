import { claimAvalistEmail } from './avalist-email.js';
import {
  avalistView,
  savePerson,
  changeAssignment,
  proposeAssignment,
  rejectProposal,
  preparePayment,
  createAdjustment,
  refreshAdjustment,
  payAvalist,
  paymentProof,
} from './avalist.js';
import {
  membershipOwner,
  restartMembership,
  withdrawalEligibility,
  requireNoContracts,
  requireMembershipOpen,
  withdrawalLabels,
  settlementDTO,
  approveWithdrawal,
  withdrawalQueue,
  payWithdrawal,
  closeMembership,
  financingList,
  recordFinancing,
  settleFinancing,
} from './withdrawal.js';
import { membershipLetter, letterDTO, membershipLetterResponse } from './membership-letter.js';
import { contractDocumentName, safeFilename, disposition } from './document-names.js';
import {
  maturityView,
  decideMaturity,
  renewalDates,
  returnQueue,
  completeReturn,
  maturityReport,
} from './maturity.js';
import { allReconciliations, allStaffTasks, startStaffTask, scopedUrls } from './staff-queue.js';
import {
  actorId,
  identity,
  accessState,
  activateManager,
  requestStaffAccess,
  accessDirectory,
  assignAccess,
  memberDirectory,
  selectedOwner,
  requireStaff,
  cooperativeOwner,
} from './access.js';
import { reportList, uploadReport, reportFile } from './reports.js';
import { offers, createOffer, reservedSql } from './offers.js';
import { managerActivity } from './manager.js';
import { savingsState, requireActiveSavings } from './savings.js';
import { PDFDocument } from 'pdf-lib';
import { ktpCheck, MAX_KTP } from './identity-photo.js';
import {
  trackedRun,
  submission,
  receive,
  finish,
  closeTasks,
  bootstrapActivity,
  activityState,
  startTask,
  summarize,
  finishPayoutTask,
} from './activity.js';
import { agreementRules } from './contract-rules.js';
import { resetPreviousDemo } from './reset-demo.js';
import { buildContractPdf, TEMPLATE_VERSION } from './contract-pdf.js';
import {
  Problem,
  stmt,
  getProfile as rawProfile,
  profileDTO,
  snapshot,
  hash,
  signatureCheck,
  validateProfile,
} from './membership.js';
import {
  staffContext,
  makassarToday,
  changeStaffRole,
  requireStaffRole,
  reconciliationFor,
  reconciliationDTO,
  renewalFunding,
  requireReconciled,
  reconciliationQueue,
  reconcile,
  payouts,
  syncDuePayoutTasks,
  savingsTotal,
} from './finance.js';
async function getProfile(env, owner) {
  const p = await rawProfile(env, owner);
  if (p) {
    p.finance = await reconciliationFor(
      env,
      owner,
      'registration',
      p.id,
      p.proof_key,
      savingsTotal(JSON.parse(p.data)),
    );
    p.savings = await savingsState(env, owner, p);
    p.letter = letterDTO(await membershipLetter(env, p));
  }
  return p;
}
/* Members own their submissions. Assigned staff roles authorize cooperative-wide
   queues and explicit per-member review/file access. */
const MAX_PROOF = 10 * 1024 * 1024;
const STATUS = {
  pending: 'Menunggu pemeriksaan',
  reviewing: 'Dalam pemeriksaan',
  correction: 'Perlu perbaikan',
  ready: 'Siap dibuat',
  generating: 'Sedang dibuat',
  generated: 'Menunggu tanda tangan koperasi',
  signed: 'Akad lengkap',
  approved: 'Disetujui untuk penyelesaian',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
const now = () => new Date().toISOString();
async function enrichRow(env, row, profile) {
  if (row.kind === 'withdrawal') row.settlement = await settlementDTO(env, row.id);
  row.member_number = profile?.member_number;
  row.member_profile_id = profile?.id;
  if (['capital', 'savings'].includes(row.kind))
    row.finance = row.renewal_of
      ? await renewalFunding(env, row.owner, row)
      : await reconciliationFor(env, row.owner, row.kind, row.id, row.proof_key, row.amount);
  const decision = row.contract_data
    ? await stmt(env, 'SELECT * FROM maturity_decisions WHERE request_id=?', row.id).first()
    : null;
  row.maturity = maturityView(row, decision);
  if (decision?.choice === 'return') {
    const payment = await stmt(
      env,
      'SELECT paid_at FROM capital_returns WHERE request_id=?',
      row.id,
    ).first();
    row.maturity.returnPaidAt = payment?.paid_at || null;
  }
  return row;
}
const getRecord = async (env, owner, id) => {
  const row = await stmt(
    env,
    'SELECT * FROM workflow_requests WHERE id = ? AND owner = ?',
    id,
    owner,
  ).first();
  return row ? enrichRow(env, row, await getProfile(env, owner)) : null;
};
function dto(row) {
  const m = row.member_snapshot ? JSON.parse(row.member_snapshot) : null;
  return {
    offerId: row.offer_id || null,
    offerTitle: row.offer_title || null,
    projectCode: row.project_code || null,
    finance: row.finance || null,
    id: row.id,
    kind: row.kind,
    memberName: row.member_name,
    memberId: row.member_number || m?.memberNumber || '—',
    memberProfileId: row.member_profile_id || m?.id || null,
    member: m?.data || null,
    signatureAvailable: !!m?.signatureKey,
    settlement: row.settlement || null,
    amount: row.amount,
    proofName: row.proof_name,
    proofType: row.proof_type,
    proofSize: row.proof_size,
    reason: row.reason,
    status: row.status,
    statusLabel:
      row.kind === 'withdrawal'
        ? withdrawalLabels[row.status]
        : row.maturity?.ended
          ? 'Selesai'
          : row.kind === 'savings' && row.finance?.status === 'approved'
            ? 'Setoran terverifikasi'
            : row.finance?.status === 'correction'
              ? 'Perlu perbaikan'
              : row.status === 'generated' && !row.contract_data
                ? 'Dokumen contoh lama'
                : STATUS[row.status],
    note: row.note,
    contractNumber: row.contract_number,
    contractData: row.contract_data ? JSON.parse(row.contract_data) : null,
    documentName: row.contract_number ? contractDocumentName(row) : null,
    documentFilename: row.contract_number ? safeFilename(contractDocumentName(row)) + '.pdf' : null,
    renewalOf: row.renewal_of || null,
    renewalEffectiveDate: row.renewal_effective_date || null,
    maturity: row.maturity || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    generatedAt: row.generated_at,
    signedAt: row.signed_at,
    signedName: row.signed_name,
    proofUrl: row.proof_key ? '/api/workflow/' + row.id + '/proof' : null,
    contractUrl: row.contract_key ? '/api/workflow/' + row.id + '/contract' : null,
    signedUrl: row.signed_key ? '/api/workflow/' + row.id + '/signed' : null,
    signatureUrl: m?.signatureKey ? '/api/workflow/' + row.id + '/signature' : null,
  };
}
async function staffPayload(env, actor, context) {
  const profiles = (
    await stmt(env, 'SELECT owner FROM member_profiles ORDER BY created_at DESC').all()
  ).results;
  if (['finance', 'avalist'].includes(context.role))
    return {
      items: [],
      profiles: [],
      profile: null,
      offers: [],
      staff: context,
      members: [],
      demo: true,
    };
  const out = [],
    items = [];
  for (const ref of profiles) {
    const p = await getProfile(env, ref.owner);
    out.push(scopedUrls(profileDTO(p), p.id));
    const rows = (
      await stmt(
        env,
        'SELECT * FROM workflow_requests WHERE owner=? ORDER BY created_at DESC',
        ref.owner,
      ).all()
    ).results;
    for (const row of rows) items.push(scopedUrls(dto(await enrichRow(env, row, p)), p.id));
  }
  const { tasks } = await activityState(env, null),
    arrivals = new Map();
  for (const t of tasks)
    if (t.role === 'admin' && !t.completedAt && !t.closedAt) arrivals.set(t.targetId, t.receivedAt);
  for (const p of out) p.receivedAt = arrivals.get(p.id) || p.createdAt;
  for (const item of items)
    item.receivedAt =
      arrivals.get(item.id) ||
      (item.status === 'generated' ? item.generatedAt : null) ||
      item.createdAt;
  items.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt) || a.id.localeCompare(b.id));
  return {
    items,
    profiles: out,
    profile: null,
    offers: await offers(env, await cooperativeOwner(env, actor)),
    staff: context,
    members: [],
    demo: true,
  };
}
function shortText(value, min, max, label) {
  const text = String(value || '').trim();
  if (text.length < min || text.length > max)
    throw new Problem(400, label + ' harus berisi ' + min + '–' + max + ' karakter.');
  return text;
}
function requestId(value) {
  const id = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    throw new Problem(400, 'Nomor pengajuan tidak valid. Muat ulang formulir.');
  return id;
}
async function limitedBody(request, limit) {
  if (Number(request.headers.get('content-length') || 0) > limit)
    throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) {
      await reader.cancel();
      throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}
async function readJson(request) {
  try {
    return JSON.parse(new TextDecoder().decode(await limitedBody(request, 16384)));
  } catch (error) {
    if (error instanceof Problem) throw error;
    throw new Problem(400, 'Data pengajuan tidak valid.');
  }
}
async function proofCheck(file) {
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size)
    throw new Problem(400, 'Lampirkan bukti transfer yang dapat dibaca.');
  if (file.size > MAX_PROOF) throw new Problem(413, 'Ukuran berkas maksimal 10 MB.');
  const extension = String(file.name || '')
    .split('.')
    .pop()
    .toLowerCase();
  const types = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
  if (
    !Object.hasOwn(types, extension) ||
    (file.type && file.type !== 'application/octet-stream' && file.type !== types[extension])
  )
    throw new Problem(400, 'Gunakan bukti transfer JPG, PNG, atau PDF.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature =
    extension === 'pdf'
      ? [37, 80, 68, 70, 45]
      : extension === 'png'
        ? [137, 80, 78, 71, 13, 10, 26, 10]
        : [255, 216, 255];
  if (!signature.every((b, i) => bytes[i] === b))
    throw new Problem(400, 'Isi berkas tidak sesuai format JPG, PNG, atau PDF.');
  return {
    bytes,
    type: types[extension],
    name: String(file.name)
      .replace(/[\u0000-\u001f\u007f]/g, '')
      .slice(0, 180),
  };
}
async function readCapital(request) {
  const bytes = await limitedBody(request, MAX_PROOF + 128 * 1024);
  let data;
  try {
    data = await new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new Problem(400, 'Formulir tidak dapat dibaca.');
  }
  const amount = Number(data.get('amount'));
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 1000000000000)
    throw new Problem(400, 'Isi nominal rupiah bulat antara Rp1 dan Rp1 triliun.');
  if (data.get('signatureConsent') !== 'true')
    throw new Problem(400, 'Setujui penggunaan tanda tangan terdaftar pada akad pengajuan ini.');
  return {
    offerId: String(data.get('offerId') || ''),
    id: requestId(data.get('id')),
    version: Number(data.get('version')),
    amount,
    proof: await proofCheck(data.get('proof')),
  };
}
async function createCapital(request, env, owner) {
  const data = await readCapital(request);
  const existing = await getRecord(env, owner, data.id);
  if (existing) {
    if (existing.kind !== 'capital') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(existing) });
  }
  const profile = await getProfile(env, owner);
  if (!profile || profile.status !== 'approved')
    throw new Problem(
      409,
      'Lengkapi pendaftaran dan tunggu persetujuan petugas sebelum mengajukan penyertaan modal.',
    );
  await requireActiveSavings(env, owner, profile);
  const key = 'proof/' + crypto.randomUUID();
  const time = now();
  await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        `INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,proof_type,proof_size,status,note,created_at,updated_at,version,member_snapshot,offer_id,offer_title,project_code) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,o.id,o.title,o.project_code FROM capital_offers o WHERE o.id=? AND o.owner=? AND o.quota>=?+${reservedSql}`,
        data.id,
        owner,
        'capital',
        JSON.parse(profile.data).name,
        data.amount,
        key,
        data.proof.name,
        data.proof.type,
        data.proof.bytes.length,
        'pending',
        '',
        time,
        time,
        1,
        snapshot(profile),
        data.offerId,
        await cooperativeOwner(env, owner),
        data.amount,
        '',
      ),
      owner,
      data.id,
      null,
      submission(data.id, 'capital', JSON.parse(profile.data).name, time),
      time,
    );
    if (!result.meta?.changes)
      throw new Problem(
        409,
        'Penawaran tidak tersedia atau sisa kuota tidak mencukupi. Periksa sisa kuota dan sesuaikan nominal pengajuan.',
      );
  } catch (error) {
    await env.BUCKET.delete(key);
    const prior = await getRecord(env, owner, data.id);
    if (prior) return json({ item: dto(prior) });
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, data.id)) }, 201);
}
async function createWithdrawal(request, env, owner) {
  const body = await readJson(request),
    id = requestId(body.id),
    reason = shortText(body.reason, 10, 1500, 'Alasan pengunduran diri');
  if (body.consent !== true)
    throw new Problem(400, 'Konfirmasi pengiriman permohonan pengunduran diri.');
  const existing = await getRecord(env, owner, id);
  if (existing) {
    if (existing.kind !== 'withdrawal') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(existing) });
  }
  const profile = await getProfile(env, owner);
  if (!profile || profile.status !== 'approved')
    throw new Problem(409, 'Keanggotaan perlu disetujui sebelum mengajukan pengunduran diri.');
  await requireNoContracts(env, owner);
  const time = now();
  try {
    await trackedRun(
      env,
      stmt(
        env,
        'INSERT INTO workflow_requests (id,owner,kind,member_name,reason,status,note,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?)',
        id,
        owner,
        'withdrawal',
        JSON.parse(profile.data).name,
        reason,
        'pending',
        '',
        time,
        time,
        1,
      ),
      owner,
      id,
      null,
      submission(id, 'withdrawal', JSON.parse(profile.data).name, time),
      time,
    );
  } catch (error) {
    const prior = await getRecord(env, owner, id);
    if (prior) return json({ item: dto(prior) });
    if (String(error).includes('UNIQUE'))
      throw new Problem(409, 'Masih ada permohonan pengunduran diri yang sedang diproses.');
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, id)) }, 201);
}
async function updateStatus(env, owner, row, status, note) {
  const time = now(),
    ops =
      status === 'reviewing'
        ? [{ type: 'start', targetId: row.id, stages: [row.kind] }]
        : status === 'cancelled'
          ? [closeTasks(row.id, 'cancelled')]
          : [
              finish(row.id, [row.kind], status),
              ...(status === 'ready' ? [receive(row.id, 'generate', row.member_name, time)] : []),
              ...(['correction', 'rejected'].includes(status)
                ? [
                    {
                      type: 'close',
                      targetId: row.id,
                      stages: ['reconciliation'],
                      outcome: 'withdrawn',
                    },
                  ]
                : []),
            ];
  const result = await trackedRun(
    env,
    stmt(
      env,
      'UPDATE workflow_requests SET status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ?',
      status,
      note,
      now(),
      row.id,
      owner,
      row.version,
    ),
    owner,
    row.id,
    status === 'cancelled' ? null : 'admin',
    ops,
    time,
  );
  if (!result.meta?.changes)
    throw new Problem(409, 'Status sudah berubah. Muat ulang daftar sebelum melanjutkan.');
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}
async function reviewRequest(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  const body = await readJson(request);
  if (!['pending', 'reviewing'].includes(row.status))
    throw new Problem(409, 'Pengajuan ini sudah selesai diproses.');
  if (Number(body.version) !== row.version)
    throw new Problem(409, 'Data sudah berubah. Muat ulang pemeriksaan.');
  const note = String(body.note || '')
    .trim()
    .slice(0, 1500);
  if (body.action === 'start') return updateStatus(env, owner, row, 'reviewing', row.note);
  if (row.kind === 'withdrawal') {
    if (!['approve', 'reject'].includes(body.action))
      throw new Problem(400, 'Pilih Setujui atau Tolak untuk permohonan pengunduran diri.');
    if (body.action === 'approve') {
      await approveWithdrawal(env, owner, row, note);
      return json({ item: dto(await getRecord(env, owner, row.id)) });
    }
    return updateStatus(
      env,
      owner,
      row,
      'rejected',
      shortText(body.note, 5, 1500, 'Alasan penolakan'),
    );
  }
  if (row.renewal_of && ['return', 'reject'].includes(body.action))
    throw new Problem(
      409,
      'Pilihan perpanjangan terkunci. Periksa data sebelum menyetujui akad lanjutan.',
    );
  if (body.action === 'return' || body.action === 'reject')
    return updateStatus(
      env,
      owner,
      row,
      body.action === 'return' ? 'correction' : 'rejected',
      shortText(body.note, 5, 1500, 'Catatan petugas'),
    );
  if (body.action !== 'approve') throw new Problem(400, 'Tindakan pemeriksaan tidak valid.');
  if (!['capital', 'withdrawal'].includes(row.kind))
    throw new Problem(409, 'Setoran simpanan diperiksa melalui rekonsiliasi Finance.');
  if (row.kind === 'capital' && !row.member_snapshot)
    throw new Problem(
      409,
      'Pengajuan lama belum memiliki data dan tanda tangan anggota. Buat pengajuan baru setelah pendaftaran disetujui.',
    );
  if (row.kind === 'capital') await requireReconciled(env, owner, 'capital', row);
  const keys = ['identity', 'amount'];
  if (!keys.every((key) => body.checks?.[key] === true))
    throw new Problem(400, 'Lengkapi semua pemeriksaan terlebih dahulu.');
  return updateStatus(env, owner, row, row.kind === 'capital' ? 'ready' : 'approved', note);
}
function correctionAllowed(row) {
  return (
    row.status === 'correction' ||
    (['pending', 'reviewing'].includes(row.status) && row.finance?.status === 'correction')
  );
}
function revisionGuard(row) {
  return row.finance?.status === 'correction'
    ? " AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=workflow_requests.owner AND target_id=workflow_requests.id AND status='correction' AND version=" +
        Number(row.finance.version) +
        ')'
    : '';
}
async function readSavings(request) {
  const form = await readMultipart(request, MAX_PROOF + 128 * 1024),
    amount = Number(form.get('amount'));
  if (![10000, 120000].includes(amount))
    throw new Problem(400, 'Pilih simpanan wajib Rp10.000 per bulan atau Rp120.000 per tahun.');
  return {
    id: requestId(form.get('id')),
    amount,
    version: Number(form.get('version')),
    proof: await proofCheck(form.get('proof')),
  };
}
async function createSavings(request, env, owner) {
  const data = await readSavings(request),
    prior = await getRecord(env, owner, data.id);
  if (prior) {
    if (prior.kind !== 'savings') throw new Problem(409, 'Referensi pengajuan berbeda.');
    return json({ item: dto(prior) });
  }
  const p = await getProfile(env, owner);
  if (!p || p.status !== 'approved')
    throw new Problem(409, 'Tunggu pendaftaran disetujui sebelum mengirim setoran lanjutan.');
  const key = 'proof/' + crypto.randomUUID(),
    time = now();
  await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
  try {
    await trackedRun(
      env,
      stmt(
        env,
        'INSERT INTO workflow_requests (id,owner,kind,member_name,amount,proof_key,proof_name,proof_type,proof_size,status,note,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,1)',
        data.id,
        owner,
        'savings',
        JSON.parse(p.data).name,
        data.amount,
        key,
        data.proof.name,
        data.proof.type,
        data.proof.bytes.length,
        'pending',
        '',
        time,
        time,
      ),
      owner,
      data.id,
      null,
      submission(data.id, 'savings', JSON.parse(p.data).name, time),
      time,
    );
  } catch (error) {
    await env.BUCKET.delete(key);
    const existing = await getRecord(env, owner, data.id);
    if (existing?.kind === 'savings') return json({ item: dto(existing) });
    throw error;
  }
  return json(
    {
      item: dto(await getRecord(env, owner, data.id)),
      profile: profileDTO(await getProfile(env, owner)),
    },
    201,
  );
}
async function reviseRequest(request, env, owner, row) {
  if (row.renewal_of)
    throw new Problem(409, 'Pilihan project dan nominal perpanjangan tidak dapat diganti.');
  if (!correctionAllowed(row))
    throw new Problem(409, 'Pengajuan hanya dapat diperbaiki jika diminta Admin atau Finance.');
  if (['capital', 'savings'].includes(row.kind)) {
    const data = row.kind === 'capital' ? await readCapital(request) : await readSavings(request);
    if (data.id !== row.id || data.version !== row.version)
      throw new Problem(409, 'Pengajuan berubah. Muat ulang formulir perbaikan.');
    const key = 'proof/' + crypto.randomUUID();
    await env.BUCKET.put(key, data.proof.bytes, { httpMetadata: { contentType: data.proof.type } });
    try {
      const result = await trackedRun(
        env,
        stmt(
          env,
          'UPDATE workflow_requests SET amount = ?, proof_key = ?, proof_name = ?, proof_type = ?, proof_size = ?, status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?' +
            revisionGuard(row) +
            (row.offer_id
              ? ` AND EXISTS (SELECT 1 FROM capital_offers o WHERE o.id=workflow_requests.offer_id AND o.quota>=?+${reservedSql})`
              : ''),
          data.amount,
          key,
          data.proof.name,
          data.proof.type,
          data.proof.bytes.length,
          'pending',
          '',
          now(),
          row.id,
          owner,
          row.version,
          row.status,
          ...(row.offer_id ? [data.amount, row.id] : []),
        ),
        owner,
        row.id,
        null,
        submission(row.id, row.kind, row.member_name),
      );
      if (!result.meta?.changes)
        throw new Problem(
          409,
          'Pengajuan berubah atau sisa kuota tidak mencukupi. Periksa nominal dan muat ulang daftar.',
        );
    } catch (error) {
      await env.BUCKET.delete(key);
      throw error;
    }
    // Retain prior proof objects; financial review history must stay recoverable.
  } else {
    const data = await readJson(request);
    if (data.consent !== true)
      throw new Problem(400, 'Konfirmasi pengiriman permohonan pengunduran diri.');
    if (Number(data.version) !== row.version)
      throw new Problem(409, 'Pengajuan berubah. Muat ulang formulir perbaikan.');
    await requireNoContracts(env, owner);
    const reason = shortText(data.reason, 10, 1500, 'Alasan pengunduran diri');
    const result = await trackedRun(
      env,
      stmt(
        env,
        'UPDATE workflow_requests SET reason = ?, status = ?, note = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?',
        reason,
        'pending',
        '',
        now(),
        row.id,
        owner,
        row.version,
        'correction',
      ),
      owner,
      row.id,
      null,
      submission(row.id, 'withdrawal', row.member_name),
    );
    if (!result.meta?.changes)
      throw new Problem(409, 'Pengajuan sudah berubah. Muat ulang daftar.');
  }
  return json({
    item: dto(await getRecord(env, owner, row.id)),
    profile: profileDTO(await getProfile(env, owner)),
  });
}
async function generateContract(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  if (['generated', 'signed'].includes(row.status) && row.contract_data)
    return json({ item: dto(row) });
  if (row.kind !== 'capital' || row.status !== 'ready')
    throw new Problem(409, 'Periksa dan setujui data serta bukti transfer sebelum membuat akad.');
  if (!row.member_snapshot)
    throw new Problem(
      409,
      'Data dan tanda tangan pendaftaran belum tersedia. Buat pengajuan baru.',
    );
  await requireReconciled(env, owner, 'capital', row);
  const body = await readJson(request);
  if (Number(body.version) !== row.version)
    throw new Problem(409, 'Data berubah. Muat ulang pemeriksaan.');
  const details = {
    ...agreementRules(body.agreementDate),
    ...(row.renewal_of ? renewalDates(row.renewal_effective_date) : {}),
    templateVersion: TEMPLATE_VERSION,
  };
  if (body.confirm !== true)
    throw new Problem(400, 'Konfirmasi data akad dan tanda tangan anggota terlebih dahulu.');
  const member = JSON.parse(row.member_snapshot),
    sig = await env.BUCKET.get(member.signatureKey);
  if (!sig) throw new Problem(409, 'Tanda tangan anggota tidak ditemukan.');
  const signatureBytes = new Uint8Array(await new Response(sig.body).arrayBuffer());
  if ((await hash(signatureBytes)) !== member.signatureSha256)
    throw new Problem(409, 'Tanda tangan tidak sesuai data pendaftaran.');
  const reserved =
    (await stmt(
      env,
      'INSERT INTO contract_numbers (request_id) SELECT ? WHERE NOT EXISTS (SELECT 1 FROM contract_numbers WHERE request_id = ?) RETURNING serial',
      row.id,
      row.id,
    ).first()) ||
    (await stmt(env, 'SELECT serial FROM contract_numbers WHERE request_id = ?', row.id).first());
  details.serial = String(reserved.serial).padStart(4, '0');
  const number = details.serial + '/' + details.code,
    key = 'contracts/' + crypto.randomUUID() + '.pdf';
  const bytes = await buildContractPdf(row, details, signatureBytes);
  details.sha256 = await hash(bytes);
  await env.BUCKET.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' } });
  const time = now();
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        'UPDATE workflow_requests SET status = ?, contract_key = ?, contract_number = ?, contract_data = ?, generated_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?',
        'generated',
        key,
        number,
        JSON.stringify(details),
        time,
        time,
        row.id,
        owner,
        row.version,
        'ready',
      ),
      owner,
      row.id,
      'admin',
      [finish(row.id, ['generate']), receive(row.id, 'archive', row.member_name, time)],
      time,
    );
    if (!result.meta?.changes) {
      const latest = await getRecord(env, owner, row.id);
      if (latest?.contract_data) {
        await env.BUCKET.delete(key);
        return json({ item: dto(latest) });
      }
      throw new Problem(409, 'Pengajuan berubah saat akad dibuat. Muat ulang pemeriksaan.');
    }
  } catch (error) {
    const latest = await getRecord(env, owner, row.id);
    if (latest?.contract_key === key) return json({ item: dto(latest) });
    await env.BUCKET.delete(key);
    if (String(error).includes('UNIQUE'))
      throw new Problem(409, 'Nomor akad belum dapat ditetapkan. Muat ulang dan coba lagi.');
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}
async function uploadSigned(request, env, owner, row) {
  await requireStaffRole(env, owner, 'admin');
  if (row.kind !== 'capital' || !row.contract_data || !['generated', 'signed'].includes(row.status))
    throw new Problem(409, 'Buat PDF akad berdasarkan template sebelum mengunggah akad lengkap.');
  const data = await readMultipart(request, MAX_PROOF + 128 * 1024),
    file = await proofCheck(data.get('signed'));
  if (file.type !== 'application/pdf') throw new Problem(400, 'Akad lengkap harus berupa PDF.');
  if (data.get('confirm') !== 'true')
    throw new Problem(400, 'Konfirmasi kedua tanda tangan dan kecocokan dokumen.');
  const digest = await hash(file.bytes);
  if (row.status === 'signed') {
    if (digest === row.signed_sha256) return json({ item: dto(row) });
    throw new Problem(409, 'Akad lengkap sudah tersimpan. Dokumen tidak ditimpa.');
  }
  if (Number(data.get('version')) !== row.version)
    throw new Problem(409, 'Data berubah. Muat ulang sebelum mengunggah.');
  if (digest === JSON.parse(row.contract_data).sha256)
    throw new Problem(
      400,
      'Ini PDF awal yang belum berubah. Unggah PDF setelah ditandatangani koperasi.',
    );
  try {
    const doc = await PDFDocument.load(file.bytes, { updateMetadata: false });
    if (!doc.getPageCount() || doc.getPageCount() > 100) throw Error();
  } catch {
    throw new Problem(
      400,
      'PDF tidak dapat dibaca atau dilindungi kata sandi. Unggah PDF yang dapat dibuka.',
    );
  }
  const key = 'signed/' + crypto.randomUUID() + '.pdf',
    time = now();
  await env.BUCKET.put(key, file.bytes, { httpMetadata: { contentType: 'application/pdf' } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        'UPDATE workflow_requests SET status = ?, signed_key = ?, signed_name = ?, signed_sha256 = ?, signed_at = ?, updated_at = ?, version = version + 1 WHERE id = ? AND owner = ? AND version = ? AND status = ?',
        'signed',
        key,
        file.name,
        digest,
        time,
        time,
        row.id,
        owner,
        row.version,
        'generated',
      ),
      owner,
      row.id,
      'admin',
      [finish(row.id, ['archive'])],
      time,
    );
    if (!result.meta?.changes) throw new Problem(409, 'Akad sudah berubah. Muat ulang daftar.');
  } catch (error) {
    const latest = await getRecord(env, owner, row.id);
    if (latest?.signed_key === key) return json({ item: dto(latest) });
    await env.BUCKET.delete(key);
    if (latest?.signed_sha256 === digest) return json({ item: dto(latest) });
    throw error;
  }
  return json({ item: dto(await getRecord(env, owner, row.id)) });
}
async function readMultipart(request, limit) {
  const bytes = await limitedBody(request, limit);
  try {
    return await new Response(bytes, {
      headers: { 'Content-Type': request.headers.get('content-type') || '' },
    }).formData();
  } catch {
    throw new Problem(400, 'Formulir tidak dapat dibaca.');
  }
}
async function serveFile(env, key, type, name, download) {
  if (!key) throw new Problem(404, 'Berkas belum tersedia.');
  const object = await env.BUCKET.get(key);
  if (!object) throw new Problem(404, 'Berkas tidak ditemukan.');
  const filename = safeFilename(name);
  return new Response(object.body, {
    headers: {
      'Content-Type': type,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': disposition(filename, download),
      'Content-Security-Policy':
        "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:",
    },
  });
}
async function fileResponse(env, row, part, download) {
  if (part === 'signature') {
    const m = row.member_snapshot ? JSON.parse(row.member_snapshot) : null;
    return serveFile(env, m?.signatureKey, 'image/png', 'tanda-tangan.png', false);
  }
  const type = part === 'proof' ? row.proof_type : 'application/pdf',
    key = part === 'proof' ? row.proof_key : part === 'signed' ? row.signed_key : row.contract_key;
  const name =
    part === 'proof'
      ? 'bukti-transfer.' +
        (type === 'application/pdf' ? 'pdf' : type === 'image/png' ? 'png' : 'jpg')
      : contractDocumentName(row) + '.pdf';
  return serveFile(env, key, type, name, download);
}
async function saveProfile(request, env, owner) {
  const form = await readMultipart(request, MAX_PROOF + MAX_KTP + 700 * 1024);
  let raw;
  try {
    raw = JSON.parse(form.get('data'));
  } catch {
    throw new Problem(400, 'Data pendaftaran tidak dapat dibaca.');
  }
  const data = await validateProfile(raw),
    signature = await signatureCheck(form.get('signature')),
    proof = await proofCheck(form.get('proof')),
    ktp = await ktpCheck(form.get('ktp'));
  const old = await getProfile(env, owner),
    id = requestId(form.get('id'));
  const used = await stmt(env, 'SELECT owner FROM member_profiles WHERE id=?', id).first();
  if (used && used.owner !== owner)
    throw new Problem(
      409,
      'Gunakan formulir pendaftaran baru. Nomor keanggotaan lama tidak dapat dipakai ulang.',
    );
  if (old && !correctionAllowed(old)) {
    if (old.id === id) return json({ profile: profileDTO(old) });
    throw new Problem(
      409,
      'Pendaftaran Anda sudah tersimpan. Buka Profil Anggota untuk melihat status.',
    );
  }
  if (old && (old.id !== id || Number(form.get('version')) !== old.version))
    throw new Problem(409, 'Data pendaftaran berubah. Muat ulang sebelum memperbaiki.');
  const credit = old
    ? await stmt(
        env,
        "SELECT * FROM savings_credits WHERE owner=? AND source_kind='registration' AND source_id=?",
        owner,
        old.id,
      ).first()
    : null;
  if (credit) {
    const before = JSON.parse(old.data);
    if (
      [
        'basic',
        'monthly',
        'paymentOption',
        'transactionSaving',
        'special',
        'specialAmount',
        'specialPayment',
        'installments',
        'admin',
      ].some((k) => String(before[k] ?? '') !== String(data[k] ?? ''))
    )
      throw new Problem(
        409,
        'Setoran awal sudah direkonsiliasi. Nominalnya tidak dapat diubah; gunakan setoran lanjutan untuk menambah simpanan wajib.',
      );
  }
  const priorProof =
    old?.finance?.status === 'approved' ? await env.BUCKET.get(old.proof_key) : null;
  const sameProof =
    priorProof &&
    (await hash(new Uint8Array(await new Response(priorProof.body).arrayBuffer()))) ===
      (await hash(proof.bytes));
  const sigKey = 'signatures/' + crypto.randomUUID() + '.png',
    proofKey = sameProof ? old.proof_key : 'registration/' + crypto.randomUUID(),
    ktpKey = 'identity/' + crypto.randomUUID(),
    time = now(),
    digest = await hash(signature);
  await env.BUCKET.put(sigKey, signature, { httpMetadata: { contentType: 'image/png' } });
  try {
    if (!sameProof)
      await env.BUCKET.put(proofKey, proof.bytes, { httpMetadata: { contentType: proof.type } });
    await env.BUCKET.put(ktpKey, ktp.bytes, { httpMetadata: { contentType: ktp.type } });
    const result = await trackedRun(
      env,
      old
        ? stmt(
            env,
            'UPDATE member_profiles SET data = ?, signature_key = ?, signature_sha256 = ?, proof_key = ?, proof_name = ?, proof_type = ?, ktp_key = ?, ktp_name = ?, ktp_type = ?, ktp_checked_at = NULL, ktp_checked_by = NULL, status = ?, note = ?, consent_at = ?, updated_at = ?, version = version + 1 WHERE owner = ? AND id = ? AND version = ? AND status = ?' +
              (old.finance?.status === 'correction'
                ? " AND EXISTS (SELECT 1 FROM finance_reconciliations WHERE owner=member_profiles.owner AND target_id=member_profiles.id AND status='correction' AND version=" +
                  Number(old.finance.version) +
                  ')'
                : ''),
            JSON.stringify(data),
            sigKey,
            digest,
            proofKey,
            proof.name,
            proof.type,
            ktpKey,
            ktp.name,
            ktp.type,
            'pending',
            '',
            time,
            time,
            owner,
            id,
            old.version,
            old.status,
          )
        : stmt(
            env,
            'INSERT INTO member_profiles (owner,id,data,signature_key,signature_sha256,proof_key,proof_name,proof_type,ktp_key,ktp_name,ktp_type,status,note,consent_at,created_at,updated_at,version) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            owner,
            id,
            JSON.stringify(data),
            sigKey,
            digest,
            proofKey,
            proof.name,
            proof.type,
            ktpKey,
            ktp.name,
            ktp.type,
            'pending',
            '',
            time,
            time,
            time,
            1,
          ),
      owner,
      id,
      null,
      submission(id, 'registration', data.name, time).filter(
        (op) => !(sameProof && op.type === 'receive' && op.task.stage === 'reconciliation'),
      ),
      time,
    );
    if (!result.meta?.changes) throw new Problem(409, 'Pendaftaran berubah. Muat ulang formulir.');
  } catch (error) {
    const latest = await getProfile(env, owner);
    if (latest?.signature_key === sigKey) return json({ profile: profileDTO(latest) });
    await env.BUCKET.delete(sigKey);
    if (!sameProof) await env.BUCKET.delete(proofKey);
    await env.BUCKET.delete(ktpKey);
    if (latest && latest.version !== old?.version)
      throw new Problem(
        409,
        'Pendaftaran berubah saat disimpan. Muat ulang dan periksa data terbaru.',
      );
    throw error;
  }
  // Keep historical signature assets immutable: a submitted contract may reference them.
  return json({ profile: profileDTO(await getProfile(env, owner)) }, 201);
}
async function completeKtp(request, env, owner) {
  const p = await getProfile(env, owner);
  if (!p) throw new Problem(404, 'Pendaftaran belum tersedia.');
  if (p.ktp_key)
    throw new Problem(
      409,
      'Foto KTP sudah tersimpan. Penggantian dilakukan melalui perbaikan pendaftaran dari Admin.',
    );
  if (!['pending', 'approved'].includes(p.status))
    throw new Problem(409, 'Lengkapi seluruh perbaikan melalui formulir pendaftaran.');
  const form = await readMultipart(request, MAX_KTP + 128 * 1024);
  if (Number(form.get('version')) !== p.version)
    throw new Problem(409, 'Data pendaftaran berubah. Muat ulang profil.');
  const ktp = await ktpCheck(form.get('ktp')),
    key = 'identity/' + crypto.randomUUID(),
    time = now();
  await env.BUCKET.put(key, ktp.bytes, { httpMetadata: { contentType: ktp.type } });
  try {
    const result = await trackedRun(
      env,
      stmt(
        env,
        "UPDATE member_profiles SET ktp_key=?,ktp_name=?,ktp_type=?,ktp_checked_at=NULL,ktp_checked_by=NULL,status='pending',updated_at=?,version=version+1 WHERE owner=? AND version=? AND ktp_key IS NULL",
        key,
        ktp.name,
        ktp.type,
        time,
        owner,
        p.version,
      ),
      owner,
      p.id,
      null,
      [
        { type: 'close', targetId: p.id, stages: ['registration'], outcome: 'superseded' },
        receive(p.id, 'registration', JSON.parse(p.data).name, time),
      ],
      time,
    );
    if (!result.meta?.changes)
      throw new Problem(409, 'Data berubah. Muat ulang profil sebelum melanjutkan.');
  } catch (error) {
    const latest = await getProfile(env, owner);
    if (latest?.ktp_key === key) return json({ profile: profileDTO(latest) });
    await env.BUCKET.delete(key);
    throw error;
  }
  return json({ profile: profileDTO(await getProfile(env, owner)) });
}
async function reviewProfile(request, env, owner) {
  await requireStaffRole(env, owner, 'admin');
  const p = await getProfile(env, owner);
  if (!p) throw new Problem(404, 'Pendaftaran belum tersedia.');
  const body = await readJson(request);
  if (p.status !== 'pending' || Number(body.version) !== p.version)
    throw new Problem(409, 'Pendaftaran sudah diperiksa atau berubah. Muat ulang daftar.');
  const correction = body.action === 'return';
  if (!correction && body.action !== 'approve') throw new Problem(400, 'Tindakan tidak sesuai.');
  const note = correction ? shortText(body.note, 5, 1500, 'Catatan petugas') : '';
  if (!correction) await requireReconciled(env, owner, 'registration', p);
  if (!correction && !p.ktp_key)
    throw new Problem(
      409,
      'Foto KTP belum tersedia. Minta anggota melengkapinya sebelum menyetujui pendaftaran.',
    );
  if (!correction && !['identity', 'signature', 'ktp'].every((k) => body.checks?.[k] === true))
    throw new Problem(
      400,
      'Periksa kecocokan foto KTP, data identitas, setoran, dan tanda tangan.',
    );
  const checkedAt = now();
  const result = await trackedRun(
    env,
    stmt(
      env,
      'UPDATE member_profiles SET status = ?, note = ?, ktp_checked_at = ?, ktp_checked_by = ?, updated_at = ?, version = version + 1 WHERE owner = ? AND version = ? AND status = ?',
      correction ? 'correction' : 'approved',
      note,
      correction ? null : checkedAt,
      correction ? null : actorId(env, owner),
      checkedAt,
      owner,
      p.version,
      'pending',
    ),
    owner,
    p.id,
    'admin',
    [
      finish(p.id, ['registration'], correction ? 'correction' : 'approved'),
      ...(correction
        ? [{ type: 'close', targetId: p.id, stages: ['reconciliation'], outcome: 'withdrawn' }]
        : []),
    ],
  );
  if (!result.meta?.changes) throw new Problem(409, 'Pendaftaran sudah berubah.');
  return json({ profile: profileDTO(await getProfile(env, owner)) });
}
async function appFetch(request, env) {
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
  if (
    context.accountRole === 'avalist' &&
    !(
      pathname === '/api/workflow' &&
      request.method === 'GET' &&
      request.headers.get('x-kspps-portal') === 'staff'
    )
  )
    throw new Problem(403, 'Avalist hanya dapat membuka portal dan riwayat miliknya.');
  if (pathname === '/api/workflow/reports' && request.method === 'GET')
    return json({ reports: await reportList(env, ownMembership) });
  if (pathname === '/api/workflow/reports' && request.method === 'POST')
    return json({ report: await uploadReport(request, env, signedIn) }, 201);
  const reportMatch = pathname.match(/^\/api\/workflow\/reports\/([0-9a-f-]{36})\/file$/i);
  if (reportMatch && request.method === 'GET')
    return reportFile(env, ownMembership, reportMatch[1], url.searchParams.has('download'));
  const staffView = request.headers.get('x-kspps-portal') === 'staff';
  if (staffView) await requireStaff(env, signedIn);

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
export { appFetch, proofCheck, buildContractPdf };
export default {
  async fetch(request, env) {
    try {
      return await appFetch(request, env);
    } catch (error) {
      if (error instanceof Problem) return json({ error: error.message }, error.status);
      if (String(error).includes('MEMBERSHIP_LOCKED') || String(error).includes('ACTIVE_CONTRACT'))
        return json(
          {
            error:
              'Keanggotaan sedang ditutup atau masih memiliki kontrak/pengajuan aktif. Perbarui data sebelum melanjutkan.',
          },
          409,
        );
      console.error('KSPPS workflow error', error?.name, String(error?.message || error));
      return json(
        {
          error:
            'Pengajuan belum dapat diproses. Data pada formulir tetap tersedia; silakan coba lagi.',
        },
        503,
      );
    }
  },
};
