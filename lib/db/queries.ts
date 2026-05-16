/**
 * Unified data access layer.
 *
 * Single import point for all data. Each function ships a Drizzle path
 * (when DATABASE_URL is set to a real connection) and a placeholder
 * fallback (when it is empty or set to a DUMMY value).
 *
 * Pages and components must import from here — never directly from
 * `placeholder-data.ts`.
 */

import { and, asc, desc, eq, gt, ilike, inArray, lte, ne, or, sql } from 'drizzle-orm'
import { randomBytes } from 'node:crypto'
import { revalidateTag } from 'next/cache'
import { db } from '.'
import {
  articles,
  bookingInterest,
  bookingOrders,
  bookings,
  bookingsPendingHolds,
  books,
  contactMessages,
  contentBlocks,
  corporateClients,
  corporatePrograms,
  corporateRequests,
  emailQueue,
  events,
  gallery,
  gifts,
  interviews,
  mediaProgress,
  orderItems,
  orders,
  pdfBookmarks,
  readingProgress,
  sessionItems,
  siteSettings,
  stripeWebhookEvents,
  subscribers,
  testAttemptAnswers,
  testAttempts,
  testOptions,
  testQuestions,
  tests,
  tours,
  tourSuggestions,
  userQuestions,
  users,
  type Article,
  type ArticleCategory,
  type Book,
  type Booking,
  type BookingInterest,
  type BookingOrder,
  type BookingProductType,
  type BookingState,
  type ContactMessage,
  type ContentBlock,
  type CorporateClient,
  type CorporateProgram,
  type CorporateRequest,
  type CorporateRequestStatus,
  type EmailQueueRow,
  type EmailStatus,
  type Event,
  type GalleryItem,
  type Gift,
  type GiftItemType,
  type GiftSource,
  type GiftStatus,
  // NewGift kept available for callers via the type-export block below; the
  // internal createGift helper uses an explicit input type instead.
  type Interview,
  type MessageStatus,
  type NewArticle,
  type NewBook,
  type NewCorporateClient,
  type NewCorporateProgram,
  type NewEvent,
  type NewGalleryItem,
  type NewInterview,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PdfBookmark,
  type SessionItem,
  type SiteSetting,
  type Subscriber,
  type SubscriberStatus,
  type Test,
  type TestAttempt,
  type TestAttemptAnswer,
  type TestOption,
  type TestQuestion,
  type Tour,
  type TourSuggestion,
  type User,
  type UserQuestion,
  type UserRole,
  type QuestionStatus,
} from './schema'
import {
  coerceSettings,
  DEFAULT_SETTINGS,
  mergeSettings,
} from '../site-settings/defaults'
import {
  SITE_CONFIG_KEY,
  SITE_SETTINGS_CACHE_TAG,
  type SiteSettings,
} from '../site-settings/types'
import type { SiteSettingsPatch } from '../site-settings/zod'
import {
  placeholderArticles,
  placeholderBookingInterest,
  placeholderBookingOrders,
  placeholderBookings,
  placeholderBooks,
  placeholderContactMessages,
  placeholderContentBlocks,
  placeholderCorporateClients,
  placeholderCorporatePrograms,
  placeholderCorporateRequests,
  placeholderEvents,
  placeholderGallery,
  placeholderInterviews,
  placeholderOrders,
  placeholderSettings,
  placeholderSubscribers,
  placeholderTestOptions,
  placeholderTestQuestions,
  placeholderTests,
  placeholderTourSuggestions,
  placeholderTours,
  placeholderUsers,
} from '../placeholder-data'
import { MOCK_AUTH_ENABLED } from '../auth/mock'
import { readStore, writeStore } from './mock-store'

const HAS_DB =
  !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('dummy')

const noDb = (op: string) => {
  console.warn(`[queries] ${op}: no DATABASE_URL — skipped (placeholder mode)`)
}

// Mock session IDs ('1', '2', '3') aren't valid UUIDs. Guard before issuing
// SQL against uuid columns so a real DB doesn't error on cast.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isUuid = (s: string) => UUID_RE.test(s)

const byOrder = <T extends { orderIndex: number }>(a: T, b: T) =>
  a.orderIndex - b.orderIndex

/* ──────────────────────────────────────────────────────────────────────────
 * Articles
 * ──────────────────────────────────────────────────────────────────────── */

export type GetArticlesOptions = {
  limit?: number
  featured?: boolean
  category?: ArticleCategory
}

export async function getArticles(options: GetArticlesOptions = {}): Promise<Article[]> {
  const { limit, featured, category } = options
  if (HAS_DB) {
    try {
      const conditions = [eq(articles.status, 'PUBLISHED')]
      if (featured !== undefined) conditions.push(eq(articles.featured, featured))
      if (category) conditions.push(eq(articles.category, category))
      return await db
        .select()
        .from(articles)
        .where(and(...conditions))
        .orderBy(desc(articles.publishedAt), articles.orderIndex)
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getArticles] DB error, falling back to placeholders:', err)
    }
  }
  let rows = placeholderArticles
    .filter((a) => a.status === 'PUBLISHED')
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
  if (featured !== undefined) rows = rows.filter((a) => a.featured === featured)
  if (category) rows = rows.filter((a) => a.category === category)
  return limit ? rows.slice(0, limit) : rows
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (HAS_DB) {
    try {
      const [row] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
      return row ?? null
    } catch (err) {
      console.error('[getArticleBySlug] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderArticles.find((a) => a.slug === slug) ?? null
}

export async function getRelatedArticles(slug: string, count = 3): Promise<Article[]> {
  if (HAS_DB) {
    try {
      return await db
        .select()
        .from(articles)
        .where(and(ne(articles.slug, slug), eq(articles.status, 'PUBLISHED')))
        .orderBy(desc(articles.publishedAt))
        .limit(count)
    } catch (err) {
      console.error('[getRelatedArticles] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderArticles
    .filter((a) => a.slug !== slug && a.status === 'PUBLISHED')
    .slice(0, count)
}

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim()
  if (!q) return []
  if (HAS_DB) {
    const pattern = `%${q}%`
    return db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.status, 'PUBLISHED'),
          or(
            ilike(articles.titleAr, pattern),
            ilike(articles.titleEn, pattern),
            ilike(articles.excerptAr, pattern),
            ilike(articles.excerptEn, pattern),
          ),
        ),
      )
      .limit(20)
  }
  const needle = q.toLowerCase()
  return placeholderArticles.filter((a) =>
    [a.titleAr, a.titleEn, a.excerptAr, a.excerptEn].some((t) =>
      t.toLowerCase().includes(needle),
    ),
  )
}

export async function incrementArticleViews(id: string): Promise<void> {
  if (!isUuid(id)) return
  if (!HAS_DB) {
    noDb(`incrementArticleViews(${id})`)
    return
  }
  await db
    .update(articles)
    .set({ viewCount: sql`${articles.viewCount} + 1` })
    .where(eq(articles.id, id))
}

/* ──────────────────────────────────────────────────────────────────────────
 * Books
 * ──────────────────────────────────────────────────────────────────────── */

export type GetBooksOptions = {
  limit?: number
  featured?: boolean
  /**
   * Narrow to BOOK or SESSION rows. Useful on surfaces that mix them in a
   * shared limit budget (the homepage previously fetched 10 mixed rows and
   * — if BOOKs filled the result — surfaced zero or one SESSIONs in the
   * "محاضرات مسجّلة" carousel). Pass this when you need at least N of a
   * specific type to land in the response.
   */
  productType?: 'BOOK' | 'SESSION'
}

export async function getBooks(options: GetBooksOptions = {}): Promise<Book[]> {
  const { limit, featured, productType } = options
  if (HAS_DB) {
    try {
      const conditions = [eq(books.status, 'PUBLISHED')]
      if (featured !== undefined) conditions.push(eq(books.featured, featured))
      if (productType !== undefined) conditions.push(eq(books.productType, productType))
      return await db
        .select()
        .from(books)
        .where(and(...conditions))
        .orderBy(books.orderIndex)
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getBooks] DB error, falling back to placeholders:', err)
    }
  }
  let rows = placeholderBooks.filter((b) => b.status === 'PUBLISHED').slice().sort(byOrder)
  if (featured !== undefined) rows = rows.filter((b) => b.featured === featured)
  if (productType !== undefined) rows = rows.filter((b) => b.productType === productType)
  return limit ? rows.slice(0, limit) : rows
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  if (HAS_DB) {
    try {
      const [row] = await db.select().from(books).where(eq(books.slug, slug)).limit(1)
      return row ?? null
    } catch (err) {
      console.error('[getBookBySlug] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderBooks.find((b) => b.slug === slug) ?? null
}

export async function getBookById(id: string): Promise<Book | null> {
  if (HAS_DB && isUuid(id)) {
    try {
      const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1)
      if (row) return row
    } catch (err) {
      console.error('[getBookById] DB error, falling back to placeholders:', err)
    }
  }
  // Falls back to placeholders when: no DB, DB error, DB miss in mock-auth
  // dev mode (so placeholder routes are exercisable on an un-seeded Neon),
  // or invalid id. In real prod (HAS_DB && !MOCK_AUTH_ENABLED), a DB miss
  // still falls through here, but the placeholder UUIDs won't exist in
  // production traffic — so this is effectively a dev-only escape hatch.
  return placeholderBooks.find((b) => b.id === id) ?? null
}

export async function getRelatedBooks(slug: string, count = 3): Promise<Book[]> {
  if (HAS_DB) {
    try {
      return await db
        .select()
        .from(books)
        .where(and(ne(books.slug, slug), eq(books.status, 'PUBLISHED')))
        .orderBy(books.orderIndex)
        .limit(count)
    } catch (err) {
      console.error('[getRelatedBooks] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderBooks
    .filter((b) => b.slug !== slug && b.status === 'PUBLISHED')
    .slice(0, count)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Interviews
 * ──────────────────────────────────────────────────────────────────────── */

export type GetInterviewsOptions = { limit?: number; featured?: boolean }

export async function getInterviews(
  options: GetInterviewsOptions = {},
): Promise<Interview[]> {
  const { limit, featured } = options
  if (HAS_DB) {
    try {
      const conditions = [eq(interviews.status, 'PUBLISHED')]
      if (featured !== undefined) conditions.push(eq(interviews.featured, featured))
      return await db
        .select()
        .from(interviews)
        .where(and(...conditions))
        .orderBy(desc(interviews.year), interviews.orderIndex)
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getInterviews] DB error, falling back to placeholders:', err)
    }
  }
  let rows = placeholderInterviews
    .filter((i) => i.status === 'PUBLISHED')
    .slice()
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
  if (featured !== undefined) rows = rows.filter((i) => i.featured === featured)
  return limit ? rows.slice(0, limit) : rows
}

export async function getInterviewBySlug(slug: string): Promise<Interview | null> {
  if (HAS_DB) {
    try {
      const [row] = await db.select().from(interviews).where(eq(interviews.slug, slug)).limit(1)
      return row ?? null
    } catch (err) {
      console.error('[getInterviewBySlug] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderInterviews.find((i) => i.slug === slug) ?? null
}

export async function getRelatedInterviews(slug: string, count = 3): Promise<Interview[]> {
  if (HAS_DB) {
    try {
      return await db
        .select()
        .from(interviews)
        .where(and(ne(interviews.slug, slug), eq(interviews.status, 'PUBLISHED')))
        .orderBy(desc(interviews.year), interviews.orderIndex)
        .limit(count)
    } catch (err) {
      console.error('[getRelatedInterviews] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderInterviews
    .filter((i) => i.slug !== slug && i.status === 'PUBLISHED')
    .slice(0, count)
}

/* ──────────────────────────────────────────────────────────────────────────
 * Gallery
 * ──────────────────────────────────────────────────────────────────────── */

export type GetGalleryOptions = { limit?: number; category?: string }

export async function getGalleryItems(
  options: GetGalleryOptions = {},
): Promise<GalleryItem[]> {
  const { limit, category } = options
  if (HAS_DB) {
    try {
      const conditions = [eq(gallery.status, 'PUBLISHED')]
      if (category) conditions.push(eq(gallery.category, category))
      return await db
        .select()
        .from(gallery)
        .where(and(...conditions))
        .orderBy(gallery.orderIndex)
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getGalleryItems] DB error, falling back to placeholders:', err)
    }
  }
  let rows = placeholderGallery
    .filter((g) => g.status === 'PUBLISHED')
    .slice()
    .sort(byOrder)
  if (category) rows = rows.filter((g) => g.category === category)
  return limit ? rows.slice(0, limit) : rows
}

export async function getGalleryCategories(): Promise<string[]> {
  if (HAS_DB) {
    try {
      const rows = await db
        .selectDistinct({ category: gallery.category })
        .from(gallery)
        .where(eq(gallery.status, 'PUBLISHED'))
      return rows
        .map((r) => r.category)
        .filter((c): c is string => Boolean(c))
        .sort()
    } catch (err) {
      console.error('[getGalleryCategories] DB error, falling back to placeholders:', err)
    }
  }
  return Array.from(
    new Set(
      placeholderGallery
        .map((g) => g.category)
        .filter((c): c is string => Boolean(c)),
    ),
  ).sort()
}

/* ──────────────────────────────────────────────────────────────────────────
 * Events
 * ──────────────────────────────────────────────────────────────────────── */

export async function getUpcomingEvents(limit?: number): Promise<Event[]> {
  if (HAS_DB) {
    try {
      return await db
        .select()
        .from(events)
        .where(eq(events.status, 'UPCOMING'))
        .orderBy(events.startDate)
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getUpcomingEvents] DB error, falling back to placeholders:', err)
    }
  }
  const rows = placeholderEvents
    .filter((e) => e.status === 'UPCOMING')
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  return limit ? rows.slice(0, limit) : rows
}

export async function getPastEvents(limit?: number): Promise<Event[]> {
  if (HAS_DB) {
    try {
      return await db
        .select()
        .from(events)
        .where(eq(events.status, 'PAST'))
        .orderBy(desc(events.startDate))
        .limit(limit ?? 100)
    } catch (err) {
      console.error('[getPastEvents] DB error, falling back to placeholders:', err)
    }
  }
  const rows = placeholderEvents
    .filter((e) => e.status === 'PAST')
    .slice()
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  return limit ? rows.slice(0, limit) : rows
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  if (HAS_DB) {
    try {
      const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
      return row ?? null
    } catch (err) {
      console.error('[getEventBySlug] DB error, falling back to placeholders:', err)
    }
  }
  return placeholderEvents.find((e) => e.slug === slug) ?? null
}

/* ──────────────────────────────────────────────────────────────────────────
 * Users (admin only)
 * ──────────────────────────────────────────────────────────────────────── */

export async function getUserById(id: string): Promise<User | null> {
  if (HAS_DB) {
    if (!isUuid(id)) return null
    const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return row ?? null
  }
  return placeholderUsers.find((u) => u.id === id) ?? null
}

export async function getAllUsers(): Promise<User[]> {
  if (HAS_DB) {
    return db.select().from(users).orderBy(desc(users.createdAt))
  }
  return placeholderUsers
}

export async function getUserByEmail(email: string): Promise<User | null> {
  if (HAS_DB) {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return row ?? null
  }
  return placeholderUsers.find((u) => u.email === email) ?? null
}

export async function updateUserRole(id: string, role: UserRole): Promise<void> {
  if (!isUuid(id)) return
  if (!HAS_DB) {
    noDb(`updateUserRole(${id}, ${role})`)
    return
  }
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id))
}

/* ──────────────────────────────────────────────────────────────────────────
 * Orders (admin only)
 * ──────────────────────────────────────────────────────────────────────── */

export async function getOrderById(id: string): Promise<Order | null> {
  if (HAS_DB) {
    if (!isUuid(id)) return null
    const [row] = await db.select().from(orders).where(eq(orders.id, id)).limit(1)
    return row ?? null
  }
  return placeholderOrders.find((o) => o.id === id) ?? null
}

/**
 * Phase 5.2 — resolve a Stripe Checkout session id to its persisted order.
 *
 * The post-purchase success page receives `?session_id=cs_xxx` from Stripe
 * (set in `success_url` at checkout creation time). The webhook
 * `checkout.session.completed` handler will have already inserted the
 * order with this id as the `stripeSessionId` foreign-ish key. This
 * helper is the read-side counterpart used by the success page to derive
 * the "Start now" deep link.
 *
 * Returns null when:
 *   - HAS_DB is false (no DB → no orders to look up).
 *   - The id is empty / oversized / clearly malformed.
 *   - The webhook hasn't fired yet (rare race; the success page falls
 *     back to a generic "Go to library" CTA in that case).
 *   - Any DB error — caller treats null as "render generic CTAs".
 */
export async function getOrderByStripeSessionId(
  stripeSessionId: string,
): Promise<Order | null> {
  if (!HAS_DB) return null
  // Stripe session ids are short prefixed strings ("cs_test_..." /
  // "cs_live_..."). Reject anything outside a sane size band before
  // hitting the DB so a junk URL parameter doesn't probe the index.
  if (!stripeSessionId || stripeSessionId.length > 200) return null
  try {
    const [row] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, stripeSessionId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[getOrderByStripeSessionId]', err)
    return null
  }
}

export async function getOrdersByUserId(userId: string): Promise<Order[]> {
  if (HAS_DB) {
    if (!isUuid(userId)) return []
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
  }
  return placeholderOrders.filter((o) => o.userId === userId)
}

export async function getRecentOrders(limit = 20): Promise<Order[]> {
  if (HAS_DB) {
    return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit)
  }
  return placeholderOrders.slice(0, limit)
}

export type OrderStats = {
  totalRevenue: number
  orderCount: number
  paidCount: number
  pendingCount: number
}

export async function getOrderStats(): Promise<OrderStats> {
  if (HAS_DB) {
    const rows = await db.select().from(orders)
    return rows.reduce<OrderStats>(
      (acc, o) => {
        acc.orderCount += 1
        if (o.status === 'PAID' || o.status === 'FULFILLED') {
          acc.totalRevenue += Number(o.totalAmount)
          acc.paidCount += 1
        }
        if (o.status === 'PENDING') acc.pendingCount += 1
        return acc
      },
      { totalRevenue: 0, orderCount: 0, paidCount: 0, pendingCount: 0 },
    )
  }
  return { totalRevenue: 0, orderCount: 0, paidCount: 0, pendingCount: 0 }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Time-series helpers — admin home charts.
 *
 * Returns one row per day in a rolling window ending today (UTC). Days with
 * zero activity emit an explicit zero row so the chart renders a flat segment
 * rather than a gap. Stay UTC throughout — local-time bucketing would shift
 * the boundary between two requests served from different regions.
 * ──────────────────────────────────────────────────────────────────────── */

export type DailyRevenuePoint = {
  date: string // ISO date (YYYY-MM-DD)
  revenue: number
  orderCount: number
}

export type DailyCountPoint = {
  date: string // ISO date (YYYY-MM-DD)
  count: number
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildDailyWindow(days: number): { start: Date; isoKeys: string[] } {
  const safe = Math.max(1, Math.min(days, 365))
  const today = startOfUtcDay(new Date())
  const start = new Date(today)
  start.setUTCDate(start.getUTCDate() - (safe - 1))
  const isoKeys: string[] = []
  for (let i = 0; i < safe; i++) {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    isoKeys.push(isoDate(d))
  }
  return { start, isoKeys }
}

export async function getRevenueByDay(
  days: number = 30,
): Promise<DailyRevenuePoint[]> {
  const { start, isoKeys } = buildDailyWindow(days)
  const empty = isoKeys.map((date) => ({ date, revenue: 0, orderCount: 0 }))
  if (!HAS_DB) return empty

  try {
    // Aggregate in SQL — avoids the full-table SELECT * pattern of
    // `getOrderStats`. PAID + FULFILLED both count as realised revenue;
    // REFUNDED orders are excluded (a Stripe refund flips status away from
    // PAID, so the order drops out of the sum on the next render).
    const rows = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount})::text, '0')`,
        orderCount: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, ['PAID', 'FULFILLED']),
          sql`${orders.createdAt} >= ${start.toISOString()}`,
        ),
      )
      .groupBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)

    const map = new Map<string, { revenue: number; orderCount: number }>()
    for (const r of rows) {
      map.set(r.day, {
        revenue: Number(r.revenue),
        orderCount: Number(r.orderCount),
      })
    }
    return isoKeys.map((date) => {
      const hit = map.get(date)
      return {
        date,
        revenue: hit?.revenue ?? 0,
        orderCount: hit?.orderCount ?? 0,
      }
    })
  } catch (err) {
    console.error('[getRevenueByDay]', err)
    return empty
  }
}

export async function getNewSubscribersByDay(
  days: number = 30,
): Promise<DailyCountPoint[]> {
  const { start, isoKeys } = buildDailyWindow(days)
  const empty = isoKeys.map((date) => ({ date, count: 0 }))
  if (!HAS_DB) return empty

  try {
    const rows = await db
      .select({
        day: sql<string>`to_char(${subscribers.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.status, 'ACTIVE'),
          sql`${subscribers.createdAt} >= ${start.toISOString()}`,
        ),
      )
      .groupBy(
        sql`to_char(${subscribers.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      )

    const map = new Map<string, number>()
    for (const r of rows) map.set(r.day, Number(r.count))
    return isoKeys.map((date) => ({ date, count: map.get(date) ?? 0 }))
  } catch (err) {
    console.error('[getNewSubscribersByDay]', err)
    return empty
  }
}

export type CreateOrderFromStripeInput = {
  stripeSessionId: string
  stripePaymentIntentId: string | null
  userId: string | null
  customerEmail: string
  customerName?: string | null
  totalAmount: string
  currency: string
  items: Array<{ bookId: string; quantity: number; priceAtPurchase: string }>
}

/**
 * Idempotent: if an order already exists for this Stripe session, returns it
 * unchanged. Otherwise inserts the order then its items sequentially, manually
 * rolling back the order row if the items insert fails (the neon-http driver
 * does not support transactions).
 */
export async function createOrderFromStripeSession(
  input: CreateOrderFromStripeInput,
): Promise<Order | null> {
  if (!HAS_DB) {
    noDb(`createOrderFromStripeSession(${input.stripeSessionId})`)
    return null
  }

  // Idempotent insert: the partial unique index `orders_stripe_session_idx`
  // guarantees at most one row per stripeSessionId. On duplicate webhook
  // delivery, ON CONFLICT DO NOTHING short-circuits cleanly; we then re-read
  // and return the existing row. Previously this used a check-then-insert
  // pattern which had a TOCTOU window: two concurrent webhook retries could
  // both pass the SELECT and both attempt the INSERT (succeeding in the
  // race era where there was no unique constraint at all, then 500-ing
  // forever once the index was added — both bad).
  //
  // `where` MUST mirror the partial index predicate exactly — without it
  // Postgres can't infer which unique constraint to use and throws at parse
  // time: "there is no unique or exclusion constraint matching the ON
  // CONFLICT specification". That throw was silently dropping every
  // post-purchase email for months — the webhook catches the failure and
  // ACKs 200, but the order INSERT, the items INSERT, and the email
  // enqueue all skip. (Gift-claim orders don't hit this path; they have
  // no stripeSessionId.)
  const inserted = await db
    .insert(orders)
    .values({
      userId: input.userId && isUuid(input.userId) ? input.userId : null,
      status: 'PAID',
      totalAmount: input.totalAmount,
      currency: input.currency.toUpperCase(),
      stripeSessionId: input.stripeSessionId,
      stripePaymentIntentId: input.stripePaymentIntentId,
      customerEmail: input.customerEmail,
      customerName: input.customerName ?? null,
    })
    .onConflictDoNothing({
      target: orders.stripeSessionId,
      where: sql`${orders.stripeSessionId} IS NOT NULL`,
    })
    .returning()

  let row = inserted[0] ?? null
  const isNew = row != null
  if (!row) {
    // Conflict — re-read the row that another webhook delivery already wrote.
    const [existing] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeSessionId, input.stripeSessionId))
      .limit(1)
    row = existing ?? null
  }
  if (!row) return null

  // Only insert order_items on the FIRST successful insert. Replays must not
  // re-insert items (would create duplicate library entries).
  if (!isNew) return row

  const validItems = input.items.filter((it) => isUuid(it.bookId))
  if (validItems.length === 0) return row

  try {
    await db.insert(orderItems).values(
      validItems.map((it) => ({
        orderId: row!.id,
        bookId: it.bookId,
        quantity: it.quantity,
        priceAtPurchase: it.priceAtPurchase,
      })),
    )
  } catch (err) {
    try {
      await db.delete(orders).where(eq(orders.id, row.id))
    } catch (cleanupErr) {
      console.error(
        '[createOrderFromStripeSession] orders rollback failed; orphan row',
        { orderId: row.id, stripeSessionId: input.stripeSessionId, cleanupErr },
      )
    }
    throw err
  }

  return row
}

export type LibraryEntry = {
  order: Order
  item: OrderItem
  book: Book
}

/**
 * Returns one row per *unique book* the user owns, joined to its order +
 * order_item. Only PAID/FULFILLED orders count.
 *
 * Dedup is intentional: the user can legitimately purchase the same digital
 * book twice (each is a real Stripe transaction we keep on record) but the
 * library should display the book once. DISTINCT ON (book_id) ordered by
 * (book_id, created_at asc) keeps the *earliest* order/item per book as the
 * canonical "owned since" pairing. The result is then re-sorted in JS so the
 * library shows newest acquisitions first — Postgres requires the SQL ORDER
 * BY's leading columns to match the DISTINCT ON columns, so we cannot do the
 * desc(createdAt) sort in the same query.
 */
export async function getLibraryEntriesByUserId(
  userId: string,
): Promise<LibraryEntry[]> {
  // Dev-only bypass: in mock-auth mode the active "user" is one of the
  // synthetic accounts in lib/auth/mock.ts whose ids ('1', '2', '3') are
  // not UUIDs and never exist in any real users table. Querying real
  // Neon for orders by such an id produces nothing (and trips the
  // isUuid guard). So in mock-auth mode we synthesize library entries
  // from the catalog the user can SEE — the same product list the admin
  // reads via getBooks(). Bypass is gated by MOCK_AUTH_ENABLED, which is
  // hard-disabled in production by NODE_ENV !== 'production' (SECURITY
  // [C-2] in lib/auth/mock.ts).
  //
  // Catalog precedence: real DB books (when HAS_DB and the books table
  // returns rows), else placeholderBooks. Filter `status === 'PUBLISHED'`
  // matches getBooks()'s public filter so admin + library + viewer all
  // agree on which products exist. Without this, an admin who creates
  // session content against a real DB book gets a write that the library
  // viewer (which was synthesizing placeholder-only entries) couldn't
  // navigate to — admin and library lived in two product universes.
  if (MOCK_AUTH_ENABLED) {
    const now = new Date()
    let catalog: Book[] = []
    if (HAS_DB) {
      try {
        catalog = await db
          .select()
          .from(books)
          .where(eq(books.status, 'PUBLISHED'))
          .orderBy(books.orderIndex)
      } catch (err) {
        console.error('[getLibraryEntriesByUserId] mock+db fetch failed', err)
      }
    }
    if (catalog.length === 0) catalog = placeholderBooks
    return catalog.map((book) => {
      const order: Order = {
        id: `mock-order-${book.id}`,
        userId,
        status: 'PAID',
        totalAmount: book.price,
        currency: book.currency,
        stripePaymentIntentId: null,
        stripeSessionId: null,
        customerEmail: 'mock@drkhaledghattass.com',
        customerName: 'Mock Buyer',
        giftId: null,
        createdAt: now,
        updatedAt: now,
      }
      const item: OrderItem = {
        id: `mock-item-${book.id}`,
        orderId: order.id,
        bookId: book.id,
        quantity: 1,
        priceAtPurchase: book.price,
        createdAt: now,
      }
      return { order, item, book }
    })
  }
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  const rows = await db
    .selectDistinctOn([orderItems.bookId], {
      order: orders,
      item: orderItems,
      book: books,
    })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .innerJoin(books, eq(orderItems.bookId, books.id))
    .where(
      and(
        eq(orders.userId, userId),
        or(eq(orders.status, 'PAID'), eq(orders.status, 'FULFILLED')),
      ),
    )
    .orderBy(orderItems.bookId, asc(orders.createdAt))
  return rows.sort(
    (a, b) => b.order.createdAt.getTime() - a.order.createdAt.getTime(),
  )
}

/**
 * True iff the user has at least one PAID/FULFILLED order containing this
 * book/session. Used to gate the Buy CTA on detail pages so the same product
 * isn't shown as purchasable to a user who already owns it. Returns false in
 * mock mode (no DB) so the buy flow stays exercisable in dev.
 */
export async function userOwnsProduct(
  userId: string,
  bookId: string,
): Promise<boolean> {
  // Dev-only bypass: mock users have non-UUID ids and never appear in real
  // orders, so we synthesize ownership. Accept placeholder UUIDs first
  // (cheap synchronous check), else any UUID present in the real `books`
  // table — keeps admin (which writes real DB books) and the viewer/reader
  // (which call this gate) in agreement when DATABASE_URL is set in dev.
  // Gated by MOCK_AUTH_ENABLED which is hard-disabled in production via
  // NODE_ENV, so this is not a security gap.
  if (MOCK_AUTH_ENABLED) {
    if (placeholderBooks.some((b) => b.id === bookId)) return true
    if (HAS_DB && isUuid(bookId)) {
      try {
        const [row] = await db
          .select({ id: books.id })
          .from(books)
          .where(eq(books.id, bookId))
          .limit(1)
        return Boolean(row)
      } catch (err) {
        console.error('[userOwnsProduct mock+db]', err)
      }
    }
    return false
  }
  if (!HAS_DB) return false
  if (!isUuid(userId) || !isUuid(bookId)) return false
  const [row] = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(
      and(
        eq(orders.userId, userId),
        eq(orderItems.bookId, bookId),
        or(eq(orders.status, 'PAID'), eq(orders.status, 'FULFILLED')),
      ),
    )
    .limit(1)
  return Boolean(row)
}

/**
 * Returns the items + their parent books for a single order. Used by the
 * post-purchase email to enumerate purchased books vs. sessions and generate
 * one signed URL per book.
 */
export async function getOrderItemsWithBooks(
  orderId: string,
): Promise<Array<{ item: OrderItem; book: Book }>> {
  if (!HAS_DB) return []
  if (!isUuid(orderId)) return []
  const rows = await db
    .select({ item: orderItems, book: books })
    .from(orderItems)
    .innerJoin(books, eq(orderItems.bookId, books.id))
    .where(eq(orderItems.orderId, orderId))
  return rows
}

/* ──────────────────────────────────────────────────────────────────────────
 * Reading progress (Phase 2 — PDF reader last-page-read save/restore)
 *
 * Mock-mode dev store: backed by ./mock-store.ts which serialises both
 * progress and bookmark Maps to .next/cache/reader-mock-store.json so they
 * survive dev-server restarts and Webpack HMR. The disk read is gated
 * behind MOCK_AUTH_ENABLED — production paths never touch the file. Mock
 * users have non-UUID ids ('1', '2', '3') so we can't put them in the
 * real readingProgress table (UUID FK + unique constraint).
 *
 * Production NEVER reaches the mock branch — MOCK_AUTH_ENABLED is
 * hard-disabled by NODE_ENV !== 'production' in lib/auth/mock.ts.
 * ──────────────────────────────────────────────────────────────────────── */

// No module-level Map — mock mode reads/writes through readStore/writeStore
// on every call. Module-level singletons are unsafe under Next.js HMR
// because multiple module instances of queries.ts can coexist, each with
// its own captured Map; writes to one were invisible to reads from another.
// The disk file is the single source of truth; reads always pull fresh.

export async function getReadingProgress(
  userId: string,
  bookId: string,
): Promise<{ lastPage: number; totalPages: number; lastReadAt: Date } | null> {
  // Order matters: check MOCK_AUTH_ENABLED before isUuid because mock
  // user ids fail the UUID guard (and that's by design — see the helper
  // comment above).
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.progress.get(`${userId}:${bookId}`) ?? null
  }
  if (!HAS_DB) return null
  if (!isUuid(userId) || !isUuid(bookId)) return null
  try {
    const [row] = await db
      .select({
        lastPage: readingProgress.lastPage,
        totalPages: readingProgress.totalPages,
        lastReadAt: readingProgress.lastReadAt,
      })
      .from(readingProgress)
      .where(
        and(
          eq(readingProgress.userId, userId),
          eq(readingProgress.bookId, bookId),
        ),
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    // The reading_progress migration (0004) and/or totalPages column
    // (0005) may not be applied yet on every deployment. Treat a missing
    // table/column error the same as "no progress" so the reader still
    // opens at page 1.
    console.error('[getReadingProgress]', err)
    return null
  }
}

export async function saveReadingProgress(
  userId: string,
  bookId: string,
  lastPage: number,
  totalPages?: number,
): Promise<void> {
  if (!Number.isInteger(lastPage) || lastPage < 1) return
  const total =
    totalPages != null && Number.isInteger(totalPages) && totalPages >= 0
      ? totalPages
      : undefined
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const key = `${userId}:${bookId}`
    const existing = store.progress.get(key)
    store.progress.set(key, {
      lastPage,
      // Preserve a previously-known total when the new save omits one
      // (e.g. keepalive-fetch flush before the document finished loading).
      totalPages: total ?? existing?.totalPages ?? 0,
      lastReadAt: new Date(),
    })
    writeStore(store)
    return
  }
  if (!HAS_DB) return
  if (!isUuid(userId) || !isUuid(bookId)) return
  try {
    // Unique index `reading_progress_user_book_idx` on (user_id, book_id) is
    // the conflict target; on conflict we bump lastPage (+ totalPages) and
    // lastReadAt.
    if (total !== undefined) {
      try {
        await db
          .insert(readingProgress)
          .values({
            userId,
            bookId,
            lastPage,
            totalPages: total,
            lastReadAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [readingProgress.userId, readingProgress.bookId],
            set: { lastPage, totalPages: total, lastReadAt: new Date() },
          })
        return
      } catch (innerErr) {
        // Migration 0005 (totalPages column) may not be applied yet on this
        // deployment. Fall through to a write that doesn't reference the
        // column at all so we still persist lastPage + lastReadAt.
        console.error(
          '[saveReadingProgress] totalPages write failed; retrying without column',
          innerErr,
        )
      }
    }
    await db
      .insert(readingProgress)
      .values({ userId, bookId, lastPage, lastReadAt: new Date() })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.bookId],
        set: { lastPage, lastReadAt: new Date() },
      })
  } catch (err) {
    // Silent degrade — the save action returns { ok: false } and the
    // user sees no toast. Worst case: they re-open at page 1 next time.
    console.error('[saveReadingProgress]', err)
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * PDF bookmarks (Phase 2 — premium reader)
 *
 * Mirror of getReadingProgress in shape: dev-only mock store backed by the
 * shared mock-store file (see ./mock-store.ts), real Drizzle path for
 * production. Migration 0004 creates the pdf_bookmarks table; if it has
 * not been applied yet on a given deployment, the try/catch around each
 * Drizzle call swallows the missing-table error and the bookmark UI
 * silently degrades to "no bookmarks" rather than crashing the reader.
 *
 * Schema permits multiple bookmarks per (user, book, page); the UX treats
 * one-per-page as a toggle, but the queries don't enforce that — call
 * toggleBookmark to add-or-delete based on existence.
 * ──────────────────────────────────────────────────────────────────────── */

// Bookmarks share the same on-disk JSON as reading progress via
// lib/db/mock-store.ts; every read calls readStore(), every write calls
// writeStore() — there is no module-level cache.

const mockBookmarkKey = (userId: string, bookId: string) =>
  `${userId}:${bookId}`

export async function getBookmarks(
  userId: string,
  bookId: string,
): Promise<PdfBookmark[]> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.bookmarks.get(mockBookmarkKey(userId, bookId)) ?? []
    // Ascending by pageNumber — list/jump UX expects natural reading order.
    return [...list].sort((a, b) => a.pageNumber - b.pageNumber)
  }
  if (!HAS_DB) return []
  if (!isUuid(userId) || !isUuid(bookId)) return []
  try {
    return await db
      .select()
      .from(pdfBookmarks)
      .where(
        and(
          eq(pdfBookmarks.userId, userId),
          eq(pdfBookmarks.bookId, bookId),
        ),
      )
      .orderBy(pdfBookmarks.pageNumber)
  } catch (err) {
    // Migration 0004 may not be applied; treat missing table as "no bookmarks"
    // so the reader still loads gracefully.
    console.error('[getBookmarks]', err)
    return []
  }
}

/**
 * Adds a bookmark on (user, book, page) if none exists, otherwise removes
 * the existing one. Returns the created bookmark on add, null on remove.
 * Optional label is captured on add only (use updateBookmarkLabel to edit).
 */
export async function toggleBookmark(
  userId: string,
  bookId: string,
  pageNumber: number,
  label?: string | null,
): Promise<PdfBookmark | null> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) return null

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const key = mockBookmarkKey(userId, bookId)
    const list = store.bookmarks.get(key) ?? []
    const existingIdx = list.findIndex((b) => b.pageNumber === pageNumber)
    if (existingIdx >= 0) {
      list.splice(existingIdx, 1)
      store.bookmarks.set(key, list)
      writeStore(store)
      return null
    }
    const created: PdfBookmark = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mock-bm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId,
      bookId,
      pageNumber,
      label: label ?? null,
      createdAt: new Date(),
    }
    store.bookmarks.set(key, [...list, created])
    writeStore(store)
    return created
  }

  if (!HAS_DB) return null
  if (!isUuid(userId) || !isUuid(bookId)) return null

  try {
    const [existing] = await db
      .select()
      .from(pdfBookmarks)
      .where(
        and(
          eq(pdfBookmarks.userId, userId),
          eq(pdfBookmarks.bookId, bookId),
          eq(pdfBookmarks.pageNumber, pageNumber),
        ),
      )
      .limit(1)

    if (existing) {
      await db.delete(pdfBookmarks).where(eq(pdfBookmarks.id, existing.id))
      return null
    }

    const [row] = await db
      .insert(pdfBookmarks)
      .values({ userId, bookId, pageNumber, label: label ?? null })
      .returning()
    return row ?? null
  } catch (err) {
    // Missing table or transient error — fail closed (no bookmark created),
    // log so the operator notices the migration drift. Reader keeps running.
    console.error('[toggleBookmark]', err)
    return null
  }
}

export async function updateBookmarkLabel(
  bookmarkId: string,
  userId: string,
  label: string | null,
): Promise<PdfBookmark | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    for (const [key, list] of store.bookmarks.entries()) {
      const idx = list.findIndex(
        (b) => b.id === bookmarkId && b.userId === userId,
      )
      if (idx >= 0) {
        const updated = { ...list[idx]!, label }
        const next = [...list]
        next[idx] = updated
        store.bookmarks.set(key, next)
        writeStore(store)
        return updated
      }
    }
    return null
  }
  if (!HAS_DB) return null
  if (!isUuid(bookmarkId) || !isUuid(userId)) return null

  try {
    // Ownership check is the eq(userId) clause — UPDATE returns no rows if
    // the bookmark id exists but belongs to another user.
    const [row] = await db
      .update(pdfBookmarks)
      .set({ label })
      .where(
        and(
          eq(pdfBookmarks.id, bookmarkId),
          eq(pdfBookmarks.userId, userId),
        ),
      )
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[updateBookmarkLabel]', err)
    return null
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Session items (Phase 1 — content delivery; admin CRUD added Phase 4)
 *
 * Two paths per helper, in this order:
 *   1. MOCK_AUTH_ENABLED — read/write the on-disk mock store. Used in dev
 *      where the admin can exercise the editor without seeding the DB.
 *      Mock book ids ('1', '2', …) fail the UUID guard, so the mock branch
 *      MUST come before isUuid() — same shape as getReadingProgress /
 *      getBookmarks above.
 *   2. HAS_DB — real Drizzle path. UUID-guarded so a malformed id from
 *      the URL doesn't cast-error against a uuid column.
 *
 * The schema does not enforce productType='SESSION' on the parent book —
 * the application invariant lives in the admin route handlers. The query
 * helpers do not re-validate it (avoids duplicate work + extra round
 * trips); callers are responsible for ensuring `sessionId` points at a
 * SESSION-type book before invoking any of the mutations below.
 * ──────────────────────────────────────────────────────────────────────── */

function sortSessionItems(list: SessionItem[]): SessionItem[] {
  // sortOrder ASC, then createdAt ASC as a deterministic tiebreaker so the
  // editor list never visibly reshuffles between mutations.
  return [...list].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}

export async function getSessionItemById(
  id: string,
  sessionId?: string,
): Promise<SessionItem | null> {
  // Optional sessionId narrows the lookup to a specific session — admin
  // mutations pass it so an attacker who guessed an itemId from another
  // session can't pivot.
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    if (sessionId) {
      const list = store.sessionItems.get(sessionId) ?? []
      return list.find((it) => it.id === id) ?? null
    }
    for (const list of store.sessionItems.values()) {
      const hit = list.find((it) => it.id === id)
      if (hit) return hit
    }
    return null
  }
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  if (sessionId && !isUuid(sessionId)) return null
  const filters = sessionId
    ? and(eq(sessionItems.id, id), eq(sessionItems.sessionId, sessionId))
    : eq(sessionItems.id, id)
  const [row] = await db
    .select()
    .from(sessionItems)
    .where(filters)
    .limit(1)
  return row ?? null
}

export async function getSessionItemsBySessionId(
  sessionId: string,
): Promise<SessionItem[]> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return sortSessionItems(store.sessionItems.get(sessionId) ?? [])
  }
  if (!HAS_DB) return []
  if (!isUuid(sessionId)) return []
  return db
    .select()
    .from(sessionItems)
    .where(eq(sessionItems.sessionId, sessionId))
    .orderBy(asc(sessionItems.sortOrder), asc(sessionItems.createdAt))
}

export type CreateSessionItemInput = {
  sessionId: string
  itemType: SessionItem['itemType']
  title: string
  description?: string | null
  storageKey: string
  durationSeconds?: number | null
  sortOrder?: number
}

export async function createSessionItem(
  input: CreateSessionItemInput,
): Promise<SessionItem | null> {
  const {
    sessionId,
    itemType,
    title,
    description = null,
    storageKey,
    durationSeconds = null,
    sortOrder,
  } = input

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.sessionItems.get(sessionId) ?? []
    const nextOrder =
      sortOrder ??
      (list.length > 0
        ? Math.max(...list.map((it) => it.sortOrder)) + 1
        : 0)
    const created: SessionItem = {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `mock-si-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      sessionId,
      itemType,
      title,
      description,
      storageKey,
      durationSeconds,
      sortOrder: nextOrder,
      createdAt: new Date(),
    }
    store.sessionItems.set(sessionId, [...list, created])
    writeStore(store)
    return created
  }

  if (!HAS_DB) {
    noDb(`createSessionItem(${sessionId})`)
    return null
  }
  if (!isUuid(sessionId)) return null

  try {
    let nextOrder = sortOrder
    if (nextOrder == null) {
      // Place at the end. Single-statement read — admins are not concurrent,
      // so the gap-on-race risk here is not worth a SELECT … FOR UPDATE.
      const [{ max }] = await db
        .select({ max: sql<number>`coalesce(max(${sessionItems.sortOrder}), -1)` })
        .from(sessionItems)
        .where(eq(sessionItems.sessionId, sessionId))
      nextOrder = (max ?? -1) + 1
    }
    const [row] = await db
      .insert(sessionItems)
      .values({
        sessionId,
        itemType,
        title,
        description,
        storageKey,
        durationSeconds,
        sortOrder: nextOrder,
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[createSessionItem]', err)
    return null
  }
}

export type UpdateSessionItemPatch = {
  itemType?: SessionItem['itemType']
  title?: string
  description?: string | null
  storageKey?: string
  durationSeconds?: number | null
}

export async function updateSessionItem(
  itemId: string,
  sessionId: string,
  patch: UpdateSessionItemPatch,
): Promise<SessionItem | null> {
  // Reject empty patches — Drizzle's update with no SET columns is an error
  // and we'd return null below anyway.
  const hasPatch =
    patch.itemType !== undefined ||
    patch.title !== undefined ||
    patch.description !== undefined ||
    patch.storageKey !== undefined ||
    patch.durationSeconds !== undefined
  if (!hasPatch) return getSessionItemById(itemId, sessionId)

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.sessionItems.get(sessionId) ?? []
    const idx = list.findIndex((it) => it.id === itemId)
    if (idx < 0) return null
    const current = list[idx]!
    const updated: SessionItem = {
      ...current,
      ...(patch.itemType !== undefined ? { itemType: patch.itemType } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.description !== undefined
        ? { description: patch.description }
        : {}),
      ...(patch.storageKey !== undefined
        ? { storageKey: patch.storageKey }
        : {}),
      ...(patch.durationSeconds !== undefined
        ? { durationSeconds: patch.durationSeconds }
        : {}),
    }
    const next = [...list]
    next[idx] = updated
    store.sessionItems.set(sessionId, next)
    writeStore(store)
    return updated
  }

  if (!HAS_DB) return null
  if (!isUuid(itemId) || !isUuid(sessionId)) return null

  try {
    const [row] = await db
      .update(sessionItems)
      .set(patch)
      .where(
        and(
          eq(sessionItems.id, itemId),
          eq(sessionItems.sessionId, sessionId),
        ),
      )
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[updateSessionItem]', err)
    return null
  }
}

export async function deleteSessionItem(
  itemId: string,
  sessionId: string,
): Promise<boolean> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.sessionItems.get(sessionId) ?? []
    const next = list.filter((it) => it.id !== itemId)
    if (next.length === list.length) return false
    store.sessionItems.set(sessionId, next)
    writeStore(store)
    return true
  }

  if (!HAS_DB) return false
  if (!isUuid(itemId) || !isUuid(sessionId)) return false

  try {
    const result = await db
      .delete(sessionItems)
      .where(
        and(
          eq(sessionItems.id, itemId),
          eq(sessionItems.sessionId, sessionId),
        ),
      )
      .returning({ id: sessionItems.id })
    return result.length > 0
  } catch (err) {
    console.error('[deleteSessionItem]', err)
    return false
  }
}

/**
 * Replace the sort order of every item in a session in one batch. Items
 * appearing in `orderedItemIds` are renumbered 0..N-1 in the order given;
 * items belonging to the session but missing from the list are left at
 * their existing sortOrder (graceful degrade if the client UI fell out of
 * sync — they sink to the end on the next read because the renumbered set
 * starts from 0). Ids that don't belong to this session are silently
 * skipped.
 */
export async function reorderSessionItems(
  sessionId: string,
  orderedItemIds: string[],
): Promise<boolean> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.sessionItems.get(sessionId) ?? []
    if (list.length === 0) return orderedItemIds.length === 0
    const byId = new Map(list.map((it) => [it.id, it]))
    let pos = 0
    const seen = new Set<string>()
    const next: SessionItem[] = []
    for (const id of orderedItemIds) {
      const item = byId.get(id)
      if (!item || seen.has(id)) continue
      seen.add(id)
      next.push({ ...item, sortOrder: pos++ })
    }
    // Append any unmentioned items at the end, preserving their relative
    // order. This guards against a partial reorder leaving items orphaned
    // out of view.
    for (const item of list) {
      if (seen.has(item.id)) continue
      next.push({ ...item, sortOrder: pos++ })
    }
    store.sessionItems.set(sessionId, next)
    writeStore(store)
    return true
  }

  if (!HAS_DB) return false
  if (!isUuid(sessionId)) return false

  try {
    // The list is admin-bounded (a single session's items — typically <50)
    // so a per-id UPDATE loop is fine. Postgres doesn't have a one-shot
    // ordered batch-update primitive without raw SQL, and the gain from
    // building a CASE expression for ~10 rows is not worth the readability
    // loss.
    let pos = 0
    for (const id of orderedItemIds) {
      if (!isUuid(id)) continue
      await db
        .update(sessionItems)
        .set({ sortOrder: pos })
        .where(
          and(
            eq(sessionItems.id, id),
            eq(sessionItems.sessionId, sessionId),
          ),
        )
      pos++
    }
    return true
  } catch (err) {
    console.error('[reorderSessionItems]', err)
    return false
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Media progress (Phase 4 — session viewer)
 *
 * Per-(user, session_item) progress for VIDEO and AUDIO items inside a
 * paid session. PDFs inside a session do NOT use this table — those have
 * no per-item read state in v1; opening one just signs and serves it.
 *
 * Mirrors getReadingProgress in shape: dev-only mock store backed by the
 * shared mock-store file, real Drizzle path for production. Migration
 * 0004 creates media_progress; the try/catch around each Drizzle call
 * swallows missing-table errors so an un-applied migration silently
 * degrades to "no progress" rather than crashing the viewer.
 *
 * `getAllMediaProgressForSession` joins through session_items so the
 * viewer can fetch every item's progress in one round trip — used to
 * decide which item the user resumes on and to mark completed items
 * in the playlist.
 * ──────────────────────────────────────────────────────────────────────── */

export type MediaProgressEntry = {
  lastPositionSeconds: number
  completedAt: Date | null
  lastWatchedAt: Date
}

const mockMediaKey = (userId: string, sessionItemId: string) =>
  `${userId}:${sessionItemId}`

export async function getMediaProgress(
  userId: string,
  sessionItemId: string,
): Promise<MediaProgressEntry | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.mediaProgress.get(mockMediaKey(userId, sessionItemId)) ?? null
  }
  if (!HAS_DB) return null
  if (!isUuid(userId) || !isUuid(sessionItemId)) return null
  try {
    const [row] = await db
      .select({
        lastPositionSeconds: mediaProgress.lastPositionSeconds,
        completedAt: mediaProgress.completedAt,
        lastWatchedAt: mediaProgress.lastWatchedAt,
      })
      .from(mediaProgress)
      .where(
        and(
          eq(mediaProgress.userId, userId),
          eq(mediaProgress.sessionItemId, sessionItemId),
        ),
      )
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[getMediaProgress]', err)
    return null
  }
}

export async function saveMediaProgress(
  userId: string,
  sessionItemId: string,
  lastPositionSeconds: number,
  completed?: boolean,
): Promise<void> {
  // Coerce to a sane integer floor — clients debounce around float seconds.
  if (!Number.isFinite(lastPositionSeconds) || lastPositionSeconds < 0) return
  const positionInt = Math.floor(lastPositionSeconds)
  const now = new Date()
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const key = mockMediaKey(userId, sessionItemId)
    const existing = store.mediaProgress.get(key)
    store.mediaProgress.set(key, {
      lastPositionSeconds: positionInt,
      // Once completed, sticky-true. A user re-watching a finished item
      // should not toggle the badge back to "in progress" just because
      // their position dropped below the 95% threshold mid-replay.
      completedAt:
        completed === true
          ? (existing?.completedAt ?? now)
          : (existing?.completedAt ?? null),
      lastWatchedAt: now,
    })
    writeStore(store)
    return
  }
  if (!HAS_DB) return
  if (!isUuid(userId) || !isUuid(sessionItemId)) return
  try {
    // Unique index `media_progress_user_item_idx` on
    // (user_id, session_item_id) is the conflict target. Don't clobber a
    // previously-set completedAt if the new save isn't claiming complete.
    await db
      .insert(mediaProgress)
      .values({
        userId,
        sessionItemId,
        lastPositionSeconds: positionInt,
        completedAt: completed === true ? now : null,
        lastWatchedAt: now,
      })
      .onConflictDoUpdate({
        target: [mediaProgress.userId, mediaProgress.sessionItemId],
        set: {
          lastPositionSeconds: positionInt,
          // sql.coalesce keeps the existing completedAt unless we're
          // setting one now; a subsequent save with completed=false won't
          // wipe the prior completion.
          completedAt:
            completed === true
              ? sql`coalesce(${mediaProgress.completedAt}, ${now})`
              : mediaProgress.completedAt,
          lastWatchedAt: now,
        },
      })
  } catch (err) {
    console.error('[saveMediaProgress]', err)
  }
}

