import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const workflowRequests = sqliteTable('workflow_requests', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  kind: text('kind').notNull(),
  memberName: text('member_name').notNull(),
  amount: integer('amount'),
  offerId: text('offer_id'),
  offerTitle: text('offer_title'),
  projectCode: text('project_code'),
  renewalOf: text('renewal_of').unique(),
  renewalEffectiveDate: text('renewal_effective_date'),
  proofKey: text('proof_key'),
  proofName: text('proof_name'),
  proofType: text('proof_type'),
  proofSize: integer('proof_size'),
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  note: text('note').notNull().default(''),
  contractKey: text('contract_key'),
  contractNumber: text('contract_number'),
  memberSnapshot: text('member_snapshot'),
  contractData: text('contract_data'),
  generatedAt: text('generated_at'),
  signedKey: text('signed_key'),
  signedName: text('signed_name'),
  signedSha256: text('signed_sha256'),
  signedAt: text('signed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull().default(1),
}, table => [
  index('idx_workflow_offer').on(table.owner, table.offerId, table.status),
  index('idx_workflow_offer_reservations').on(table.offerId, table.status),
  index('idx_workflow_owner_created').on(table.owner, table.createdAt),
  uniqueIndex('idx_workflow_owner_contract_number').on(table.owner, table.contractNumber),
  uniqueIndex('idx_workflow_active_withdrawal').on(table.owner)
    .where(sql`${table.kind} = 'withdrawal' AND ${table.status} IN ('pending', 'reviewing', 'correction', 'approved', 'finance_pending', 'manager_pending')`),
]);

export const memberProfiles = sqliteTable('member_profiles', {
  owner: text('owner').primaryKey(),
  id: text('id').notNull().unique(),
  memberNumber: text('member_number').unique(),
  data: text('data').notNull(),
  signatureKey: text('signature_key').notNull(),
  signatureSha256: text('signature_sha256').notNull(),
  ktpKey: text('ktp_key'),
  ktpName: text('ktp_name'),
  ktpType: text('ktp_type'),
  ktpCheckedAt: text('ktp_checked_at'),
  ktpCheckedBy: text('ktp_checked_by'),
  proofKey: text('proof_key').notNull(),
  proofName: text('proof_name').notNull(),
  proofType: text('proof_type').notNull(),
  status: text('status').notNull().default('pending'),
  note: text('note').notNull().default(''),
  consentAt: text('consent_at').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull().default(1),
});

export const contractNumbers = sqliteTable('contract_numbers', {
  serial: integer('serial').primaryKey({autoIncrement:true}),
  requestId: text('request_id').notNull().unique(),
});

export const memberNumbers = sqliteTable('member_numbers', {
  serial: integer('serial').primaryKey({autoIncrement:true}),
  profileId: text('profile_id').notNull().unique(),
});

export const maintenanceTasks = sqliteTable('maintenance_tasks', {
  id: text('id').primaryKey(),
  completedAt: text('completed_at').notNull(),
});

// The existing concept keeps each authenticated account's test workspace private.
export const staffWorkspaces = sqliteTable('staff_workspaces', {
  owner: text('owner').primaryKey(),
  activeRole: text('active_role').notNull().default('admin'),
  updatedAt: text('updated_at').notNull(),
});

export const financeReconciliations = sqliteTable('finance_reconciliations', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  targetKind: text('target_kind').notNull(),
  targetId: text('target_id').notNull(),
  proofKey: text('proof_key').notNull(),
  expectedAmount: integer('expected_amount').notNull(),
  receivedAmount: integer('received_amount').notNull(),
  transferDate: text('transfer_date').notNull(),
  reference: text('reference').notNull(),
  status: text('status').notNull(),
  note: text('note').notNull().default(''),
  checkedBy: text('checked_by').notNull(),
  checkedAt: text('checked_at').notNull(),
  version: integer('version').notNull().default(1),
},table=>[
  uniqueIndex('idx_finance_target').on(table.owner,table.targetKind,table.targetId),
]);

// Append-only work history; business updates and their audit event commit together.
export const staffActivity = sqliteTable('staff_activity', {
  sequence: integer('sequence').primaryKey({autoIncrement:true}),
  owner: text('owner').notNull(),
  eventKey: text('event_key').notNull(),
  targetId: text('target_id').notNull(),
  occurredAt: text('occurred_at').notNull(),
  role: text('role'),
  actorId: text('actor_id'),
  payload: text('payload').notNull(),
}, table => [
  uniqueIndex('idx_activity_owner_event').on(table.owner,table.eventKey),
  index('idx_activity_owner_sequence').on(table.owner,table.sequence),
]);

