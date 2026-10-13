CREATE TABLE `avalist_email_access` (
	`email` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`bound_user_id` text,
	`claim_token` text,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`claimed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `avalist_email_access_person_id_unique` ON `avalist_email_access` (`person_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `avalist_email_access_bound_user_id_unique` ON `avalist_email_access` (`bound_user_id`);
--> statement-breakpoint
CREATE TRIGGER avalist_email_binding_immutable BEFORE UPDATE ON avalist_email_access
BEGIN
 SELECT RAISE(ABORT,'AVALIST_EMAIL_BINDING_IMMUTABLE') WHERE NEW.email<>OLD.email OR NEW.person_id<>OLD.person_id OR (OLD.bound_user_id IS NOT NULL AND (NEW.bound_user_id IS NOT OLD.bound_user_id OR NEW.claim_token IS NOT OLD.claim_token));
END;

--> statement-breakpoint
CREATE TRIGGER avalist_clock_email_claim AFTER UPDATE ON avalist_email_access
BEGIN
 INSERT INTO avalist_clock(id,revision) VALUES('main',1) ON CONFLICT(id) DO UPDATE SET revision=revision+1;
END;
