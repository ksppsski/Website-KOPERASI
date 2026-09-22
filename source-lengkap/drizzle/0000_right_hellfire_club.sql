CREATE TABLE `workflow_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`kind` text NOT NULL,
	`member_name` text NOT NULL,
	`amount` integer,
	`proof_key` text,
	`proof_name` text,
	`proof_type` text,
	`proof_size` integer,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`contract_key` text,
	`contract_number` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_workflow_owner_created` ON `workflow_requests` (`owner`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_workflow_active_withdrawal` ON `workflow_requests` (`owner`) WHERE "workflow_requests"."kind" = 'withdrawal' AND "workflow_requests"."status" IN ('pending', 'reviewing', 'correction', 'approved');