// One immutable receipt per reconciled source; monthly allocation is calendar-derived.
export const savingsCredits = sqliteTable('savings_credits', {
  owner: text('owner').notNull(),
  sourceKind: text('source_kind').notNull(),
  sourceId: text('source_id').notNull(),
  basic: integer('basic').notNull().default(0),
  mandatory: integer('mandatory').notNull().default(0),
  other: integer('other').notNull().default(0),
  acceptedAt: text('accepted_at').notNull(),
}, table => [uniqueIndex('idx_savings_source').on(table.owner,table.sourceKind,table.sourceId)]);

export const capitalOffers = sqliteTable('capital_offers', {
  id: text('id').primaryKey(),
  owner: text('owner').notNull(),
  title: text('title').notNull(),
  projectCode: text('project_code').notNull(),
  quota: integer('quota').notNull(),
  createdAt: text('created_at').notNull(),
  createdBy: text('created_by').notNull(),
  fulfilledAt: text('fulfilled_at'),
}, table => [uniqueIndex('idx_offer_project').on(table.owner,table.projectCode)]);

export const staffAccounts = sqliteTable('staff_accounts', {
 userId:text('user_id').primaryKey(),role:text('role').notNull(),displayName:text('display_name').notNull(),email:text('email').notNull(),grantedBy:text('granted_by').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull(),
});
export const staffBootstrap = sqliteTable('staff_bootstrap', {id:text('id').primaryKey(),managerId:text('manager_id').notNull(),createdAt:text('created_at').notNull()});
export const staffAccessRequests=sqliteTable('staff_access_requests', {userId:text('user_id').primaryKey(),requestCode:text('request_code').notNull().unique(),displayName:text('display_name').notNull(),email:text('email').notNull(),status:text('status').notNull(),requestedAt:text('requested_at').notNull()});
export const staffAccessAudit=sqliteTable('staff_access_audit', {id:text('id').primaryKey(),targetUserId:text('target_user_id').notNull(),role:text('role').notNull(),actorId:text('actor_id').notNull(),createdAt:text('created_at').notNull()});
export const memberReports=sqliteTable('member_reports', {
 id:text('id').primaryKey(),category:text('category').notNull(),title:text('title').notNull(),period:text('period').notNull(),projectCode:text('project_code'),fileKey:text('file_key').notNull(),fileName:text('file_name').notNull(),fileType:text('file_type').notNull(),fileSize:integer('file_size').notNull(),uploadedBy:text('uploaded_by').notNull(),uploaderName:text('uploader_name').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('idx_reports_created').on(table.createdAt)]);

export const maturityDecisions=sqliteTable('maturity_decisions', {
 requestId:text('request_id').primaryKey(),owner:text('owner').notNull(),choice:text('choice').notNull(),amount:integer('amount').notNull(),dueDate:text('due_date').notNull(),offerId:text('offer_id'),renewalId:text('renewal_id').unique(),effectiveDate:text('effective_date'),confirmedAt:text('confirmed_at').notNull(),confirmedBy:text('confirmed_by').notNull(),
},table=>[index('idx_maturity_due').on(table.dueDate,table.choice)]);
export const capitalReturns=sqliteTable('capital_returns', {
 requestId:text('request_id').primaryKey(),owner:text('owner').notNull(),amount:integer('amount').notNull(),dueDate:text('due_date').notNull(),bankName:text('bank_name').notNull(),bankAccount:text('bank_account').notNull(),accountName:text('account_name').notNull(),paidAt:text('paid_at'),paidBy:text('paid_by'),transferDate:text('transfer_date'),reference:text('reference'),proofKey:text('proof_key'),proofName:text('proof_name'),proofType:text('proof_type'),
});
export const membershipLetters=sqliteTable('membership_letters', {
 serial:integer('serial').primaryKey({autoIncrement:true}),profileId:text('profile_id').notNull().unique(),owner:text('owner').notNull(),reconciledAt:text('reconciled_at').notNull(),snapshot:text('snapshot').notNull(),createdAt:text('created_at').notNull(),
});

