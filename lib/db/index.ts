import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

/**
 * Lazy-init Drizzle client.
 *
 * Always exports a `db` instance so module imports never crash even when
 * `DATABASE_URL` is missing or set to a placeholder. The actual network
 * call only happens when a query method is invoked — and `queries.ts`
 * gates every call behind a `HAS_DB` check, so placeholder mode never
 * touches the network.
 */
const connectionString =
  process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')
    ? process.env.DATABASE_URL
    : 'postgresql://placeholder:placeholder@localhost:5432/placeholder'

const sql = neon(connectionString)
export const db = drizzle(sql, { schema })

export type Database = typeof db
export * from './schema'