/**
 * Returns a map of session_item_id → progress entry for every item in the
 * given session that this user has touched. Items the user hasn't started
 * are simply absent from the map; the viewer treats absence as
 * "not started." Used to power the playlist's progress + completion
 * indicators and the "continue from" item selection.
 */
export async function getAllMediaProgressForSession(
  userId: string,
  sessionId: string,
): Promise<Record<string, MediaProgressEntry>> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const items = store.sessionItems.get(sessionId) ?? []
    const out: Record<string, MediaProgressEntry> = {}
    for (const it of items) {
      const entry = store.mediaProgress.get(mockMediaKey(userId, it.id))
      if (entry) out[it.id] = entry
    }
    return out
  }
  if (!HAS_DB) return {}
  if (!isUuid(userId) || !isUuid(sessionId)) return {}
  try {
    const rows = await db
      .select({
        sessionItemId: mediaProgress.sessionItemId,
        lastPositionSeconds: mediaProgress.lastPositionSeconds,
        completedAt: mediaProgress.completedAt,
        lastWatchedAt: mediaProgress.lastWatchedAt,
      })
      .from(mediaProgress)
      .innerJoin(
        sessionItems,
        eq(mediaProgress.sessionItemId, sessionItems.id),
      )
      .where(
        and(
          eq(mediaProgress.userId, userId),
          eq(sessionItems.sessionId, sessionId),
        ),
      )
    const out: Record<string, MediaProgressEntry> = {}
    for (const row of rows) {
      out[row.sessionItemId] = {
        lastPositionSeconds: row.lastPositionSeconds,
        completedAt: row.completedAt,
        lastWatchedAt: row.lastWatchedAt,
      }
    }
    return out
  } catch (err) {
    console.error('[getAllMediaProgressForSession]', err)
    return {}
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase 5 — unified continue-activity surface
 *
 * The library landing page used to surface only BOOK reading-progress in the
 * "Continue" hero. Sessions (Phase 4) had their own resume-from-position
 * logic inside the viewer but never bubbled up to the library overview, so a
 * user with an in-flight book AND an in-flight session only saw the book.
 *
 * `getMostRecentActivity` is the single source of truth for that surface:
 * it considers BOTH content types and returns the one the user touched
 * most recently. The hero card now renders either a book-resume or a
 * session-item-resume affordance from the same return value — no callsite
 * needs to merge two queries.
 *
 * Defensive filters (must match the visual gates):
 *   - BOOK candidate must have `lastPage > 1` (matches the legacy
 *     pickHeroCandidate gate — a freshly-opened book that never paged
 *     forward shouldn't pin the hero).
 *   - BOOK candidate must not be finished (`totalPages > 0` ⇒ `lastPage <
 *     totalPages`; `totalPages === 0` is treated as "unknown total" and
 *     allowed through).
 *   - SESSION candidate must have `completedAt IS NULL` and the parent
 *     session must still exist with `productType = 'SESSION'` (admins can
 *     delete a session out from under a user; orphan media_progress rows
 *     are skipped rather than crash the hero).
 *
 * Tiebreak when timestamps match: prefer SESSION. Sessions tend to play
 * continuously, so an exact timestamp tie usually means the session was
 * actively running while the user opened the library in another tab.
 * ──────────────────────────────────────────────────────────────────────── */

export type RecentActivity =
  | {
      type: 'BOOK'
      bookId: string
      lastPage: number
      totalPages: number
      lastReadAt: Date
      book: Book
    }
  | {
      type: 'SESSION'
      sessionId: string
      sessionItemId: string
      lastPositionSeconds: number
      /** Duration of the SPECIFIC item the user was on. 0 when unknown
       * (the column is nullable in session_items; the hero treats 0 as
       * "skip the total in the timestamp display"). */
      durationSeconds: number
      lastWatchedAt: Date
      session: Book
      item: SessionItem
    }

export async function getMostRecentActivity(
  userId: string,
): Promise<RecentActivity | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()

    // Catalog hydration matches getLibraryEntriesByUserId — DB books take
    // precedence when present so admin-created sessions resolve correctly,
    // else fall through to placeholders.
    let catalog: Book[] = []
    if (HAS_DB) {
      try {
        catalog = await db
          .select()
          .from(books)
          .where(eq(books.status, 'PUBLISHED'))
      } catch (err) {
        console.error('[getMostRecentActivity mock+db] catalog fetch failed', err)
      }
    }
    if (catalog.length === 0) catalog = [...placeholderBooks]
    const bookById = new Map<string, Book>(catalog.map((b) => [b.id, b]))

    // Most-recent BOOK candidate from the persisted reading-progress map.
    const userPrefix = `${userId}:`
    let bookCandidate: {
      bookId: string
      lastPage: number
      totalPages: number
      lastReadAt: Date
    } | null = null
    for (const [key, entry] of store.progress.entries()) {
      if (!key.startsWith(userPrefix)) continue
      const bookId = key.slice(userPrefix.length)
      if (entry.lastPage <= 1) continue
      if (entry.totalPages > 0 && entry.lastPage >= entry.totalPages) continue
      const book = bookById.get(bookId)
      if (!book || book.productType !== 'BOOK') continue
      if (
        !bookCandidate ||
        entry.lastReadAt.getTime() > bookCandidate.lastReadAt.getTime()
      ) {
        bookCandidate = {
          bookId,
          lastPage: entry.lastPage,
          totalPages: entry.totalPages,
          lastReadAt: entry.lastReadAt,
        }
      }
    }

    // session_item_id → (session_id, item) lookup, built from the mock
    // sessionItems map so we can resolve orphan rows in O(1).
    const itemToSession = new Map<
      string,
      { sessionId: string; item: SessionItem }
    >()
    for (const [sessionId, items] of store.sessionItems.entries()) {
      for (const item of items) {
        itemToSession.set(item.id, { sessionId, item })
      }
    }

    let sessionCandidate: {
      sessionId: string
      sessionItemId: string
      lastPositionSeconds: number
      durationSeconds: number
      lastWatchedAt: Date
      item: SessionItem
    } | null = null
    for (const [key, entry] of store.mediaProgress.entries()) {
      if (!key.startsWith(userPrefix)) continue
      if (entry.completedAt != null) continue
      const sessionItemId = key.slice(userPrefix.length)
      const lookup = itemToSession.get(sessionItemId)
      if (!lookup) continue // Orphan — item deleted from admin.
      const session = bookById.get(lookup.sessionId)
      if (!session || session.productType !== 'SESSION') continue
      if (
        !sessionCandidate ||
        entry.lastWatchedAt.getTime() > sessionCandidate.lastWatchedAt.getTime()
      ) {
        sessionCandidate = {
          sessionId: lookup.sessionId,
          sessionItemId,
          lastPositionSeconds: entry.lastPositionSeconds,
          durationSeconds: lookup.item.durationSeconds ?? 0,
          lastWatchedAt: entry.lastWatchedAt,
          item: lookup.item,
        }
      }
    }

    return resolveCandidate(bookCandidate, sessionCandidate, bookById)
  }

  if (!HAS_DB) return null
  if (!isUuid(userId)) return null

  try {
    // Two parallel single-row reads — the DB indexes already cover both
    // (reading_progress_user_book_idx + media_progress_user_item_idx),
    // and pulling each table's latest separately is cheaper than a
    // UNION ALL with conditional joins.
    const [bookRows, sessionRows] = await Promise.all([
      db
        .select({
          bookId: readingProgress.bookId,
          lastPage: readingProgress.lastPage,
          totalPages: readingProgress.totalPages,
          lastReadAt: readingProgress.lastReadAt,
          book: books,
        })
        .from(readingProgress)
        .innerJoin(books, eq(readingProgress.bookId, books.id))
        .where(
          and(
            eq(readingProgress.userId, userId),
            eq(books.productType, 'BOOK'),
            sql`${readingProgress.lastPage} > 1`,
            or(
              eq(readingProgress.totalPages, 0),
              sql`${readingProgress.lastPage} < ${readingProgress.totalPages}`,
            ),
          ),
        )
        .orderBy(desc(readingProgress.lastReadAt))
        .limit(1),
      db
        .select({
          sessionItemId: mediaProgress.sessionItemId,
          sessionId: sessionItems.sessionId,
          lastPositionSeconds: mediaProgress.lastPositionSeconds,
          durationSeconds: sessionItems.durationSeconds,
          lastWatchedAt: mediaProgress.lastWatchedAt,
          session: books,
          item: sessionItems,
        })
        .from(mediaProgress)
        .innerJoin(sessionItems, eq(mediaProgress.sessionItemId, sessionItems.id))
        .innerJoin(books, eq(sessionItems.sessionId, books.id))
        .where(
          and(
            eq(mediaProgress.userId, userId),
            eq(books.productType, 'SESSION'),
            sql`${mediaProgress.completedAt} IS NULL`,
          ),
        )
        .orderBy(desc(mediaProgress.lastWatchedAt))
        .limit(1),
    ])

    const bookRow = bookRows[0]
    const sessionRow = sessionRows[0]
    if (!bookRow && !sessionRow) return null
    if (!bookRow) {
      const sr = sessionRow!
      return {
        type: 'SESSION',
        sessionId: sr.sessionId,
        sessionItemId: sr.sessionItemId,
        lastPositionSeconds: sr.lastPositionSeconds,
        durationSeconds: sr.durationSeconds ?? 0,
        lastWatchedAt: sr.lastWatchedAt,
        session: sr.session,
        item: sr.item,
      }
    }
    if (!sessionRow) {
      return {
        type: 'BOOK',
        bookId: bookRow.bookId,
        lastPage: bookRow.lastPage,
        totalPages: bookRow.totalPages,
        lastReadAt: bookRow.lastReadAt,
        book: bookRow.book,
      }
    }
    const bookTs = bookRow.lastReadAt.getTime()
    const sessionTs = sessionRow.lastWatchedAt.getTime()
    // Tiebreak on equal timestamps: SESSION wins.
    if (sessionTs >= bookTs) {
      return {
        type: 'SESSION',
        sessionId: sessionRow.sessionId,
        sessionItemId: sessionRow.sessionItemId,
        lastPositionSeconds: sessionRow.lastPositionSeconds,
        durationSeconds: sessionRow.durationSeconds ?? 0,
        lastWatchedAt: sessionRow.lastWatchedAt,
        session: sessionRow.session,
        item: sessionRow.item,
      }
    }
    return {
      type: 'BOOK',
      bookId: bookRow.bookId,
      lastPage: bookRow.lastPage,
      totalPages: bookRow.totalPages,
      lastReadAt: bookRow.lastReadAt,
      book: bookRow.book,
    }
  } catch (err) {
    console.error('[getMostRecentActivity]', err)
    return null
  }
}

// Mock-mode tiebreak helper. Pure function — kept at module scope so the
// MOCK_AUTH_ENABLED branch above stays linear.
function resolveCandidate(
  bookCandidate: {
    bookId: string
    lastPage: number
    totalPages: number
    lastReadAt: Date
  } | null,
  sessionCandidate: {
    sessionId: string
    sessionItemId: string
    lastPositionSeconds: number
    durationSeconds: number
    lastWatchedAt: Date
    item: SessionItem
  } | null,
  bookById: Map<string, Book>,
): RecentActivity | null {
  if (!bookCandidate && !sessionCandidate) return null
  if (!bookCandidate) {
    const sc = sessionCandidate!
    const session = bookById.get(sc.sessionId)
    if (!session) return null
    return {
      type: 'SESSION',
      sessionId: sc.sessionId,
      sessionItemId: sc.sessionItemId,
      lastPositionSeconds: sc.lastPositionSeconds,
      durationSeconds: sc.durationSeconds,
      lastWatchedAt: sc.lastWatchedAt,
      session,
      item: sc.item,
    }
  }
  if (!sessionCandidate) {
    const book = bookById.get(bookCandidate.bookId)
    if (!book) return null
    return {
      type: 'BOOK',
      bookId: bookCandidate.bookId,
      lastPage: bookCandidate.lastPage,
      totalPages: bookCandidate.totalPages,
      lastReadAt: bookCandidate.lastReadAt,
      book,
    }
  }
  const sessionTs = sessionCandidate.lastWatchedAt.getTime()
  const bookTs = bookCandidate.lastReadAt.getTime()
  if (sessionTs >= bookTs) {
    const session = bookById.get(sessionCandidate.sessionId)
    if (!session) return null
    return {
      type: 'SESSION',
      sessionId: sessionCandidate.sessionId,
      sessionItemId: sessionCandidate.sessionItemId,
      lastPositionSeconds: sessionCandidate.lastPositionSeconds,
      durationSeconds: sessionCandidate.durationSeconds,
      lastWatchedAt: sessionCandidate.lastWatchedAt,
      session,
      item: sessionCandidate.item,
    }
  }
  const book = bookById.get(bookCandidate.bookId)
  if (!book) return null
  return {
    type: 'BOOK',
    bookId: bookCandidate.bookId,
    lastPage: bookCandidate.lastPage,
    totalPages: bookCandidate.totalPages,
    lastReadAt: bookCandidate.lastReadAt,
    book,
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase 5 — session aggregate progress (library card surface)
 *
 * For a session card on the library grid, the user wants an at-a-glance
 * "I'm 2 of 5 items into this session" indicator. The viewer already has
 * per-item progress; this helper rolls it up.
 *
 * `percent` is computed as `completedItems / totalItems` (rounded). Items
 * that are partially watched but not completed are surfaced separately
 * via `partiallyWatchedItems` so the card UI can decide whether to show a
 * "continue" affordance even when nothing is fully complete.
 *
 * Performance: this is per-session, so the library page calls it N times
 * for N session items. Each call is two cheap indexed reads (count items,
 * count progress for those items). Acceptable at the realistic scale
 * (~10-50 sessions per user). If we ever ship a "trending sessions" view
 * with 100+ sessions, batch this into a single GROUP-BY query — see the
 * TODO in buildLibraryItems.
 * ──────────────────────────────────────────────────────────────────────── */

export type SessionAggregateProgress = {
  totalItems: number
  completedItems: number
  partiallyWatchedItems: number
  /** Percentage 0-100 — rounded `completedItems / totalItems`. PDF items
   * inside a session don't have media_progress rows so they never count
   * as completed here (acceptable for v1; the user thinks of session
   * "completion" in terms of the video/audio they watched). */
  percent: number
}

const EMPTY_AGGREGATE: SessionAggregateProgress = {
  totalItems: 0,
  completedItems: 0,
  partiallyWatchedItems: 0,
  percent: 0,
}

export async function getSessionAggregateProgress(
  userId: string,
  sessionId: string,
): Promise<SessionAggregateProgress> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const items = store.sessionItems.get(sessionId) ?? []
    if (items.length === 0) return EMPTY_AGGREGATE
    let completed = 0
    let partial = 0
    for (const item of items) {
      const entry = store.mediaProgress.get(`${userId}:${item.id}`)
      if (!entry) continue
      if (entry.completedAt != null) {
        completed++
      } else if (entry.lastPositionSeconds > 0) {
        partial++
      }
    }
    return {
      totalItems: items.length,
      completedItems: completed,
      partiallyWatchedItems: partial,
      percent: Math.round((completed / items.length) * 100),
    }
  }

  if (!HAS_DB) return EMPTY_AGGREGATE
  if (!isUuid(userId) || !isUuid(sessionId)) return EMPTY_AGGREGATE

  try {
    const [itemRows, progressRows] = await Promise.all([
      db
        .select({ id: sessionItems.id })
        .from(sessionItems)
        .where(eq(sessionItems.sessionId, sessionId)),
      db
        .select({
          completedAt: mediaProgress.completedAt,
          lastPositionSeconds: mediaProgress.lastPositionSeconds,
        })
        .from(mediaProgress)
        .innerJoin(sessionItems, eq(mediaProgress.sessionItemId, sessionItems.id))
        .where(
          and(
            eq(mediaProgress.userId, userId),
            eq(sessionItems.sessionId, sessionId),
          ),
        ),
    ])

    const totalItems = itemRows.length
    if (totalItems === 0) return EMPTY_AGGREGATE
    let completed = 0
    let partial = 0
    for (const row of progressRows) {
      if (row.completedAt != null) {
        completed++
      } else if (row.lastPositionSeconds > 0) {
        partial++
      }
    }
    return {
      totalItems,
      completedItems: completed,
      partiallyWatchedItems: partial,
      percent: Math.round((completed / totalItems) * 100),
    }
  } catch (err) {
    console.error('[getSessionAggregateProgress]', err)
    return EMPTY_AGGREGATE
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Subscribers
 * ──────────────────────────────────────────────────────────────────────── */

export async function createSubscriber(
  email: string,
  name?: string,
  source?: string,
): Promise<Subscriber | null> {
  if (!HAS_DB) {
    noDb(`createSubscriber(${email})`)
    return null
  }
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  // QA P1 — upsert behavior: re-subscribe after unsubscribe must flip the
  // status back to ACTIVE. Previously this was a plain INSERT, which threw
  // unique-violation on re-subscribe; the route caught it and returned a
  // fake-success `alreadySubscribed: true` while the user stayed UNSUBSCRIBED.
  // Now we ON CONFLICT (email) DO UPDATE: restore status, refresh name/source
  // if provided, keep the existing unsubscribe token (rotating it on every
  // resubscribe breaks the old unsubscribe links in already-sent emails).
  const [row] = await db
    .insert(subscribers)
    .values({
      email,
      nameEn: name ?? null,
      source: source ?? null,
      unsubscribeToken: token,
    })
    .onConflictDoUpdate({
      target: subscribers.email,
      set: {
        status: 'ACTIVE',
        nameEn: name ?? sql`${subscribers.nameEn}`,
        source: source ?? sql`${subscribers.source}`,
      },
    })
    .returning()
  return row ?? null
}

export async function getSubscribers(limit = 100): Promise<Subscriber[]> {
  if (HAS_DB) {
    return db
      .select()
      .from(subscribers)
      .orderBy(desc(subscribers.createdAt))
      .limit(limit)
  }
  return placeholderSubscribers.slice(0, limit)
}

export async function unsubscribe(token: string): Promise<boolean> {
  if (!HAS_DB) {
    noDb(`unsubscribe(${token})`)
    return false
  }
  const result = await db
    .update(subscribers)
    .set({ status: 'UNSUBSCRIBED' })
    .where(eq(subscribers.unsubscribeToken, token))
    .returning({ id: subscribers.id })
  return result.length > 0
}

/* ──────────────────────────────────────────────────────────────────────────
 * Contact messages
 * ──────────────────────────────────────────────────────────────────────── */

export type ContactInput = {
  name: string
  email: string
  subject: string
  message: string
}

export async function createContactMessage(
  data: ContactInput,
): Promise<ContactMessage | null> {
  if (!HAS_DB) {
    noDb(`createContactMessage(${data.email})`)
    return null
  }
  const [row] = await db.insert(contactMessages).values(data).returning()
  return row ?? null
}

export async function getContactMessages(
  status?: MessageStatus,
  limit = 50,
): Promise<ContactMessage[]> {
  if (HAS_DB) {
    const query = status
      ? db
          .select()
          .from(contactMessages)
          .where(eq(contactMessages.status, status))
      : db.select().from(contactMessages)
    return query.orderBy(desc(contactMessages.createdAt)).limit(limit)
  }
  const rows = status
    ? placeholderContactMessages.filter((m) => m.status === status)
    : placeholderContactMessages
  return rows.slice(0, limit)
}

export async function markMessageRead(id: string): Promise<void> {
  if (!isUuid(id)) return
  if (!HAS_DB) {
    noDb(`markMessageRead(${id})`)
    return
  }
  await db
    .update(contactMessages)
    .set({ status: 'READ' })
    .where(eq(contactMessages.id, id))
}

/* ──────────────────────────────────────────────────────────────────────────
 * Settings + content blocks
 * ──────────────────────────────────────────────────────────────────────── */

export async function getSetting(key: string): Promise<SiteSetting | null> {
  if (HAS_DB) {
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, key))
      .limit(1)
    return row ?? null
  }
  return placeholderSettings.find((s) => s.key === key) ?? null
}

