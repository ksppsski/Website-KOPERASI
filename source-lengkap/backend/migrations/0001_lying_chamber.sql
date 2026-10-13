CREATE TABLE `member_profiles` (
	`owner` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	`signature_key` text NOT NULL,
	`signature_sha256` text NOT NULL,
	`proof_key` text NOT NULL,
	`proof_name` text NOT NULL,
	`proof_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`consent_at` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_profiles_id_unique` ON `member_profiles` (`id`);--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `member_snapshot` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `contract_data` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `generated_at` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `signed_key` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `signed_name` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `signed_sha256` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `signed_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_owner_contract_number` ON `workflow_requests` (`owner`,`contract_number`);