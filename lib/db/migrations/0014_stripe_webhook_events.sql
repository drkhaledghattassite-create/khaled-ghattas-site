-- QA P2 — Stripe webhook event idempotency table.
--
-- Background:
--   Stripe retries webhook delivery on any 5xx response (and sometimes
--   re-delivers under network conditions even after a 200). The existing
--   per-branch SQL guards (status='PENDING' gated UPDATEs, unique
--   stripe_session_id indexes on orders / booking_orders / gifts) prevent
--   double-processing for the common case: same event delivered twice.
--
--   But Stripe also delivers DIFFERENT events for the same payment over
--   time — e.g. `charge.refunded` followed days later by a delayed
--   `payment_intent.succeeded` from a chargeback reversal. The per-branch
--   guards don't track event chains; they only know "is the current row
--   in the right state for this branch's UPDATE." A reversal arriving
--   after a refund could flip REFUNDED → PAID in some branches without
--   this table.
--
--   The handler now stamps every event id into this table via
--   INSERT … ON CONFLICT (event_id) DO NOTHING and short-circuits when
--   the INSERT returns no row. The `event_type` column is purely for
--   ops triage / replay-detection metrics; the `processed_at` column is
--   indexed alongside type so admin queries like "show recent refunds"
--   stay fast.
--
-- Safe to apply: no foreign keys, no migrations of existing data. Stripe
-- event ids are opaque `evt_…` strings; the PK is `text` (no CHECK).

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
  "event_id" text PRIMARY KEY NOT NULL,
  "event_type" text NOT NULL,
  "processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "stripe_webhook_events_type_processed_idx"
  ON "stripe_webhook_events" ("event_type", "processed_at" DESC);