export async function getAllSettings(): Promise<SiteSetting[]> {
  if (HAS_DB) {
    return db.select().from(siteSettings).orderBy(siteSettings.key)
  }
  return placeholderSettings
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!HAS_DB) {
    noDb(`setSetting(${key})`)
    return
  }
  await db
    .insert(siteSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } })
}

export async function setSettingsBulk(entries: Record<string, string>): Promise<void> {
  if (!HAS_DB) {
    noDb(`setSettingsBulk(${Object.keys(entries).length} keys)`)
    return
  }
  for (const [key, value] of Object.entries(entries)) {
    await db
      .insert(siteSettings)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } })
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Structured site settings (single JSON blob under key 'site_config').
 *
 * Read with getSiteSettings(); the cached, request-deduped wrapper lives in
 * lib/site-settings/get.ts and is what pages should call. updateSiteSettings()
 * merges a partial update over the current row and revalidates the
 * 'site-settings' cache tag.
 * ──────────────────────────────────────────────────────────────────────── */

export async function getSiteSettings(): Promise<SiteSettings> {
  if (!HAS_DB) return DEFAULT_SETTINGS
  try {
    const [row] = await db
      .select({ valueJson: siteSettings.valueJson })
      .from(siteSettings)
      .where(eq(siteSettings.key, SITE_CONFIG_KEY))
      .limit(1)
    if (!row || row.valueJson == null) return DEFAULT_SETTINGS
    return coerceSettings(row.valueJson)
  } catch (err) {
    console.error('[getSiteSettings]', err)
    return DEFAULT_SETTINGS
  }
}

export async function updateSiteSettings(
  patch: SiteSettingsPatch,
): Promise<SiteSettings> {
  const current = await getSiteSettings()
  const next = mergeSettings(current, patch)

  if (!HAS_DB) {
    noDb('updateSiteSettings')
    revalidateTag(SITE_SETTINGS_CACHE_TAG)
    return next
  }

  await db
    .insert(siteSettings)
    .values({ key: SITE_CONFIG_KEY, value: '', valueJson: next })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { valueJson: next, updatedAt: new Date() },
    })

  revalidateTag(SITE_SETTINGS_CACHE_TAG)
  return next
}

export async function resetSiteSettings(): Promise<SiteSettings> {
  if (!HAS_DB) {
    noDb('resetSiteSettings')
    revalidateTag(SITE_SETTINGS_CACHE_TAG)
    return DEFAULT_SETTINGS
  }
  await db
    .insert(siteSettings)
    .values({ key: SITE_CONFIG_KEY, value: '', valueJson: DEFAULT_SETTINGS })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { valueJson: DEFAULT_SETTINGS, updatedAt: new Date() },
    })
  revalidateTag(SITE_SETTINGS_CACHE_TAG)
  return DEFAULT_SETTINGS
}

export async function getContentBlock(key: string): Promise<ContentBlock | null> {
  if (HAS_DB) {
    const [row] = await db
      .select()
      .from(contentBlocks)
      .where(eq(contentBlocks.key, key))
      .limit(1)
    return row ?? null
  }
  return placeholderContentBlocks.find((b) => b.key === key) ?? null
}

export async function getAllContentBlocks(): Promise<ContentBlock[]> {
  if (HAS_DB) {
    return db.select().from(contentBlocks).orderBy(contentBlocks.key)
  }
  return placeholderContentBlocks
}

export async function setContentBlock(
  key: string,
  valueAr: string,
  valueEn: string,
  description?: string | null,
): Promise<void> {
  if (!HAS_DB) {
    noDb(`setContentBlock(${key})`)
    return
  }
  await db
    .insert(contentBlocks)
    .values({ key, valueAr, valueEn, description: description ?? null })
    .onConflictDoUpdate({
      target: contentBlocks.key,
      set: {
        valueAr,
        valueEn,
        description: description ?? null,
        updatedAt: new Date(),
      },
    })
}

export async function deleteContentBlock(key: string): Promise<boolean> {
  if (!HAS_DB) {
    noDb(`deleteContentBlock(${key})`)
    return false
  }
  const result = await db.delete(contentBlocks).where(eq(contentBlocks.key, key))
  return (result.rowCount ?? 0) > 0
}

/* ──────────────────────────────────────────────────────────────────────────
 * Mutations — admin CRUD
 *
 * Each create/update/delete is a no-op when DATABASE_URL is unset, returning
 * `null` (and logging once via noDb). Real Drizzle paths run when connected.
 * ──────────────────────────────────────────────────────────────────────── */

export async function createArticle(data: NewArticle): Promise<Article | null> {
  if (!HAS_DB) {
    noDb(`createArticle(${data.slug})`)
    return null
  }
  const [row] = await db.insert(articles).values(data).returning()
  return row ?? null
}

export async function updateArticle(
  id: string,
  data: Partial<NewArticle>,
): Promise<Article | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateArticle(${id})`)
    return null
  }
  const [row] = await db
    .update(articles)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(articles.id, id))
    .returning()
  return row ?? null
}

export async function deleteArticle(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteArticle(${id})`)
    return false
  }
  const rows = await db
    .delete(articles)
    .where(eq(articles.id, id))
    .returning({ id: articles.id })
  return rows.length > 0
}

export async function createBook(data: NewBook): Promise<Book | null> {
  if (!HAS_DB) {
    noDb(`createBook(${data.slug})`)
    return null
  }
  const [row] = await db.insert(books).values(data).returning()
  return row ?? null
}

export async function updateBook(
  id: string,
  data: Partial<NewBook>,
): Promise<Book | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateBook(${id})`)
    return null
  }
  const [row] = await db
    .update(books)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(books.id, id))
    .returning()
  return row ?? null
}

export async function deleteBook(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteBook(${id})`)
    return false
  }
  const rows = await db
    .delete(books)
    .where(eq(books.id, id))
    .returning({ id: books.id })
  return rows.length > 0
}

export async function createInterview(
  data: NewInterview,
): Promise<Interview | null> {
  if (!HAS_DB) {
    noDb(`createInterview(${data.slug})`)
    return null
  }
  const [row] = await db.insert(interviews).values(data).returning()
  return row ?? null
}

export async function updateInterview(
  id: string,
  data: Partial<NewInterview>,
): Promise<Interview | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateInterview(${id})`)
    return null
  }
  const [row] = await db
    .update(interviews)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(interviews.id, id))
    .returning()
  return row ?? null
}

export async function deleteInterview(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteInterview(${id})`)
    return false
  }
  const rows = await db
    .delete(interviews)
    .where(eq(interviews.id, id))
    .returning({ id: interviews.id })
  return rows.length > 0
}

export async function createEvent(data: NewEvent): Promise<Event | null> {
  if (!HAS_DB) {
    noDb(`createEvent(${data.slug})`)
    return null
  }
  const [row] = await db.insert(events).values(data).returning()
  return row ?? null
}

export async function updateEvent(
  id: string,
  data: Partial<NewEvent>,
): Promise<Event | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateEvent(${id})`)
    return null
  }
  const [row] = await db
    .update(events)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(events.id, id))
    .returning()
  return row ?? null
}

export async function deleteEvent(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteEvent(${id})`)
    return false
  }
  const rows = await db
    .delete(events)
    .where(eq(events.id, id))
    .returning({ id: events.id })
  return rows.length > 0
}

export async function createGalleryItem(
  data: NewGalleryItem,
): Promise<GalleryItem | null> {
  if (!HAS_DB) {
    noDb(`createGalleryItem(${data.image})`)
    return null
  }
  const [row] = await db.insert(gallery).values(data).returning()
  return row ?? null
}

export async function updateGalleryItem(
  id: string,
  data: Partial<NewGalleryItem>,
): Promise<GalleryItem | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateGalleryItem(${id})`)
    return null
  }
  const [row] = await db
    .update(gallery)
    .set(data)
    .where(eq(gallery.id, id))
    .returning()
  return row ?? null
}

export async function deleteGalleryItem(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteGalleryItem(${id})`)
    return false
  }
  const rows = await db
    .delete(gallery)
    .where(eq(gallery.id, id))
    .returning({ id: gallery.id })
  return rows.length > 0
}

export async function updateOrderStatus(
  id: string,
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'REFUNDED' | 'FAILED',
): Promise<Order | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateOrderStatus(${id}, ${status})`)
    return null
  }
  const [row] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, id))
    .returning()
  return row ?? null
}

/**
 * Lookup by Stripe payment_intent id. Used by the webhook to mirror
 * payment-side events (charge.refunded, payment_intent.payment_failed) onto
 * the local order row.
 */
export async function getOrderByPaymentIntentId(
  paymentIntentId: string,
): Promise<Order | null> {
  if (!HAS_DB) return null
  if (!paymentIntentId) return null
  const [row] = await db
    .select()
    .from(orders)
    .where(eq(orders.stripePaymentIntentId, paymentIntentId))
    .limit(1)
  return row ?? null
}

/**
 * Idempotent: updates the order whose stripePaymentIntentId matches. Used by
 * the webhook. Returns null if no matching order exists (e.g. event for a
 * payment we never recorded).
 */
export async function updateOrderStatusByPaymentIntentId(
  paymentIntentId: string,
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'REFUNDED' | 'FAILED',
): Promise<Order | null> {
  if (!HAS_DB) {
    noDb(`updateOrderStatusByPaymentIntentId(${paymentIntentId}, ${status})`)
    return null
  }
  if (!paymentIntentId) return null
  const [row] = await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.stripePaymentIntentId, paymentIntentId))
    .returning()
  return row ?? null
}

/* ──────────────────────────────────────────────────────────────────────────
 * Re-export schema types so pages don't import from `db/schema` directly.
 * ──────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
 * Corporate programs
 *
 * Programs are public listings (read paths fall back to placeholders); clients
 * are trust-strip logos; requests are submissions from organizations. The
 * `byOrder` helper is reused for placeholder paths.
 * ──────────────────────────────────────────────────────────────────────── */

export async function getCorporatePrograms(opts?: {
  publishedOnly?: boolean
  limit?: number
}): Promise<CorporateProgram[]> {
  const publishedOnly = opts?.publishedOnly ?? true
  const limit = opts?.limit ?? 100

  if (HAS_DB) {
    try {
      const base = db.select().from(corporatePrograms)
      const filtered = publishedOnly
        ? base.where(eq(corporatePrograms.status, 'PUBLISHED'))
        : base
      return await filtered
        .orderBy(corporatePrograms.orderIndex, corporatePrograms.createdAt)
        .limit(limit)
    } catch (err) {
      console.error(
        '[getCorporatePrograms] DB error, falling back to placeholders:',
        err,
      )
    }
  }
  const rows = (
    publishedOnly
      ? placeholderCorporatePrograms.filter((p) => p.status === 'PUBLISHED')
      : placeholderCorporatePrograms
  )
    .slice()
    .sort(byOrder)
  return rows.slice(0, limit)
}

export async function getCorporateProgram(
  id: string,
): Promise<CorporateProgram | null> {
  if (HAS_DB && isUuid(id)) {
    try {
      const [row] = await db
        .select()
        .from(corporatePrograms)
        .where(eq(corporatePrograms.id, id))
        .limit(1)
      if (row) return row
    } catch (err) {
      console.error('[getCorporateProgram] DB error:', err)
    }
  }
  return placeholderCorporatePrograms.find((p) => p.id === id) ?? null
}

export async function getCorporateProgramBySlug(
  slug: string,
): Promise<CorporateProgram | null> {
  if (HAS_DB) {
    try {
      const [row] = await db
        .select()
        .from(corporatePrograms)
        .where(eq(corporatePrograms.slug, slug))
        .limit(1)
      if (row) return row
    } catch (err) {
      console.error('[getCorporateProgramBySlug] DB error:', err)
    }
  }
  return placeholderCorporatePrograms.find((p) => p.slug === slug) ?? null
}

export async function createCorporateProgram(
  data: NewCorporateProgram,
): Promise<CorporateProgram | null> {
  if (!HAS_DB) {
    noDb(`createCorporateProgram(${data.slug})`)
    return null
  }
  const [row] = await db.insert(corporatePrograms).values(data).returning()
  return row ?? null
}

export async function updateCorporateProgram(
  id: string,
  data: Partial<NewCorporateProgram>,
): Promise<CorporateProgram | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateCorporateProgram(${id})`)
    return null
  }
  const [row] = await db
    .update(corporatePrograms)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(corporatePrograms.id, id))
    .returning()
  return row ?? null
}

export async function deleteCorporateProgram(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteCorporateProgram(${id})`)
    return false
  }
  const rows = await db
    .delete(corporatePrograms)
    .where(eq(corporatePrograms.id, id))
    .returning({ id: corporatePrograms.id })
  return rows.length > 0
}

export async function getCorporateClients(opts?: {
  publishedOnly?: boolean
}): Promise<CorporateClient[]> {
  const publishedOnly = opts?.publishedOnly ?? true
  if (HAS_DB) {
    try {
      const base = db.select().from(corporateClients)
      const filtered = publishedOnly
        ? base.where(eq(corporateClients.status, 'PUBLISHED'))
        : base
      return await filtered.orderBy(
        corporateClients.orderIndex,
        corporateClients.createdAt,
      )
    } catch (err) {
      console.error(
        '[getCorporateClients] DB error, falling back to placeholders:',
        err,
      )
    }
  }
  return (
    publishedOnly
      ? placeholderCorporateClients.filter((c) => c.status === 'PUBLISHED')
      : placeholderCorporateClients
  )
    .slice()
    .sort(byOrder)
}

export async function getCorporateClient(
  id: string,
): Promise<CorporateClient | null> {
  if (HAS_DB && isUuid(id)) {
    try {
      const [row] = await db
        .select()
        .from(corporateClients)
        .where(eq(corporateClients.id, id))
        .limit(1)
      if (row) return row
    } catch (err) {
      console.error('[getCorporateClient] DB error:', err)
    }
  }
  return placeholderCorporateClients.find((c) => c.id === id) ?? null
}

export async function createCorporateClient(
  data: NewCorporateClient,
): Promise<CorporateClient | null> {
  if (!HAS_DB) {
    noDb(`createCorporateClient(${data.name})`)
    return null
  }
  const [row] = await db.insert(corporateClients).values(data).returning()
  return row ?? null
}

export async function updateCorporateClient(
  id: string,
  data: Partial<NewCorporateClient>,
): Promise<CorporateClient | null> {
  if (!isUuid(id)) return null
  if (!HAS_DB) {
    noDb(`updateCorporateClient(${id})`)
    return null
  }
  const [row] = await db
    .update(corporateClients)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(corporateClients.id, id))
    .returning()
  return row ?? null
}

export async function deleteCorporateClient(id: string): Promise<boolean> {
  if (!isUuid(id)) return false
  if (!HAS_DB) {
    noDb(`deleteCorporateClient(${id})`)
    return false
  }
  const rows = await db
    .delete(corporateClients)
    .where(eq(corporateClients.id, id))
    .returning({ id: corporateClients.id })
  return rows.length > 0
}

export type CorporateRequestInput = {
  name: string
  email: string
  phone?: string | null
  organization: string
  position?: string | null
  programId?: string | null
  preferredDate?: string | null
  attendeeCount?: number | null
  message?: string | null
}

export async function createCorporateRequest(
  data: CorporateRequestInput,
): Promise<CorporateRequest | null> {
  if (!HAS_DB) {
    // Buffer into the placeholder array so admin pages can preview the new
    // request in dev, even without a real DB. Resets on dev-server restart.
    const row: CorporateRequest = {
      id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`,
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      organization: data.organization,
      position: data.position ?? null,
      programId: data.programId ?? null,
      preferredDate: data.preferredDate ?? null,
      attendeeCount: data.attendeeCount ?? null,
      message: data.message ?? null,
      status: 'NEW',
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    placeholderCorporateRequests.unshift(row)
    return row
  }
  const [row] = await db
    .insert(corporateRequests)
    .values({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      organization: data.organization,
      position: data.position ?? null,
      programId: data.programId ?? null,
      preferredDate: data.preferredDate ?? null,
      attendeeCount: data.attendeeCount ?? null,
      message: data.message ?? null,
    })
    .returning()
  return row ?? null
}

export async function getCorporateRequests(
  status?: CorporateRequestStatus,
  limit = 100,
): Promise<CorporateRequest[]> {
  if (HAS_DB) {
    try {
      const query = status
        ? db
            .select()
            .from(corporateRequests)
            .where(eq(corporateRequests.status, status))
        : db.select().from(corporateRequests)
      return await query
        .orderBy(desc(corporateRequests.createdAt))
        .limit(limit)
    } catch (err) {
      console.error(
        '[getCorporateRequests] DB error, falling back to placeholders:',
        err,
      )
    }
  }
  const rows = status
    ? placeholderCorporateRequests.filter((r) => r.status === status)
    : placeholderCorporateRequests
  return rows.slice(0, limit)
}

export async function getCorporateRequest(
  id: string,
): Promise<CorporateRequest | null> {
  if (HAS_DB && isUuid(id)) {
    try {
      const [row] = await db
        .select()
        .from(corporateRequests)
        .where(eq(corporateRequests.id, id))
        .limit(1)
      if (row) return row
    } catch (err) {
      console.error('[getCorporateRequest] DB error:', err)
    }
  }
  return placeholderCorporateRequests.find((r) => r.id === id) ?? null
}

export async function updateCorporateRequest(
  id: string,
  data: Partial<{
    status: CorporateRequestStatus
    adminNotes: string | null
  }>,
): Promise<CorporateRequest | null> {
  if (!HAS_DB) {
    const idx = placeholderCorporateRequests.findIndex((r) => r.id === id)
    if (idx === -1) return null
    const next: CorporateRequest = {
      ...placeholderCorporateRequests[idx],
      ...data,
      updatedAt: new Date(),
    }
    placeholderCorporateRequests[idx] = next
    return next
  }
  if (!isUuid(id)) return null
  const [row] = await db
    .update(corporateRequests)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(corporateRequests.id, id))
    .returning()
  return row ?? null
}

export async function deleteCorporateRequest(id: string): Promise<boolean> {
  if (!HAS_DB) {
    const idx = placeholderCorporateRequests.findIndex((r) => r.id === id)
    if (idx === -1) return false
    placeholderCorporateRequests.splice(idx, 1)
    return true
  }
  if (!isUuid(id)) return false
  const rows = await db
    .delete(corporateRequests)
    .where(eq(corporateRequests.id, id))
    .returning({ id: corporateRequests.id })
  return rows.length > 0
}

/* ──────────────────────────────────────────────────────────────────────────
 * Booking — Services for Individuals (Phase A1)
 *
 * Read helpers return enriched shapes: bookings come with `activeHoldsCount`
 * computed via LEFT JOIN bookings_pending_holds h ON h.booking_id = b.id AND
 * h.expires_at > NOW(). Effective seat math is then maxCapacity - bookedCount
 * - activeHoldsCount.
 *
 * Write helpers (createBookingHold) are transactional with a SELECT FOR UPDATE
 * on the booking row to serialise concurrent Reserve clicks.
 *
 * Mock-mode: bookings + tours come from placeholder-data; bookingInterest +
 * tourSuggestions live in the on-disk mock-store so re-submissions exercise
 * the idempotent upsert. Holds and Stripe-driven booking_orders are not
 * mocked (the createBookingCheckoutAction returns 'stripe_unconfigured' in
 * mock mode, so the hold path is never entered).
 * ──────────────────────────────────────────────────────────────────────── */

export type BookingWithHolds = Booking & {
  activeHoldsCount: number
}

export async function getActiveTours(): Promise<Tour[]> {
  if (!HAS_DB) {
    return [...placeholderTours]
      .filter((t) => t.isActive)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }
  try {
    return await db
      .select()
      .from(tours)
      .where(eq(tours.isActive, true))
      .orderBy(asc(tours.date))
  } catch (err) {
    console.error('[queries.getActiveTours]', err)
    return []
  }
}

/**
 * Cleans up expired holds. Cheap, idempotent — uses the
 * (booking_id, expires_at) index. Safe to call before any read or at the top
 * of the createBookingHold transaction.
 *
 * Pass a bookingId to scope the cleanup; pass undefined to sweep globally.
 */
async function cleanupExpiredHolds(bookingId?: string): Promise<void> {
  if (!HAS_DB) return
  try {
    const where = bookingId
      ? and(
          eq(bookingsPendingHolds.bookingId, bookingId),
          lte(bookingsPendingHolds.expiresAt, sql`now()`),
        )
      : lte(bookingsPendingHolds.expiresAt, sql`now()`)
    await db.delete(bookingsPendingHolds).where(where)
  } catch (err) {
    console.error('[queries.cleanupExpiredHolds]', err)
  }
}

/**
 * Read helper: returns the bookings rows enriched with `activeHoldsCount`.
 * One query, not N. Lazy-cleans expired holds first so the count is precise.
 */
async function getBookingsByProductType(
  productType: BookingProductType,
): Promise<BookingWithHolds[]> {
  if (!HAS_DB) {
    return placeholderBookings
      .filter((b) => b.isActive && b.productType === productType)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((b) => ({ ...b, activeHoldsCount: 0 }))
  }
  await cleanupExpiredHolds()
  try {
    const rows = await db
      .select({
        booking: bookings,
        activeHoldsCount: sql<number>`COALESCE(COUNT(${bookingsPendingHolds.id}) FILTER (WHERE ${bookingsPendingHolds.expiresAt} > now()), 0)::int`,
      })
      .from(bookings)
      .leftJoin(
        bookingsPendingHolds,
        eq(bookingsPendingHolds.bookingId, bookings.id),
      )
      .where(
        and(eq(bookings.isActive, true), eq(bookings.productType, productType)),
      )
      .groupBy(bookings.id)
      .orderBy(asc(bookings.displayOrder))
    return rows.map((r) => ({
      ...r.booking,
      activeHoldsCount: Number(r.activeHoldsCount) || 0,
    }))
  } catch (err) {
    console.error('[queries.getBookingsByProductType]', err)
    return []
  }
}

/**
 * Returns the Reconsider course row, or null if not seeded.
 *
 * Defensive on >1: if admin accidentally created multiple RECONSIDER_COURSE
 * rows, log a warning and return the lowest displayOrder (tiebreak: createdAt
 * asc). Behavior is deterministic across requests; doesn't 500 on bad data.
 */
export async function getReconsiderCourse(): Promise<BookingWithHolds | null> {
  const rows = await getBookingsByProductType('RECONSIDER_COURSE')
  if (rows.length === 0) return null
  if (rows.length > 1) {
    console.warn(
      `[queries.getReconsiderCourse] expected 1 row, found ${rows.length}; returning lowest displayOrder.`,
    )
  }
  // getBookingsByProductType already orders by displayOrder asc; take first.
  return rows[0]!
}

export async function getActiveOnlineSessions(): Promise<BookingWithHolds[]> {
  return getBookingsByProductType('ONLINE_SESSION')
}

export async function getBookingById(
  id: string,
): Promise<BookingWithHolds | null> {
  if (!HAS_DB) {
    const found = placeholderBookings.find((b) => b.id === id)
    return found ? { ...found, activeHoldsCount: 0 } : null
  }
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .select({
        booking: bookings,
        activeHoldsCount: sql<number>`COALESCE(COUNT(${bookingsPendingHolds.id}) FILTER (WHERE ${bookingsPendingHolds.expiresAt} > now()), 0)::int`,
      })
      .from(bookings)
      .leftJoin(
        bookingsPendingHolds,
        eq(bookingsPendingHolds.bookingId, bookings.id),
      )
      .where(eq(bookings.id, id))
      .groupBy(bookings.id)
      .limit(1)
    if (!row) return null
    return {
      ...row.booking,
      activeHoldsCount: Number(row.activeHoldsCount) || 0,
    }
  } catch (err) {
    console.error('[queries.getBookingById]', err)
    return null
  }
}

/* ── Tour suggestions ──────────────────────────────────────────────────── */

export async function createTourSuggestion(input: {
  userId: string
  suggestedCity: string
  suggestedCountry: string
  additionalNotes?: string | null
}): Promise<TourSuggestion | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const row: TourSuggestion = {
      id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`,
      userId: input.userId,
      suggestedCity: input.suggestedCity,
      suggestedCountry: input.suggestedCountry,
      additionalNotes: input.additionalNotes ?? null,
      createdAt: new Date(),
      reviewedAt: null,
    }
    store.tourSuggestions.unshift(row)
    writeStore(store)
    placeholderTourSuggestions.unshift(row)
    return row
  }
  if (!HAS_DB) return null
  if (!isUuid(input.userId)) return null
  try {
    const [row] = await db
      .insert(tourSuggestions)
      .values({
        userId: input.userId,
        suggestedCity: input.suggestedCity,
        suggestedCountry: input.suggestedCountry,
        additionalNotes: input.additionalNotes ?? null,
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createTourSuggestion]', err)
    return null
  }
}

/* ── Booking interest (waitlist) ───────────────────────────────────────── */

/**
 * Idempotent upsert on (user_id, booking_id). Re-submissions update the
 * additionalNotes; no duplicate row, no error.
 */
export async function upsertBookingInterest(input: {
  userId: string
  bookingId: string
  additionalNotes?: string | null
}): Promise<BookingInterest | null> {
  if (MOCK_AUTH_ENABLED) {
    const key = `${input.userId}:${input.bookingId}`
    const store = readStore()
    const existing = store.bookingInterest.get(key)
    const now = new Date()
    if (existing) {
      const updated: BookingInterest = {
        ...existing,
        additionalNotes: input.additionalNotes ?? null,
      }
      store.bookingInterest.set(key, updated)
      writeStore(store)
      return updated
    }
    const row: BookingInterest = {
      id: `00000000-0000-0000-0000-${Date.now().toString().slice(-12).padStart(12, '0')}`,
      userId: input.userId,
      bookingId: input.bookingId,
      additionalNotes: input.additionalNotes ?? null,
      createdAt: now,
      contactedAt: null,
    }
    store.bookingInterest.set(key, row)
    writeStore(store)
    placeholderBookingInterest.unshift(row)
    return row
  }
  if (!HAS_DB) return null
  if (!isUuid(input.userId) || !isUuid(input.bookingId)) return null
  try {
    const [row] = await db
      .insert(bookingInterest)
      .values({
        userId: input.userId,
        bookingId: input.bookingId,
        additionalNotes: input.additionalNotes ?? null,
      })
      .onConflictDoUpdate({
        target: [bookingInterest.userId, bookingInterest.bookingId],
        set: { additionalNotes: input.additionalNotes ?? null },
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.upsertBookingInterest]', err)
    return null
  }
}

/* ── Holds (capacity guard) ────────────────────────────────────────────── */

/**
 * Result type for createBookingHold. Discriminated so callers don't need to
 * inspect a `null` row.
 */
export type CreateBookingHoldResult =
  | { ok: true; holdId: string; expiresAt: Date }
  | {
      ok: false
      error:
        | 'booking_not_found'
        | 'not_open'
        | 'no_capacity'
        | 'invalid_input'
        | 'db_unavailable'
    }

/**
 * Race-free hold creation. Inside ONE transaction:
 *   1. Lazy-clean expired holds for this booking
 *   2. Delete any prior hold the same user has on this booking (re-click UX)
 *   3. SELECT booked_count, max_capacity, booking_state FOR UPDATE
 *   4. If state != OPEN → not_open
 *   5. Count active holds (the count of others' holds — the user's own was
 *      already deleted in step 2)
 *   6. If booked_count + active_holds + 1 > max_capacity → no_capacity
 *      (the +1 accounts for the hold we're about to insert)
 *   7. INSERT hold and return its id + expiresAt
 *
 * If MOCK_AUTH_ENABLED, returns 'db_unavailable' — the action layer treats
 * this the same as 'stripe_unconfigured' since the Stripe path is also
 * unavailable in mock mode.
 */
export async function createBookingHold(input: {
  userId: string
  bookingId: string
}): Promise<CreateBookingHoldResult> {
  if (!HAS_DB) {
    return { ok: false, error: 'db_unavailable' }
  }
  if (!isUuid(input.userId) || !isUuid(input.bookingId)) {
    return { ok: false, error: 'invalid_input' }
  }
  try {
    return await db.transaction(async (tx) => {
      await tx.delete(bookingsPendingHolds).where(
        and(
          eq(bookingsPendingHolds.bookingId, input.bookingId),
          lte(bookingsPendingHolds.expiresAt, sql`now()`),
        ),
      )
      // Re-click handling: drop any existing hold the same user has for this
      // booking. The orphan Stripe session (if any) will be cleaned up by
      // the checkout.session.expired webhook later.
      await tx.delete(bookingsPendingHolds).where(
        and(
          eq(bookingsPendingHolds.userId, input.userId),
          eq(bookingsPendingHolds.bookingId, input.bookingId),
        ),
      )
      const [bookingRow] = await tx
        .select({
          bookedCount: bookings.bookedCount,
          maxCapacity: bookings.maxCapacity,
          bookingState: bookings.bookingState,
        })
        .from(bookings)
        .where(eq(bookings.id, input.bookingId))
        .for('update')
        .limit(1)
      if (!bookingRow) {
        return { ok: false, error: 'booking_not_found' as const }
      }
      if (bookingRow.bookingState !== 'OPEN') {
        return { ok: false, error: 'not_open' as const }
      }
      const [{ count }] = await tx
        .select({
          count: sql<number>`COUNT(*)::int`,
        })
        .from(bookingsPendingHolds)
        .where(
          and(
            eq(bookingsPendingHolds.bookingId, input.bookingId),
            gt(bookingsPendingHolds.expiresAt, sql`now()`),
          ),
        )
      const activeHolds = Number(count) || 0
      // The +1 accounts for the hold we're about to insert.
      if (bookingRow.bookedCount + activeHolds + 1 > bookingRow.maxCapacity) {
        return { ok: false, error: 'no_capacity' as const }
      }
      const [hold] = await tx
        .insert(bookingsPendingHolds)
        .values({
          userId: input.userId,
          bookingId: input.bookingId,
        })
        .returning({
          id: bookingsPendingHolds.id,
          expiresAt: bookingsPendingHolds.expiresAt,
        })
      return {
        ok: true as const,
        holdId: hold!.id,
        expiresAt: hold!.expiresAt,
      }
    })
  } catch (err) {
    console.error('[queries.createBookingHold]', err)
    return { ok: false, error: 'db_unavailable' }
  }
}

export async function setHoldStripeSessionId(
  holdId: string,
  stripeSessionId: string,
): Promise<boolean> {
  if (!HAS_DB) return false
  if (!isUuid(holdId)) return false
  try {
    const rows = await db
      .update(bookingsPendingHolds)
      .set({ stripeSessionId })
      .where(eq(bookingsPendingHolds.id, holdId))
      .returning({ id: bookingsPendingHolds.id })
    return rows.length > 0
  } catch (err) {
    console.error('[queries.setHoldStripeSessionId]', err)
    return false
  }
}

export async function deleteHoldByStripeSessionId(
  stripeSessionId: string,
): Promise<void> {
  if (!HAS_DB) return
  try {
    await db
      .delete(bookingsPendingHolds)
      .where(eq(bookingsPendingHolds.stripeSessionId, stripeSessionId))
  } catch (err) {
    console.error('[queries.deleteHoldByStripeSessionId]', err)
  }
}

export async function deleteHoldById(holdId: string): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(holdId)) return
  try {
    await db
      .delete(bookingsPendingHolds)
      .where(eq(bookingsPendingHolds.id, holdId))
  } catch (err) {
    console.error('[queries.deleteHoldById]', err)
  }
}

/* ── Booking orders ────────────────────────────────────────────────────── */

export async function createBookingOrder(input: {
  userId: string | null
  bookingId: string
  stripeSessionId: string
  amountPaid: number
  currency: string
}): Promise<BookingOrder | null> {
  if (!HAS_DB) return null
  if (input.userId && !isUuid(input.userId)) return null
  if (!isUuid(input.bookingId)) return null
  try {
    const [row] = await db
      .insert(bookingOrders)
      .values({
        userId: input.userId,
        bookingId: input.bookingId,
        stripeSessionId: input.stripeSessionId,
        amountPaid: input.amountPaid,
        currency: input.currency,
        status: 'PENDING',
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createBookingOrder]', err)
    return null
  }
}

export async function getBookingOrderByStripeSessionId(
  stripeSessionId: string,
): Promise<BookingOrder | null> {
  if (!HAS_DB) return null
  if (!stripeSessionId || stripeSessionId.length > 200) return null
  try {
    const [row] = await db
      .select()
      .from(bookingOrders)
      .where(eq(bookingOrders.stripeSessionId, stripeSessionId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[queries.getBookingOrderByStripeSessionId]', err)
    return null
  }
}

/**
 * Webhook handler: completed payment.
 * Atomically: marks order PAID + increments bookedCount + flips SOLD_OUT if
 * we just hit max + deletes the hold by stripeSessionId.
 *
 * Concurrency: the UPDATE is gated on `status='PENDING'`. Two concurrent
 * webhook deliveries can both pass the outer `existing.status === 'PAID'`
 * idempotency check (TOCTOU) — without the AND-status guard here, both
 * would then increment bookedCount. With the guard, the second UPDATE
 * matches zero rows, returns null, and the caller no-ops. Exactly one
 * PAID transition + one bookedCount increment per stripeSessionId.
 *
 * Returns null when the order is already PAID (or doesn't exist) — the
 * caller should treat null as "already processed" and proceed to clean
 * up any orphaned hold defensively.
 */
export async function markBookingOrderPaid(input: {
  stripeSessionId: string
  stripePaymentIntentId: string | null
  amountPaid: number
}): Promise<{
  bookingOrder: BookingOrder
  bookingId: string
  newBookedCount: number
  flippedToSoldOut: boolean
} | null> {
  if (!HAS_DB) return null
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .update(bookingOrders)
        .set({
          status: 'PAID',
          stripePaymentIntentId: input.stripePaymentIntentId,
          amountPaid: input.amountPaid,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingOrders.stripeSessionId, input.stripeSessionId),
            eq(bookingOrders.status, 'PENDING'),
          ),
        )
        .returning()
      if (!order) return null
      const [b] = await tx
        .update(bookings)
        .set({
          bookedCount: sql`${bookings.bookedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, order.bookingId))
        .returning({
          id: bookings.id,
          bookedCount: bookings.bookedCount,
          maxCapacity: bookings.maxCapacity,
          bookingState: bookings.bookingState,
        })
      let flippedToSoldOut = false
      if (b && b.bookedCount >= b.maxCapacity && b.bookingState === 'OPEN') {
        await tx
          .update(bookings)
          .set({ bookingState: 'SOLD_OUT', updatedAt: new Date() })
          .where(eq(bookings.id, b.id))
        flippedToSoldOut = true
      }
      await tx
        .delete(bookingsPendingHolds)
        .where(eq(bookingsPendingHolds.stripeSessionId, input.stripeSessionId))
      return {
        bookingOrder: order,
        bookingId: order.bookingId,
        newBookedCount: b?.bookedCount ?? 0,
        flippedToSoldOut,
      }
    })
  } catch (err) {
    console.error('[queries.markBookingOrderPaid]', err)
    return null
  }
}

