-- Phase H B-1 — backfill emailVerified=true for pre-existing users.
--
-- We're switching Better Auth to require email verification at signup
-- (lib/auth/index.ts), but users created BEFORE this rule never had a
-- chance to verify. Forcing them to re-verify would break logins for
-- anyone with an active session, including admins. They predate the rule,
-- so we grandfather them as verified.
--
-- Idempotent: the WHERE clause only matches rows still in the legacy
-- unverified state, so re-applying the migration on a DB that already
-- ran it is a no-op (zero rows match).
--
-- Future signups (after this migration runs) will be created with the
-- column default (false), so this only affects the historical pile.
--
-- Why no `WHERE NOT EXISTS` schema guard: the `email_verified` column
-- was added in migration 0000 alongside the user table itself; it has
-- always been present. The idempotency comes from the row-level
-- predicate (`email_verified = false`), not a column existence check.
--
-- ─────────────────────────────────────────────────────────────────────────
-- HOW TO APPLY
-- ─────────────────────────────────────────────────────────────────────────
--
--     npm run db:migrate
--
-- Or via psql directly:
--
--     psql $DATABASE_URL -f lib/db/migrations/0017_backfill_email_verified.sql
--
-- ─────────────────────────────────────────────────────────────────────────
-- VERIFY — run after applying
-- ─────────────────────────────────────────────────────────────────────────
--
--     SELECT COUNT(*) AS unverified_remaining
--     FROM "user"
--     WHERE email_verified = false
--       AND created_at < NOW();
--
-- Expected output: zero rows for accounts created before this migration
-- ran. New accounts created afterwards may show up as the verification
-- pipeline catches up.
--
-- ─────────────────────────────────────────────────────────────────────────

UPDATE "user"
SET email_verified = true,
    updated_at = NOW()
WHERE email_verified = false;
