CREATE TABLE `complaint_events` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`complaint_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_role` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaint_events_id_unique` ON `complaint_events` (`id`);--> statement-breakpoint
CREATE INDEX `idx_complaint_events_case_sequence` ON `complaint_events` (`complaint_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `complaint_numbers` (
	`serial` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`complaint_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaint_numbers_complaint_id_unique` ON `complaint_numbers` (`complaint_id`);--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`number` text NOT NULL,
	`member_name` text NOT NULL,
	`member_number` text,
	`subject` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`division` text,
	`assignee_id` text,
	`assignee_name` text,
	`due_at` text,
	`resolution` text,
	`resolved_at` text,
	`closed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`mutation_token` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaints_number_unique` ON `complaints` (`number`);--> statement-breakpoint
CREATE INDEX `idx_complaints_owner_created` ON `complaints` (`owner`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_complaints_assignee_status` ON `complaints` (`assignee_id`,`status`);