export async function markBookingOrderFailed(input: {
  stripeSessionId?: string
  stripePaymentIntentId?: string
}): Promise<BookingOrder | null> {
  if (!HAS_DB) return null
  if (!input.stripeSessionId && !input.stripePaymentIntentId) return null
  try {
    const where = input.stripeSessionId
      ? eq(bookingOrders.stripeSessionId, input.stripeSessionId)
      : eq(bookingOrders.stripePaymentIntentId, input.stripePaymentIntentId!)
    const [row] = await db
      .update(bookingOrders)
      .set({ status: 'FAILED', updatedAt: new Date() })
      .where(where)
      .returning()
    if (row) {
      // Best-effort: clear the matching hold too.
      await db
        .delete(bookingsPendingHolds)
        .where(
          eq(bookingsPendingHolds.stripeSessionId, row.stripeSessionId),
        )
    }
    return row ?? null
  } catch (err) {
    console.error('[queries.markBookingOrderFailed]', err)
    return null
  }
}

/**
 * Refund handler. Decrements bookedCount with floor at 0. Does NOT auto-revert
 * SOLD_OUT → OPEN — admin tooling (Phase A2) is responsible for that decision.
 */
export async function markBookingOrderRefunded(input: {
  stripePaymentIntentId: string
}): Promise<BookingOrder | null> {
  if (!HAS_DB) return null
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .update(bookingOrders)
        .set({ status: 'REFUNDED', updatedAt: new Date() })
        .where(
          eq(
            bookingOrders.stripePaymentIntentId,
            input.stripePaymentIntentId,
          ),
        )
        .returning()
      if (!order) return null
      // GREATEST clamp at 0 so a double-refund webhook doesn't underflow.
      await tx
        .update(bookings)
        .set({
          bookedCount: sql`GREATEST(${bookings.bookedCount} - 1, 0)`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, order.bookingId))
      // Note: bookingState left alone. Per Decision 11, SOLD_OUT → OPEN auto-
      // revert is deferred to Phase A2 admin tooling.
      return order
    })
  } catch (err) {
    console.error('[queries.markBookingOrderRefunded]', err)
    return null
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Booking admin (Phase A2)
 *
 * All queries below are intended for admin-only callers. They DO NOT filter
 * by isActive=true — admin sees archived/inactive rows. They DO accept
 * optional admin-only filters (status, date range, etc.).
 *
 * Capacity-reduction guard:
 *   updateBookingAdmin / updateBookingCapacityAdmin both honour the
 *   "newMax >= bookedCount + activeHolds" invariant. If the new capacity
 *   would put the booking under-water, the helper returns
 *   { ok: false, error: 'capacity_below_commitment' } so the caller can
 *   surface a precise UI message. The webhook + the public-action code
 *   path are unchanged; this guard is admin-only.
 * ──────────────────────────────────────────────────────────────────────── */

/* ── Tour admin reads / writes ───────────────────────────────────────── */

export async function getAllToursAdmin(): Promise<Tour[]> {
  if (!HAS_DB) {
    return [...placeholderTours].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    )
  }
  try {
    return await db.select().from(tours).orderBy(asc(tours.date))
  } catch (err) {
    console.error('[queries.getAllToursAdmin]', err)
    return []
  }
}

export async function getTourById(id: string): Promise<Tour | null> {
  if (!HAS_DB) {
    return placeholderTours.find((t) => t.id === id) ?? null
  }
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .select()
      .from(tours)
      .where(eq(tours.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[queries.getTourById]', err)
    return null
  }
}

export type CreateTourAdminInput = {
  slug: string
  titleAr: string
  titleEn: string
  cityAr: string
  cityEn: string
  countryAr: string
  countryEn: string
  regionAr: string | null
  regionEn: string | null
  date: Date
  venueAr: string | null
  venueEn: string | null
  descriptionAr: string | null
  descriptionEn: string | null
  externalBookingUrl: string | null
  coverImage: string | null
  attendedCount: number | null
  isActive: boolean
  displayOrder: number
}

export async function createTour(
  input: CreateTourAdminInput,
): Promise<Tour | null> {
  if (!HAS_DB) {
    noDb('createTour')
    return null
  }
  try {
    const [row] = await db.insert(tours).values(input).returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createTour]', err)
    return null
  }
}

export async function updateTour(
  id: string,
  patch: Partial<CreateTourAdminInput>,
): Promise<Tour | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .update(tours)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(tours.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.updateTour]', err)
    return null
  }
}

export async function deleteTour(id: string): Promise<boolean> {
  if (!HAS_DB) return false
  if (!isUuid(id)) return false
  try {
    const rows = await db
      .delete(tours)
      .where(eq(tours.id, id))
      .returning({ id: tours.id })
    return rows.length > 0
  } catch (err) {
    console.error('[queries.deleteTour]', err)
    return false
  }
}

export async function toggleTourActive(
  id: string,
  isActive: boolean,
): Promise<Tour | null> {
  return updateTour(id, { isActive })
}

/* ── Booking admin reads / writes ────────────────────────────────────── */

export async function getAllBookingsAdmin(): Promise<BookingWithHolds[]> {
  if (!HAS_DB) {
    return placeholderBookings
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((b) => ({ ...b, activeHoldsCount: 0 }))
  }
  await cleanupExpiredHolds()
  try {
    const rows = await db
      .select({
        booking: bookings,
        activeHoldsCount: sql<number>`COALESCE(COUNT(${bookingsPendingHolds.id}) FILTER (WHERE ${bookingsPendingHolds.expiresAt} > now()), 0)::int`,
      })
      .from(bookings)
      .leftJoin(
        bookingsPendingHolds,
        eq(bookingsPendingHolds.bookingId, bookings.id),
      )
      .groupBy(bookings.id)
      .orderBy(asc(bookings.displayOrder))
    return rows.map((r) => ({
      ...r.booking,
      activeHoldsCount: Number(r.activeHoldsCount) || 0,
    }))
  } catch (err) {
    console.error('[queries.getAllBookingsAdmin]', err)
    return []
  }
}

export type CreateBookingAdminInput = {
  slug: string
  productType: BookingProductType
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  coverImage: string | null
  priceUsd: number
  currency: string
  nextCohortDate: Date | null
  cohortLabelAr: string | null
  cohortLabelEn: string | null
  durationMinutes: number | null
  formatAr: string | null
  formatEn: string | null
  maxCapacity: number
  bookingState: BookingState
  displayOrder: number
  isActive: boolean
}

export async function createBookingAdmin(
  input: CreateBookingAdminInput,
): Promise<Booking | null> {
  if (!HAS_DB) {
    noDb('createBookingAdmin')
    return null
  }
  try {
    const [row] = await db.insert(bookings).values(input).returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createBookingAdmin]', err)
    return null
  }
}

export type UpdateBookingAdminResult =
  | { ok: true; booking: Booking }
  | {
      ok: false
      error:
        | 'not_found'
        | 'capacity_below_commitment'
        | 'invalid_input'
        | 'db_unavailable'
      data?: { currentBookings: number; currentHolds: number }
    }

/**
 * Capacity-aware booking update. If the patch contains `maxCapacity`, this
 * runs inside a transaction with a SELECT FOR UPDATE on the booking row,
 * counts active holds, and rejects with `capacity_below_commitment` if the
 * new max would put the booking under water (committed seats > capacity).
 *
 * Without this guard, an admin could over-sell by mistake — the public
 * Reserve flow would then start failing with no_capacity even on rows that
 * "should" have seats.
 *
 * Other fields (slug, title, etc.) update without the lock since they don't
 * affect capacity invariants.
 */
export async function updateBookingAdmin(
  id: string,
  patch: Partial<CreateBookingAdminInput>,
): Promise<UpdateBookingAdminResult> {
  if (!HAS_DB) return { ok: false, error: 'db_unavailable' }
  if (!isUuid(id)) return { ok: false, error: 'invalid_input' }
  try {
    return await db.transaction(async (tx) => {
      // Lazy-clean expired holds for this booking so the active count below
      // reflects only live commitments.
      await tx.delete(bookingsPendingHolds).where(
        and(
          eq(bookingsPendingHolds.bookingId, id),
          lte(bookingsPendingHolds.expiresAt, sql`now()`),
        ),
      )

      // Lock the booking row so concurrent admin edits + Reserve clicks
      // don't race against the capacity check.
      const [current] = await tx
        .select({
          bookedCount: bookings.bookedCount,
          maxCapacity: bookings.maxCapacity,
        })
        .from(bookings)
        .where(eq(bookings.id, id))
        .for('update')
        .limit(1)
      if (!current) return { ok: false, error: 'not_found' as const }

      if (patch.maxCapacity !== undefined) {
        const [{ count }] = await tx
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(bookingsPendingHolds)
          .where(
            and(
              eq(bookingsPendingHolds.bookingId, id),
              gt(bookingsPendingHolds.expiresAt, sql`now()`),
            ),
          )
        const activeHolds = Number(count) || 0
        const committed = current.bookedCount + activeHolds
        if (patch.maxCapacity < committed) {
          return {
            ok: false,
            error: 'capacity_below_commitment' as const,
            data: {
              currentBookings: current.bookedCount,
              currentHolds: activeHolds,
            },
          }
        }
      }

      const [row] = await tx
        .update(bookings)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(bookings.id, id))
        .returning()
      if (!row) return { ok: false, error: 'not_found' as const }
      return { ok: true as const, booking: row }
    })
  } catch (err) {
    console.error('[queries.updateBookingAdmin]', err)
    return { ok: false, error: 'db_unavailable' }
  }
}

export async function updateBookingState(
  id: string,
  bookingState: BookingState,
): Promise<Booking | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .update(bookings)
      .set({ bookingState, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.updateBookingState]', err)
    return null
  }
}

export async function deleteBookingAdmin(
  id: string,
): Promise<{ ok: true } | { ok: false; error: 'not_found' | 'has_orders' | 'db_unavailable' }> {
  if (!HAS_DB) return { ok: false, error: 'db_unavailable' }
  if (!isUuid(id)) return { ok: false, error: 'not_found' }
  try {
    const [orderCheck] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookingOrders)
      .where(eq(bookingOrders.bookingId, id))
    if ((orderCheck?.count ?? 0) > 0) {
      return { ok: false, error: 'has_orders' }
    }
    const rows = await db
      .delete(bookings)
      .where(eq(bookings.id, id))
      .returning({ id: bookings.id })
    if (rows.length === 0) return { ok: false, error: 'not_found' }
    return { ok: true }
  } catch (err) {
    console.error('[queries.deleteBookingAdmin]', err)
    return { ok: false, error: 'db_unavailable' }
  }
}

/* ── Tour suggestions admin ──────────────────────────────────────────── */

export type TourSuggestionWithUser = TourSuggestion & {
  userName: string | null
  userEmail: string
}

export async function getAllTourSuggestions(): Promise<TourSuggestionWithUser[]> {
  if (!HAS_DB) {
    return placeholderTourSuggestions.map((s) => ({
      ...s,
      userName: null,
      userEmail: '',
    }))
  }
  try {
    const rows = await db
      .select({
        suggestion: tourSuggestions,
        userName: users.name,
        userEmail: users.email,
      })
      .from(tourSuggestions)
      .leftJoin(users, eq(users.id, tourSuggestions.userId))
      .orderBy(desc(tourSuggestions.createdAt))
    return rows.map((r) => ({
      ...r.suggestion,
      userName: r.userName ?? null,
      userEmail: r.userEmail ?? '',
    }))
  } catch (err) {
    console.error('[queries.getAllTourSuggestions]', err)
    return []
  }
}

export type TourSuggestionAggregate = {
  country: string
  city: string
  count: number
}

export async function getTourSuggestionAggregates(): Promise<
  TourSuggestionAggregate[]
> {
  if (!HAS_DB) return []
  try {
    const rows = await db
      .select({
        country: tourSuggestions.suggestedCountry,
        city: tourSuggestions.suggestedCity,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(tourSuggestions)
      .groupBy(tourSuggestions.suggestedCountry, tourSuggestions.suggestedCity)
      .orderBy(desc(sql`COUNT(*)`))
    return rows.map((r) => ({
      country: r.country,
      city: r.city,
      count: Number(r.count) || 0,
    }))
  } catch (err) {
    console.error('[queries.getTourSuggestionAggregates]', err)
    return []
  }
}

export async function markSuggestionReviewed(
  id: string,
  reviewed: boolean,
): Promise<TourSuggestion | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .update(tourSuggestions)
      .set({ reviewedAt: reviewed ? new Date() : null })
      .where(eq(tourSuggestions.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.markSuggestionReviewed]', err)
    return null
  }
}

/* ── Booking interest admin ──────────────────────────────────────────── */

export type BookingInterestWithMeta = BookingInterest & {
  userName: string | null
  userEmail: string
  bookingTitleAr: string
  bookingTitleEn: string
  bookingProductType: BookingProductType
}

export async function getAllBookingInterest(): Promise<BookingInterestWithMeta[]> {
  if (!HAS_DB) {
    return placeholderBookingInterest.map((i) => {
      const booking = placeholderBookings.find((b) => b.id === i.bookingId)
      return {
        ...i,
        userName: null,
        userEmail: '',
        bookingTitleAr: booking?.titleAr ?? '',
        bookingTitleEn: booking?.titleEn ?? '',
        bookingProductType: booking?.productType ?? 'ONLINE_SESSION',
      }
    })
  }
  try {
    const rows = await db
      .select({
        interest: bookingInterest,
        userName: users.name,
        userEmail: users.email,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        bookingProductType: bookings.productType,
      })
      .from(bookingInterest)
      .leftJoin(users, eq(users.id, bookingInterest.userId))
      .leftJoin(bookings, eq(bookings.id, bookingInterest.bookingId))
      .orderBy(desc(bookingInterest.createdAt))
    return rows.map((r) => ({
      ...r.interest,
      userName: r.userName ?? null,
      userEmail: r.userEmail ?? '',
      bookingTitleAr: r.bookingTitleAr ?? '',
      bookingTitleEn: r.bookingTitleEn ?? '',
      bookingProductType: r.bookingProductType ?? 'ONLINE_SESSION',
    }))
  } catch (err) {
    console.error('[queries.getAllBookingInterest]', err)
    return []
  }
}

export type BookingInterestCount = {
  bookingId: string
  bookingTitleAr: string
  bookingTitleEn: string
  totalCount: number
  pendingCount: number
}

export async function getBookingInterestCounts(): Promise<
  BookingInterestCount[]
> {
  if (!HAS_DB) return []
  try {
    const rows = await db
      .select({
        bookingId: bookingInterest.bookingId,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        totalCount: sql<number>`COUNT(${bookingInterest.id})::int`,
        pendingCount: sql<number>`COUNT(${bookingInterest.id}) FILTER (WHERE ${bookingInterest.contactedAt} IS NULL)::int`,
      })
      .from(bookingInterest)
      .leftJoin(bookings, eq(bookings.id, bookingInterest.bookingId))
      .groupBy(
        bookingInterest.bookingId,
        bookings.titleAr,
        bookings.titleEn,
      )
      .orderBy(desc(sql`COUNT(*)`))
    return rows.map((r) => ({
      bookingId: r.bookingId,
      bookingTitleAr: r.bookingTitleAr ?? '',
      bookingTitleEn: r.bookingTitleEn ?? '',
      totalCount: Number(r.totalCount) || 0,
      pendingCount: Number(r.pendingCount) || 0,
    }))
  } catch (err) {
    console.error('[queries.getBookingInterestCounts]', err)
    return []
  }
}

export async function markInterestContacted(
  id: string,
  contacted: boolean,
): Promise<BookingInterest | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .update(bookingInterest)
      .set({ contactedAt: contacted ? new Date() : null })
      .where(eq(bookingInterest.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.markInterestContacted]', err)
    return null
  }
}

export async function bulkMarkInterestContacted(
  ids: string[],
  contacted: boolean,
): Promise<number> {
  if (!HAS_DB) return 0
  const validIds = ids.filter(isUuid)
  if (validIds.length === 0) return 0
  try {
    const rows = await db
      .update(bookingInterest)
      .set({ contactedAt: contacted ? new Date() : null })
      .where(inArray(bookingInterest.id, validIds))
      .returning({ id: bookingInterest.id })
    return rows.length
  } catch (err) {
    console.error('[queries.bulkMarkInterestContacted]', err)
    return 0
  }
}

/* ── Booking orders admin ────────────────────────────────────────────── */

export type BookingOrderWithMeta = BookingOrder & {
  userName: string | null
  userEmail: string
  bookingTitleAr: string
  bookingTitleEn: string
  bookingProductType: BookingProductType | null
}

export async function getAllBookingOrders(): Promise<BookingOrderWithMeta[]> {
  if (!HAS_DB) {
    return placeholderBookingOrders.map((o) => {
      const booking = placeholderBookings.find((b) => b.id === o.bookingId)
      return {
        ...o,
        userName: null,
        userEmail: '',
        bookingTitleAr: booking?.titleAr ?? '',
        bookingTitleEn: booking?.titleEn ?? '',
        bookingProductType: booking?.productType ?? null,
      }
    })
  }
  try {
    const rows = await db
      .select({
        order: bookingOrders,
        userName: users.name,
        userEmail: users.email,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        bookingProductType: bookings.productType,
      })
      .from(bookingOrders)
      .leftJoin(users, eq(users.id, bookingOrders.userId))
      .leftJoin(bookings, eq(bookings.id, bookingOrders.bookingId))
      .orderBy(desc(bookingOrders.createdAt))
    return rows.map((r) => ({
      ...r.order,
      userName: r.userName ?? null,
      userEmail: r.userEmail ?? '',
      bookingTitleAr: r.bookingTitleAr ?? '',
      bookingTitleEn: r.bookingTitleEn ?? '',
      bookingProductType: r.bookingProductType ?? null,
    }))
  } catch (err) {
    console.error('[queries.getAllBookingOrders]', err)
    return []
  }
}

export async function getBookingOrderById(
  id: string,
): Promise<BookingOrderWithMeta | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .select({
        order: bookingOrders,
        userName: users.name,
        userEmail: users.email,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        bookingProductType: bookings.productType,
      })
      .from(bookingOrders)
      .leftJoin(users, eq(users.id, bookingOrders.userId))
      .leftJoin(bookings, eq(bookings.id, bookingOrders.bookingId))
      .where(eq(bookingOrders.id, id))
      .limit(1)
    if (!row) return null
    return {
      ...row.order,
      userName: row.userName ?? null,
      userEmail: row.userEmail ?? '',
      bookingTitleAr: row.bookingTitleAr ?? '',
      bookingTitleEn: row.bookingTitleEn ?? '',
      bookingProductType: row.bookingProductType ?? null,
    }
  } catch (err) {
    console.error('[queries.getBookingOrderById]', err)
    return null
  }
}

/**
 * Stale-PENDING purge. Deletes booking_orders rows that are still PENDING
 * AND older than 24 hours. Returns the number deleted. Idempotent — safe
 * to run on a schedule or button click.
 *
 * These rows represent abandoned Stripe Checkouts where the user never
 * completed payment. The hold protecting their seat already expired at
 * 15-min TTL, so capacity isn't a concern; this is purely a cleanup of
 * dead audit rows.
 */
export async function purgeStaleBookingOrders(): Promise<number> {
  if (!HAS_DB) return 0
  try {
    const rows = await db
      .delete(bookingOrders)
      .where(
        and(
          eq(bookingOrders.status, 'PENDING'),
          lte(bookingOrders.createdAt, sql`now() - interval '24 hours'`),
        ),
      )
      .returning({ id: bookingOrders.id })
    return rows.length
  } catch (err) {
    console.error('[queries.purgeStaleBookingOrders]', err)
    return 0
  }
}

/* ── Customer-facing: a user's own booking orders ────────────────────── */

/**
 * Dashboard projection — joins the booking metadata the /dashboard/bookings
 * page actually renders (cohort label, format, next cohort date). Returns
 * the most-recent first. Used by the dashboard list page and the dashboard
 * root's "Your bookings" recap card.
 *
 * Mock branch returns [] (placeholderBookingOrders is empty by design — the
 * post-purchase flow can't run without a real Stripe webhook). This is
 * intentional: dev mode shows the empty state, which exercises that surface.
 */
export type UserBookingOrder = BookingOrder & {
  bookingTitleAr: string
  bookingTitleEn: string
  bookingProductType: BookingProductType | null
  cohortLabelAr: string | null
  cohortLabelEn: string | null
  nextCohortDate: Date | null
  formatAr: string | null
  formatEn: string | null
}

export async function getBookingOrdersByUserId(
  userId: string,
): Promise<UserBookingOrder[]> {
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    const rows = await db
      .select({
        order: bookingOrders,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        bookingProductType: bookings.productType,
        cohortLabelAr: bookings.cohortLabelAr,
        cohortLabelEn: bookings.cohortLabelEn,
        nextCohortDate: bookings.nextCohortDate,
        formatAr: bookings.formatAr,
        formatEn: bookings.formatEn,
      })
      .from(bookingOrders)
      .leftJoin(bookings, eq(bookings.id, bookingOrders.bookingId))
      .where(eq(bookingOrders.userId, userId))
      .orderBy(desc(bookingOrders.createdAt))
    return rows.map((r) => ({
      ...r.order,
      bookingTitleAr: r.bookingTitleAr ?? '',
      bookingTitleEn: r.bookingTitleEn ?? '',
      bookingProductType: r.bookingProductType ?? null,
      cohortLabelAr: r.cohortLabelAr ?? null,
      cohortLabelEn: r.cohortLabelEn ?? null,
      nextCohortDate: r.nextCohortDate ?? null,
      formatAr: r.formatAr ?? null,
      formatEn: r.formatEn ?? null,
    }))
  } catch (err) {
    console.error('[queries.getBookingOrdersByUserId]', err)
    return []
  }
}

/**
 * Set of bookingIds the user has a *currently-active* booking_orders row for.
 * Used by the public /booking page + createBookingCheckoutAction to gate the
 * "already booked" state — a user shouldn't be able to re-buy a session
 * they already paid for.
 *
 * Filter rationale:
 *   - PAID / FULFILLED   → blocked: user already has a seat
 *   - PENDING            → NOT blocked: mid-checkout; the holds machinery
 *                          handles re-click by replacing the prior hold.
 *                          Blocking would strand the user if their first
 *                          attempt stalled at Stripe.
 *   - REFUNDED / FAILED  → NOT blocked: re-book is the expected behaviour.
 *
 * Cohort-identity caveat: this gates by `bookings.id`, which is the row
 * representing the offering. If admin reuses the same row for a future
 * cohort, a previous-cohort buyer will still see "already booked." v1 ask
 * is to direct the user to support via the dashboard Manage CTA. Phase B
 * can introduce cohort-instance tracking if needed.
 *
 * Returns plain string[] — Set<string> would warn at the React Server →
 * Client boundary on serialisation. Callers convert to Set if O(1) lookup
 * matters; with ~1 reconsider + ~8 sessions per page, .includes() is fine.
 */
export async function getPaidBookingIdsForUser(
  userId: string,
): Promise<string[]> {
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    const rows = await db
      .select({ bookingId: bookingOrders.bookingId })
      .from(bookingOrders)
      .where(
        and(
          eq(bookingOrders.userId, userId),
          inArray(bookingOrders.status, ['PAID', 'FULFILLED']),
        ),
      )
    return rows.map((r) => r.bookingId)
  } catch (err) {
    console.error('[queries.getPaidBookingIdsForUser]', err)
    return []
  }
}

/* ── User questions ("Ask Dr. Khaled") ─────────────────────────────────── */

/**
 * Phase B1 — return a user's own question history, ordered by createdAt DESC.
 *
 * Mock-mode (`MOCK_AUTH_ENABLED=true`) reads from the disk-backed mock store;
 * real-DB mode hits the `user_questions` table. The optional `status` filter
 * lets callers narrow to PENDING / ANSWERED / ARCHIVED — the filter pills on
 * the dashboard page do this client-side after the initial server fetch, but
 * the helper accepts it so admin queue queries (Phase B2) can reuse it.
 *
 * Default status filter is `'all'`, which returns every status. The customer
 * UI then chooses to hide ARCHIVED from the default "All" tab — that's a UI
 * decision, not a data-layer one.
 */
export async function getUserQuestionsByUserId(
  userId: string,
  options?: { limit?: number; status?: QuestionStatus | 'all' },
): Promise<UserQuestion[]> {
  const limit = options?.limit ?? 50
  const status = options?.status ?? 'all'
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.userQuestions.filter((q) => q.userId === userId)
    const filtered = status === 'all' ? list : list.filter((q) => q.status === status)
    // Mock store stores newest-first via `unshift`, but be defensive — sort
    // by createdAt DESC explicitly so callers don't depend on insertion order.
    return filtered
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    const where =
      status === 'all'
        ? eq(userQuestions.userId, userId)
        : and(eq(userQuestions.userId, userId), eq(userQuestions.status, status))
    const rows = await db
      .select()
      .from(userQuestions)
      .where(where)
      .orderBy(desc(userQuestions.createdAt))
      .limit(limit)
    return rows
  } catch (err) {
    console.error('[queries.getUserQuestionsByUserId]', err)
    return []
  }
}

/**
 * Phase B1 — insert a new question. Status starts at 'PENDING'; admin
 * transitions it to ANSWERED / ARCHIVED in Phase B2.
 *
 * `isAnonymous` is dormant — the user-facing toggle was removed. The
 * column stays in migration 0009 with a `false` default and we honour
 * that default here. Callers can still pass `true` if the feature is
 * ever reintroduced, but no surface in the app does today.
 *
 * Returns null when the DB write fails so the action layer can surface a
 * `database_error` code instead of throwing past the server-action boundary.
 */
export async function createUserQuestion(input: {
  userId: string
  subject: string
  body: string
  category: string | null
  isAnonymous?: boolean
}): Promise<UserQuestion | null> {
  const isAnonymous = input.isAnonymous ?? false
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const now = new Date()
    const row: UserQuestion = {
      // Match the real-DB `defaultRandom()` behavior on this column. The
      // earlier Date.now-derived id was a millisecond-resolution string
      // that could collide if two submissions landed in the same ms (rare
      // but possible in mock dev iteration).
      id: crypto.randomUUID(),
      userId: input.userId,
      subject: input.subject,
      body: input.body,
      category: input.category,
      isAnonymous,
      status: 'PENDING',
      answerBody: null,
      answerReference: null,
      answeredAt: null,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    }
    store.userQuestions.unshift(row)
    writeStore(store)
    return row
  }
  if (!HAS_DB) return null
  if (!isUuid(input.userId)) return null
  try {
    const [row] = await db
      .insert(userQuestions)
      .values({
        userId: input.userId,
        subject: input.subject,
        body: input.body,
        category: input.category,
        isAnonymous,
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createUserQuestion]', err)
    return null
  }
}

/* ── Admin: user questions queue (Phase B2) ─────────────────────────────── */

/**
 * The shape returned by admin queue reads — the question row joined with the
 * minimum identity fields the table needs (name + email). Email is required
 * for outbound notifications; name is shown in the table even when the user
 * preferred anonymity (the anonymity flag was a public-display preference,
 * never a private-comms one). Note: the user-facing toggle was removed
 * pre-launch; `isAnonymous` will be `false` on every new row but legacy
 * data may still be `true`.
 */
/**
 * `user` is nullable so the orphan-user case (asker row missing — should
 * be impossible thanks to the user_questions.user_id FK ON DELETE
 * CASCADE, but defense-in-depth) is explicit. Callers MUST handle null
 * before reading email/name. The action layer uses null to skip the
 * notification email.
 */
export type AdminQuestion = UserQuestion & {
  user: {
    id: string
    name: string | null
    email: string
  } | null
}

/**
 * Paginated admin queue read. Joins users for the asker identity. Uses the
 * `user_questions_status_idx` (status, created_at DESC) when status is
 * concrete; falls back to the createdAt order when 'all'.
 */
export async function getAdminQuestions(input: {
  status?: QuestionStatus | 'all'
  category?: string | 'all'
  page?: number
  pageSize?: number
}): Promise<{
  rows: AdminQuestion[]
  total: number
  page: number
  pageSize: number
}> {
  const status = input.status ?? 'all'
  const category = (input.category ?? 'all').trim()
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50))
  const offset = (page - 1) * pageSize

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const all = store.userQuestions
      .filter((q) => status === 'all' || q.status === status)
      .filter((q) => category === 'all' || (q.category ?? '') === category)
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const sliced = all.slice(offset, offset + pageSize)
    const userById = new Map(placeholderUsers.map((u) => [u.id, u]))
    const rows: AdminQuestion[] = sliced.map((q) => {
      const u = userById.get(q.userId)
      return {
        ...q,
        // null when the asker row is missing — orphaned question. Cascade
        // FK should prevent this in real DB, but the mock placeholder set
        // is small and a question can outlive a placeholder user.
        user: u
          ? { id: q.userId, name: u.name ?? null, email: u.email }
          : null,
      }
    })
    return { rows, total: all.length, page, pageSize }
  }
  if (!HAS_DB) return { rows: [], total: 0, page, pageSize }
  try {
    const conditions = []
    if (status !== 'all') conditions.push(eq(userQuestions.status, status))
    if (category && category !== 'all') {
      conditions.push(eq(userQuestions.category, category))
    }
    const where = conditions.length ? and(...conditions) : undefined
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userQuestions)
      .where(where ?? sql`TRUE`)
    const dbRows = await db
      .select({
        question: userQuestions,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userQuestions)
      .leftJoin(users, eq(users.id, userQuestions.userId))
      .where(where ?? sql`TRUE`)
      .orderBy(desc(userQuestions.createdAt))
      .limit(pageSize)
      .offset(offset)
    const rows: AdminQuestion[] = dbRows.map((r) => ({
      ...r.question,
      // LEFT JOIN: null `users.id` ⇒ orphaned question (FK cascade should
      // prevent this; defense-in-depth). The action layer skips email send
      // when user is null and surfaces the dedicated 'no recipient' toast.
      user:
        r.userId != null
          ? {
              id: r.userId,
              name: r.userName ?? null,
              email: r.userEmail ?? '',
            }
          : null,
    }))
    return { rows, total: Number(count) || 0, page, pageSize }
  } catch (err) {
    console.error('[queries.getAdminQuestions]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

/**
 * Single-question lookup. Used by `updateQuestionStatusAction` to determine
 * the recipient + locale for the outbound notification email. Returns null
 * when the row is missing.
 */
export async function getQuestionById(
  id: string,
): Promise<AdminQuestion | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const q = store.userQuestions.find((row) => row.id === id)
    if (!q) return null
    const userById = new Map(placeholderUsers.map((u) => [u.id, u]))
    const u = userById.get(q.userId)
    return {
      ...q,
      user: u
        ? { id: q.userId, name: u.name ?? null, email: u.email }
        : null,
    }
  }
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .select({
        question: userQuestions,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
      })
      .from(userQuestions)
      .leftJoin(users, eq(users.id, userQuestions.userId))
      .where(eq(userQuestions.id, id))
      .limit(1)
    if (!row) return null
    return {
      ...row.question,
      // LEFT JOIN: null `users.id` ⇒ orphaned. FK cascade should prevent
      // this; explicit null lets the action layer skip the email send.
      user:
        row.userId != null
          ? {
              id: row.userId,
              name: row.userName ?? null,
              email: row.userEmail ?? '',
            }
          : null,
    }
  } catch (err) {
    console.error('[queries.getQuestionById]', err)
    return null
  }
}