// A sign-in identity points to its current membership workspace. Previous
// workspaces, numbers, receipts and audit events remain immutable archives.
export const membershipAccounts=sqliteTable('membership_accounts', {
 accountId:text('account_id').primaryKey(),currentOwner:text('current_owner').notNull().unique(),updatedAt:text('updated_at').notNull(),
});
export const withdrawalSettlements=sqliteTable('withdrawal_settlements', {
 requestId:text('request_id').primaryKey(),owner:text('owner').notNull(),profileId:text('profile_id').notNull(),amount:integer('amount').notNull().default(100000),bankName:text('bank_name').notNull(),bankAccount:text('bank_account').notNull(),accountName:text('account_name').notNull(),adminAt:text('admin_at').notNull(),adminBy:text('admin_by').notNull(),paidAt:text('paid_at'),paidBy:text('paid_by'),transferDate:text('transfer_date'),reference:text('reference'),proofKey:text('proof_key'),proofName:text('proof_name'),proofType:text('proof_type'),closedAt:text('closed_at'),closedBy:text('closed_by'),
});
// Register existing financing contracts; active or overdue contracts stay open
// until Admin records settlement. Merely reaching an end date is not settlement.
export const financingContracts=sqliteTable('financing_contracts', {
 id:text('id').primaryKey(),owner:text('owner').notNull(),number:text('number').notNull().unique(),purpose:text('purpose').notNull(),amount:integer('amount').notNull(),startDate:text('start_date').notNull(),endDate:text('end_date').notNull(),createdAt:text('created_at').notNull(),createdBy:text('created_by').notNull(),settledAt:text('settled_at'),settledBy:text('settled_by'),settlementNote:text('settlement_note'),
},table=>[index('idx_financing_owner').on(table.owner)]);

// Avalist assignments and paid allocations are append-only historical records.
export const avalistPeople = sqliteTable('avalist_people', {
  id: text('id').primaryKey(), userId: text('user_id').notNull().unique(), name: text('name').notNull(),
  bankName: text('bank_name').notNull(), bankAccount: text('bank_account').notNull(), accountName: text('account_name').notNull(),
  active: integer('active').notNull().default(1), version: integer('version').notNull().default(1),
  updatedAt: text('updated_at').notNull(), updatedBy: text('updated_by').notNull(),
});
export const avalistEmailAccess = sqliteTable('avalist_email_access', {
  email: text('email').primaryKey(), personId: text('person_id').notNull().unique(),
  boundUserId: text('bound_user_id').unique(), claimToken: text('claim_token'),
  createdBy: text('created_by').notNull(), createdAt: text('created_at').notNull(), claimedAt: text('claimed_at'),
});
export const avalistEvents = sqliteTable('avalist_events', {
  seq: integer('seq').primaryKey({autoIncrement:true}), id: text('id').notNull().unique(),
  memberId: text('member_id').notNull(), contractId: text('contract_id'), effectiveDate: text('effective_date').notNull(),
  personId: text('person_id'), rate: integer('rate'), reason: text('reason').notNull(),
  actor: text('actor').notNull(), createdAt: text('created_at').notNull(),
}, t => [index('idx_avalist_contract_period').on(t.contractId,t.effectiveDate,t.seq), index('idx_avalist_member_default').on(t.memberId,t.contractId,t.seq)]);
export const avalistProposals = sqliteTable('avalist_proposals', {
  id: text('id').primaryKey(), payload: text('payload').notNull(), status: text('status').notNull().default('pending'),
  submittedBy: text('submitted_by').notNull(), createdAt: text('created_at').notNull(), decidedBy: text('decided_by'), decidedAt: text('decided_at'), decisionNote: text('decision_note'),
});
export const avalistClock = sqliteTable('avalist_clock', {id:text('id').primaryKey(), revision:integer('revision').notNull()});
export const avalistOperations = sqliteTable('avalist_operations', {
  id:text('id').primaryKey(), kind:text('kind').notNull(), actor:text('actor').notNull(), reason:text('reason').notNull(),
  expectedRevision:integer('expected_revision').notNull(), createdAt:text('created_at').notNull(),
});
export const avalistPayments = sqliteTable('avalist_payments', {
  id:text('id').primaryKey(), kind:text('kind').notNull().default('regular'), originalId:text('original_id'),
  contractId:text('contract_id').notNull(), dueDate:text('due_date').notNull(), personId:text('person_id').notNull(), amount:integer('amount').notNull(),
  snapshot:text('snapshot').notNull(), fingerprint:text('fingerprint').notNull(), status:text('status').notNull().default('prepared'),
  reason:text('reason').notNull().default(''), createdBy:text('created_by').notNull(), createdAt:text('created_at').notNull(),
  version:integer('version').notNull().default(1), paidAt:text('paid_at'), paidBy:text('paid_by'), transferDate:text('transfer_date'), reference:text('reference'),
  proofKey:text('proof_key'), proofName:text('proof_name'), proofType:text('proof_type'),
}, t => [uniqueIndex('idx_avalist_regular_period').on(t.contractId,t.dueDate).where(sql`${t.kind} = 'regular'`),index('idx_avalist_person_history').on(t.personId,t.dueDate),index('idx_avalist_corrections').on(t.originalId)]);
