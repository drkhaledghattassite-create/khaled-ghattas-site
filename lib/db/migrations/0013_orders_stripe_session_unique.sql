-- QA P0 — partial unique index on orders.stripe_session_id.
--
-- Background:
--   `createOrderFromStripeSession` previously used a check-then-insert
--   pattern. On duplicate Stripe webhook delivery (which happens regularly
--   — Stripe retries on any 5xx from our endpoint, and our handler returns
--   500 if `db` blips for a second) two concurrent webhook deliveries
--   could both pass the SELECT and both write an `orders` row + its
--   `order_items` cascade, doubling library entries and sending two
--   post-purchase emails for one payment.
--
--   The `gifts.stripe_session_id` and `booking_orders.stripe_session_id`
--   columns both already have unique indexes for this exact reason.
--   `orders.stripe_session_id` was the outlier.
--
-- Why a PARTIAL index (WHERE stripe_session_id IS NOT NULL):
--   Gift-claim orders (the recipient redeeming a BOOK or SESSION gift)
--   are written by `createGiftClaimOrder` without a Stripe session id —
--   the payment was the sender's Stripe charge, the claim itself is a
--   server-side entitlement grant with no Stripe round-trip. NULLs would
--   collide on a non-partial unique constraint; the partial-index `WHERE`
--   excludes them from the uniqueness check entirely.
--
-- Safe to apply post-deploy: a duplicate row that already exists in prod
-- would prevent index creation. Run a manual check first:
--   SELECT stripe_session_id, COUNT(*)
--   FROM orders
--   WHERE stripe_session_id IS NOT NULL
--   GROUP BY stripe_session_id
--   HAVING COUNT(*) > 1;
-- and de-duplicate (keep earliest, delete the rest with their order_items
-- cascading) before applying this migration.

CREATE UNIQUE INDEX IF NOT EXISTS "orders_stripe_session_idx"
  ON "orders" ("stripe_session_id")
  WHERE "stripe_session_id" IS NOT NULL;
