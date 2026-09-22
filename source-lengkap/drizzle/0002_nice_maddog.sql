CREATE TABLE `contract_numbers` (
	`serial` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_numbers_request_id_unique` ON `contract_numbers` (`request_id`);--> statement-breakpoint
CREATE TABLE `maintenance_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`completed_at` text NOT NULL
);
