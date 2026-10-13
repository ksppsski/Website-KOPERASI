CREATE TABLE `member_numbers` (
	`serial` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`profile_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_numbers_profile_id_unique` ON `member_numbers` (`profile_id`);--> statement-breakpoint
ALTER TABLE `member_profiles` ADD `member_number` text;--> statement-breakpoint
CREATE UNIQUE INDEX `member_profiles_member_number_unique` ON `member_profiles` (`member_number`);