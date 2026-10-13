ALTER TABLE `capital_offers` ADD `fulfilled_at` text;--> statement-breakpoint
CREATE INDEX `idx_workflow_offer_reservations` ON `workflow_requests` (`offer_id`,`status`);
--> statement-breakpoint
-- Record fulfillment in the same transaction as the reservation, including renewals.
CREATE TRIGGER capital_offer_fulfilled_insert AFTER INSERT ON workflow_requests
WHEN NEW.offer_id IS NOT NULL AND NEW.status NOT IN ('rejected','cancelled')
BEGIN
  UPDATE capital_offers SET fulfilled_at=COALESCE(fulfilled_at,NEW.created_at)
  WHERE id=NEW.offer_id AND quota<=(
    SELECT COALESCE(SUM(amount),0) FROM workflow_requests
    WHERE offer_id=NEW.offer_id AND status NOT IN ('rejected','cancelled')
  );
END;
--> statement-breakpoint
-- Document/status updates that retain the same reservation do not restart the clock.
CREATE TRIGGER capital_offer_fulfilled_update AFTER UPDATE OF amount,status,offer_id ON workflow_requests
WHEN NEW.amount IS NOT OLD.amount OR NEW.offer_id IS NOT OLD.offer_id
  OR (NEW.status IN ('rejected','cancelled'))<>(OLD.status IN ('rejected','cancelled'))
BEGIN
  UPDATE capital_offers SET fulfilled_at=CASE WHEN quota<=(
    SELECT COALESCE(SUM(amount),0) FROM workflow_requests
    WHERE offer_id=capital_offers.id AND status NOT IN ('rejected','cancelled')
  ) THEN COALESCE(fulfilled_at,NEW.updated_at) ELSE NULL END
  WHERE id IN (OLD.offer_id,NEW.offer_id);
END;
--> statement-breakpoint
CREATE TRIGGER capital_offer_fulfilled_delete AFTER DELETE ON workflow_requests
WHEN OLD.offer_id IS NOT NULL
BEGIN
  UPDATE capital_offers SET fulfilled_at=NULL
  WHERE id=OLD.offer_id AND quota>(
    SELECT COALESCE(SUM(amount),0) FROM workflow_requests
    WHERE offer_id=OLD.offer_id AND status NOT IN ('rejected','cancelled')
  );
END;
