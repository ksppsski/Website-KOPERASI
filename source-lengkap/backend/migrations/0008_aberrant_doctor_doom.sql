CREATE TABLE `capital_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`project_code` text NOT NULL,
	`quota` integer NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_offer_project` ON `capital_offers` (`owner`,`project_code`);--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `offer_id` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `offer_title` text;--> statement-breakpoint
ALTER TABLE `workflow_requests` ADD `project_code` text;--> statement-breakpoint
CREATE INDEX `idx_workflow_offer` ON `workflow_requests` (`owner`,`offer_id`,`status`);