/**
 * Atomic status update with timestamp side-effects per the Phase B2 spec:
 *   - status='ANSWERED'  → answeredAt=now, archivedAt=null,
 *                          answerBody=input.answerBody,
 *                          answerReference=input.answerReference
 *   - status='ARCHIVED'  → archivedAt=now, answeredAt=null,
 *                          answerBody=null, answerReference=null
 *   - status='PENDING'   → answeredAt=null, archivedAt=null,
 *                          answerBody=null, answerReference=null
 *                          (revert state — both answer fields cleared)
 * `updatedAt` is always set to now.
 *
 * Returns the updated row, or null if the row was missing or the write
 * failed. Caller (`updateQuestionStatusAction`) maps null to a `not_found`
 * or `database_error` response shape.
 */
export async function updateQuestionStatus(input: {
  id: string
  status: QuestionStatus
  answerBody: string | null
  answerReference: string | null
}): Promise<UserQuestion | null> {
  const now = new Date()
  const patch = ((): Partial<UserQuestion> => {
    if (input.status === 'ANSWERED') {
      return {
        status: 'ANSWERED',
        answeredAt: now,
        archivedAt: null,
        answerBody: input.answerBody,
        answerReference: input.answerReference,
        updatedAt: now,
      }
    }
    if (input.status === 'ARCHIVED') {
      return {
        status: 'ARCHIVED',
        archivedAt: now,
        answeredAt: null,
        answerBody: null,
        answerReference: null,
        updatedAt: now,
      }
    }
    return {
      status: 'PENDING',
      answeredAt: null,
      archivedAt: null,
      answerBody: null,
      answerReference: null,
      updatedAt: now,
    }
  })()

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const idx = store.userQuestions.findIndex((q) => q.id === input.id)
    if (idx === -1) return null
    const updated: UserQuestion = {
      ...store.userQuestions[idx]!,
      ...patch,
    } as UserQuestion
    store.userQuestions[idx] = updated
    writeStore(store)
    return updated
  }
  if (!HAS_DB) return null
  if (!isUuid(input.id)) return null
  try {
    const [row] = await db
      .update(userQuestions)
      .set(patch)
      .where(eq(userQuestions.id, input.id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.updateQuestionStatus]', err)
    return null
  }
}

/**
 * Hard delete. Idempotent — no error if the row is already gone. Used only
 * for spam/abuse cleanup; ARCHIVED is the soft-removal path.
 */
export async function deleteQuestion(id: string): Promise<void> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const before = store.userQuestions.length
    store.userQuestions = store.userQuestions.filter((q) => q.id !== id)
    if (store.userQuestions.length !== before) writeStore(store)
    return
  }
  if (!HAS_DB) return
  if (!isUuid(id)) return
  try {
    await db.delete(userQuestions).where(eq(userQuestions.id, id))
  } catch (err) {
    console.error('[queries.deleteQuestion]', err)
  }
}

/**
 * Lightweight count for the sidebar badge. Sized at 1 row so the index hit
 * is cheap; we only need the total. Returns 0 in all failure modes so a
 * broken count never blocks the admin layout from rendering.
 */
export async function getPendingQuestionCount(): Promise<number> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.userQuestions.filter((q) => q.status === 'PENDING').length
  }
  if (!HAS_DB) return 0
  try {
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(userQuestions)
      .where(eq(userQuestions.status, 'PENDING'))
    return Number(row?.count) || 0
  } catch (err) {
    console.error('[queries.getPendingQuestionCount]', err)
    return 0
  }
}

/* ── Tests & Quizzes (Phase C1) ─────────────────────────────────────────── */

export type TestWithQuestionCount = Test & { questionCount: number }

export type TestWithDetail = Test & {
  questions: Array<TestQuestion & { options: TestOption[] }>
}

export type TestAttemptWithTestSummary = TestAttempt & {
  test: Pick<Test, 'id' | 'slug' | 'titleAr' | 'titleEn' | 'category'>
}

export type TestAttemptWithDetail = TestAttempt & {
  test: Test
  answers: Array<
    TestAttemptAnswer & {
      question: TestQuestion & { options: TestOption[] }
      selectedOption: TestOption
    }
  >
}

/**
 * Sort placeholder/DB tests for the catalog: displayOrder ASC, then
 * createdAt DESC (newest within the same display bucket appears first).
 */
function sortCatalog<T extends { displayOrder: number; createdAt: Date }>(
  list: T[],
): T[] {
  return list
    .slice()
    .sort(
      (a, b) =>
        a.displayOrder - b.displayOrder ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )
}

/**
 * Mock-mode catalog source — merges admin-edited rows from the mock store
 * over the static `placeholderTests` baseline. The store is empty until the
 * first admin write; once an id appears in the store, the store's row wins
 * (an admin can effectively "delete" a placeholder by removing it).
 *
 * Phase C2 introduced this layering so admin CRUD in mock-auth dev is
 * end-to-end testable without a real DB. Production never executes this
 * branch — `MOCK_AUTH_ENABLED` is hard-disabled when `NODE_ENV=production`.
 */
function readMockTestCatalog(): {
  tests: Test[]
  questionsByTestId: Map<string, TestQuestion[]>
  optionsByQuestionId: Map<string, TestOption[]>
} {
  const store = readStore()
  // Start from placeholder data so first-time admins see seeded tests.
  // Once an admin has performed any write, the store carries the full
  // current state and the placeholder layer is effectively a no-op for
  // those ids.
  const testsById = new Map<string, Test>()
  for (const t of placeholderTests) testsById.set(t.id, t)
  // Apply mock-store overrides: full row replacement (including delete via
  // removeTest, which we implement as a hard delete from the map).
  for (const [id, t] of store.tests) testsById.set(id, t)
  // Tests in the placeholder layer that aren't in the store stay visible.
  // Tests added via admin (not in placeholders) get inserted by the line
  // above. Tests deleted via admin get removed by `tests.delete()` on the
  // store side; we then need to reflect the delete here too. The simplest
  // correctness model: if the mock store has any entries at all, treat
  // its key set as authoritative for ids that EXIST in the store; absence
  // means "not yet edited," not "deleted." So track a tombstone set.
  // For v1 we go simpler: hard-deleted tests are removed from the store
  // map and we DON'T tombstone — the placeholder will re-appear. Document
  // in self-critique.
  const allTests = Array.from(testsById.values())
  // Same merge for questions / options.
  const questionsByTestId = new Map<string, TestQuestion[]>()
  for (const q of placeholderTestQuestions) {
    const list = questionsByTestId.get(q.testId) ?? []
    list.push(q)
    questionsByTestId.set(q.testId, list)
  }
  for (const [testId, list] of store.testQuestions) {
    questionsByTestId.set(testId, list)
  }
  const optionsByQuestionId = new Map<string, TestOption[]>()
  for (const o of placeholderTestOptions) {
    const list = optionsByQuestionId.get(o.questionId) ?? []
    list.push(o)
    optionsByQuestionId.set(o.questionId, list)
  }
  for (const [questionId, list] of store.testOptions) {
    optionsByQuestionId.set(questionId, list)
  }
  return {
    tests: allTests,
    questionsByTestId,
    optionsByQuestionId,
  }
}

/**
 * Catalog read for `/tests`. Includes a per-test question count so the card
 * can render "{n} questions" without a separate fetch per row.
 *
 * Default: every published test, no category filter.
 */
export async function getPublishedTests(options?: {
  category?: string
  limit?: number
}): Promise<TestWithQuestionCount[]> {
  const { category, limit } = options ?? {}
  if (HAS_DB) {
    try {
      const conditions = [eq(tests.isPublished, true)]
      if (category && category !== 'all')
        conditions.push(eq(tests.category, category))
      const rows = await db
        .select({
          test: tests,
          questionCount: sql<number>`COUNT(${testQuestions.id})::int`,
        })
        .from(tests)
        .leftJoin(testQuestions, eq(testQuestions.testId, tests.id))
        .where(and(...conditions))
        .groupBy(tests.id)
        .orderBy(asc(tests.displayOrder), desc(tests.createdAt))
        .limit(limit ?? 100)
      return rows.map((r) => ({ ...r.test, questionCount: r.questionCount }))
    } catch (err) {
      console.error('[getPublishedTests] DB error, falling back', err)
    }
  }
  // Phase C2: mock-mode admins can publish/unpublish. Layer the store on
  // top of placeholders so public catalog reflects admin state.
  const source = MOCK_AUTH_ENABLED
    ? readMockTestCatalog()
    : {
        tests: [...placeholderTests],
        questionsByTestId: new Map<string, TestQuestion[]>(
          Array.from(
            placeholderTestQuestions.reduce((acc, q) => {
              const list = acc.get(q.testId) ?? []
              list.push(q)
              acc.set(q.testId, list)
              return acc
            }, new Map<string, TestQuestion[]>()),
          ),
        ),
        optionsByQuestionId: new Map<string, TestOption[]>(),
      }
  let list = source.tests.filter((t) => t.isPublished)
  if (category && category !== 'all')
    list = list.filter((t) => t.category === category)
  list = sortCatalog(list)
  if (limit) list = list.slice(0, limit)
  return list.map((t) => ({
    ...t,
    questionCount: (source.questionsByTestId.get(t.id) ?? []).length,
  }))
}

/**
 * Detail read with all questions and their options, in display order.
 *
 * Returns null when the slug doesn't match OR when the test is not
 * published. Anonymous and authenticated visitors share the same gate;
 * Phase C2 admin preview will need a separate, role-gated path.
 */
export async function getTestBySlug(
  slug: string,
): Promise<TestWithDetail | null> {
  if (HAS_DB) {
    try {
      const [row] = await db
        .select()
        .from(tests)
        .where(and(eq(tests.slug, slug), eq(tests.isPublished, true)))
        .limit(1)
      if (!row) return null
      const qRows = await db
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.testId, row.id))
        .orderBy(asc(testQuestions.displayOrder))
      if (qRows.length === 0) return { ...row, questions: [] }
      const oRows = await db
        .select()
        .from(testOptions)
        .where(
          inArray(
            testOptions.questionId,
            qRows.map((q) => q.id),
          ),
        )
        .orderBy(asc(testOptions.displayOrder))
      const optionsByQ = new Map<string, TestOption[]>()
      for (const o of oRows) {
        const list = optionsByQ.get(o.questionId) ?? []
        list.push(o)
        optionsByQ.set(o.questionId, list)
      }
      return {
        ...row,
        questions: qRows.map((q) => ({
          ...q,
          options: optionsByQ.get(q.id) ?? [],
        })),
      }
    } catch (err) {
      console.error('[getTestBySlug] DB error, falling back', err)
    }
  }
  // Phase C2 — mock-mode reads layer the admin store on top of placeholders.
  if (MOCK_AUTH_ENABLED) {
    const source = readMockTestCatalog()
    const test = source.tests.find(
      (t) => t.slug === slug && t.isPublished,
    )
    if (!test) return null
    const qList = (source.questionsByTestId.get(test.id) ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
    const questions = qList.map((q) => ({
      ...q,
      options: (source.optionsByQuestionId.get(q.id) ?? [])
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
    return { ...test, questions }
  }
  const test = placeholderTests.find(
    (t) => t.slug === slug && t.isPublished,
  )
  if (!test) return null
  const questions = placeholderTestQuestions
    .filter((q) => q.testId === test.id)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((q) => ({
      ...q,
      options: placeholderTestOptions
        .filter((o) => o.questionId === q.id)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
  return { ...test, questions }
}

/**
 * Detail page → "you took this test" check. Returns the most recent
 * attempt this user has on this test, or null if none.
 */
export async function getLatestAttemptForUserAndTest(
  userId: string,
  testId: string,
): Promise<TestAttempt | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const list = store.testAttempts
      .filter((a) => a.userId === userId && a.testId === testId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    return list[0] ?? null
  }
  if (!HAS_DB) return null
  if (!isUuid(userId) || !isUuid(testId)) return null
  try {
    const [row] = await db
      .select()
      .from(testAttempts)
      .where(
        and(eq(testAttempts.userId, userId), eq(testAttempts.testId, testId)),
      )
      .orderBy(desc(testAttempts.completedAt))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[getLatestAttemptForUserAndTest]', err)
    return null
  }
}

/**
 * Set of testIds this user has attempted at least once. Used by the catalog
 * to render the "Taken" pill / "Take again" CTA. One round-trip per page,
 * not one per card.
 */
export async function getTestIdsTakenByUser(
  userId: string,
): Promise<Set<string>> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return new Set(
      store.testAttempts
        .filter((a) => a.userId === userId)
        .map((a) => a.testId),
    )
  }
  if (!HAS_DB) return new Set()
  if (!isUuid(userId)) return new Set()
  try {
    const rows = await db
      .selectDistinct({ testId: testAttempts.testId })
      .from(testAttempts)
      .where(eq(testAttempts.userId, userId))
    return new Set(rows.map((r) => r.testId))
  } catch (err) {
    console.error('[getTestIdsTakenByUser]', err)
    return new Set()
  }
}

/**
 * Dashboard history list. Joined with the minimal test identity (id, slug,
 * titles, category) so the row can render without a second fetch.
 */
export async function getTestAttemptsByUserId(
  userId: string,
  options?: { limit?: number },
): Promise<TestAttemptWithTestSummary[]> {
  const limit = options?.limit ?? 50
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const testById = new Map(placeholderTests.map((t) => [t.id, t]))
    return store.testAttempts
      .filter((a) => a.userId === userId)
      .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
      .slice(0, limit)
      .map((a) => {
        const t = testById.get(a.testId)
        return {
          ...a,
          test: t
            ? {
                id: t.id,
                slug: t.slug,
                titleAr: t.titleAr,
                titleEn: t.titleEn,
                category: t.category,
              }
            : { id: a.testId, slug: '', titleAr: '', titleEn: '', category: 'general' },
        }
      })
  }
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    const rows = await db
      .select({
        attempt: testAttempts,
        test: {
          id: tests.id,
          slug: tests.slug,
          titleAr: tests.titleAr,
          titleEn: tests.titleEn,
          category: tests.category,
        },
      })
      .from(testAttempts)
      .leftJoin(tests, eq(tests.id, testAttempts.testId))
      .where(eq(testAttempts.userId, userId))
      .orderBy(desc(testAttempts.completedAt))
      .limit(limit)
    return rows
      .map((r) => {
        if (!r.test) return null
        return { ...r.attempt, test: r.test }
      })
      .filter((r): r is TestAttemptWithTestSummary => r !== null)
  } catch (err) {
    console.error('[getTestAttemptsByUserId]', err)
    return []
  }
}

/**
 * Result page payload — the attempt + the test it was taken on + every
 * answer joined with its question, the question's options, and the option
 * the user picked. Returns null if (a) the attempt doesn't exist, (b) it
 * belongs to a different user (cross-user enumeration guard), or (c) the
 * test backing it has been wiped.
 */
export async function getTestAttemptById(
  attemptId: string,
  userId: string,
): Promise<TestAttemptWithDetail | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const att = store.testAttempts.find(
      (a) => a.id === attemptId && a.userId === userId,
    )
    if (!att) return null
    const test = placeholderTests.find((t) => t.id === att.testId)
    if (!test) return null
    const questions = placeholderTestQuestions.filter(
      (q) => q.testId === test.id,
    )
    const optionsByQ = new Map<string, TestOption[]>()
    for (const o of placeholderTestOptions) {
      const list = optionsByQ.get(o.questionId) ?? []
      list.push(o)
      optionsByQ.set(o.questionId, list)
    }
    const optionById = new Map(placeholderTestOptions.map((o) => [o.id, o]))
    const questionById = new Map(questions.map((q) => [q.id, q]))
    const answers = att.answers
      .map((ans) => {
        const q = questionById.get(ans.questionId)
        const sel = optionById.get(ans.selectedOptionId)
        if (!q || !sel) return null
        return {
          ...ans,
          question: {
            ...q,
            options: (optionsByQ.get(q.id) ?? []).slice().sort(
              (a, b) => a.displayOrder - b.displayOrder,
            ),
          },
          selectedOption: sel,
        }
      })
      .filter(
        (
          x,
        ): x is TestAttemptAnswer & {
          question: TestQuestion & { options: TestOption[] }
          selectedOption: TestOption
        } => x !== null,
      )
      .sort((a, b) => a.question.displayOrder - b.question.displayOrder)
    return { ...att, test, answers }
  }
  if (!HAS_DB) return null
  if (!isUuid(attemptId) || !isUuid(userId)) return null
  try {
    const [att] = await db
      .select()
      .from(testAttempts)
      .where(
        and(
          eq(testAttempts.id, attemptId),
          eq(testAttempts.userId, userId),
        ),
      )
      .limit(1)
    if (!att) return null
    const [test] = await db
      .select()
      .from(tests)
      .where(eq(tests.id, att.testId))
      .limit(1)
    if (!test) return null
    const ansRows = await db
      .select({
        answer: testAttemptAnswers,
        question: testQuestions,
        selectedOption: testOptions,
      })
      .from(testAttemptAnswers)
      .leftJoin(
        testQuestions,
        eq(testQuestions.id, testAttemptAnswers.questionId),
      )
      .leftJoin(
        testOptions,
        eq(testOptions.id, testAttemptAnswers.selectedOptionId),
      )
      .where(eq(testAttemptAnswers.attemptId, att.id))
    if (ansRows.length === 0) {
      return { ...att, test, answers: [] }
    }
    const questionIds = ansRows
      .map((r) => r.question?.id)
      .filter((id): id is string => !!id)
    const allOptions = questionIds.length
      ? await db
          .select()
          .from(testOptions)
          .where(inArray(testOptions.questionId, questionIds))
          .orderBy(asc(testOptions.displayOrder))
      : []
    const optionsByQ = new Map<string, TestOption[]>()
    for (const o of allOptions) {
      const list = optionsByQ.get(o.questionId) ?? []
      list.push(o)
      optionsByQ.set(o.questionId, list)
    }
    const answers = ansRows
      .map((r) => {
        if (!r.question || !r.selectedOption) return null
        return {
          ...r.answer,
          question: {
            ...r.question,
            options: optionsByQ.get(r.question.id) ?? [],
          },
          selectedOption: r.selectedOption,
        }
      })
      .filter(
        (
          x,
        ): x is TestAttemptAnswer & {
          question: TestQuestion & { options: TestOption[] }
          selectedOption: TestOption
        } => x !== null,
      )
      .sort((a, b) => a.question.displayOrder - b.question.displayOrder)
    return { ...att, test, answers }
  } catch (err) {
    console.error('[getTestAttemptById]', err)
    return null
  }
}

/**
 * Submit-attempt write. Creates the attempt row + all denormalised answer
 * rows. Sequential inserts (no transaction) — Neon HTTP doesn't support
 * `db.transaction()`. If the attempt insert succeeds and the answer inserts
 * fail, the attempt row is deleted as best-effort cleanup so the result
 * page won't render an empty review.
 */
export async function createTestAttempt(input: {
  userId: string
  testId: string
  answers: Array<{
    questionId: string
    selectedOptionId: string
    isCorrect: boolean
  }>
  scorePercentage: number
  correctCount: number
  totalCount: number
}): Promise<TestAttempt | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const now = new Date()
    const attemptId = crypto.randomUUID()
    const answers: TestAttemptAnswer[] = input.answers.map((a) => ({
      id: crypto.randomUUID(),
      attemptId,
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: a.isCorrect,
      createdAt: now,
    }))
    const attempt: TestAttempt = {
      id: attemptId,
      testId: input.testId,
      userId: input.userId,
      scorePercentage: input.scorePercentage,
      correctCount: input.correctCount,
      totalCount: input.totalCount,
      completedAt: now,
      createdAt: now,
    }
    store.testAttempts.unshift({ ...attempt, answers })
    writeStore(store)
    return attempt
  }
  if (!HAS_DB) return null
  if (!isUuid(input.userId) || !isUuid(input.testId)) return null
  try {
    const [attempt] = await db
      .insert(testAttempts)
      .values({
        userId: input.userId,
        testId: input.testId,
        scorePercentage: input.scorePercentage,
        correctCount: input.correctCount,
        totalCount: input.totalCount,
      })
      .returning()
    if (!attempt) return null
    try {
      await db.insert(testAttemptAnswers).values(
        input.answers.map((a) => ({
          attemptId: attempt.id,
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          isCorrect: a.isCorrect,
        })),
      )
    } catch (err) {
      // Best-effort cleanup. If the attempt row outlived the failed answer
      // inserts, the result page would render an empty review with the
      // computed score — confusing for the user. Better to fail the whole
      // submission and let them retry.
      console.error('[createTestAttempt] answers insert failed', err)
      try {
        await db.delete(testAttempts).where(eq(testAttempts.id, attempt.id))
      } catch (cleanupErr) {
        console.error(
          '[createTestAttempt] cleanup of orphaned attempt failed',
          cleanupErr,
        )
      }
      return null
    }
    return attempt
  } catch (err) {
    console.error('[createTestAttempt]', err)
    return null
  }
}

/* ── Tests & Quizzes admin (Phase C2) ──────────────────────────────────── */

export type AdminTestRow = Test & {
  questionCount: number
  attemptCount: number
  averageScore: number | null
}

export type AdminTestDetail = Test & {
  questions: Array<TestQuestion & { options: TestOption[] }>
}

export type AdminTestAnalytics = {
  test: Test
  totalAttempts: number
  uniqueUsers: number
  averageScore: number | null
  scoreDistribution: Array<{
    band: 'low' | 'medium' | 'high'
    count: number
  }>
  questions: Array<{
    question: TestQuestion
    options: Array<{
      option: TestOption
      selectionCount: number
      selectionPercentage: number
      isCorrect: boolean
    }>
    correctCount: number
    correctPercentage: number
  }>
  recentAttempts: Array<
    TestAttempt & {
      user: Pick<User, 'id' | 'name' | 'email'>
    }
  >
}

export type AdminTestListInput = {
  search?: string
  status?: 'all' | 'published' | 'draft'
  category?: string
}

export type CreateAdminTestInput = {
  slug: string
  titleAr: string
  titleEn: string
  descriptionAr: string
  descriptionEn: string
  introAr: string
  introEn: string
  category: string
  estimatedMinutes: number
  coverImageUrl: string | null
  isPublished: boolean
  displayOrder: number
  questions: Array<{
    promptAr: string
    promptEn: string
    explanationAr: string | null
    explanationEn: string | null
    options: Array<{
      labelAr: string
      labelEn: string
      isCorrect: boolean
    }>
  }>
}

export type UpdateAdminTestInput = CreateAdminTestInput & {
  id: string
  questions: Array<
    CreateAdminTestInput['questions'][number] & {
      id?: string
      options: Array<
        CreateAdminTestInput['questions'][number]['options'][number] & {
          id?: string
        }
      >
    }
  >
}

/**
 * Sort tests for the admin list: drafts first (so admins see what needs
 * publishing), then displayOrder ASC, then createdAt DESC. The "drafts
 * first" rule is the reason we don't reuse `sortCatalog`.
 */
function sortAdminCatalog<T extends { isPublished: boolean; displayOrder: number; createdAt: Date }>(
  list: T[],
): T[] {
  return list
    .slice()
    .sort((a, b) => {
      // Boolean false (draft) sorts before true (published).
      const aPub = a.isPublished ? 1 : 0
      const bPub = b.isPublished ? 1 : 0
      if (aPub !== bPub) return aPub - bPub
      if (a.displayOrder !== b.displayOrder)
        return a.displayOrder - b.displayOrder
      return b.createdAt.getTime() - a.createdAt.getTime()
    })
}

/**
 * Admin list — every test (drafts + published) with rolled-up question
 * count, attempt count, and average score per row.
 *
 * DB query plan: a single SELECT joining `tests` LEFT JOIN counts on
 * `test_questions` (question count) and a correlated subquery on
 * `test_attempts` (attempt count + AVG). The correlated subquery
 * avoids the GROUP BY explosion that LEFT JOIN + LEFT JOIN would
 * cause when a test has many attempts.
 */
