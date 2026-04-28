// Wipe external URLs that point to the legacy WordPress site.
//
// Usage:
//   node --env-file=.env.local scripts/fix-external-urls.mjs
//
// Targets any books.external_url or events.registration_url whose value
// contains "drkhaledghattass.com" (the old WordPress origin). Run this any
// time you re-seed from the legacy export so the new independent site never
// links back to the old one.

import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[fix-external-urls] DATABASE_URL not set.')
  process.exit(1)
}

const sql = neon(url)
const OLD_DOMAIN = '%drkhaledghattass.com%'

const books = await sql`
  UPDATE "books"
  SET external_url = NULL, updated_at = now()
  WHERE external_url LIKE ${OLD_DOMAIN}
  RETURNING id, slug
`
console.log(`[fix-external-urls] Cleared ${books.length} book(s).`)
for (const b of books) console.log(`  · book ${b.slug}`)

const events = await sql`
  UPDATE "events"
  SET registration_url = NULL, updated_at = now()
  WHERE registration_url LIKE ${OLD_DOMAIN}
  RETURNING id, slug
`
console.log(`[fix-external-urls] Cleared ${events.length} event(s).`)
for (const e of events) console.log(`  · event ${e.slug}`)

console.log('[fix-external-urls] Done.')
