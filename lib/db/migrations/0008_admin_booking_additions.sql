-- Phase A2 — admin booking tooling
--
-- The only schema change in A2: a nullable timestamp on tour_suggestions
-- so admins can mark a suggestion "reviewed" (separate from the existing
-- soft-delete via row removal). Additive ALTER, safe to apply to a
-- production DB with existing data — every existing row simply has
-- reviewed_at = NULL until an admin marks it.
ALTER TABLE "tour_suggestions" ADD COLUMN "reviewed_at" timestamp with time zone;
