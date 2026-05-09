import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import * as schema from './schema'

/**
 * Drizzle client — Neon WebSocket Pool driver.
 *
 * Why Pool / neon-serverless instead of neon-http:
 *   The booking flow's race-free seat-hold logic uses a multi-statement
 *   transaction with `SELECT ... FOR UPDATE` on the booking row (see
 *   `createBookingHold` in queries.ts). The HTTP driver is stateless per
 *   request and explicitly throws `"No transactions support in neon-http
 *   driver"` on any `db.transaction()` call. The serverless WebSocket driver
 *   maintains a stateful connection within the request and supports
 *   transactions natively.
 *
 * The Drizzle API is identical between drivers, so all existing query
 * helpers continue to work without changes.
 *
 * WebSocket constructor:
 *   - Node 22+ has native `globalThis.WebSocket` and the `ws` shim is a no-op
 *     fallback.
 *   - Node 20 (Netlify's default) requires the explicit `ws` package, which
 *     we wire up unconditionally so production works regardless of runtime.
 *   - Edge runtimes have native WebSocket and ignore this assignment.
 *
 * Lazy connection:
 *   `new Pool(...)` does not open a socket until a query runs. Modules that
 *   import `db` without invoking it (e.g., during build) never touch the
 *   network. Placeholder mode is still gated upstream in queries.ts via
 *   `HAS_DB`, so this file never speaks to a real DB when DATABASE_URL is
 *   missing or set to a 'dummy' value.
 */

// Configure once per process. Idempotent — re-assignment of the same
// constructor is harmless if multiple modules import this file via
// different bundle paths.
if (typeof globalThis.WebSocket === 'undefined') {
  neonConfig.webSocketConstructor = ws
}

const connectionString =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')
    ? process.env.DATABASE_URL
    : 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

const pool = new Pool({ connectionString })
export const db = drizzle(pool, { schema })

export type Database = typeof db
export * from './schema'
