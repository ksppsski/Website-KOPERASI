CREATE TABLE `member_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`period` text NOT NULL,
	`project_code` text,
	`file_key` text NOT NULL,
	`file_name` text NOT NULL,
	`file_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`uploaded_by` text NOT NULL,
	`uploader_name` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_created` ON `member_reports` (`created_at`);--> statement-breakpoint
CREATE TABLE `staff_access_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`target_user_id` text NOT NULL,
	`role` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_access_requests` (
	`user_id` text PRIMARY KEY NOT NULL,
	`request_code` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`status` text NOT NULL,
	`requested_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `staff_access_requests_request_code_unique` ON `staff_access_requests` (`request_code`);--> statement-breakpoint
CREATE TABLE `staff_accounts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`role` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`granted_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_bootstrap` (
	`id` text PRIMARY KEY NOT NULL,
	`manager_id` text NOT NULL,
	`created_at` text NOT NULL
);
