/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { getProfile as rawProfile, profileDTO, stmt } from '../../membership.js';
import { reconciliationFor, renewalFunding, savingsTotal } from '../../finance.js';
import { savingsState } from '../../savings.js';
import { letterDTO, membershipLetter } from '../../membership-letter.js';
import { settlementDTO, withdrawalLabels } from '../../withdrawal.js';
import { maturityView } from '../../maturity.js';
import { contractDocumentName, safeFilename } from '../../document-names.js';
import { scopedUrls } from '../../staff-queue.js';
import { activityState } from '../../activity.js';
import { offers } from '../../offers.js';
import { cooperativeOwner } from '../../access.js';

export const STATUS = {
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

export async function getProfile(env, owner) {
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

export async function enrichRow(env, row, profile) {
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

export const getRecord = async (env, owner, id) => {
  const row = await stmt(
    env,
    'SELECT * FROM workflow_requests WHERE id = ? AND owner = ?',
    id,
    owner,
  ).first();
  return row ? enrichRow(env, row, await getProfile(env, owner)) : null;
};

export function dto(row) {
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
                ? 'Draf terdahulu'
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

export async function staffPayload(env, actor, context) {
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
