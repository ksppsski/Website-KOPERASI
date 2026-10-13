CREATE TABLE `financing_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`number` text NOT NULL,
	`purpose` text NOT NULL,
	`amount` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL,
	`settled_at` text,
	`settled_by` text,
	`settlement_note` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `financing_contracts_number_unique` ON `financing_contracts` (`number`);--> statement-breakpoint
CREATE INDEX `idx_financing_owner` ON `financing_contracts` (`owner`);--> statement-breakpoint
CREATE TABLE `membership_accounts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`current_owner` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_accounts_current_owner_unique` ON `membership_accounts` (`current_owner`);--> statement-breakpoint
CREATE TABLE `withdrawal_settlements` (
	`request_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`profile_id` text NOT NULL,
	`amount` integer DEFAULT 100000 NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account` text NOT NULL,
	`account_name` text NOT NULL,
	`admin_at` text NOT NULL,
	`admin_by` text NOT NULL,
	`paid_at` text,
	`paid_by` text,
	`transfer_date` text,
	`reference` text,
	`proof_key` text,
	`proof_name` text,
	`proof_type` text,
	`closed_at` text,
	`closed_by` text
);
--> statement-breakpoint
DROP INDEX `idx_workflow_active_withdrawal`;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_active_withdrawal` ON `workflow_requests` (`owner`) WHERE "workflow_requests"."kind" = 'withdrawal' AND "workflow_requests"."status" IN ('pending', 'reviewing', 'correction', 'approved', 'finance_pending', 'manager_pending');--> statement-breakpoint
-- Earlier two-step approvals must be reviewed under the new financial lifecycle.
INSERT INTO staff_activity (owner,event_key,target_id,occurred_at,role,actor_id,payload)
SELECT owner,'withdrawal-v2:'||id,id,strftime('%Y-%m-%dT%H:%M:%fZ','now'),NULL,NULL,
 json_array(json_object('type','receive','task',json_object('id','withdrawal-v2:'||id,'targetId',id,'stage','withdrawal','role','admin','label','Pemeriksaan pengunduran diri','memberName',member_name,'receivedAt',strftime('%Y-%m-%dT%H:%M:%fZ','now'))))
FROM workflow_requests WHERE kind='withdrawal' AND status='approved';
--> statement-breakpoint
UPDATE workflow_requests SET status='pending',note='Tinjau ulang untuk proses Admin, Finance, dan persetujuan final Manajer.',version=version+1,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE kind='withdrawal' AND status='approved';
--> statement-breakpoint
CREATE TRIGGER guard_new_service BEFORE INSERT ON workflow_requests
WHEN NEW.kind IN ('capital','savings') AND (
 EXISTS (SELECT 1 FROM member_profiles WHERE owner=NEW.owner AND status='closed') OR
 EXISTS (SELECT 1 FROM workflow_requests WHERE owner=NEW.owner AND kind='withdrawal' AND status IN ('pending','reviewing','correction','approved','finance_pending','manager_pending')))
BEGIN SELECT RAISE(ABORT,'MEMBERSHIP_LOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER guard_financing_contract BEFORE INSERT ON financing_contracts
WHEN EXISTS (SELECT 1 FROM member_profiles WHERE owner=NEW.owner AND status='closed') OR
 EXISTS (SELECT 1 FROM workflow_requests WHERE owner=NEW.owner AND kind='withdrawal' AND status IN ('pending','reviewing','correction','approved','finance_pending','manager_pending'))
BEGIN SELECT RAISE(ABORT,'MEMBERSHIP_LOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER guard_withdrawal_insert BEFORE INSERT ON workflow_requests
WHEN NEW.kind='withdrawal' AND (
 EXISTS (SELECT 1 FROM member_profiles WHERE owner=NEW.owner AND status='closed') OR
 EXISTS (SELECT 1 FROM financing_contracts WHERE owner=NEW.owner AND settled_at IS NULL) OR
 EXISTS (SELECT 1 FROM workflow_requests WHERE owner=NEW.owner AND kind='capital' AND status NOT IN ('rejected','cancelled') AND (contract_data IS NULL OR COALESCE(json_extract(contract_data,'$.endDate'),'9999-12-31')>date('now','+8 hours') OR NOT EXISTS (SELECT 1 FROM maturity_decisions d WHERE d.request_id=workflow_requests.id AND (d.choice='extend' OR (d.choice='return' AND EXISTS (SELECT 1 FROM capital_returns cr WHERE cr.request_id=d.request_id AND cr.paid_at IS NOT NULL)))))))
BEGIN SELECT RAISE(ABORT,'ACTIVE_CONTRACT'); END;
--> statement-breakpoint
CREATE TRIGGER guard_withdrawal_progress BEFORE UPDATE OF status ON workflow_requests
WHEN NEW.kind='withdrawal' AND NEW.status IN ('pending','finance_pending','manager_pending','completed') AND (
 EXISTS (SELECT 1 FROM financing_contracts WHERE owner=NEW.owner AND settled_at IS NULL) OR
 EXISTS (SELECT 1 FROM workflow_requests WHERE owner=NEW.owner AND kind='capital' AND status NOT IN ('rejected','cancelled') AND (contract_data IS NULL OR COALESCE(json_extract(contract_data,'$.endDate'),'9999-12-31')>date('now','+8 hours') OR NOT EXISTS (SELECT 1 FROM maturity_decisions d WHERE d.request_id=workflow_requests.id AND (d.choice='extend' OR (d.choice='return' AND EXISTS (SELECT 1 FROM capital_returns cr WHERE cr.request_id=d.request_id AND cr.paid_at IS NOT NULL)))))))
BEGIN SELECT RAISE(ABORT,'ACTIVE_CONTRACT'); END;
--> statement-breakpoint
CREATE TRIGGER guard_service_progress BEFORE UPDATE OF status,contract_data ON workflow_requests
WHEN NEW.kind='capital' AND NEW.status NOT IN ('rejected','cancelled') AND (
 EXISTS (SELECT 1 FROM member_profiles WHERE owner=NEW.owner AND status='closed') OR
 EXISTS (SELECT 1 FROM workflow_requests WHERE owner=NEW.owner AND kind='withdrawal' AND status IN ('pending','reviewing','correction','approved','finance_pending','manager_pending')))
BEGIN SELECT RAISE(ABORT,'MEMBERSHIP_LOCKED'); END;
--> statement-breakpoint
CREATE TRIGGER guard_closed_membership BEFORE UPDATE OF status,member_number ON member_profiles
WHEN OLD.status='closed' AND (NEW.status<>'closed' OR NEW.member_number IS NOT OLD.member_number)
BEGIN SELECT RAISE(ABORT,'MEMBERSHIP_LOCKED'); END;
