CREATE TABLE `avalist_clock` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `avalist_events` (
	`seq` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`member_id` text NOT NULL,
	`contract_id` text,
	`effective_date` text NOT NULL,
	`person_id` text,
	`rate` integer,
	`reason` text NOT NULL,
	`actor` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `avalist_events_id_unique` ON `avalist_events` (`id`);--> statement-breakpoint
CREATE INDEX `idx_avalist_contract_period` ON `avalist_events` (`contract_id`,`effective_date`,`seq`);--> statement-breakpoint
CREATE INDEX `idx_avalist_member_default` ON `avalist_events` (`member_id`,`contract_id`,`seq`);--> statement-breakpoint
CREATE TABLE `avalist_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`actor` text NOT NULL,
	`reason` text NOT NULL,
	`expected_revision` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `avalist_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text DEFAULT 'regular' NOT NULL,
	`original_id` text,
	`contract_id` text NOT NULL,
	`due_date` text NOT NULL,
	`person_id` text NOT NULL,
	`amount` integer NOT NULL,
	`snapshot` text NOT NULL,
	`fingerprint` text NOT NULL,
	`status` text DEFAULT 'prepared' NOT NULL,
	`reason` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`paid_at` text,
	`paid_by` text,
	`transfer_date` text,
	`reference` text,
	`proof_key` text,
	`proof_name` text,
	`proof_type` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_avalist_regular_period` ON `avalist_payments` (`contract_id`,`due_date`) WHERE "avalist_payments"."kind" = 'regular';--> statement-breakpoint
CREATE INDEX `idx_avalist_person_history` ON `avalist_payments` (`person_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `idx_avalist_corrections` ON `avalist_payments` (`original_id`);--> statement-breakpoint
CREATE TABLE `avalist_people` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account` text NOT NULL,
	`account_name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	`updated_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `avalist_people_user_id_unique` ON `avalist_people` (`user_id`);--> statement-breakpoint
CREATE TABLE `avalist_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by` text NOT NULL,
	`created_at` text NOT NULL,
	`decided_by` text,
	`decided_at` text,
	`decision_note` text
);

--> statement-breakpoint
CREATE TRIGGER avalist_operation_guard BEFORE INSERT ON avalist_operations
BEGIN
 SELECT RAISE(ABORT,'AVALIST_STALE') WHERE NEW.expected_revision <> COALESCE((SELECT revision FROM avalist_clock WHERE id='main'),0);
END;
--> statement-breakpoint
CREATE TRIGGER avalist_operation_clock AFTER INSERT ON avalist_operations
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;
--> statement-breakpoint
CREATE TRIGGER avalist_inherit_default AFTER INSERT ON workflow_requests WHEN NEW.kind='capital'
BEGIN
 INSERT INTO avalist_events(id,member_id,contract_id,effective_date,person_id,rate,reason,actor,created_at)
 SELECT 'initial:'||NEW.id,e.member_id,NEW.id,'1901-01-01',e.person_id,e.rate,'Avalist bawaan saat pengajuan dibuat',e.actor,NEW.created_at
 FROM avalist_events e JOIN member_profiles p ON p.id=e.member_id
 WHERE p.owner=NEW.owner AND e.contract_id IS NULL
 ORDER BY e.seq DESC LIMIT 1;
END;
--> statement-breakpoint
CREATE TRIGGER avalist_event_review AFTER INSERT ON avalist_events
BEGIN
 UPDATE avalist_payments SET status='needs_review',version=version+1
 WHERE kind='regular' AND status='prepared' AND contract_id=NEW.contract_id AND due_date>=NEW.effective_date;
END;
--> statement-breakpoint
CREATE TRIGGER avalist_bank_review AFTER UPDATE ON avalist_people
BEGIN
 UPDATE avalist_payments SET status='needs_review',version=version+1 WHERE status='prepared' AND person_id=NEW.id;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_workflow_requests_insert AFTER INSERT ON workflow_requests
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_workflow_requests_update AFTER UPDATE ON workflow_requests
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_workflow_requests_delete AFTER DELETE ON workflow_requests
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_finance_reconciliations_insert AFTER INSERT ON finance_reconciliations
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_finance_reconciliations_update AFTER UPDATE ON finance_reconciliations
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_finance_reconciliations_delete AFTER DELETE ON finance_reconciliations
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_maturity_decisions_insert AFTER INSERT ON maturity_decisions
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_maturity_decisions_update AFTER UPDATE ON maturity_decisions
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_maturity_decisions_delete AFTER DELETE ON maturity_decisions
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_staff_accounts_insert AFTER INSERT ON staff_accounts
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_staff_accounts_update AFTER UPDATE ON staff_accounts
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_staff_accounts_delete AFTER DELETE ON staff_accounts
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;

--> statement-breakpoint
CREATE TRIGGER avalist_events_immutable_update BEFORE UPDATE ON avalist_events
BEGIN
 SELECT RAISE(ABORT,'AVALIST_HISTORY_IMMUTABLE');
END;

--> statement-breakpoint
CREATE TRIGGER avalist_events_immutable_delete BEFORE DELETE ON avalist_events
BEGIN
 SELECT RAISE(ABORT,'AVALIST_HISTORY_IMMUTABLE');
END;

--> statement-breakpoint
CREATE TRIGGER avalist_operations_immutable_update BEFORE UPDATE ON avalist_operations
BEGIN
 SELECT RAISE(ABORT,'AVALIST_HISTORY_IMMUTABLE');
END;

--> statement-breakpoint
CREATE TRIGGER avalist_operations_immutable_delete BEFORE DELETE ON avalist_operations
BEGIN
 SELECT RAISE(ABORT,'AVALIST_HISTORY_IMMUTABLE');
END;

--> statement-breakpoint
CREATE TRIGGER avalist_paid_immutable_update BEFORE UPDATE ON avalist_payments WHEN OLD.status='paid'
BEGIN
 SELECT RAISE(ABORT,'AVALIST_PAID_IMMUTABLE');
END;

--> statement-breakpoint
CREATE TRIGGER avalist_paid_immutable_delete BEFORE DELETE ON avalist_payments WHEN OLD.status='paid'
BEGIN
 SELECT RAISE(ABORT,'AVALIST_PAID_IMMUTABLE');
END;
