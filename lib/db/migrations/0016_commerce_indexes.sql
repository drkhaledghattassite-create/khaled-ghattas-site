-- Phase G P0 — commerce hot-path indexes for 100k DAU readiness.
--
-- Three indexes that cover queries running on every authenticated dashboard
-- render and on every /api/content/access call. Without them, both surfaces
-- sequentially scan the orders / order_items tables. Adequate at launch with
-- ~100 orders; degrades visibly past ~50k rows.
--
-- Index 1 — orders_user_created_idx (P0-1)
--   Covers: getOrdersByUserId            (lib/db/queries.ts:600)
--           getLibraryEntriesByUserId    (lib/db/queries.ts:953)
--           userOwnsProduct              (lib/db/queries.ts:1004)
--   Filter: WHERE orders.user_id = $1   ORDER BY created_at DESC
--   Composite (user_id, created_at DESC) lets the planner satisfy both
--   the filter and the sort from a single index walk.
--
-- Index 2 — order_items_order_idx (P0-2)
--   Covers: getLibraryEntriesByUserId    (lib/db/queries.ts:953)
--           getOrderItemsWithBooks       (lib/db/queries.ts:1018)
--           userOwnsProduct              (lib/db/queries.ts:1004)
--   Filter: JOIN order_items ON order_id = orders.id
--   Postgres does NOT auto-index FK columns; this is the missing default.
--
-- Index 3 — order_items_book_idx (P0-3)
--   Covers: userOwnsProduct              (lib/db/queries.ts:1004)
--   Filter: WHERE order_items.book_id = $1
--   Kept separate from order_items_order_idx so the planner can pick the
--   more selective column per query rather than being forced into a
--   leading-column composite.
--
-- ─────────────────────────────────────────────────────────────────────────
-- HOW TO APPLY
-- ─────────────────────────────────────────────────────────────────────────
--
--     npm run db:migrate
--
-- Or via psql directly (e.g. when the Drizzle migrator isn't available):
--
--     psql $DATABASE_URL -f lib/db/migrations/0016_commerce_indexes.sql
--
-- Both paths are safe at current row counts. The plain `CREATE INDEX`
-- statements take a brief ACCESS EXCLUSIVE lock on each table; at
-- launch volume (orders/order_items effectively empty) the lock is
-- microseconds. If this migration is ever re-applied against a
-- populated production database where the lock matters, switch the
-- statements to `CREATE INDEX CONCURRENTLY` AND apply manually via
-- psql (Drizzle's migrator wraps each file in a transaction, and
-- CONCURRENTLY is rejected inside a transaction block).
--
-- ─────────────────────────────────────────────────────────────────────────
-- VERIFY — run after applying to confirm all three indexes exist
-- ─────────────────────────────────────────────────────────────────────────
--
--     SELECT indexname FROM pg_indexes
--     WHERE indexname IN ('orders_user_created_idx',
--                         'order_items_order_idx',
--                         'order_items_book_idx');
--
-- Expected output: 3 rows, one per index name.
--
-- ─────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS "orders_user_created_idx"
  ON "orders" ("user_id", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_order_idx"
  ON "order_items" ("order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "order_items_book_idx"
  ON "order_items" ("book_id");
