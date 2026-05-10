/**
 * Seed Phase C1 tests-domain data into Neon.
 *
 * Requires DATABASE_URL set to a real connection string (not 'dummy').
 * Run via:  npx tsx scripts/seed-tests.ts
 *
 * Idempotent: deletes the three placeholder tests by slug first (cascades to
 * questions, options, attempts, answers via FK ON DELETE CASCADE), then inserts
 * fresh rows with the placeholder IDs so cross-references stay stable.
 */

try {
  process.loadEnvFile('.env.local')
} catch {
  /* fall through */
}
try {
  process.loadEnvFile('.env')
} catch {
  /* fall through */
}

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { inArray } from 'drizzle-orm'
import * as schema from '../lib/db/schema'
import {
  placeholderTests,
  placeholderTestQuestions,
  placeholderTestOptions,
} from '../lib/placeholder-data'

const url = process.env.DATABASE_URL
if (!url || url.includes('dummy')) {
  console.error('[seed-tests] DATABASE_URL is missing or set to a dummy value.')
  process.exit(1)
}

const sql = neon(url)
const db = drizzle(sql, { schema })

async function main() {
  const slugs = placeholderTests.map((t) => t.slug)
  console.log(`[seed-tests] Removing existing tests by slug: ${slugs.join(', ')}`)

  await db.delete(schema.tests).where(inArray(schema.tests.slug, slugs))

  console.log(`[seed-tests] Inserting ${placeholderTests.length} tests…`)
  await db.insert(schema.tests).values(
    placeholderTests.map((t) => ({
      id: t.id,
      slug: t.slug,
      titleAr: t.titleAr,
      titleEn: t.titleEn,
      introAr: t.introAr,
      introEn: t.introEn,
      descriptionAr: t.descriptionAr,
      descriptionEn: t.descriptionEn,
      category: t.category,
      estimatedMinutes: t.estimatedMinutes,
      coverImageUrl: t.coverImageUrl,
      priceUsd: t.priceUsd === null ? null : String(t.priceUsd),
      isPaid: t.isPaid,
      isPublished: t.isPublished,
      displayOrder: t.displayOrder,
      createdAt: new Date(t.createdAt),
      updatedAt: new Date(t.updatedAt),
    })),
  )

  console.log(`[seed-tests] Inserting ${placeholderTestQuestions.length} questions…`)
  await db.insert(schema.testQuestions).values(
    placeholderTestQuestions.map((q) => ({
      id: q.id,
      testId: q.testId,
      displayOrder: q.displayOrder,
      promptAr: q.promptAr,
      promptEn: q.promptEn,
      explanationAr: q.explanationAr,
      explanationEn: q.explanationEn,
      createdAt: new Date(q.createdAt),
      updatedAt: new Date(q.updatedAt),
    })),
  )

  console.log(`[seed-tests] Inserting ${placeholderTestOptions.length} options…`)
  await db.insert(schema.testOptions).values(
    placeholderTestOptions.map((o) => ({
      id: o.id,
      questionId: o.questionId,
      displayOrder: o.displayOrder,
      labelAr: o.labelAr,
      labelEn: o.labelEn,
      isCorrect: o.isCorrect,
      createdAt: new Date(o.createdAt),
    })),
  )

  console.log('[seed-tests] Done.')
}

main().catch((err) => {
  console.error('[seed-tests] Failed:', err)
  process.exit(1)
})
