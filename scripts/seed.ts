/**
 * Seed script — populate a real Neon DB with placeholder content.
 *
 * Requires DATABASE_URL set to a real connection string (not 'dummy').
 * Run via:  npm run db:seed
 *
 * Idempotent-ish: uses ON CONFLICT (slug) DO UPDATE to upsert content rows.
 * For one-row tables (settings, content blocks) it upserts on the unique key.
 */

// Load .env.local first (project-local), fall back to .env if it exists.
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
import * as schema from '../lib/db/schema'
import {
  placeholderArticles,
  placeholderBookings,
  placeholderBooks,
  placeholderContentBlocks,
  placeholderCorporateClients,
  placeholderCorporatePrograms,
  placeholderEvents,
  placeholderGallery,
  placeholderInterviews,
  placeholderSettings,
  placeholderTours,
} from '../lib/placeholder-data'

const url = process.env.DATABASE_URL
if (!url || url.includes('dummy')) {
  console.error('[seed] DATABASE_URL is missing or set to a dummy value.')
  console.error('[seed] Set a real Neon connection string in .env.local first.')
  process.exit(1)
}

const sql = neon(url)
const db = drizzle(sql, { schema })

async function main() {
  console.log('[seed] Connecting to', url!.replace(/:[^:@]+@/, ':***@'))

  console.log('[seed] Inserting articles…')
  for (const a of placeholderArticles) {
    await db
      .insert(schema.articles)
      .values({ ...a, id: undefined })
      .onConflictDoUpdate({
        target: schema.articles.slug,
        set: {
          titleAr: a.titleAr,
          titleEn: a.titleEn,
          excerptAr: a.excerptAr,
          excerptEn: a.excerptEn,
          contentAr: a.contentAr,
          contentEn: a.contentEn,
          coverImage: a.coverImage,
          category: a.category,
          status: a.status,
          featured: a.featured,
          orderIndex: a.orderIndex,
          publishedAt: a.publishedAt,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting books…')
  for (const b of placeholderBooks) {
    await db
      .insert(schema.books)
      .values({ ...b, id: undefined })
      .onConflictDoUpdate({
        target: schema.books.slug,
        set: {
          titleAr: b.titleAr,
          titleEn: b.titleEn,
          subtitleAr: b.subtitleAr,
          subtitleEn: b.subtitleEn,
          descriptionAr: b.descriptionAr,
          descriptionEn: b.descriptionEn,
          coverImage: b.coverImage,
          price: b.price,
          currency: b.currency,
          digitalFile: b.digitalFile,
          publisher: b.publisher,
          publicationYear: b.publicationYear,
          status: b.status,
          featured: b.featured,
          orderIndex: b.orderIndex,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting interviews…')
  for (const i of placeholderInterviews) {
    await db
      .insert(schema.interviews)
      .values({ ...i, id: undefined })
      .onConflictDoUpdate({
        target: schema.interviews.slug,
        set: {
          titleAr: i.titleAr,
          titleEn: i.titleEn,
          descriptionAr: i.descriptionAr,
          descriptionEn: i.descriptionEn,
          thumbnailImage: i.thumbnailImage,
          videoUrl: i.videoUrl,
          source: i.source,
          sourceAr: i.sourceAr,
          year: i.year,
          status: i.status,
          featured: i.featured,
          orderIndex: i.orderIndex,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting gallery items…')
  for (const g of placeholderGallery) {
    await db.insert(schema.gallery).values({ ...g, id: undefined })
  }

  console.log('[seed] Inserting events…')
  for (const e of placeholderEvents) {
    await db
      .insert(schema.events)
      .values({ ...e, id: undefined })
      .onConflictDoUpdate({
        target: schema.events.slug,
        set: {
          titleAr: e.titleAr,
          titleEn: e.titleEn,
          descriptionAr: e.descriptionAr,
          descriptionEn: e.descriptionEn,
          locationAr: e.locationAr,
          locationEn: e.locationEn,
          startDate: e.startDate,
          endDate: e.endDate,
          registrationUrl: e.registrationUrl,
          status: e.status,
          orderIndex: e.orderIndex,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Upserting site settings…')
  for (const s of placeholderSettings) {
    await db
      .insert(schema.siteSettings)
      .values({ key: s.key, value: s.value })
      .onConflictDoUpdate({
        target: schema.siteSettings.key,
        set: { value: s.value, updatedAt: new Date() },
      })
  }

  console.log('[seed] Upserting content blocks…')
  for (const cb of placeholderContentBlocks) {
    await db
      .insert(schema.contentBlocks)
      .values({
        key: cb.key,
        valueAr: cb.valueAr,
        valueEn: cb.valueEn,
        description: cb.description,
      })
      .onConflictDoUpdate({
        target: schema.contentBlocks.key,
        set: {
          valueAr: cb.valueAr,
          valueEn: cb.valueEn,
          description: cb.description,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting corporate programs…')
  for (const p of placeholderCorporatePrograms) {
    await db
      .insert(schema.corporatePrograms)
      .values({ ...p, id: undefined })
      .onConflictDoUpdate({
        target: schema.corporatePrograms.slug,
        set: {
          titleAr: p.titleAr,
          titleEn: p.titleEn,
          descriptionAr: p.descriptionAr,
          descriptionEn: p.descriptionEn,
          durationAr: p.durationAr,
          durationEn: p.durationEn,
          audienceAr: p.audienceAr,
          audienceEn: p.audienceEn,
          coverImage: p.coverImage,
          status: p.status,
          featured: p.featured,
          orderIndex: p.orderIndex,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting corporate clients…')
  for (const c of placeholderCorporateClients) {
    await db
      .insert(schema.corporateClients)
      .values(c)
      .onConflictDoUpdate({
        target: schema.corporateClients.id,
        set: {
          name: c.name,
          nameAr: c.nameAr,
          logoUrl: c.logoUrl,
          websiteUrl: c.websiteUrl,
          status: c.status,
          orderIndex: c.orderIndex,
          updatedAt: new Date(),
        },
      })
  }

  // ── Booking domain — tours + bookings (Reconsider course + 8 sessions) ──
  console.log('[seed] Inserting tours…')
  for (const t of placeholderTours) {
    await db
      .insert(schema.tours)
      .values({ ...t, id: undefined })
      .onConflictDoUpdate({
        target: schema.tours.slug,
        set: {
          titleAr: t.titleAr,
          titleEn: t.titleEn,
          cityAr: t.cityAr,
          cityEn: t.cityEn,
          countryAr: t.countryAr,
          countryEn: t.countryEn,
          regionAr: t.regionAr,
          regionEn: t.regionEn,
          date: t.date,
          venueAr: t.venueAr,
          venueEn: t.venueEn,
          descriptionAr: t.descriptionAr,
          descriptionEn: t.descriptionEn,
          externalBookingUrl: t.externalBookingUrl,
          coverImage: t.coverImage,
          attendedCount: t.attendedCount,
          isActive: t.isActive,
          displayOrder: t.displayOrder,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Inserting bookings (Reconsider + online sessions)…')
  for (const b of placeholderBookings) {
    await db
      .insert(schema.bookings)
      .values({ ...b, id: undefined })
      .onConflictDoUpdate({
        target: schema.bookings.slug,
        set: {
          productType: b.productType,
          titleAr: b.titleAr,
          titleEn: b.titleEn,
          descriptionAr: b.descriptionAr,
          descriptionEn: b.descriptionEn,
          coverImage: b.coverImage,
          priceUsd: b.priceUsd,
          currency: b.currency,
          nextCohortDate: b.nextCohortDate,
          cohortLabelAr: b.cohortLabelAr,
          cohortLabelEn: b.cohortLabelEn,
          durationMinutes: b.durationMinutes,
          formatAr: b.formatAr,
          formatEn: b.formatEn,
          maxCapacity: b.maxCapacity,
          // bookedCount intentionally NOT overwritten on conflict — preserves
          // any production seat counts. Re-running seed locally is harmless;
          // re-running on a deployed DB won't reset capacity counters.
          bookingState: b.bookingState,
          displayOrder: b.displayOrder,
          isActive: b.isActive,
          updatedAt: new Date(),
        },
      })
  }

  console.log('[seed] Done.')
}

main().catch((err) => {
  console.error('[seed] Failed:', err)
  process.exit(1)
})
