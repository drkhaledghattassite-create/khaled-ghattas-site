/**
 * Seed session items for the two paid session products.
 *
 * ──────────────────────────────────────────────────────
 * FILL IN YOUTUBE URLS BEFORE RUNNING
 * ──────────────────────────────────────────────────────
 * Replace every 'PASTE_YOUTUBE_URL_HERE' below with
 * a real YouTube URL or 11-char video ID, e.g.:
 *   'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
 *   or just the ID: 'dQw4w9WgXcQ'
 *
 * After filling in, run:
 *   npx tsx scripts/seed-session-items.ts
 *
 * Idempotent — re-running replaces the items cleanly.
 * ──────────────────────────────────────────────────────
 */

// ── CONFIGURE CONTENT HERE ───────────────────────────────────────────────────

type ItemDef = {
  type: 'VIDEO' | 'AUDIO' | 'PDF'
  title: string
  storageKey: string
  durationSeconds?: number
}

const SESSIONS: Record<string, ItemDef[]> = {
  'session-story-before-the-end': [
    {
      type: 'VIDEO',
      title: 'المحاضرة الرئيسية',
      storageKey: 'jNQXAC9IVRw',
      durationSeconds: undefined,
    },
    {
      type: 'AUDIO',
      title: 'تأمل صوتي',
      storageKey: 'audio-1.mp3',
      durationSeconds: 1800,
    },
    {
      type: 'PDF',
      title: 'مواد الجلسة',
      storageKey: 'book-1.pdf',
      durationSeconds: undefined,
    },
  ],
  'session-risky-experience': [
    {
      type: 'VIDEO',
      title: 'المحاضرة الرئيسية',
      storageKey: 'dQw4w9WgXcQ',
      durationSeconds: undefined,
    },
    {
      type: 'AUDIO',
      title: 'تأمل صوتي',
      storageKey: 'audio-2.mp3',
      durationSeconds: 1800,
    },
    {
      type: 'PDF',
      title: 'مواد الجلسة',
      storageKey: 'book-1.pdf',
      durationSeconds: undefined,
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────

try { process.loadEnvFile('.env.local') } catch { /* fall through */ }
try { process.loadEnvFile('.env') } catch { /* fall through */ }

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../lib/db/schema'

const url = process.env.DATABASE_URL
if (!url || url.includes('dummy')) {
  console.error('[seed-session-items] DATABASE_URL is missing or set to a dummy value.')
  process.exit(1)
}

const unfilledVideos = Object.values(SESSIONS)
  .flat()
  .filter(i => i.type === 'VIDEO' && i.storageKey === 'PASTE_YOUTUBE_URL_HERE')

if (unfilledVideos.length > 0) {
  console.warn(
    `[seed-session-items] WARNING: ${unfilledVideos.length} VIDEO item(s) still have placeholder storageKey.`,
  )
  console.warn('[seed-session-items] The session viewer will show a "Video unavailable" embed for those.')
  console.warn('[seed-session-items] Replace PASTE_YOUTUBE_URL_HERE and re-run to fix.')
}

const sql = neon(url)
const db = drizzle(sql, { schema })

async function main() {
  for (const [slug, items] of Object.entries(SESSIONS)) {
    const [session] = await db
      .select({ id: schema.books.id, titleAr: schema.books.titleAr })
      .from(schema.books)
      .where(eq(schema.books.slug, slug))
      .limit(1)

    if (!session) {
      console.error(`[seed-session-items] Session not found in DB: ${slug}`)
      console.error('[seed-session-items] Make sure you ran npm run db:seed first.')
      continue
    }

    console.log(`[seed-session-items] Seeding "${session.titleAr}" (${session.id})…`)

    // Delete existing items for this session so re-runs are clean.
    await db.delete(schema.sessionItems).where(eq(schema.sessionItems.sessionId, session.id))

    // Insert fresh items in order.
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      await db.insert(schema.sessionItems).values({
        sessionId: session.id,
        itemType: item.type,
        title: item.title,
        storageKey: item.storageKey,
        durationSeconds: item.durationSeconds ?? null,
        sortOrder: i + 1,
        createdAt: new Date(),
      })
      console.log(`  + [${item.type}] ${item.title} (${item.storageKey})`)
    }
  }

  console.log('[seed-session-items] Done.')
}

main().catch((err) => {
  console.error('[seed-session-items] Failed:', err)
  process.exit(1)
})
