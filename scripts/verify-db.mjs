// Read-only check: lists tables + verifies bio/preferences columns exist on user.
//
// Usage: node --env-file=.env.local scripts/verify-db.mjs

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' ORDER BY table_name
`
console.log('Tables in public:', tables.map((t) => t.table_name))

const userCols = await sql`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'user'
  ORDER BY ordinal_position
`
console.log('user columns:', userCols.map((c) => c.column_name))

const bookCols = await sql`
  SELECT column_name, is_nullable FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'books'
  AND column_name IN ('price', 'product_type')
`
console.log('books price/product_type:', bookCols)