export async function getAllTestsForAdmin(
  input?: AdminTestListInput,
): Promise<AdminTestRow[]> {
  const { search, status = 'all', category } = input ?? {}
  if (HAS_DB) {
    try {
      const conditions = []
      if (status === 'published') conditions.push(eq(tests.isPublished, true))
      else if (status === 'draft') conditions.push(eq(tests.isPublished, false))
      if (category && category !== 'all')
        conditions.push(eq(tests.category, category))
      if (search && search.trim().length > 0) {
        const term = `%${search.trim()}%`
        conditions.push(
          or(ilike(tests.titleEn, term), ilike(tests.titleAr, term))!,
        )
      }
      const rows = await db
        .select({
          test: tests,
          questionCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${testQuestions}
            WHERE ${testQuestions.testId} = ${tests.id}
          )`,
          attemptCount: sql<number>`(
            SELECT COUNT(*)::int FROM ${testAttempts}
            WHERE ${testAttempts.testId} = ${tests.id}
          )`,
          averageScore: sql<number | null>`(
            SELECT AVG(${testAttempts.scorePercentage})::float FROM ${testAttempts}
            WHERE ${testAttempts.testId} = ${tests.id}
          )`,
        })
        .from(tests)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(
          asc(tests.isPublished),
          asc(tests.displayOrder),
          desc(tests.createdAt),
        )
      return rows.map((r) => ({
        ...r.test,
        questionCount: Number(r.questionCount) || 0,
        attemptCount: Number(r.attemptCount) || 0,
        averageScore:
          r.averageScore != null ? Math.round(Number(r.averageScore)) : null,
      }))
    } catch (err) {
      console.error('[getAllTestsForAdmin] DB error, falling back', err)
    }
  }
  const source = readMockTestCatalog()
  let list = source.tests
  if (status === 'published') list = list.filter((t) => t.isPublished)
  else if (status === 'draft') list = list.filter((t) => !t.isPublished)
  if (category && category !== 'all')
    list = list.filter((t) => t.category === category)
  if (search && search.trim().length > 0) {
    const term = search.trim().toLowerCase()
    list = list.filter(
      (t) =>
        t.titleEn.toLowerCase().includes(term) ||
        t.titleAr.toLowerCase().includes(term),
    )
  }
  // Compute aggregates from the mock test-attempts list.
  const store = readStore()
  const attemptsByTestId = new Map<string, MockTestAttempt[]>()
  for (const a of store.testAttempts) {
    const list = attemptsByTestId.get(a.testId) ?? []
    list.push(a)
    attemptsByTestId.set(a.testId, list)
  }
  return sortAdminCatalog(list).map((t) => {
    const attempts = attemptsByTestId.get(t.id) ?? []
    const avg =
      attempts.length === 0
        ? null
        : Math.round(
            attempts.reduce((sum, a) => sum + a.scorePercentage, 0) /
              attempts.length,
          )
    return {
      ...t,
      questionCount: (source.questionsByTestId.get(t.id) ?? []).length,
      attemptCount: attempts.length,
      averageScore: avg,
    }
  })
}

// MockTestAttempt is internal to the mock store — re-import the type alias
// for the helper above. We don't want the action layer leaning on it.
type MockTestAttempt = TestAttempt & { answers: TestAttemptAnswer[] }

/**
 * Sidebar badge count — number of unpublished tests. Cheap; one COUNT(*)
 * on the `tests_published_idx` partial.
 */
export async function getDraftTestCount(): Promise<number> {
  if (HAS_DB) {
    try {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(tests)
        .where(eq(tests.isPublished, false))
      return Number(row?.count) || 0
    } catch (err) {
      console.error('[getDraftTestCount]', err)
      return 0
    }
  }
  if (MOCK_AUTH_ENABLED) {
    const source = readMockTestCatalog()
    return source.tests.filter((t) => !t.isPublished).length
  }
  return placeholderTests.filter((t) => !t.isPublished).length
}

/**
 * Admin detail read by id (NOT slug) — admins use ids in URLs because slug
 * may be edited mid-session. Includes ALL questions and options regardless
 * of `isPublished` — admin needs draft access.
 */
export async function getTestForAdmin(
  id: string,
): Promise<AdminTestDetail | null> {
  if (HAS_DB) {
    if (!isUuid(id)) return null
    try {
      const [row] = await db
        .select()
        .from(tests)
        .where(eq(tests.id, id))
        .limit(1)
      if (!row) return null
      const qRows = await db
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.testId, row.id))
        .orderBy(asc(testQuestions.displayOrder))
      if (qRows.length === 0) return { ...row, questions: [] }
      const oRows = await db
        .select()
        .from(testOptions)
        .where(
          inArray(
            testOptions.questionId,
            qRows.map((q) => q.id),
          ),
        )
        .orderBy(asc(testOptions.displayOrder))
      const optionsByQ = new Map<string, TestOption[]>()
      for (const o of oRows) {
        const list = optionsByQ.get(o.questionId) ?? []
        list.push(o)
        optionsByQ.set(o.questionId, list)
      }
      return {
        ...row,
        questions: qRows.map((q) => ({
          ...q,
          options: optionsByQ.get(q.id) ?? [],
        })),
      }
    } catch (err) {
      console.error('[getTestForAdmin]', err)
    }
  }
  const source = readMockTestCatalog()
  const test = source.tests.find((t) => t.id === id)
  if (!test) return null
  const questions = (source.questionsByTestId.get(test.id) ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((q) => ({
      ...q,
      options: (source.optionsByQuestionId.get(q.id) ?? [])
        .slice()
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }))
  return { ...test, questions }
}

/**
 * Aggregate analytics for one test. Three queries, plain by design:
 *   Q1: attempt-level aggregates from `test_attempts`
 *   Q2: per-option selection counts from `test_attempt_answers`
 *   Q3: 20 most recent attempts joined with users
 *
 * Score-band thresholds match the user-side AnswerCard: low=<50,
 * medium=50–79, high=≥80.
 */
export async function getTestAnalytics(
  testId: string,
): Promise<AdminTestAnalytics | null> {
  if (HAS_DB) {
    if (!isUuid(testId)) return null
    try {
      const [test] = await db
        .select()
        .from(tests)
        .where(eq(tests.id, testId))
        .limit(1)
      if (!test) return null
      const qRows = await db
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.testId, test.id))
        .orderBy(asc(testQuestions.displayOrder))
      const oRows =
        qRows.length === 0
          ? []
          : await db
              .select()
              .from(testOptions)
              .where(
                inArray(
                  testOptions.questionId,
                  qRows.map((q) => q.id),
                ),
              )
              .orderBy(asc(testOptions.displayOrder))
      const optionsByQ = new Map<string, TestOption[]>()
      for (const o of oRows) {
        const list = optionsByQ.get(o.questionId) ?? []
        list.push(o)
        optionsByQ.set(o.questionId, list)
      }
      // Q1
      const [agg] = await db
        .select({
          totalAttempts: sql<number>`COUNT(*)::int`,
          uniqueUsers: sql<number>`COUNT(DISTINCT ${testAttempts.userId})::int`,
          averageScore: sql<number | null>`AVG(${testAttempts.scorePercentage})::float`,
          lowCount: sql<number>`SUM(CASE WHEN ${testAttempts.scorePercentage} < 50 THEN 1 ELSE 0 END)::int`,
          medCount: sql<number>`SUM(CASE WHEN ${testAttempts.scorePercentage} >= 50 AND ${testAttempts.scorePercentage} < 80 THEN 1 ELSE 0 END)::int`,
          highCount: sql<number>`SUM(CASE WHEN ${testAttempts.scorePercentage} >= 80 THEN 1 ELSE 0 END)::int`,
        })
        .from(testAttempts)
        .where(eq(testAttempts.testId, test.id))
      const totalAttempts = Number(agg?.totalAttempts) || 0
      const uniqueUsers = Number(agg?.uniqueUsers) || 0
      const averageScore =
        agg?.averageScore != null
          ? Math.round(Number(agg.averageScore))
          : null
      const scoreDistribution: AdminTestAnalytics['scoreDistribution'] = [
        { band: 'low', count: Number(agg?.lowCount) || 0 },
        { band: 'medium', count: Number(agg?.medCount) || 0 },
        { band: 'high', count: Number(agg?.highCount) || 0 },
      ]
      // Q2 — per-option selection counts. We join through attempts to
      // confine to this test only (attempt_answers cascades on attempt
      // delete, but a stale row at the boundary would otherwise leak in).
      const optionRows =
        qRows.length === 0
          ? []
          : await db
              .select({
                questionId: testAttemptAnswers.questionId,
                selectedOptionId: testAttemptAnswers.selectedOptionId,
                count: sql<number>`COUNT(*)::int`,
              })
              .from(testAttemptAnswers)
              .innerJoin(
                testAttempts,
                eq(testAttempts.id, testAttemptAnswers.attemptId),
              )
              .where(eq(testAttempts.testId, test.id))
              .groupBy(
                testAttemptAnswers.questionId,
                testAttemptAnswers.selectedOptionId,
              )
      const selectionByQO = new Map<string, number>()
      for (const r of optionRows) {
        selectionByQO.set(`${r.questionId}:${r.selectedOptionId}`, Number(r.count) || 0)
      }
      // Q3 — recent attempts.
      const recentRows = await db
        .select({
          attempt: testAttempts,
          user: { id: users.id, name: users.name, email: users.email },
        })
        .from(testAttempts)
        .leftJoin(users, eq(users.id, testAttempts.userId))
        .where(eq(testAttempts.testId, test.id))
        .orderBy(desc(testAttempts.completedAt))
        .limit(20)
      const recentAttempts: AdminTestAnalytics['recentAttempts'] = recentRows
        .map((r) => {
          if (!r.user) return null
          return {
            ...r.attempt,
            user: {
              id: r.user.id,
              name: r.user.name,
              email: r.user.email,
            },
          }
        })
        .filter(
          (
            x,
          ): x is TestAttempt & {
            user: Pick<User, 'id' | 'name' | 'email'>
          } => x !== null,
        )
      // Per-question rollup with correct-percentage.
      const questions: AdminTestAnalytics['questions'] = qRows.map((q) => {
        const opts = optionsByQ.get(q.id) ?? []
        const correctOption = opts.find((o) => o.isCorrect)
        const optionRollups = opts.map((o) => {
          const selectionCount = selectionByQO.get(`${q.id}:${o.id}`) ?? 0
          const selectionPercentage =
            totalAttempts > 0
              ? Math.round((selectionCount / totalAttempts) * 100)
              : 0
          return {
            option: o,
            selectionCount,
            selectionPercentage,
            isCorrect: o.isCorrect,
          }
        })
        const correctCount = correctOption
          ? selectionByQO.get(`${q.id}:${correctOption.id}`) ?? 0
          : 0
        const correctPercentage =
          totalAttempts > 0
            ? Math.round((correctCount / totalAttempts) * 100)
            : 0
        return {
          question: q,
          options: optionRollups,
          correctCount,
          correctPercentage,
        }
      })
      return {
        test,
        totalAttempts,
        uniqueUsers,
        averageScore,
        scoreDistribution,
        questions,
        recentAttempts,
      }
    } catch (err) {
      console.error('[getTestAnalytics]', err)
      return null
    }
  }
  // Mock-mode fallback: compute everything in-memory.
  const source = readMockTestCatalog()
  const test = source.tests.find((t) => t.id === testId)
  if (!test) return null
  const store = readStore()
  const attempts = store.testAttempts.filter((a) => a.testId === testId)
  const totalAttempts = attempts.length
  const uniqueUsers = new Set(attempts.map((a) => a.userId)).size
  const averageScore =
    totalAttempts === 0
      ? null
      : Math.round(
          attempts.reduce((s, a) => s + a.scorePercentage, 0) / totalAttempts,
        )
  const lowCount = attempts.filter((a) => a.scorePercentage < 50).length
  const medCount = attempts.filter(
    (a) => a.scorePercentage >= 50 && a.scorePercentage < 80,
  ).length
  const highCount = attempts.filter((a) => a.scorePercentage >= 80).length
  const qList = (source.questionsByTestId.get(test.id) ?? [])
    .slice()
    .sort((a, b) => a.displayOrder - b.displayOrder)
  const selectionByQO = new Map<string, number>()
  for (const att of attempts) {
    for (const ans of att.answers) {
      const key = `${ans.questionId}:${ans.selectedOptionId}`
      selectionByQO.set(key, (selectionByQO.get(key) ?? 0) + 1)
    }
  }
  // Mock recent attempts can't join users — surface a stub user object so
  // the UI doesn't crash on null. mock users are anonymous in this view.
  const recentAttempts = attempts
    .slice()
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())
    .slice(0, 20)
    .map((a) => ({
      ...a,
      user: {
        id: a.userId,
        name: 'Mock user',
        email: `${a.userId}@mock.local`,
      },
    }))
  const questions: AdminTestAnalytics['questions'] = qList.map((q) => {
    const opts = (source.optionsByQuestionId.get(q.id) ?? [])
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder)
    const correctOption = opts.find((o) => o.isCorrect)
    const optionRollups = opts.map((o) => {
      const selectionCount = selectionByQO.get(`${q.id}:${o.id}`) ?? 0
      const selectionPercentage =
        totalAttempts > 0
          ? Math.round((selectionCount / totalAttempts) * 100)
          : 0
      return {
        option: o,
        selectionCount,
        selectionPercentage,
        isCorrect: o.isCorrect,
      }
    })
    const correctCount = correctOption
      ? selectionByQO.get(`${q.id}:${correctOption.id}`) ?? 0
      : 0
    const correctPercentage =
      totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0
    return { question: q, options: optionRollups, correctCount, correctPercentage }
  })
  return {
    test,
    totalAttempts,
    uniqueUsers,
    averageScore,
    scoreDistribution: [
      { band: 'low', count: lowCount },
      { band: 'medium', count: medCount },
      { band: 'high', count: highCount },
    ],
    questions,
    recentAttempts,
  }
}

/**
 * How many historical answers attach to the given questions? Used by the
 * update flow to surface "{N} historical attempts will be affected" in the
 * confirm-removals modal BEFORE the cascade-delete fires.
 */
export async function countAttemptAnswersForQuestions(
  questionIds: string[],
): Promise<number> {
  if (questionIds.length === 0) return 0
  if (HAS_DB) {
    try {
      const [row] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(testAttemptAnswers)
        .where(inArray(testAttemptAnswers.questionId, questionIds))
      return Number(row?.count) || 0
    } catch (err) {
      console.error('[countAttemptAnswersForQuestions]', err)
      return 0
    }
  }
  const store = readStore()
  const set = new Set(questionIds)
  let count = 0
  for (const att of store.testAttempts) {
    for (const ans of att.answers) {
      if (set.has(ans.questionId)) count++
    }
  }
  return count
}

/** True iff the slug is taken by ANOTHER test (excludeId optional). */
export async function isTestSlugTaken(
  slug: string,
  excludeId?: string,
): Promise<boolean> {
  if (HAS_DB) {
    try {
      const conditions = [eq(tests.slug, slug)]
      if (excludeId && isUuid(excludeId))
        conditions.push(ne(tests.id, excludeId))
      const [row] = await db
        .select({ id: tests.id })
        .from(tests)
        .where(and(...conditions))
        .limit(1)
      return !!row
    } catch (err) {
      console.error('[isTestSlugTaken]', err)
      return false
    }
  }
  const source = readMockTestCatalog()
  return source.tests.some(
    (t) => t.slug === slug && (!excludeId || t.id !== excludeId),
  )
}

/**
 * Create a test row + its questions + their options.
 *
 * Sequential inserts (Neon HTTP doesn't support transactions). On
 * child-insert failure, best-effort cleanup deletes the parent so we don't
 * orphan a test row with no questions. Returns null on any failure; the
 * action layer maps to a translated error.
 */
export async function createTest(
  input: CreateAdminTestInput,
): Promise<Test | null> {
  if (HAS_DB) {
    try {
      const [test] = await db
        .insert(tests)
        .values({
          slug: input.slug,
          titleAr: input.titleAr,
          titleEn: input.titleEn,
          introAr: input.introAr,
          introEn: input.introEn,
          descriptionAr: input.descriptionAr,
          descriptionEn: input.descriptionEn,
          category: input.category,
          estimatedMinutes: input.estimatedMinutes,
          coverImageUrl: input.coverImageUrl,
          isPublished: input.isPublished,
          displayOrder: input.displayOrder,
        })
        .returning()
      if (!test) return null
      try {
        for (let qi = 0; qi < input.questions.length; qi++) {
          const q = input.questions[qi]
          const [qRow] = await db
            .insert(testQuestions)
            .values({
              testId: test.id,
              displayOrder: qi,
              promptAr: q.promptAr,
              promptEn: q.promptEn,
              explanationAr: q.explanationAr,
              explanationEn: q.explanationEn,
            })
            .returning()
          if (!qRow) throw new Error('question insert returned no row')
          if (q.options.length > 0) {
            await db.insert(testOptions).values(
              q.options.map((o, oi) => ({
                questionId: qRow.id,
                displayOrder: oi,
                labelAr: o.labelAr,
                labelEn: o.labelEn,
                isCorrect: o.isCorrect,
              })),
            )
          }
        }
      } catch (childErr) {
        console.error('[createTest] child insert failed; cleaning up', childErr)
        try {
          await db.delete(tests).where(eq(tests.id, test.id))
        } catch (cleanupErr) {
          console.error(
            '[createTest] cleanup of orphaned test row failed',
            cleanupErr,
          )
        }
        return null
      }
      return test
    } catch (err) {
      // Concrete error code "23505" = unique_violation. Surface as null —
      // the action layer pre-checks the slug, but two concurrent admin
      // creates can race past that check.
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        console.warn('[createTest] unique_violation — slug taken')
        return null
      }
      console.error('[createTest]', err)
      return null
    }
  }
  // Mock-mode write — seed from placeholders on first write so admins start
  // with the seeded catalog.
  const store = readStore()
  if (store.tests.size === 0) {
    for (const t of placeholderTests) store.tests.set(t.id, t)
    for (const q of placeholderTestQuestions) {
      const list = store.testQuestions.get(q.testId) ?? []
      list.push(q)
      store.testQuestions.set(q.testId, list)
    }
    for (const o of placeholderTestOptions) {
      const list = store.testOptions.get(o.questionId) ?? []
      list.push(o)
      store.testOptions.set(o.questionId, list)
    }
  }
  // Slug uniqueness check in mock too.
  for (const t of store.tests.values()) {
    if (t.slug === input.slug) return null
  }
  const now = new Date()
  const testId = crypto.randomUUID()
  const newTest: Test = {
    id: testId,
    slug: input.slug,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    introAr: input.introAr,
    introEn: input.introEn,
    descriptionAr: input.descriptionAr,
    descriptionEn: input.descriptionEn,
    category: input.category,
    estimatedMinutes: input.estimatedMinutes,
    coverImageUrl: input.coverImageUrl,
    priceUsd: null,
    isPaid: false,
    isPublished: input.isPublished,
    displayOrder: input.displayOrder,
    createdAt: now,
    updatedAt: now,
  }
  store.tests.set(testId, newTest)
  const newQuestions: TestQuestion[] = []
  for (let qi = 0; qi < input.questions.length; qi++) {
    const q = input.questions[qi]
    const questionId = crypto.randomUUID()
    newQuestions.push({
      id: questionId,
      testId,
      displayOrder: qi,
      promptAr: q.promptAr,
      promptEn: q.promptEn,
      explanationAr: q.explanationAr,
      explanationEn: q.explanationEn,
      createdAt: now,
      updatedAt: now,
    })
    const newOpts: TestOption[] = q.options.map((o, oi) => ({
      id: crypto.randomUUID(),
      questionId,
      displayOrder: oi,
      labelAr: o.labelAr,
      labelEn: o.labelEn,
      isCorrect: o.isCorrect,
      createdAt: now,
    }))
    store.testOptions.set(questionId, newOpts)
  }
  store.testQuestions.set(testId, newQuestions)
  writeStore(store)
  return newTest
}

/**
 * Update a test row + diff its questions/options against the existing.
 *
 * Diff semantics:
 *   - Question/option WITH id present → UPDATE existing fields
 *   - Question/option WITHOUT id → INSERT new row
 *   - Existing question/option NOT in payload → DELETE (cascades to
 *     test_attempt_answers)
 *
 * Sequential operations, no transaction. Like createTest, child-insert
 * failure leaves partial state; the action layer revalidates so the next
 * fetch shows truth, not the optimistic admin form payload.
 */
export type UpdateTestResult =
  | { ok: true; test: Test }
  | { ok: false; error: 'not_found' | 'slug_taken' | 'database_error' }

export async function updateTest(
  input: UpdateAdminTestInput,
): Promise<UpdateTestResult> {
  if (HAS_DB) {
    if (!isUuid(input.id)) return { ok: false, error: 'not_found' }
    try {
      const [existing] = await db
        .select()
        .from(tests)
        .where(eq(tests.id, input.id))
        .limit(1)
      if (!existing) return { ok: false, error: 'not_found' }
      // Slug-uniqueness check: another row with the same slug?
      if (input.slug !== existing.slug) {
        const [taken] = await db
          .select({ id: tests.id })
          .from(tests)
          .where(and(eq(tests.slug, input.slug), ne(tests.id, input.id)))
          .limit(1)
        if (taken) return { ok: false, error: 'slug_taken' }
      }
      // Update parent row.
      const [updated] = await db
        .update(tests)
        .set({
          slug: input.slug,
          titleAr: input.titleAr,
          titleEn: input.titleEn,
          introAr: input.introAr,
          introEn: input.introEn,
          descriptionAr: input.descriptionAr,
          descriptionEn: input.descriptionEn,
          category: input.category,
          estimatedMinutes: input.estimatedMinutes,
          coverImageUrl: input.coverImageUrl,
          isPublished: input.isPublished,
          displayOrder: input.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(tests.id, input.id))
        .returning()
      if (!updated) return { ok: false, error: 'database_error' }
      // Diff questions.
      const existingQuestions = await db
        .select()
        .from(testQuestions)
        .where(eq(testQuestions.testId, input.id))
      const existingQById = new Map(existingQuestions.map((q) => [q.id, q]))
      const incomingQIds = new Set<string>()
      for (let qi = 0; qi < input.questions.length; qi++) {
        const q = input.questions[qi]
        if (q.id && existingQById.has(q.id)) {
          incomingQIds.add(q.id)
          await db
            .update(testQuestions)
            .set({
              displayOrder: qi,
              promptAr: q.promptAr,
              promptEn: q.promptEn,
              explanationAr: q.explanationAr,
              explanationEn: q.explanationEn,
              updatedAt: new Date(),
            })
            .where(eq(testQuestions.id, q.id))
          // Diff options for this question.
          const existingOpts = await db
            .select()
            .from(testOptions)
            .where(eq(testOptions.questionId, q.id))
          const existingOById = new Map(existingOpts.map((o) => [o.id, o]))
          const incomingOIds = new Set<string>()
          for (let oi = 0; oi < q.options.length; oi++) {
            const o = q.options[oi]
            if (o.id && existingOById.has(o.id)) {
              incomingOIds.add(o.id)
              await db
                .update(testOptions)
                .set({
                  displayOrder: oi,
                  labelAr: o.labelAr,
                  labelEn: o.labelEn,
                  isCorrect: o.isCorrect,
                })
                .where(eq(testOptions.id, o.id))
            } else {
              await db.insert(testOptions).values({
                questionId: q.id,
                displayOrder: oi,
                labelAr: o.labelAr,
                labelEn: o.labelEn,
                isCorrect: o.isCorrect,
              })
            }
          }
          // Delete options absent from payload.
          const removedOIds = existingOpts
            .filter((o) => !incomingOIds.has(o.id))
            .map((o) => o.id)
          if (removedOIds.length > 0) {
            await db
              .delete(testOptions)
              .where(inArray(testOptions.id, removedOIds))
          }
        } else {
          // New question.
          const [qRow] = await db
            .insert(testQuestions)
            .values({
              testId: input.id,
              displayOrder: qi,
              promptAr: q.promptAr,
              promptEn: q.promptEn,
              explanationAr: q.explanationAr,
              explanationEn: q.explanationEn,
            })
            .returning()
          if (qRow && q.options.length > 0) {
            await db.insert(testOptions).values(
              q.options.map((o, oi) => ({
                questionId: qRow.id,
                displayOrder: oi,
                labelAr: o.labelAr,
                labelEn: o.labelEn,
                isCorrect: o.isCorrect,
              })),
            )
          }
        }
      }
      // Delete questions absent from payload — cascades to options + answers.
      const removedQIds = existingQuestions
        .filter((q) => !incomingQIds.has(q.id))
        .map((q) => q.id)
      if (removedQIds.length > 0) {
        await db
          .delete(testQuestions)
          .where(inArray(testQuestions.id, removedQIds))
      }
      return { ok: true, test: updated }
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code?: string }).code === '23505'
      ) {
        return { ok: false, error: 'slug_taken' }
      }
      console.error('[updateTest]', err)
      return { ok: false, error: 'database_error' }
    }
  }
  // Mock-mode update.
  const store = readStore()
  if (store.tests.size === 0) {
    for (const t of placeholderTests) store.tests.set(t.id, t)
    for (const q of placeholderTestQuestions) {
      const list = store.testQuestions.get(q.testId) ?? []
      list.push(q)
      store.testQuestions.set(q.testId, list)
    }
    for (const o of placeholderTestOptions) {
      const list = store.testOptions.get(o.questionId) ?? []
      list.push(o)
      store.testOptions.set(o.questionId, list)
    }
  }
  const existing = store.tests.get(input.id)
  if (!existing) return { ok: false, error: 'not_found' }
  for (const t of store.tests.values()) {
    if (t.id !== input.id && t.slug === input.slug)
      return { ok: false, error: 'slug_taken' }
  }
  const now = new Date()
  const updated: Test = {
    ...existing,
    slug: input.slug,
    titleAr: input.titleAr,
    titleEn: input.titleEn,
    introAr: input.introAr,
    introEn: input.introEn,
    descriptionAr: input.descriptionAr,
    descriptionEn: input.descriptionEn,
    category: input.category,
    estimatedMinutes: input.estimatedMinutes,
    coverImageUrl: input.coverImageUrl,
    isPublished: input.isPublished,
    displayOrder: input.displayOrder,
    updatedAt: now,
  }
  store.tests.set(input.id, updated)
  // Rebuild the question + option maps for this test from the payload.
  const existingQList = store.testQuestions.get(input.id) ?? []
  const existingQById = new Map(existingQList.map((q) => [q.id, q]))
  const incomingQIds = new Set<string>()
  const newQList: TestQuestion[] = []
  for (let qi = 0; qi < input.questions.length; qi++) {
    const q = input.questions[qi]
    if (q.id && existingQById.has(q.id)) {
      incomingQIds.add(q.id)
      const prev = existingQById.get(q.id)!
      newQList.push({
        ...prev,
        displayOrder: qi,
        promptAr: q.promptAr,
        promptEn: q.promptEn,
        explanationAr: q.explanationAr,
        explanationEn: q.explanationEn,
        updatedAt: now,
      })
      // Options diff for this question.
      const prevOpts = store.testOptions.get(q.id) ?? []
      const prevOById = new Map(prevOpts.map((o) => [o.id, o]))
      const newOpts: TestOption[] = []
      for (let oi = 0; oi < q.options.length; oi++) {
        const o = q.options[oi]
        if (o.id && prevOById.has(o.id)) {
          const prevO = prevOById.get(o.id)!
          newOpts.push({
            ...prevO,
            displayOrder: oi,
            labelAr: o.labelAr,
            labelEn: o.labelEn,
            isCorrect: o.isCorrect,
          })
        } else {
          newOpts.push({
            id: crypto.randomUUID(),
            questionId: q.id,
            displayOrder: oi,
            labelAr: o.labelAr,
            labelEn: o.labelEn,
            isCorrect: o.isCorrect,
            createdAt: now,
          })
        }
      }
      store.testOptions.set(q.id, newOpts)
    } else {
      // New question.
      const newId = crypto.randomUUID()
      newQList.push({
        id: newId,
        testId: input.id,
        displayOrder: qi,
        promptAr: q.promptAr,
        promptEn: q.promptEn,
        explanationAr: q.explanationAr,
        explanationEn: q.explanationEn,
        createdAt: now,
        updatedAt: now,
      })
      store.testOptions.set(
        newId,
        q.options.map((o, oi) => ({
          id: crypto.randomUUID(),
          questionId: newId,
          displayOrder: oi,
          labelAr: o.labelAr,
          labelEn: o.labelEn,
          isCorrect: o.isCorrect,
          createdAt: now,
        })),
      )
    }
  }
  // Drop options for removed questions.
  for (const prev of existingQList) {
    if (!incomingQIds.has(prev.id)) {
      store.testOptions.delete(prev.id)
    }
  }
  store.testQuestions.set(input.id, newQList)
  writeStore(store)
  return { ok: true, test: updated }
}

/**
 * Hard delete. Cascades to questions, options, attempts, attempt_answers
 * via FK ON DELETE CASCADE per the C1 schema.
 *
 * Idempotent — no-op if the row is already gone.
 */
export async function deleteTest(id: string): Promise<boolean> {
  if (HAS_DB) {
    if (!isUuid(id)) return true
    try {
      await db.delete(tests).where(eq(tests.id, id))
      return true
    } catch (err) {
      console.error('[deleteTest]', err)
      return false
    }
  }
  const store = readStore()
  // Seeding the store from placeholders on delete would let an admin "see"
  // a test reappear after deletion (because placeholder data backs the
  // catalog when the store is empty). Instead, on first delete we seed
  // and immediately drop the target.
  if (store.tests.size === 0) {
    for (const t of placeholderTests) store.tests.set(t.id, t)
    for (const q of placeholderTestQuestions) {
      const list = store.testQuestions.get(q.testId) ?? []
      list.push(q)
      store.testQuestions.set(q.testId, list)
    }
    for (const o of placeholderTestOptions) {
      const list = store.testOptions.get(o.questionId) ?? []
      list.push(o)
      store.testOptions.set(o.questionId, list)
    }
  }
  const existing = store.tests.get(id)
  if (existing) {
    store.tests.delete(id)
    const qList = store.testQuestions.get(id) ?? []
    for (const q of qList) store.testOptions.delete(q.id)
    store.testQuestions.delete(id)
    // Cascade attempts + answers.
    store.testAttempts = store.testAttempts.filter((a) => a.testId !== id)
    writeStore(store)
  }
  return true
}

/** Toggle `tests.is_published`. Returns the updated row or null. */
export async function setTestPublished(
  id: string,
  isPublished: boolean,
): Promise<Test | null> {
  if (HAS_DB) {
    if (!isUuid(id)) return null
    try {
      const [row] = await db
        .update(tests)
        .set({ isPublished, updatedAt: new Date() })
        .where(eq(tests.id, id))
        .returning()
      return row ?? null
    } catch (err) {
      console.error('[setTestPublished]', err)
      return null
    }
  }
  const store = readStore()
  if (store.tests.size === 0) {
    for (const t of placeholderTests) store.tests.set(t.id, t)
  }
  const existing = store.tests.get(id)
  if (!existing) return null
  const updated: Test = {
    ...existing,
    isPublished,
    updatedAt: new Date(),
  }
  store.tests.set(id, updated)
  writeStore(store)
  return updated
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase D — Gifts
 *
 * Two flavors share `gifts`: ADMIN_GRANT (no Stripe) and USER_PURCHASE
 * (Stripe Checkout). The query helpers below cover both flows + admin
 * tooling. The action layer enforces the one-way state graph; helpers do
 * not — they only execute the requested transition (with sane FK guards).
 *
 * Mock-mode coverage: ADMIN_GRANT is fully exercisable (the action shortcuts
 * through createGift → markGiftEmailSent in the same in-memory list).
 * USER_PURCHASE is gated by Stripe in the action layer (returns
 * 'stripe_unconfigured' when getStripe() is null), so PENDING USER_PURCHASE
 * gifts never land in the mock store.
 *
 * Token generation: `crypto.randomBytes(32).toString('base64url')` produces
 * a ~43-char URL-safe string. Collision probability with a unique-index
 * retry is effectively zero for any realistic gift volume.
 *
 * Item resolution: `resolveGiftItemPrice()` is the bridge between the
 * polymorphic `itemId` column and the three concrete item tables. It
 * normalises numeric (decimal dollars) and integer-cents prices into a
 * single `priceCents` shape so callers don't need to re-encode.
 * ──────────────────────────────────────────────────────────────────────── */

const GIFT_TTL_MS = 30 * 24 * 60 * 60 * 1000

export type GiftableItemType = 'BOOK' | 'SESSION' | 'BOOKING'

export type GiftItemSummary = {
  itemType: GiftableItemType
  itemId: string
  priceCents: number
  currency: string
  titleAr: string
  titleEn: string
  coverImage: string | null
}

/**
 * Polymorphic price + display lookup.
 *
 * - BOOK / SESSION: row in `books`. Price stored as `numeric(10,2)` decimal
 *   dollars; we multiply by 100 → cents. `productType` invariant enforced
 *   here (BOOK row can't be gifted as a SESSION even if itemId matches).
 * - BOOKING: row in `bookings`. Price already in cents (`integer priceUsd`).
 *
 * Returns null when:
 *   - The row doesn't exist or isn't published.
 *   - Price is null/zero (free items can't be paid-gifted; admin grants
 *     handle the free case via a separate path).
 *   - The productType invariant fails.
 *
 * Used by: createUserGiftAction (resolve before Stripe), createAdminGiftAction
 * (resolve before insert), gift display components.
 */
export async function resolveGiftItemPrice(
  itemType: GiftableItemType,
  itemId: string,
): Promise<GiftItemSummary | null> {
  if (!itemId) return null
  if (itemType === 'BOOKING') {
    const booking = await getBookingById(itemId)
    if (!booking || !booking.isActive) return null
    if (!booking.priceUsd || booking.priceUsd <= 0) return null
    return {
      itemType: 'BOOKING',
      itemId: booking.id,
      priceCents: booking.priceUsd,
      currency: (booking.currency || 'usd').toLowerCase(),
      titleAr: booking.titleAr,
      titleEn: booking.titleEn,
      coverImage: booking.coverImage ?? null,
    }
  }
  // BOOK / SESSION
  const book = await getBookById(itemId)
  if (!book) return null
  if (book.status !== 'PUBLISHED') return null
  const expectedProductType = itemType === 'SESSION' ? 'SESSION' : 'BOOK'
  if (book.productType !== expectedProductType) return null
  const decimal = Number.parseFloat(String(book.price))
  if (!Number.isFinite(decimal) || decimal <= 0) return null
  const priceCents = Math.round(decimal * 100)
  return {
    itemType,
    itemId: book.id,
    priceCents,
    currency: (book.currency || 'USD').toLowerCase(),
    titleAr: book.titleAr,
    titleEn: book.titleEn,
    coverImage: book.coverImage ?? null,
  }
}

export type CreateGiftInput = {
  source: GiftSource
  itemType: GiftItemType
  itemId: string
  recipientEmail: string
  senderUserId?: string | null
  senderMessage?: string | null
  amountCents?: number | null
  currency?: string | null
  stripeSessionId?: string | null
  stripePaymentIntentId?: string | null
  locale?: 'ar' | 'en'
  adminGrantedByUserId?: string | null
}

export type CreateGiftResult = {
  gift: Gift
  /** True when the gift was auto-claimed because the recipient already had
   *  an account with the matching email (ADMIN_GRANT path). */
  autoClaimed: boolean
  /** The recipient's userId iff autoClaimed; null otherwise. */
  recipientUserId: string | null
}

function generateGiftToken(): string {
  return randomBytes(32).toString('base64url')
}

function lcEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

/**
 * Insert a gift row. Auto-claim semantics for ADMIN_GRANT:
 * if the recipient email matches an existing user (case-insensitive), the
 * gift starts in CLAIMED state and `recipientUserId` is set immediately.
 * For USER_PURCHASE, the gift always starts PENDING — Stripe webhook calls
 * this only AFTER successful payment, so the recipient's existence isn't
 * a gating signal.
 *
 * Returns null on DB failure. Token uniqueness is enforced by the
 * `gifts_token_idx` unique index; a collision would surface as null + a
 * console.error (effectively zero probability with 256-bit entropy).
 */
export async function createGift(
  input: CreateGiftInput,
): Promise<CreateGiftResult | null> {
  const recipientEmail = lcEmail(input.recipientEmail)
  const expiresAt = new Date(Date.now() + GIFT_TTL_MS)
  const token = generateGiftToken()
  const locale = input.locale ?? 'ar'
  const currency = (input.currency ?? 'usd').toLowerCase()

  // Resolve recipient existence — needed for ADMIN_GRANT auto-claim AND for
  // setting recipientUserId on USER_PURCHASE if they happen to be a user
  // (so claim-time joins are simpler).
  const recipientUser = await getUserByEmail(recipientEmail)
  const autoClaim =
    input.source === 'ADMIN_GRANT' && recipientUser != null

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const now = new Date()
    const row: Gift = {
      id: cryptoRandomUuid(),
      token,
      source: input.source,
      status: autoClaim ? 'CLAIMED' : 'PENDING',
      itemType: input.itemType,
      itemId: input.itemId,
      senderUserId: input.senderUserId ?? null,
      recipientEmail,
      recipientUserId: autoClaim ? (recipientUser?.id ?? null) : null,
      senderMessage: input.senderMessage ?? null,
      amountCents: input.amountCents ?? null,
      currency,
      stripeSessionId: input.stripeSessionId ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      claimedAt: autoClaim ? now : null,
      expiresAt,
      revokedAt: null,
      revokedReason: null,
      refundedAt: null,
      locale,
      adminGrantedByUserId: input.adminGrantedByUserId ?? null,
      emailSentAt: null,
      emailSendFailedReason: null,
      createdAt: now,
      updatedAt: now,
    }
    store.gifts.unshift(row)
    writeStore(store)
    return {
      gift: row,
      autoClaimed: autoClaim,
      recipientUserId: autoClaim ? (recipientUser?.id ?? null) : null,
    }
  }

  if (!HAS_DB) return null
  const senderUserIdOk =
    input.senderUserId == null || isUuid(input.senderUserId)
  const adminGrantedByOk =
    input.adminGrantedByUserId == null || isUuid(input.adminGrantedByUserId)
  if (!isUuid(input.itemId) || !senderUserIdOk || !adminGrantedByOk) {
    return null
  }

  try {
    const [row] = await db
      .insert(gifts)
      .values({
        token,
        source: input.source,
        status: autoClaim ? 'CLAIMED' : 'PENDING',
        itemType: input.itemType,
        itemId: input.itemId,
        senderUserId: input.senderUserId ?? null,
        recipientEmail,
        recipientUserId: autoClaim ? (recipientUser?.id ?? null) : null,
        senderMessage: input.senderMessage ?? null,
        amountCents: input.amountCents ?? null,
        currency,
        stripeSessionId: input.stripeSessionId ?? null,
        stripePaymentIntentId: input.stripePaymentIntentId ?? null,
        claimedAt: autoClaim ? new Date() : null,
        expiresAt,
        locale,
        adminGrantedByUserId: input.adminGrantedByUserId ?? null,
      })
      .returning()
    if (!row) return null
    return {
      gift: row,
      autoClaimed: autoClaim,
      recipientUserId: autoClaim ? (recipientUser?.id ?? null) : null,
    }
  } catch (err) {
    console.error('[queries.createGift]', err)
    return null
  }
}

// Tiny helper: produce a uuid-like string for mock-mode rows. Real UUIDs
// would require a dependency; mock-mode IDs only need to be unique within
// the mock store and visually distinct from real ones.
function cryptoRandomUuid(): string {
  // Deterministically uuid-shaped: 8-4-4-4-12 hex chars.
  const hex = randomBytes(16).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

/**
 * Look up a gift by its opaque base64url token (~43 chars).
 *
 * Returns null for "token doesn't match any gift" (length-validation failures
 * or a genuine miss). Throws on DB-level errors (Neon timeout, connection
 * loss). Callers must distinguish — a null is not the same as a failed read.
 * The /gifts/claim server component branches into a `temporary_error` render
 * state on throw; claimGiftAction returns `{ ok: false, error: 'db_failed' }`.
 * Swallowing here would render a Neon hiccup as "invalid gift link" to the
 * user, which is what we used to do — see the gift-claim diagnostic Bug 3.
 */
export async function getGiftByToken(token: string): Promise<Gift | null> {
  if (!token || token.length < 16 || token.length > 64) return null
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.gifts.find((g) => g.token === token) ?? null
  }
  if (!HAS_DB) return null
  const [row] = await db.select().from(gifts).where(eq(gifts.token, token)).limit(1)
  return row ?? null
}

export async function getGiftById(id: string): Promise<Gift | null> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.gifts.find((g) => g.id === id) ?? null
  }
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db.select().from(gifts).where(eq(gifts.id, id)).limit(1)
    return row ?? null
  } catch (err) {
    console.error('[queries.getGiftById]', err)
    return null
  }
}

export async function getGiftByStripeSessionId(
  stripeSessionId: string,
): Promise<Gift | null> {
  if (!stripeSessionId || stripeSessionId.length > 200) return null
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return (
      store.gifts.find((g) => g.stripeSessionId === stripeSessionId) ?? null
    )
  }
  if (!HAS_DB) return null
  try {
    const [row] = await db
      .select()
      .from(gifts)
      .where(eq(gifts.stripeSessionId, stripeSessionId))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[queries.getGiftByStripeSessionId]', err)
    return null
  }
}

/**
 * Race-safe claim. The UPDATE is gated on `status='PENDING'` AND
 * `expiresAt > now()`. If two callers race (concurrent claim + cron expiry,
 * or two browser tabs), exactly one's UPDATE matches a row and returns it;
 * the other returns null and the action layer surfaces 'invalid_or_expired'.
 *
 * QA P2 — `expectedRecipientEmail` (optional but strongly recommended) is a
 * defense-in-depth DB-level gate. The action layer (`claimGiftAction` in
 * app/[locale]/(public)/gifts/actions.ts) already verifies the signed-in
 * user's email matches the gift's recipientEmail BEFORE calling this fn —
 * the WHERE clause here repeats the check so a future caller that bypasses
 * the action wrapper still cannot succeed with a token belonging to a
 * different account. Pass null when calling from a trusted context that
 * has already verified ownership some other way (kept as a backdoor for
 * tests + the legacy code path, but production callers should always
 * pass the expected email).
 *
 * Mock-mode replicates the same all-or-nothing semantics by checking + updating
 * the in-memory row inside a single readStore→write→writeStore sequence.
 */
export async function claimGift(
  token: string,
  recipientUserId: string,
  expectedRecipientEmail?: string | null,
): Promise<Gift | null> {
  if (!token) return null
  const expectedLc = expectedRecipientEmail?.trim().toLowerCase() ?? null
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const now = new Date()
    const idx = store.gifts.findIndex((g) => g.token === token)
    if (idx === -1) return null
    const g = store.gifts[idx]!
    if (g.status !== 'PENDING') return null
    if (g.expiresAt.getTime() <= now.getTime()) return null
    if (
      expectedLc != null &&
      g.recipientEmail.trim().toLowerCase() !== expectedLc
    ) {
      return null
    }
    const updated: Gift = {
      ...g,
      status: 'CLAIMED',
      claimedAt: now,
      recipientUserId,
      updatedAt: now,
    }
    store.gifts[idx] = updated
    writeStore(store)
    return updated
  }
  if (!HAS_DB) return null
  if (!isUuid(recipientUserId)) return null
  try {
    const conditions = [
      eq(gifts.token, token),
      eq(gifts.status, 'PENDING'),
      gt(gifts.expiresAt, sql`now()`),
    ]
    if (expectedLc != null) {
      // The recipient_email column is already stored lowercased (see
      // createGift's lcEmail helper); compare against the lowercased input.
      conditions.push(eq(gifts.recipientEmail, expectedLc))
    }
    const [row] = await db
      .update(gifts)
      .set({
        status: 'CLAIMED',
        claimedAt: new Date(),
        recipientUserId,
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.claimGift]', err)
    return null
  }
}

/**
 * Delete the BOOK/SESSION order row associated with a claimed gift. Used as
 * a side effect of revokeGift / markGiftRefunded for BOOK and SESSION items.
 * Booking-flavored gifts have their own revoke path (transfer userId back).
 */
async function deleteOrderForGift(giftId: string): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(giftId)) return
  try {
    await db.delete(orders).where(eq(orders.giftId, giftId))
  } catch (err) {
    console.error('[queries.deleteOrderForGift]', err)
  }
}

/**
 * Booking-side of revoke for CLAIMED gifts. Transfers the booking_orders
 * row back to the original sender (per spec: "sender paid, so they keep
 * the booking after revoke") and clears the giftId pointer. Capacity is
 * NOT decremented — the seat stays.
 *
 * Reads the gift first to recover senderUserId. For USER_PURCHASE gifts
 * that's the original buyer; for ADMIN_GRANT gifts it's null and we only
 * clear the giftId pointer (no one to transfer back to — the admin's
 * adminGrantedByUserId isn't a user-facing owner).
 */
async function unlinkBookingOrderFromGift(giftId: string): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(giftId)) return
  try {
    const [g] = await db
      .select({ senderUserId: gifts.senderUserId })
      .from(gifts)
      .where(eq(gifts.id, giftId))
      .limit(1)
    const senderUserId = g?.senderUserId ?? null
    await db
      .update(bookingOrders)
      .set({
        // For USER_PURCHASE, transfer userId back to the original buyer so
        // they retain the seat they paid for. For ADMIN_GRANT (senderUserId
        // null), leave userId untouched — there's no original buyer to
        // restore ownership to.
        ...(senderUserId ? { userId: senderUserId } : {}),
        giftId: null,
        updatedAt: new Date(),
      })
      .where(eq(bookingOrders.giftId, giftId))
  } catch (err) {
    console.error('[queries.unlinkBookingOrderFromGift]', err)
  }
}

export type RevokeGiftResult = Gift

/**
 * Admin revoke. Sets status=REVOKED + revokedAt + revokedReason. If the
 * gift was CLAIMED, also revokes the entitlement:
 *   - BOOK / SESSION: delete the orders row (cascades to order_items via FK)
 *   - BOOKING: transfer the booking_orders.userId back to senderUserId, clear
 *     giftId. Sender keeps the seat.
 */
export async function revokeGift(
  giftId: string,
  reason: string,
): Promise<RevokeGiftResult | null> {
  const now = new Date()
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const idx = store.gifts.findIndex((g) => g.id === giftId)
    if (idx === -1) return null
    const g = store.gifts[idx]!
    if (g.status === 'REVOKED' || g.status === 'REFUNDED') return g
    const updated: Gift = {
      ...g,
      status: 'REVOKED',
      revokedAt: now,
      revokedReason: reason,
      updatedAt: now,
    }
    store.gifts[idx] = updated
    writeStore(store)
    return updated
  }
  if (!HAS_DB) return null
  if (!isUuid(giftId)) return null
  try {
    const [row] = await db
      .update(gifts)
      .set({
        status: 'REVOKED',
        revokedAt: now,
        revokedReason: reason,
        updatedAt: now,
      })
      .where(
        and(
          eq(gifts.id, giftId),
          // Only transition non-terminal states. Terminal states return
          // null from the .returning() call.
          inArray(gifts.status, ['PENDING', 'CLAIMED']),
        ),
      )
      .returning()
    if (!row) return null
    if (row.itemType === 'BOOK' || row.itemType === 'SESSION') {
      await deleteOrderForGift(row.id)
    } else if (row.itemType === 'BOOKING') {
      await unlinkBookingOrderFromGift(row.id)
    }
    return row
  } catch (err) {
    console.error('[queries.revokeGift]', err)
    return null
  }
}

/**
 * Stripe-driven refund or chargeback. Mirrors revokeGift's side effects but
 * with status=REFUNDED. Booking flavor: same transfer-back-to-sender shape.
 */
export async function markGiftRefunded(giftId: string): Promise<Gift | null> {
  const now = new Date()
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const idx = store.gifts.findIndex((g) => g.id === giftId)
    if (idx === -1) return null
    const g = store.gifts[idx]!
    if (g.status === 'REFUNDED') return g
    const updated: Gift = {
      ...g,
      status: 'REFUNDED',
      refundedAt: now,
      updatedAt: now,
    }
    store.gifts[idx] = updated
    writeStore(store)
    return updated
  }
  if (!HAS_DB) return null
  if (!isUuid(giftId)) return null
  try {
    const [row] = await db
      .update(gifts)
      .set({
        status: 'REFUNDED',
        refundedAt: now,
        updatedAt: now,
      })
      .where(eq(gifts.id, giftId))
      .returning()
    if (!row) return null
    if (row.itemType === 'BOOK' || row.itemType === 'SESSION') {
      await deleteOrderForGift(row.id)
    } else if (row.itemType === 'BOOKING') {
      await unlinkBookingOrderFromGift(row.id)
    }
    return row
  } catch (err) {
    console.error('[queries.markGiftRefunded]', err)
    return null
  }
}

export async function markGiftEmailSent(
  giftId: string,
  success: boolean,
  failedReason?: string | null,
): Promise<void> {
  const now = new Date()
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const idx = store.gifts.findIndex((g) => g.id === giftId)
    if (idx === -1) return
    const g = store.gifts[idx]!
    store.gifts[idx] = {
      ...g,
      emailSentAt: success ? now : g.emailSentAt,
      emailSendFailedReason: success ? null : failedReason ?? null,
      updatedAt: now,
    }
    writeStore(store)
    return
  }
  if (!HAS_DB) return
  if (!isUuid(giftId)) return
  try {
    await db
      .update(gifts)
      .set({
        emailSentAt: success ? now : sql`email_sent_at`,
        emailSendFailedReason: success ? null : failedReason ?? null,
        updatedAt: now,
      })
      .where(eq(gifts.id, giftId))
  } catch (err) {
    console.error('[queries.markGiftEmailSent]', err)
  }
}

/**
 * Update the link from a Stripe session id to a gift after the gift has been
 * created. Used by the webhook to record the paymentIntentId once Stripe
 * provides it, after the initial PENDING insert.
 */
export async function setGiftStripePaymentIntent(
  giftId: string,
  stripePaymentIntentId: string,
): Promise<void> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const idx = store.gifts.findIndex((g) => g.id === giftId)
    if (idx === -1) return
    const g = store.gifts[idx]!
    store.gifts[idx] = {
      ...g,
      stripePaymentIntentId,
      updatedAt: new Date(),
    }
    writeStore(store)
    return
  }
  if (!HAS_DB) return
  if (!isUuid(giftId)) return
  try {
    await db
      .update(gifts)
      .set({ stripePaymentIntentId, updatedAt: new Date() })
      .where(eq(gifts.id, giftId))
  } catch (err) {
    console.error('[queries.setGiftStripePaymentIntent]', err)
  }
}

export async function getUserSentGifts(userId: string): Promise<Gift[]> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.gifts
      .filter((g) => g.senderUserId === userId)
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    return await db
      .select()
      .from(gifts)
      .where(eq(gifts.senderUserId, userId))
      .orderBy(desc(gifts.createdAt))
      .limit(100)
  } catch (err) {
    console.error('[queries.getUserSentGifts]', err)
    return []
  }
}

/**
 * Returns the gifts a user has received. Joins on `recipient_user_id` for
 * already-claimed gifts AND on lowercased recipient_email for PENDING gifts
 * the user hasn't claimed yet (e.g., signed up after the gift was created).
 */
export async function getUserReceivedGifts(
  userId: string,
  email: string,
): Promise<Gift[]> {
  const lc = lcEmail(email)
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.gifts
      .filter(
        (g) =>
          g.recipientUserId === userId ||
          g.recipientEmail.toLowerCase() === lc,
      )
      .slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }
  if (!HAS_DB) return []
  if (!isUuid(userId)) return []
  try {
    return await db
      .select()
      .from(gifts)
      .where(
        or(
          eq(gifts.recipientUserId, userId),
          eq(gifts.recipientEmail, lc),
        ),
      )
      .orderBy(desc(gifts.createdAt))
      .limit(100)
  } catch (err) {
    console.error('[queries.getUserReceivedGifts]', err)
    return []
  }
}

export type AdminGiftFilter = {
  status?: GiftStatus | 'all'
  source?: GiftSource | 'all'
  itemType?: GiftItemType | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export type AdminGiftsPage = {
  rows: Gift[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminGifts(
  filter: AdminGiftFilter,
): Promise<AdminGiftsPage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, filter.pageSize ?? 50))

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    let rows = store.gifts.slice()
    if (filter.status && filter.status !== 'all') {
      rows = rows.filter((g) => g.status === filter.status)
    }
    if (filter.source && filter.source !== 'all') {
      rows = rows.filter((g) => g.source === filter.source)
    }
    if (filter.itemType && filter.itemType !== 'all') {
      rows = rows.filter((g) => g.itemType === filter.itemType)
    }
    if (filter.search?.trim()) {
      const needle = filter.search.trim().toLowerCase()
      rows = rows.filter((g) =>
        g.recipientEmail.toLowerCase().includes(needle),
      )
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const total = rows.length
    const sliced = rows.slice((page - 1) * pageSize, page * pageSize)
    return { rows: sliced, total, page, pageSize }
  }
  if (!HAS_DB) return { rows: [], total: 0, page, pageSize }
  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(gifts.status, filter.status))
    }
    if (filter.source && filter.source !== 'all') {
      conditions.push(eq(gifts.source, filter.source))
    }
    if (filter.itemType && filter.itemType !== 'all') {
      conditions.push(eq(gifts.itemType, filter.itemType))
    }
    if (filter.search?.trim()) {
      conditions.push(ilike(gifts.recipientEmail, `%${filter.search.trim()}%`))
    }
    const whereClause = conditions.length ? and(...conditions) : undefined
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(gifts)
      .where(whereClause)
    const rows = await db
      .select()
      .from(gifts)
      .where(whereClause)
      .orderBy(desc(gifts.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return {
      rows,
      total: Number(count) || 0,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('[queries.getAdminGifts]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

export type ExpirePendingGiftsResult = {
  expiredCount: number
  bookingReleasedCount: number
  errors: Array<{ giftId: string; error: string }>
}

/**
 * Daily cron sweep. Marks PENDING gifts past their expiresAt as EXPIRED and
 * applies booking-specific cleanup:
 *   - BOOKING gifts whose underlying booking has a future event date:
 *     decrement bookings.bookedCount, leave the booking_order row as-is
 *     (sender's payment record stays — admin can refund manually).
 *   - BOOKING gifts whose event has already passed: leave bookedCount alone.
 *
 * Idempotent: a second pass finds no PENDING+expired rows.
 */
export async function expirePendingGifts(): Promise<ExpirePendingGiftsResult> {
  const errors: Array<{ giftId: string; error: string }> = []
  const now = new Date()

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    let expiredCount = 0
    for (let i = 0; i < store.gifts.length; i++) {
      const g = store.gifts[i]!
      if (g.status !== 'PENDING') continue
      if (g.expiresAt.getTime() > now.getTime()) continue
      store.gifts[i] = { ...g, status: 'EXPIRED', updatedAt: now }
      expiredCount++
    }
    if (expiredCount > 0) writeStore(store)
    // Booking release in mock-mode is a no-op (USER_PURCHASE BOOKING gifts
    // don't get created in mock-auth dev mode; ADMIN_GRANT BOOKING gifts
    // don't consume capacity through Stripe).
    return { expiredCount, bookingReleasedCount: 0, errors }
  }

  if (!HAS_DB) return { expiredCount: 0, bookingReleasedCount: 0, errors }

  try {
    // QA P1 — Per-gift transactional expiry. Previously this fn did one
    // bulk UPDATE flipping ALL PENDING-past-expiresAt gifts to EXPIRED,
    // then iterated row-by-row to release booking capacity in separate
    // transactions. A crash mid-loop (DB blip, function timeout, network
    // partition) left BOOKING gifts in EXPIRED while their seat stayed
    // consumed; the next sweep skipped them (already EXPIRED) so capacity
    // was permanently leaked.
    //
    // Now: pick the expired-candidate set first (no status flip yet),
    // then per gift, run (flip + capacity release + booking_order unlink)
    // inside one transaction. Crash mid-loop leaves not-yet-processed
    // gifts as PENDING-past-expiresAt — the next sweep picks them up.
    const candidates = await db
      .select()
      .from(gifts)
      .where(
        and(eq(gifts.status, 'PENDING'), lte(gifts.expiresAt, sql`now()`)),
      )

    let expiredCount = 0
    let bookingReleasedCount = 0
    for (const g of candidates) {
      try {
        const isBooking = g.itemType === 'BOOKING'
        const booking = isBooking ? await getBookingById(g.itemId) : null
        const eventInFuture =
          booking?.nextCohortDate != null &&
          booking.nextCohortDate.getTime() > now.getTime()
        const shouldReleaseSeat = isBooking && eventInFuture

        const released = await db.transaction(async (tx) => {
          // Status flip — gated on PENDING so a concurrent claim that
          // raced past our SELECT and CLAIMED the gift is respected
          // (the UPDATE matches no row, we move on).
          const [flipped] = await tx
            .update(gifts)
            .set({ status: 'EXPIRED', updatedAt: now })
            .where(and(eq(gifts.id, g.id), eq(gifts.status, 'PENDING')))
            .returning({ id: gifts.id })
          if (!flipped) return false

          if (shouldReleaseSeat) {
            // Release the seat capacity AND flip the linked booking_order
            // so commerce history doesn't claim a seat that capacity now
            // reports as open. Both run in the same transaction as the
            // gift flip; partial failure is rolled back.
            await tx
              .update(bookings)
              .set({
                bookedCount: sql`GREATEST(${bookings.bookedCount} - 1, 0)`,
                updatedAt: now,
              })
              .where(eq(bookings.id, g.itemId))
            await tx
              .update(bookingOrders)
              .set({
                // No 'EXPIRED' enum value; refund-class state isn't right
                // either since no money flowed. FAILED is the closest fit
                // — "we accepted a hold but never resolved it" — and
                // matches what payment_intent.payment_failed writes.
                status: 'FAILED',
                updatedAt: now,
              })
              .where(eq(bookingOrders.giftId, g.id))
            return true
          }
          return false
        })
        expiredCount++
        if (released) bookingReleasedCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'unknown'
        errors.push({ giftId: g.id, error: msg })
        console.error('[queries.expirePendingGifts] per-gift transaction failed', {
          giftId: g.id,
          err,
        })
      }
    }

    return {
      expiredCount,
      bookingReleasedCount,
      errors,
    }
  } catch (err) {
    console.error('[queries.expirePendingGifts]', err)
    const msg = err instanceof Error ? err.message : 'unknown'
    errors.push({ giftId: 'sweep', error: msg })
    return { expiredCount: 0, bookingReleasedCount: 0, errors }
  }
}

export async function countPendingGiftsForUser(
  userId: string,
  email: string,
): Promise<number> {
  const lc = lcEmail(email)
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const now = Date.now()
    return store.gifts.filter(
      (g) =>
        g.status === 'PENDING' &&
        g.expiresAt.getTime() > now &&
        (g.recipientUserId === userId || g.recipientEmail.toLowerCase() === lc),
    ).length
  }
  if (!HAS_DB) return 0
  if (!isUuid(userId)) return 0
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(gifts)
      .where(
        and(
          eq(gifts.status, 'PENDING'),
          gt(gifts.expiresAt, sql`now()`),
          or(eq(gifts.recipientUserId, userId), eq(gifts.recipientEmail, lc)),
        ),
      )
    return Number(count) || 0
  } catch (err) {
    console.error('[queries.countPendingGiftsForUser]', err)
    return 0
  }
}

/**
 * Email-based already-owns check for BOOK / SESSION gifts. Joins orders →
 * users.email so an offer to gift a book to recipient@example.com is
 * blocked when that email belongs to an existing user who already paid for
 * (or claimed a gift of) the same item.
 */
export async function recipientEmailOwnsBookOrSession(
  email: string,
  bookId: string,
): Promise<boolean> {
  const lc = lcEmail(email)
  if (!HAS_DB) return false
  if (!isUuid(bookId)) return false
  try {
    const recipient = await getUserByEmail(lc)
    if (!recipient) return false
    const rows = await db
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(
        and(
          eq(orders.userId, recipient.id),
          eq(orderItems.bookId, bookId),
          inArray(orders.status, ['PAID', 'FULFILLED']),
        ),
      )
      .limit(1)
    return rows.length > 0
  } catch (err) {
    console.error('[queries.recipientEmailOwnsBookOrSession]', err)
    return false
  }
}

export async function recipientEmailHasBooking(
  email: string,
  bookingId: string,
): Promise<boolean> {
  const lc = lcEmail(email)
  if (!HAS_DB) return false
  if (!isUuid(bookingId)) return false
  try {
    const recipient = await getUserByEmail(lc)
    if (!recipient) return false
    const rows = await db
      .select({ id: bookingOrders.id })
      .from(bookingOrders)
      .where(
        and(
          eq(bookingOrders.userId, recipient.id),
          eq(bookingOrders.bookingId, bookingId),
          inArray(bookingOrders.status, ['PAID', 'FULFILLED']),
        ),
      )
      .limit(1)
    return rows.length > 0
  } catch (err) {
    console.error('[queries.recipientEmailHasBooking]', err)
    return false
  }
}

/**
 * Grant an entitlement after a successful claim. For BOOK/SESSION gifts this
 * inserts an order + order_items row; for BOOKING gifts the action layer
 * mutates the existing booking_order's userId to the recipient. This helper
 * encapsulates the BOOK/SESSION branch only.
 *
 * Returns the orderId on success, null on failure.
 */
export async function createGiftClaimOrder(input: {
  recipientUserId: string
  recipientEmail: string
  giftId: string
  bookId: string
  priceCents: number
  currency: string
}): Promise<string | null> {
  if (MOCK_AUTH_ENABLED) {
    // Mock-mode "library access" is governed by the queries.ts BOOK / SESSION
    // queries (placeholder data). Owning a book in mock-mode is auto-true for
    // demo simplicity; we don't need to insert an orders row here. Return a
    // stable mock id so the caller's logging works.
    return `gift-mock-order-${input.giftId.slice(0, 8)}`
  }
  if (!HAS_DB) return null
  if (!isUuid(input.recipientUserId) || !isUuid(input.bookId) || !isUuid(input.giftId)) {
    return null
  }
  try {
    const totalAmount = (input.priceCents / 100).toFixed(2)
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          userId: input.recipientUserId,
          status: 'PAID',
          totalAmount,
          currency: input.currency.toUpperCase(),
          customerEmail: input.recipientEmail,
          giftId: input.giftId,
        })
        .returning({ id: orders.id })
      if (!order) return null
      await tx.insert(orderItems).values({
        orderId: order.id,
        bookId: input.bookId,
        quantity: 1,
        priceAtPurchase: totalAmount,
      })
      return order.id
    })
  } catch (err) {
    console.error('[queries.createGiftClaimOrder]', err)
    return null
  }
}

/**
 * Booking-flavored claim. Updates the booking_order's userId from sender
 * to recipient. Idempotent on userId: re-running with the same args is a
 * no-op (the WHERE clause matches, the SET applies the same value).
 */
export async function transferBookingOrderToRecipient(input: {
  giftId: string
  recipientUserId: string
}): Promise<{ bookingId: string; bookingOrderId: string } | null> {
  if (MOCK_AUTH_ENABLED) {
    // Mock-mode booking_orders flow is gated behind Stripe, so this branch
    // is unreachable for USER_PURCHASE. ADMIN_GRANT BOOKING gifts in mock
    // mode just record the gift; the booking_order doesn't exist. Return
    // a synthesized success so the action's downstream side effects (email,
    // revalidation) still fire.
    const gift = await getGiftById(input.giftId)
    return gift && gift.itemType === 'BOOKING'
      ? {
          bookingId: gift.itemId,
          bookingOrderId: `gift-mock-${input.giftId.slice(0, 8)}`,
        }
      : null
  }
  if (!HAS_DB) return null
  if (!isUuid(input.giftId) || !isUuid(input.recipientUserId)) return null
  try {
    const [row] = await db
      .update(bookingOrders)
      .set({ userId: input.recipientUserId, updatedAt: new Date() })
      .where(eq(bookingOrders.giftId, input.giftId))
      .returning({ id: bookingOrders.id, bookingId: bookingOrders.bookingId })
    if (!row) return null
    return { bookingOrderId: row.id, bookingId: row.bookingId }
  } catch (err) {
    console.error('[queries.transferBookingOrderToRecipient]', err)
    return null
  }
}

/**
 * Stripe webhook helper: at the moment of checkout.session.completed for a
 * BOOKING gift, we need to (a) create the booking_order in PENDING with
 * the sender's userId, (b) create the gift row, (c) link the booking_order
 * back to the gift, and (d) flip the booking_order to PAID + increment
 * bookedCount + delete the hold. This helper bundles (d) for gift bookings.
 *
 * Returns null when the row didn't move (already PAID via concurrent
 * delivery, or the row doesn't exist).
 */
export async function markGiftBookingOrderPaid(input: {
  giftId: string
  stripeSessionId: string
  stripePaymentIntentId: string | null
  amountPaid: number
}): Promise<{
  bookingOrderId: string
  bookingId: string
  newBookedCount: number
  flippedToSoldOut: boolean
} | null> {
  if (!HAS_DB) return null
  if (!isUuid(input.giftId)) return null
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .update(bookingOrders)
        .set({
          status: 'PAID',
          stripePaymentIntentId: input.stripePaymentIntentId,
          amountPaid: input.amountPaid,
          confirmedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(bookingOrders.giftId, input.giftId),
            eq(bookingOrders.status, 'PENDING'),
          ),
        )
        .returning()
      if (!order) return null
      const [b] = await tx
        .update(bookings)
        .set({
          bookedCount: sql`${bookings.bookedCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, order.bookingId))
        .returning({
          id: bookings.id,
          bookedCount: bookings.bookedCount,
          maxCapacity: bookings.maxCapacity,
          bookingState: bookings.bookingState,
        })
      let flippedToSoldOut = false
      if (b && b.bookedCount >= b.maxCapacity && b.bookingState === 'OPEN') {
        await tx
          .update(bookings)
          .set({ bookingState: 'SOLD_OUT', updatedAt: new Date() })
          .where(eq(bookings.id, b.id))
        flippedToSoldOut = true
      }
      await tx
        .delete(bookingsPendingHolds)
        .where(eq(bookingsPendingHolds.stripeSessionId, input.stripeSessionId))
      return {
        bookingOrderId: order.id,
        bookingId: order.bookingId,
        newBookedCount: b?.bookedCount ?? 0,
        flippedToSoldOut,
      }
    })
  } catch (err) {
    console.error('[queries.markGiftBookingOrderPaid]', err)
    return null
  }
}

