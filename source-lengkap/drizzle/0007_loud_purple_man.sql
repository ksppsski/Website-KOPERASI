CREATE TABLE `savings_credits` (
	`owner` text NOT NULL,
	`source_kind` text NOT NULL,
	`source_id` text NOT NULL,
	`basic` integer DEFAULT 0 NOT NULL,
	`mandatory` integer DEFAULT 0 NOT NULL,
	`other` integer DEFAULT 0 NOT NULL,
	`accepted_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_savings_source` ON `savings_credits` (`owner`,`source_kind`,`source_id`);