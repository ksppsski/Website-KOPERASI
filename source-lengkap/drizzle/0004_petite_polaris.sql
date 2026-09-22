CREATE TABLE `finance_reconciliations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`target_kind` text NOT NULL,
	`target_id` text NOT NULL,
	`proof_key` text NOT NULL,
	`expected_amount` integer NOT NULL,
	`received_amount` integer NOT NULL,
	`transfer_date` text NOT NULL,
	`reference` text NOT NULL,
	`status` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`checked_by` text NOT NULL,
	`checked_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_finance_target` ON `finance_reconciliations` (`owner`,`target_kind`,`target_id`);--> statement-breakpoint
CREATE TABLE `staff_workspaces` (
	`owner` text PRIMARY KEY NOT NULL,
	`active_role` text DEFAULT 'admin' NOT NULL,
	`updated_at` text NOT NULL
);