/**
 * Insert a booking_order row in PENDING state with a giftId linked. Called
 * from the gift-creation server action (USER_PURCHASE BOOKING flow) AFTER
 * the hold is created and BEFORE the Stripe checkout session is created.
 * The user_id is the sender's id; transferred to recipient on claim.
 */
export async function createGiftBookingOrder(input: {
  senderUserId: string
  bookingId: string
  giftId: string
  amountPaid: number
  currency: string
  stripeSessionId: string
}): Promise<BookingOrder | null> {
  if (!HAS_DB) return null
  if (
    !isUuid(input.senderUserId) ||
    !isUuid(input.bookingId) ||
    !isUuid(input.giftId)
  ) {
    return null
  }
  try {
    const [row] = await db
      .insert(bookingOrders)
      .values({
        userId: input.senderUserId,
        bookingId: input.bookingId,
        stripeSessionId: input.stripeSessionId,
        amountPaid: input.amountPaid,
        currency: input.currency.toUpperCase(),
        status: 'PENDING',
        giftId: input.giftId,
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.createGiftBookingOrder]', err)
    return null
  }
}

/**
 * Admin BOOKING grant: insert a booking_order in PAID state (no Stripe path)
 * linked to the gift, then bump bookedCount + SOLD_OUT flip, and release the
 * hold that gated the capacity check.
 *
 * Semantics:
 *   - Auto-claimed (recipient is an existing user): `recipientUserId` is set,
 *     booking_order.userId = recipientUserId. Recipient sees the booking
 *     immediately in /dashboard/bookings.
 *   - Not auto-claimed (PENDING gift): booking_order.userId = null.
 *     `transferBookingOrderToRecipient` populates it on claim.
 *
 * stripeSessionId is a sentinel — `admin-grant:{giftId}` — since
 * booking_orders.stripeSessionId is NOT NULL with a unique index. The
 * sentinel keeps the column populated and uniquely keyed per gift.
 *
 * Capacity bump and SOLD_OUT flip mirror markGiftBookingOrderPaid's
 * transaction logic. The hold (created by the action layer before this call)
 * is deleted as the final step inside the same transaction.
 *
 * Mock-mode: synthesizes a fake bookingOrderId so the action's downstream
 * side effects (email, revalidation) still fire. The mock store doesn't
 * model booking_orders.
 */
export async function createAdminGrantBookingOrder(input: {
  giftId: string
  bookingId: string
  recipientUserId: string | null
  currency: string
  holdId: string
}): Promise<{
  bookingOrderId: string
  newBookedCount: number
  flippedToSoldOut: boolean
} | null> {
  if (MOCK_AUTH_ENABLED) {
    return {
      bookingOrderId: `admin-grant-mock-${input.giftId.slice(0, 8)}`,
      newBookedCount: 0,
      flippedToSoldOut: false,
    }
  }
  if (!HAS_DB) return null
  if (!isUuid(input.giftId) || !isUuid(input.bookingId) || !isUuid(input.holdId)) {
    return null
  }
  if (input.recipientUserId && !isUuid(input.recipientUserId)) return null
  try {
    return await db.transaction(async (tx) => {
      const now = new Date()
      const [order] = await tx
        .insert(bookingOrders)
        .values({
          userId: input.recipientUserId ?? null,
          bookingId: input.bookingId,
          stripeSessionId: `admin-grant:${input.giftId}`,
          amountPaid: 0,
          currency: input.currency.toUpperCase(),
          status: 'PAID',
          giftId: input.giftId,
          confirmedAt: now,
        })
        .returning({ id: bookingOrders.id })
      if (!order) return null
      // Mirrors markGiftBookingOrderPaid's bookedCount bump + SOLD_OUT flip.
      // Kept inline rather than extracted because Drizzle's PgTransaction
      // type would need to thread through every call site; the duplication
      // is bounded to two places and clearer than the type gymnastics.
      const [b] = await tx
        .update(bookings)
        .set({
          bookedCount: sql`${bookings.bookedCount} + 1`,
          updatedAt: now,
        })
        .where(eq(bookings.id, input.bookingId))
        .returning({
          id: bookings.id,
          bookedCount: bookings.bookedCount,
          maxCapacity: bookings.maxCapacity,
          bookingState: bookings.bookingState,
        })
      let flippedToSoldOut = false
      if (b && b.bookedCount >= b.maxCapacity && b.bookingState === 'OPEN') {
        await tx
          .update(bookings)
          .set({ bookingState: 'SOLD_OUT', updatedAt: now })
          .where(eq(bookings.id, b.id))
        flippedToSoldOut = true
      }
      await tx
        .delete(bookingsPendingHolds)
        .where(eq(bookingsPendingHolds.id, input.holdId))
      return {
        bookingOrderId: order.id,
        newBookedCount: b?.bookedCount ?? 0,
        flippedToSoldOut,
      }
    })
  } catch (err) {
    console.error('[queries.createAdminGrantBookingOrder]', err)
    return null
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase D2 — Email queue
 *
 * Durable outbox for every transactional email. Callers enqueue rendered
 * messages at the action layer; a Vercel cron at /api/cron/process-email-queue
 * drains the queue with retry + backoff.
 *
 * Concurrency: pickPendingEmails uses SELECT ... FOR UPDATE SKIP LOCKED so
 * concurrent cron workers (Vercel can overlap if a previous run is still
 * executing) can safely drain in parallel without double-sends. The
 * partial index `email_queue_pending_idx` keeps the dequeue scan small
 * even as SENT rows accumulate.
 *
 * Mock-mode: emailQueue is not modeled in mock-store. enqueueEmail
 * returns a synthesized row + the dev-preview email file write still
 * happens via lib/email/send.ts. Cron worker is a no-op in mock mode.
 * ──────────────────────────────────────────────────────────────────────── */

import { nextAttemptDateFor, MAX_EMAIL_ATTEMPTS } from '../email/backoff'

/**
 * Loose-typed related-entity discriminator. Keeps the FK-less polymorphic
 * pointer narrow at the type level without baking the set into a DB enum
 * (new surfaces shouldn't require a migration).
 */
export type EmailRelatedEntityType =
  | 'gift'
  | 'order'
  | 'booking'
  | 'booking_order'
  | 'question'
  | 'corporate_request'

export type EnqueueEmailInput = {
  emailType: string
  recipientEmail: string
  subject: string
  htmlBody: string
  textBody: string
  fromAddress: string
  replyTo?: string | null
  relatedEntityType?: EmailRelatedEntityType | null
  relatedEntityId?: string | null
}

export async function enqueueEmail(
  input: EnqueueEmailInput,
): Promise<EmailQueueRow | null> {
  const recipient = input.recipientEmail.trim().toLowerCase()
  if (!HAS_DB) return null
  try {
    const [row] = await db
      .insert(emailQueue)
      .values({
        emailType: input.emailType,
        recipientEmail: recipient,
        subject: input.subject,
        htmlBody: input.htmlBody,
        textBody: input.textBody,
        fromAddress: input.fromAddress,
        replyTo: input.replyTo ?? null,
        status: 'PENDING',
        attemptCount: 0,
        maxAttempts: MAX_EMAIL_ATTEMPTS,
        nextAttemptAt: new Date(),
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId:
          input.relatedEntityId && isUuid(input.relatedEntityId)
            ? input.relatedEntityId
            : null,
      })
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.enqueueEmail]', err)
    return null
  }
}

/**
 * Atomic batched dequeue. Inside a single transaction:
 *   1. SELECT up to `limit` rows WHERE
 *        status='PENDING' AND nextAttemptAt <= now()
 *        OR  (status='SENDING' AND lastAttemptAt < now() - interval '10 min')
 *      FOR UPDATE SKIP LOCKED
 *   2. UPDATE picked rows to status='SENDING' + lastAttemptAt=now()
 *   3. Return the updated rows
 *
 * SKIP LOCKED is the standard pattern: a concurrent worker that races
 * for the same rows simply skips them and picks others, instead of
 * blocking on the lock. Lock is released when the transaction commits
 * (immediately, since we don't keep it open past the UPDATE).
 *
 * QA P2 — stale-SENDING recovery. A worker that crashes mid-batch (Vercel
 * function timeout, container OOM, network partition) leaves rows pinned
 * in SENDING forever; the partial index `email_queue_pending_idx`
 * deliberately INCLUDES SENDING (so the cron can re-pick them), but the
 * old query filtered them out. After 10 minutes of inactivity we treat
 * a SENDING row as orphaned and re-pick it. Worst case: a long-running
 * Resend call that's actually still in-flight gets a duplicate retry;
 * Resend itself deduplicates by `Idempotency-Key` (we set one in
 * lib/email/queue-send.ts) so the recipient won't see two copies.
 *
 * Returns [] when nothing is pending.
 */
export async function pickPendingEmails(
  limit: number,
): Promise<EmailQueueRow[]> {
  if (!HAS_DB) return []
  const batchSize = Math.max(1, Math.min(100, Math.floor(limit)))
  try {
    return await db.transaction(async (tx) => {
      const picked = await tx
        .select({ id: emailQueue.id })
        .from(emailQueue)
        .where(
          sql`(
            (${emailQueue.status} = 'PENDING' AND ${emailQueue.nextAttemptAt} <= now())
            OR
            (${emailQueue.status} = 'SENDING' AND ${emailQueue.lastAttemptAt} < now() - interval '10 minutes')
          )`,
        )
        .orderBy(asc(emailQueue.nextAttemptAt))
        .limit(batchSize)
        .for('update', { skipLocked: true })

      if (picked.length === 0) return []

      const ids = picked.map((p) => p.id)
      const now = new Date()
      const updated = await tx
        .update(emailQueue)
        .set({
          status: 'SENDING',
          lastAttemptAt: now,
          updatedAt: now,
        })
        .where(inArray(emailQueue.id, ids))
        .returning()
      return updated
    })
  } catch (err) {
    console.error('[queries.pickPendingEmails]', err)
    return []
  }
}

export async function markEmailSent(
  id: string,
  resendMessageId: string | null,
): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(id)) return
  try {
    await db
      .update(emailQueue)
      .set({
        status: 'SENT',
        resendMessageId: resendMessageId ?? null,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailQueue.id, id))
  } catch (err) {
    console.error('[queries.markEmailSent]', err)
  }
}

/**
 * Bumps attemptCount + reschedules per the backoff schedule. When the
 * post-increment attempt count hits MAX_EMAIL_ATTEMPTS, transitions to
 * EXHAUSTED with no further nextAttemptAt change.
 *
 * Idempotent on EXHAUSTED — a stale worker that completes after a peer
 * already marked the row exhausted is a no-op (the eq(id) WHERE doesn't
 * filter on status, but EXHAUSTED rows are never re-picked, so the worst
 * case is a status flip back to PENDING which gets re-corrected on next
 * dequeue attempt).
 */
export async function markEmailRetry(id: string, error: string): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(id)) return
  const truncatedError =
    error.length > 2000 ? `${error.slice(0, 2000)}…` : error
  try {
    const [current] = await db
      .select({ attemptCount: emailQueue.attemptCount })
      .from(emailQueue)
      .where(eq(emailQueue.id, id))
      .limit(1)
    if (!current) return
    const nextCount = current.attemptCount + 1
    const nextAttempt = nextAttemptDateFor(nextCount)
    const exhausted = nextAttempt == null
    await db
      .update(emailQueue)
      .set({
        attemptCount: nextCount,
        status: exhausted ? 'EXHAUSTED' : 'PENDING',
        nextAttemptAt: nextAttempt ?? new Date(),
        lastError: truncatedError,
        updatedAt: new Date(),
      })
      .where(eq(emailQueue.id, id))
  } catch (err) {
    console.error('[queries.markEmailRetry]', err)
  }
}

/**
 * Admin manual dead-letter. Used when operators give up on a stuck row
 * (e.g., a recipient address is known-invalid and re-attempts won't help).
 * The lastError is overwritten with the admin-supplied reason for audit.
 */
export async function markEmailFailed(
  id: string,
  reason: string,
): Promise<void> {
  if (!HAS_DB) return
  if (!isUuid(id)) return
  try {
    await db
      .update(emailQueue)
      .set({
        status: 'FAILED',
        lastError: reason.slice(0, 2000),
        updatedAt: new Date(),
      })
      .where(eq(emailQueue.id, id))
  } catch (err) {
    console.error('[queries.markEmailFailed]', err)
  }
}

export type AdminEmailQueueFilter = {
  status?: EmailStatus | 'all'
  emailType?: string | 'all'
  search?: string
  relatedEntityType?: string | null
  relatedEntityId?: string | null
  page?: number
  pageSize?: number
}

