CREATE TABLE `staff_activity` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`event_key` text NOT NULL,
	`target_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`role` text,
	`actor_id` text,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_owner_event` ON `staff_activity` (`owner`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_activity_owner_sequence` ON `staff_activity` (`owner`,`sequence`);