CREATE TABLE `capital_returns` (
	`request_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`bank_name` text NOT NULL,
	`bank_account` text NOT NULL,
	`account_name` text NOT NULL,
	`paid_at` text,
	`paid_by` text,
	`transfer_date` text,
	`reference` text,
	`proof_key` text,
	`proof_name` text,
	`proof_type` text
);
--> statement-breakpoint
CREATE TABLE `maturity_decisions` (
	`request_id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`choice` text NOT NULL,
	`amount` integer NOT NULL,
	`due_date` text NOT NULL,
	`offer_id` text,
	`renewal_id` text,
	`effective_date` text,
	`confirmed_at` text NOT NULL,
	`confirmed_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `maturity_decisions_renewal_id_unique` ON `maturity_decisions` (`renewal_id`);--> statement-breakpoint
CREATE INDEX `idx_maturity_due` ON `maturity_decisions` (`due_date`,`choice`);--> statement-breakpoint
CREATE TABLE `membership_letters` (
	`serial` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL,
	`owner` text NOT NULL,
	`reconciled_at` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `membership_letters_profile_id_unique` ON `membership_letters` (`profile_id`);--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `renewal_of` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `renewal_effective_date` text;--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_requests_renewal_of_unique` ON `workflow_requests` (`renewal_of`);