export type AdminEmailQueuePage = {
  rows: EmailQueueRow[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminEmailQueue(
  filter: AdminEmailQueueFilter,
): Promise<AdminEmailQueuePage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = Math.min(100, Math.max(10, filter.pageSize ?? 50))
  if (!HAS_DB) return { rows: [], total: 0, page, pageSize }
  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(emailQueue.status, filter.status))
    }
    if (filter.emailType && filter.emailType !== 'all') {
      conditions.push(eq(emailQueue.emailType, filter.emailType))
    }
    if (filter.search?.trim()) {
      conditions.push(
        ilike(emailQueue.recipientEmail, `%${filter.search.trim()}%`),
      )
    }
    if (filter.relatedEntityType) {
      conditions.push(eq(emailQueue.relatedEntityType, filter.relatedEntityType))
    }
    if (filter.relatedEntityId && isUuid(filter.relatedEntityId)) {
      conditions.push(eq(emailQueue.relatedEntityId, filter.relatedEntityId))
    }
    const whereClause = conditions.length ? and(...conditions) : undefined
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(emailQueue)
      .where(whereClause)
    const rows = await db
      .select()
      .from(emailQueue)
      .where(whereClause)
      .orderBy(desc(emailQueue.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { rows, total: Number(count) || 0, page, pageSize }
  } catch (err) {
    console.error('[queries.getAdminEmailQueue]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

export async function getEmailQueueEntry(
  id: string,
): Promise<EmailQueueRow | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    console.error('[queries.getEmailQueueEntry]', err)
    return null
  }
}

/**
 * Admin "retry now" — flips status back to PENDING and resets
 * nextAttemptAt to now() without resetting attemptCount, so the audit
 * trail (this row has been tried N times) survives.
 *
 * The maxAttempts cap still applies: if attemptCount is already at the
 * max, the row will go back to EXHAUSTED on the next failure. Admin can
 * re-click to keep trying — manual operations decision, not automatic.
 */
export async function retryEmailManually(
  id: string,
): Promise<EmailQueueRow | null> {
  if (!HAS_DB) return null
  if (!isUuid(id)) return null
  try {
    const [row] = await db
      .update(emailQueue)
      .set({
        status: 'PENDING',
        nextAttemptAt: new Date(),
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(emailQueue.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    console.error('[queries.retryEmailManually]', err)
    return null
  }
}

/**
 * Returns a count per EmailStatus value. Used by the admin sidebar to
 * surface EXHAUSTED + FAILED as a badge — admin attention bucket.
 *
 * One scan; the partial index doesn't help here (we read every status)
 * but the table size is bounded by retention, so a full COUNT is fine.
 */
export async function countQueueByStatus(): Promise<Record<EmailStatus, number>> {
  const empty: Record<EmailStatus, number> = {
    PENDING: 0,
    SENDING: 0,
    SENT: 0,
    FAILED: 0,
    EXHAUSTED: 0,
  }
  if (!HAS_DB) return empty
  try {
    const rows = await db
      .select({
        status: emailQueue.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(emailQueue)
      .groupBy(emailQueue.status)
    const out = { ...empty }
    for (const r of rows) {
      out[r.status] = Number(r.count) || 0
    }
    return out
  } catch (err) {
    console.error('[queries.countQueueByStatus]', err)
    return empty
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Stripe webhook idempotency (QA P2)
 *
 * recordStripeEvent inserts the event id with ON CONFLICT DO NOTHING and
 * returns whether the row was newly inserted (true = first delivery; false
 * = duplicate, caller should short-circuit). Caller is the route handler
 * at app/api/stripe/webhook/route.ts.
 *
 * In mock-auth dev / non-DB mode, ALWAYS returns true (first-delivery
 * semantics) — local Stripe-CLI testing should always process events.
 * ──────────────────────────────────────────────────────────────────────── */

/* ──────────────────────────────────────────────────────────────────────────
 * Phase E1b — admin list helpers (paginated, filtered, server-side).
 *
 * Mirrors the getAdminGifts / getAdminEmailQueue contract: every helper
 * returns `{ rows, total, page, pageSize }` and accepts a filter input with
 * `status`, `search`, optional `startDate` / `endDate`, plus paging. Used by
 * the rebuilt admin list pages and by the CSV-export server actions
 * (which call them with a large pageSize to bypass page-by-page traversal).
 * ──────────────────────────────────────────────────────────────────────── */

const ADMIN_LIST_MAX_PAGE_SIZE = 200
const ADMIN_CSV_MAX_ROWS = 5000

function clampPageSize(raw: number | undefined, fallback = 50): number {
  return Math.min(ADMIN_LIST_MAX_PAGE_SIZE, Math.max(10, raw ?? fallback))
}

function clampCsvPageSize(raw: number | undefined): number {
  return Math.min(ADMIN_CSV_MAX_ROWS, Math.max(10, raw ?? ADMIN_CSV_MAX_ROWS))
}

/* ── Admin orders (BOOK + SESSION purchases) ──────────────────────────── */

export type AdminOrderFilter = {
  status?: OrderStatus | 'all'
  search?: string
  startDate?: Date | null
  endDate?: Date | null
  page?: number
  pageSize?: number
}

export type AdminOrdersPage = {
  rows: Order[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminOrders(
  filter: AdminOrderFilter,
): Promise<AdminOrdersPage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = clampPageSize(filter.pageSize)

  if (!HAS_DB) {
    let rows = placeholderOrders.slice()
    if (filter.status && filter.status !== 'all') {
      rows = rows.filter((o) => o.status === filter.status)
    }
    if (filter.search?.trim()) {
      const needle = filter.search.trim().toLowerCase()
      rows = rows.filter(
        (o) =>
          o.customerEmail.toLowerCase().includes(needle) ||
          (o.stripeSessionId ?? '').toLowerCase().includes(needle),
      )
    }
    if (filter.startDate) {
      rows = rows.filter((o) => o.createdAt >= filter.startDate!)
    }
    if (filter.endDate) {
      rows = rows.filter((o) => o.createdAt <= filter.endDate!)
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const total = rows.length
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total,
      page,
      pageSize,
    }
  }

  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(orders.status, filter.status))
    }
    if (filter.search?.trim()) {
      const needle = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(orders.customerEmail, needle),
          ilike(orders.stripeSessionId, needle),
        )!,
      )
    }
    if (filter.startDate) {
      conditions.push(sql`${orders.createdAt} >= ${filter.startDate.toISOString()}`)
    }
    if (filter.endDate) {
      conditions.push(sql`${orders.createdAt} <= ${filter.endDate.toISOString()}`)
    }
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(orders)
      .where(whereClause)
    const rows = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { rows, total: Number(count) || 0, page, pageSize }
  } catch (err) {
    console.error('[queries.getAdminOrders]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

/** Streaming variant for CSV export — same filters, no pagination, capped at
 *  5000 rows so a runaway click can't OOM the function. */
export async function getAdminOrdersForCsv(
  filter: Omit<AdminOrderFilter, 'page' | 'pageSize'>,
): Promise<Order[]> {
  const result = await getAdminOrders({
    ...filter,
    page: 1,
    pageSize: clampCsvPageSize(undefined),
  })
  return result.rows
}

/* ── Admin booking orders ─────────────────────────────────────────────── */

export type AdminBookingOrderFilter = {
  status?: OrderStatus | 'all'
  search?: string
  bookingId?: string
  startDate?: Date | null
  endDate?: Date | null
  page?: number
  pageSize?: number
}

export type AdminBookingOrdersPage = {
  rows: BookingOrderWithMeta[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminBookingOrders(
  filter: AdminBookingOrderFilter,
): Promise<AdminBookingOrdersPage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = clampPageSize(filter.pageSize)

  if (!HAS_DB) {
    const base = placeholderBookingOrders.map((o) => {
      const booking = placeholderBookings.find((b) => b.id === o.bookingId)
      return {
        ...o,
        userName: null,
        userEmail: '',
        bookingTitleAr: booking?.titleAr ?? '',
        bookingTitleEn: booking?.titleEn ?? '',
        bookingProductType: booking?.productType ?? null,
      } as BookingOrderWithMeta
    })
    let rows = base
    if (filter.status && filter.status !== 'all') {
      rows = rows.filter((o) => o.status === filter.status)
    }
    if (filter.bookingId && isUuid(filter.bookingId)) {
      rows = rows.filter((o) => o.bookingId === filter.bookingId)
    }
    if (filter.search?.trim()) {
      const needle = filter.search.trim().toLowerCase()
      rows = rows.filter(
        (o) =>
          o.userEmail.toLowerCase().includes(needle) ||
          o.bookingTitleEn.toLowerCase().includes(needle) ||
          o.bookingTitleAr.toLowerCase().includes(needle) ||
          o.stripeSessionId.toLowerCase().includes(needle),
      )
    }
    if (filter.startDate) {
      rows = rows.filter((o) => o.createdAt >= filter.startDate!)
    }
    if (filter.endDate) {
      rows = rows.filter((o) => o.createdAt <= filter.endDate!)
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    }
  }

  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(bookingOrders.status, filter.status))
    }
    if (filter.bookingId && isUuid(filter.bookingId)) {
      conditions.push(eq(bookingOrders.bookingId, filter.bookingId))
    }
    if (filter.search?.trim()) {
      const needle = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(users.email, needle),
          ilike(bookings.titleEn, needle),
          ilike(bookings.titleAr, needle),
          ilike(bookingOrders.stripeSessionId, needle),
        )!,
      )
    }
    if (filter.startDate) {
      conditions.push(
        sql`${bookingOrders.createdAt} >= ${filter.startDate.toISOString()}`,
      )
    }
    if (filter.endDate) {
      conditions.push(
        sql`${bookingOrders.createdAt} <= ${filter.endDate.toISOString()}`,
      )
    }
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookingOrders)
      .leftJoin(users, eq(users.id, bookingOrders.userId))
      .leftJoin(bookings, eq(bookings.id, bookingOrders.bookingId))
      .where(whereClause)
    const rows = await db
      .select({
        order: bookingOrders,
        userName: users.name,
        userEmail: users.email,
        bookingTitleAr: bookings.titleAr,
        bookingTitleEn: bookings.titleEn,
        bookingProductType: bookings.productType,
      })
      .from(bookingOrders)
      .leftJoin(users, eq(users.id, bookingOrders.userId))
      .leftJoin(bookings, eq(bookings.id, bookingOrders.bookingId))
      .where(whereClause)
      .orderBy(desc(bookingOrders.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    return {
      rows: rows.map((r) => ({
        ...r.order,
        userName: r.userName ?? null,
        userEmail: r.userEmail ?? '',
        bookingTitleAr: r.bookingTitleAr ?? '',
        bookingTitleEn: r.bookingTitleEn ?? '',
        bookingProductType: r.bookingProductType ?? null,
      })),
      total: Number(count) || 0,
      page,
      pageSize,
    }
  } catch (err) {
    console.error('[queries.getAdminBookingOrders]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

export async function getAdminBookingOrdersForCsv(
  filter: Omit<AdminBookingOrderFilter, 'page' | 'pageSize'>,
): Promise<BookingOrderWithMeta[]> {
  const result = await getAdminBookingOrders({
    ...filter,
    page: 1,
    pageSize: clampCsvPageSize(undefined),
  })
  return result.rows
}

export async function getAdminGiftsForCsv(
  filter: Omit<AdminGiftFilter, 'page' | 'pageSize'>,
): Promise<Gift[]> {
  const result = await getAdminGifts({
    ...filter,
    page: 1,
    pageSize: clampCsvPageSize(undefined),
  })
  return result.rows
}

/* ── Admin corporate requests ─────────────────────────────────────────── */

export type AdminCorporateRequestsFilter = {
  status?: CorporateRequestStatus | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export type AdminCorporateRequestsPage = {
  rows: CorporateRequest[]
  total: number
  page: number
  pageSize: number
}

export async function getAdminCorporateRequests(
  filter: AdminCorporateRequestsFilter,
): Promise<AdminCorporateRequestsPage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = clampPageSize(filter.pageSize)

  if (!HAS_DB) {
    let rows = placeholderCorporateRequests.slice()
    if (filter.status && filter.status !== 'all') {
      rows = rows.filter((r) => r.status === filter.status)
    }
    if (filter.search?.trim()) {
      const needle = filter.search.trim().toLowerCase()
      rows = rows.filter(
        (r) =>
          r.organization.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          r.name.toLowerCase().includes(needle),
      )
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    }
  }

  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(corporateRequests.status, filter.status))
    }
    if (filter.search?.trim()) {
      const needle = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(corporateRequests.organization, needle),
          ilike(corporateRequests.email, needle),
          ilike(corporateRequests.name, needle),
        )!,
      )
    }
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(corporateRequests)
      .where(whereClause)
    const rows = await db
      .select()
      .from(corporateRequests)
      .where(whereClause)
      .orderBy(desc(corporateRequests.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { rows, total: Number(count) || 0, page, pageSize }
  } catch (err) {
    console.error('[queries.getAdminCorporateRequests]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

export type CorporateRequestFunnel = {
  NEW: number
  CONTACTED: number
  SCHEDULED: number
  COMPLETED: number
  CANCELLED: number
}

export async function getCorporateRequestFunnel(): Promise<CorporateRequestFunnel> {
  const empty: CorporateRequestFunnel = {
    NEW: 0,
    CONTACTED: 0,
    SCHEDULED: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  }
  if (!HAS_DB) {
    for (const r of placeholderCorporateRequests) {
      empty[r.status] = (empty[r.status] ?? 0) + 1
    }
    return empty
  }
  try {
    const rows = await db
      .select({
        status: corporateRequests.status,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(corporateRequests)
      .groupBy(corporateRequests.status)
    for (const r of rows) {
      empty[r.status] = Number(r.count) || 0
    }
    return empty
  } catch (err) {
    console.error('[queries.getCorporateRequestFunnel]', err)
    return empty
  }
}

/* ── Distinct question categories (dynamic filter dropdown) ───────────── */

export async function getDistinctQuestionCategories(
  limit: number = 10,
): Promise<string[]> {
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const seen = new Map<string, number>()
    for (const q of store.userQuestions) {
      const c = (q.category ?? '').trim()
      if (!c) continue
      seen.set(c, (seen.get(c) ?? 0) + 1)
    }
    return [...seen.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([c]) => c)
  }
  if (!HAS_DB) return []
  try {
    const rows = await db
      .select({
        category: userQuestions.category,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(userQuestions)
      .where(sql`${userQuestions.category} IS NOT NULL AND ${userQuestions.category} <> ''`)
      .groupBy(userQuestions.category)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit)
    return rows
      .map((r) => (r.category ?? '').trim())
      .filter((c) => c.length > 0)
  } catch (err) {
    console.error('[queries.getDistinctQuestionCategories]', err)
    return []
  }
}

/* ── Paginated subscribers (Phase E1b breaking change) ────────────────── */

export type AdminSubscribersFilter = {
  status?: SubscriberStatus | 'all'
  search?: string
  page?: number
  pageSize?: number
}

export type AdminSubscribersPage = {
  rows: Subscriber[]
  total: number
  page: number
  pageSize: number
}

/**
 * Paginated + filtered subscribers list. Replaces the previous
 * `getSubscribers(limit)` simple helper.
 *
 * BREAKING CHANGE (E1b): the old signature `getSubscribers(limit?: number)`
 * returned `Subscriber[]`. The new signature accepts an input object and
 * returns `{ rows, total, page, pageSize }`. Callers that previously did
 * `Array.isArray(await getSubscribers())` need to read `.rows`. See
 * `scripts/verify/smoke.ts` for the smoke test that exercises this.
 */
export async function getAdminSubscribers(
  filter: AdminSubscribersFilter = {},
): Promise<AdminSubscribersPage> {
  const page = Math.max(1, filter.page ?? 1)
  const pageSize = clampPageSize(filter.pageSize)

  if (!HAS_DB) {
    let rows = placeholderSubscribers.slice()
    if (filter.status && filter.status !== 'all') {
      rows = rows.filter((s) => s.status === filter.status)
    }
    if (filter.search?.trim()) {
      const needle = filter.search.trim().toLowerCase()
      rows = rows.filter(
        (s) =>
          s.email.toLowerCase().includes(needle) ||
          (s.nameEn ?? '').toLowerCase().includes(needle) ||
          (s.nameAr ?? '').toLowerCase().includes(needle),
      )
    }
    rows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    return {
      rows: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    }
  }

  try {
    const conditions = []
    if (filter.status && filter.status !== 'all') {
      conditions.push(eq(subscribers.status, filter.status))
    }
    if (filter.search?.trim()) {
      const needle = `%${filter.search.trim()}%`
      conditions.push(
        or(
          ilike(subscribers.email, needle),
          ilike(subscribers.nameEn, needle),
          ilike(subscribers.nameAr, needle),
        )!,
      )
    }
    const whereClause = conditions.length ? and(...conditions) : undefined

    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(subscribers)
      .where(whereClause)
    const rows = await db
      .select()
      .from(subscribers)
      .where(whereClause)
      .orderBy(desc(subscribers.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)
    return { rows, total: Number(count) || 0, page, pageSize }
  } catch (err) {
    console.error('[queries.getAdminSubscribers]', err)
    return { rows: [], total: 0, page, pageSize }
  }
}

/* ── Pending-counts for admin home KPI cards ──────────────────────────── */

export async function getPendingBookingInterestCount(): Promise<number> {
  if (!HAS_DB) {
    return placeholderBookingInterest.filter((i) => i.contactedAt === null)
      .length
  }
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(bookingInterest)
      .where(sql`${bookingInterest.contactedAt} IS NULL`)
    return Number(count) || 0
  } catch (err) {
    console.error('[queries.getPendingBookingInterestCount]', err)
    return 0
  }
}

export async function getPendingGiftCountExpiringWithin(
  days: number = 7,
): Promise<number> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() + Math.max(1, Math.min(days, 365)))
  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    return store.gifts.filter(
      (g) => g.status === 'PENDING' && g.expiresAt <= cutoff,
    ).length
  }
  if (!HAS_DB) return 0
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(gifts)
      .where(
        and(
          eq(gifts.status, 'PENDING'),
          lte(gifts.expiresAt, cutoff),
        ),
      )
    return Number(count) || 0
  } catch (err) {
    console.error('[queries.getPendingGiftCountExpiringWithin]', err)
    return 0
  }
}

export async function getNewCorporateRequestCount(): Promise<number> {
  if (!HAS_DB) {
    return placeholderCorporateRequests.filter((r) => r.status === 'NEW').length
  }
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(corporateRequests)
      .where(eq(corporateRequests.status, 'NEW'))
    return Number(count) || 0
  } catch (err) {
    console.error('[queries.getNewCorporateRequestCount]', err)
    return 0
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * Phase E2 — dashboard composition helpers.
 *
 * Prior-period comparison helpers (revenue + subscribers), top tests by
 * attempts, and the per-test "most-revealing question" highlight used by
 * the redesigned /admin home (`AdminDashboardHome`). Counts are kept
 * separate (one helper per metric) rather than batched — the round-trip
 * cost is invisible at admin-page scale and parallel `Promise.all` reads
 * are simpler than a single batched RPC.
 * ──────────────────────────────────────────────────────────────────────── */

export type DailyComparison = {
  current: Array<{ date: string; revenue: number }>
  prior: Array<{ date: string; revenue: number }>
  currentTotal: number
  priorTotal: number
  /** null when priorTotal is 0 (avoids divide-by-zero). */
  deltaPercent: number | null
}

export type DailyCountComparison = {
  current: Array<{ date: string; count: number }>
  prior: Array<{ date: string; count: number }>
  currentTotal: number
  priorTotal: number
  deltaPercent: number | null
}

function buildPriorWindow(days: number): { start: Date; end: Date; isoKeys: string[] } {
  const safe = Math.max(1, Math.min(days, 365))
  const today = startOfUtcDay(new Date())
  // current window starts at today - (safe-1); prior window ends the day
  // BEFORE current starts and spans `safe` days back from there.
  const currentStart = new Date(today)
  currentStart.setUTCDate(currentStart.getUTCDate() - (safe - 1))
  const priorEnd = new Date(currentStart)
  priorEnd.setUTCDate(priorEnd.getUTCDate() - 1)
  const priorStart = new Date(priorEnd)
  priorStart.setUTCDate(priorStart.getUTCDate() - (safe - 1))
  const isoKeys: string[] = []
  for (let i = 0; i < safe; i++) {
    const d = new Date(priorStart)
    d.setUTCDate(d.getUTCDate() + i)
    isoKeys.push(isoDate(d))
  }
  return { start: priorStart, end: priorEnd, isoKeys }
}

function computeDelta(current: number, prior: number): number | null {
  if (prior <= 0) return null
  return Math.round(((current - prior) / prior) * 100)
}

/**
 * 30d revenue + the equivalent prior 30d, for the dashboard performance band.
 * Both windows are aligned to UTC day boundaries via `buildDailyWindow` /
 * `buildPriorWindow`; the prior window ends the day before the current
 * window starts. Mock/no-DB mode returns zero-filled windows.
 */
export async function getRevenueByDayWithComparison(
  days: number = 30,
): Promise<DailyComparison> {
  const current = await getRevenueByDay(days)
  const currentTotal = current.reduce((sum, p) => sum + p.revenue, 0)
  const prior = await getPriorRevenueByDay(days)
  const priorTotal = prior.reduce((sum, p) => sum + p.revenue, 0)
  return {
    current: current.map((p) => ({ date: p.date, revenue: p.revenue })),
    prior,
    currentTotal,
    priorTotal,
    deltaPercent: computeDelta(currentTotal, priorTotal),
  }
}

async function getPriorRevenueByDay(
  days: number,
): Promise<Array<{ date: string; revenue: number }>> {
  const { start, end, isoKeys } = buildPriorWindow(days)
  const empty = isoKeys.map((date) => ({ date, revenue: 0 }))
  if (!HAS_DB) return empty
  try {
    const rows = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        revenue: sql<string>`coalesce(sum(${orders.totalAmount})::text, '0')`,
      })
      .from(orders)
      .where(
        and(
          inArray(orders.status, ['PAID', 'FULFILLED']),
          sql`${orders.createdAt} >= ${start.toISOString()}`,
          sql`${orders.createdAt} < ${new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString()}`,
        ),
      )
      .groupBy(sql`to_char(${orders.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`)
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.day, Number(r.revenue))
    return isoKeys.map((date) => ({ date, revenue: map.get(date) ?? 0 }))
  } catch (err) {
    console.error('[getPriorRevenueByDay]', err)
    return empty
  }
}

/**
 * 30d new-subscriber counts + the equivalent prior 30d. Counts only ACTIVE
 * subscribers (UNSUBSCRIBED rows aren't part of the growth story).
 */
export async function getSubscribersByDayWithComparison(
  days: number = 30,
): Promise<DailyCountComparison> {
  const current = await getNewSubscribersByDay(days)
  const currentTotal = current.reduce((sum, p) => sum + p.count, 0)
  const prior = await getPriorSubscribersByDay(days)
  const priorTotal = prior.reduce((sum, p) => sum + p.count, 0)
  return {
    current,
    prior,
    currentTotal,
    priorTotal,
    deltaPercent: computeDelta(currentTotal, priorTotal),
  }
}

async function getPriorSubscribersByDay(
  days: number,
): Promise<Array<{ date: string; count: number }>> {
  const { start, end, isoKeys } = buildPriorWindow(days)
  const empty = isoKeys.map((date) => ({ date, count: 0 }))
  if (!HAS_DB) return empty
  try {
    const rows = await db
      .select({
        day: sql<string>`to_char(${subscribers.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(subscribers)
      .where(
        and(
          eq(subscribers.status, 'ACTIVE'),
          sql`${subscribers.createdAt} >= ${start.toISOString()}`,
          sql`${subscribers.createdAt} < ${new Date(end.getTime() + 24 * 60 * 60 * 1000).toISOString()}`,
        ),
      )
      .groupBy(
        sql`to_char(${subscribers.createdAt} AT TIME ZONE 'UTC', 'YYYY-MM-DD')`,
      )
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.day, Number(r.count))
    return isoKeys.map((date) => ({ date, count: map.get(date) ?? 0 }))
  } catch (err) {
    console.error('[getPriorSubscribersByDay]', err)
    return empty
  }
}

export type AudienceSnapshotCounts = {
  activeSubscribers: number
  subscribersThisWeek: number
  registeredUsers: number
  usersThisWeek: number
  booksPublished: number
  testsPublished: number
}

/**
 * Single read for the audience-snapshot tile row. Uses COUNT(*) over
 * narrow filtered predicates — never loads full rows. "This week" means
 * the prior 7 UTC days inclusive of today (consistent with the rest of
 * the dashboard's window math).
 */
export async function getAudienceSnapshotCounts(): Promise<AudienceSnapshotCounts> {
  if (!HAS_DB) {
    const placeholderTestsPublished = placeholderTests.filter((t) => t.isPublished).length
    const placeholderBooksPublished = placeholderBooks.filter(
      (b) => b.productType === 'BOOK' && b.status === 'PUBLISHED',
    ).length
    return {
      activeSubscribers: placeholderSubscribers.filter((s) => s.status === 'ACTIVE').length,
      subscribersThisWeek: 0,
      registeredUsers: placeholderUsers.length,
      usersThisWeek: 0,
      booksPublished: placeholderBooksPublished,
      testsPublished: placeholderTestsPublished,
    }
  }
  const weekAgo = new Date()
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7)
  try {
    const [
      [subsActive],
      [subsWeek],
      [usersTotal],
      [usersWeek],
      [booksPub],
      [testsPub],
    ] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(subscribers)
        .where(eq(subscribers.status, 'ACTIVE')),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(subscribers)
        .where(
          and(
            eq(subscribers.status, 'ACTIVE'),
            sql`${subscribers.createdAt} >= ${weekAgo.toISOString()}`,
          ),
        ),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(users)
        .where(sql`${users.createdAt} >= ${weekAgo.toISOString()}`),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(books)
        .where(and(eq(books.productType, 'BOOK'), eq(books.status, 'PUBLISHED'))),
      db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(tests)
        .where(eq(tests.isPublished, true)),
    ])
    return {
      activeSubscribers: Number(subsActive?.count) || 0,
      subscribersThisWeek: Number(subsWeek?.count) || 0,
      registeredUsers: Number(usersTotal?.count) || 0,
      usersThisWeek: Number(usersWeek?.count) || 0,
      booksPublished: Number(booksPub?.count) || 0,
      testsPublished: Number(testsPub?.count) || 0,
    }
  } catch (err) {
    console.error('[queries.getAudienceSnapshotCounts]', err)
    return {
      activeSubscribers: 0,
      subscribersThisWeek: 0,
      registeredUsers: 0,
      usersThisWeek: 0,
      booksPublished: 0,
      testsPublished: 0,
    }
  }
}

export type TopTestByAttempts = {
  testId: string
  slug: string
  titleEn: string
  titleAr: string
  attemptCount: number
}

/**
 * Top N tests ranked by attempt count within the trailing window. Counts
 * COMPLETED attempts only (`completedAt IS NOT NULL`) — abandoned attempts
 * shouldn't move the dashboard. Aggregated in SQL via GROUP BY + ORDER BY
 * count DESC.
 *
 * Mock mode reads attempts from the JSON-backed dev store and aggregates
 * in-memory. Returns an empty array (not an error) when no tests have
 * attempts in the window — the consumer renders an editorial empty state.
 */
export async function getTopTestsByAttemptsWithin(
  days: number = 30,
  limit: number = 3,
): Promise<TopTestByAttempts[]> {
  const cutoff = new Date()
  cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(1, Math.min(days, 365)))

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const catalog = readMockTestCatalog()
    const byId = new Map(catalog.tests.map((t) => [t.id, t]))
    const counts = new Map<string, number>()
    for (const att of store.testAttempts) {
      if (!att.completedAt || att.completedAt < cutoff) continue
      counts.set(att.testId, (counts.get(att.testId) ?? 0) + 1)
    }
    // Tie-break by createdAt DESC so equal-count tests come back in a
    // deterministic order — newer test wins. Mirrors the DB-mode
    // `ORDER BY ..., tests.createdAt DESC` clause below. We look up
    // createdAt off the captured `byId` map inside the comparator rather
    // than threading it through the return shape.
    return Array.from(counts.entries())
      .map(([testId, attemptCount]) => {
        const test = byId.get(testId)
        if (!test) return null
        return {
          testId,
          slug: test.slug,
          titleEn: test.titleEn,
          titleAr: test.titleAr,
          attemptCount,
        }
      })
      .filter((x): x is TopTestByAttempts => x !== null)
      .sort((a, b) => {
        if (b.attemptCount !== a.attemptCount) {
          return b.attemptCount - a.attemptCount
        }
        const aTime = byId.get(a.testId)?.createdAt.getTime() ?? 0
        const bTime = byId.get(b.testId)?.createdAt.getTime() ?? 0
        return bTime - aTime
      })
      .slice(0, Math.max(1, Math.min(limit, 50)))
  }

  if (!HAS_DB) return []

  try {
    const rows = await db
      .select({
        testId: testAttempts.testId,
        slug: tests.slug,
        titleEn: tests.titleEn,
        titleAr: tests.titleAr,
        attemptCount: sql<number>`COUNT(*)::int`,
      })
      .from(testAttempts)
      .innerJoin(tests, eq(tests.id, testAttempts.testId))
      .where(
        and(
          sql`${testAttempts.completedAt} IS NOT NULL`,
          sql`${testAttempts.completedAt} >= ${cutoff.toISOString()}`,
        ),
      )
      .groupBy(testAttempts.testId, tests.slug, tests.titleEn, tests.titleAr, tests.createdAt)
      // Tie-break by tests.createdAt DESC so equal-count tests come back in
      // a deterministic order across requests — newer test wins. Without
      // this Postgres returns ties in physical/MVCC order, which can drift
      // between requests.
      .orderBy(sql`COUNT(*) DESC, ${tests.createdAt} DESC`)
      .limit(Math.max(1, Math.min(limit, 50)))
    return rows.map((r) => ({
      testId: r.testId,
      slug: r.slug,
      titleEn: r.titleEn,
      titleAr: r.titleAr,
      attemptCount: Number(r.attemptCount) || 0,
    }))
  } catch (err) {
    console.error('[queries.getTopTestsByAttemptsWithin]', err)
    return []
  }
}

export type TestResearchHighlight = {
  testId: string
  testSlug: string
  testTitleEn: string
  testTitleAr: string
  totalAttempts: number
  questionPromptEn: string
  questionPromptAr: string
  topOptionLabelEn: string
  topOptionLabelAr: string
  topOptionPercentage: number
  options: Array<{
    labelEn: string
    labelAr: string
    selectionPercentage: number
    isTop: boolean
  }>
}

/**
 * For a given test, returns the data needed for the dashboard's research
 * highlight: the single most-revealing question (the one with the highest
 * maximum-option-percentage — i.e. the question where the audience
 * converged most strongly on one answer) and that question's full option
 * distribution.
 *
 * Returns null when the test doesn't exist OR has zero completed attempts.
 * Ties are broken by the question with more attempts; if still tied, the
 * earlier displayOrder wins. Composes on `getTestAnalytics` rather than
 * re-querying — three calls per page load is acceptable at admin scale.
 */
export async function getTestHighlightForResearch(
  testId: string,
): Promise<TestResearchHighlight | null> {
  const analytics = await getTestAnalytics(testId)
  if (!analytics) return null
  if (analytics.totalAttempts === 0) return null
  if (analytics.questions.length === 0) return null

  let bestIndex = -1
  let bestMaxPct = -1
  let bestSelectionTotal = -1
  for (let i = 0; i < analytics.questions.length; i++) {
    const q = analytics.questions[i]
    if (!q || q.options.length === 0) continue
    const maxPct = Math.max(...q.options.map((o) => o.selectionPercentage))
    const selectionTotal = q.options.reduce(
      (sum, o) => sum + o.selectionCount,
      0,
    )
    if (
      maxPct > bestMaxPct ||
      (maxPct === bestMaxPct && selectionTotal > bestSelectionTotal)
    ) {
      bestMaxPct = maxPct
      bestSelectionTotal = selectionTotal
      bestIndex = i
    }
  }
  if (bestIndex === -1) return null
  const best = analytics.questions[bestIndex]
  if (!best) return null

  let topOption = best.options[0]
  for (const o of best.options) {
    if (!topOption || o.selectionPercentage > topOption.selectionPercentage) {
      topOption = o
    }
  }
  if (!topOption) return null

  return {
    testId: analytics.test.id,
    testSlug: analytics.test.slug,
    testTitleEn: analytics.test.titleEn,
    testTitleAr: analytics.test.titleAr,
    totalAttempts: analytics.totalAttempts,
    questionPromptEn: best.question.promptEn,
    questionPromptAr: best.question.promptAr,
    topOptionLabelEn: topOption.option.labelEn,
    topOptionLabelAr: topOption.option.labelAr,
    topOptionPercentage: topOption.selectionPercentage,
    options: best.options.map((o) => ({
      labelEn: o.option.labelEn,
      labelAr: o.option.labelAr,
      selectionPercentage: o.selectionPercentage,
      isTop: topOption !== null && o.option.id === topOption.option.id,
    })),
  }
}

export async function recordStripeEvent(input: {
  eventId: string
  eventType: string
}): Promise<boolean> {
  if (!HAS_DB) return true
  if (!input.eventId || input.eventId.length > 200) return true
  try {
    const rows = await db
      .insert(stripeWebhookEvents)
      .values({ eventId: input.eventId, eventType: input.eventType })
      .onConflictDoNothing({ target: stripeWebhookEvents.eventId })
      .returning({ id: stripeWebhookEvents.eventId })
    // .returning returns the inserted row IF the INSERT actually happened.
    // ON CONFLICT DO NOTHING returns an empty array on conflict.
    return rows.length > 0
  } catch (err) {
    console.error('[queries.recordStripeEvent]', err)
    // On any DB error, treat as first-delivery so the webhook still
    // processes — duplicate handling is per-branch (status-gated SQL
    // guards). Idempotency-by-event-id is belt-and-suspenders.
    return true
  }
}

export type {
  Article,
  ArticleCategory,
  Book,
  Booking,
  BookingInterest,
  BookingOrder,
  BookingProductType,
  BookingState,
  ContactMessage,
  ContentBlock,
  ContentStatus,
  CorporateClient,
  CorporateProgram,
  CorporateRequest,
  CorporateRequestStatus,
  EmailQueueRow,
  EmailStatus,
  Event,
  GalleryItem,
  Gift,
  GiftItemType,
  GiftSource,
  GiftStatus,
  Interview,
  MediaProgress,
  MessageStatus,
  Order,
  OrderItem,
  OrderStatus,
  PdfBookmark,
  SessionItem,
  SessionItemType,
  SiteSetting,
  Subscriber,
  SubscriberStatus,
  Test,
  TestAttempt,
  TestAttemptAnswer,
  TestOption,
  TestQuestion,
  Tour,
  TourSuggestion,
  User,
  UserQuestion,
  UserRole,
  QuestionStatus,
} from './schema'

/** Whether the unified queries layer is talking to a real database. */
export const isDbConnected = HAS_DB

/** True iff the string parses as a Postgres uuid. Mock session IDs are not. */
export const isValidUuid = isUuid
