/**
 * Clear all gallery rows from the database.
 * Run via:  npx tsx scripts/clear-gallery.ts
 */

try { process.loadEnvFile('.env.local') } catch { /* fall through */ }
try { process.loadEnvFile('.env') } catch { /* fall through */ }

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../lib/db/schema'

const url = process.env.DATABASE_URL
if (!url || url.includes('dummy')) {
  console.error('[clear-gallery] DATABASE_URL is missing or set to a dummy value.')
  process.exit(1)
}

const sql = neon(url)
const db = drizzle(sql, { schema })

async function main() {
  console.log('[clear-gallery] Deleting all gallery rows…')
  await db.delete(schema.gallery)
  console.log('[clear-gallery] Done — gallery table is now empty.')
}

main().catch((err) => {
  console.error('[clear-gallery] Failed:', err)
  process.exit(1)
})
