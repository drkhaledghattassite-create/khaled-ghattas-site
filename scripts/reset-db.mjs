// One-shot destructive reset: drops the public schema and recreates it.
// Run after this with: npm run db:migrate
//
// Usage: node --env-file=.env.local scripts/reset-db.mjs

import { neon } from '@neondatabase/serverless'

const url = process.env.DATABASE_URL
if (!url || url.includes('dummy') || url.includes('placeholder')) {
  console.error('[reset-db] DATABASE_URL not set to a real Neon URL.')
  process.exit(1)
}

const sql = neon(url)

console.log('[reset-db] dropping schema public CASCADE…')
await sql`DROP SCHEMA IF EXISTS public CASCADE`
console.log('[reset-db] recreating schema public…')
await sql`CREATE SCHEMA public`
await sql`GRANT ALL ON SCHEMA public TO neondb_owner`
await sql`GRANT ALL ON SCHEMA public TO public`
console.log('[reset-db] done. Run: npm run db:migrate')
