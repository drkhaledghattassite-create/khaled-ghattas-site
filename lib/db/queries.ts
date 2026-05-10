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
  events,
  gallery,
  interviews,
  mediaProgress,
  orderItems,
  orders,
  pdfBookmarks,
  readingProgress,
  sessionItems,
  siteSettings,
  subscribers,
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
  type Event,
  type GalleryItem,
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
  type PdfBookmark,
  type SessionItem,
  type SiteSetting,
  type Subscriber,
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

export type GetBooksOptions = { limit?: number; featured?: boolean }

export async function getBooks(options: GetBooksOptions = {}): Promise<Book[]> {
  const { limit, featured } = options
  if (HAS_DB) {
    try {
      const conditions = [eq(books.status, 'PUBLISHED')]
      if (featured !== undefined) conditions.push(eq(books.featured, featured))
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

  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeSessionId, input.stripeSessionId))
    .limit(1)
  if (existing) return existing

  const [row] = await db
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
    .returning()
  if (!row) return null

  const validItems = input.items.filter((it) => isUuid(it.bookId))
  if (validItems.length === 0) return row

  try {
    await db.insert(orderItems).values(
      validItems.map((it) => ({
        orderId: row.id,
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
  const [row] = await db
    .insert(subscribers)
    .values({
      email,
      nameEn: name ?? null,
      source: source ?? null,
      unsubscribeToken: token,
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
        .where(eq(bookingOrders.stripeSessionId, input.stripeSessionId))
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
  page?: number
  pageSize?: number
}): Promise<{
  rows: AdminQuestion[]
  total: number
  page: number
  pageSize: number
}> {
  const status = input.status ?? 'all'
  const page = Math.max(1, input.page ?? 1)
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50))
  const offset = (page - 1) * pageSize

  if (MOCK_AUTH_ENABLED) {
    const store = readStore()
    const all = store.userQuestions
      .filter((q) => status === 'all' || q.status === status)
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
    const where =
      status === 'all'
        ? undefined
        : eq(userQuestions.status, status)
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
 *                          answerReference=input.answerReference
 *   - status='ARCHIVED'  → archivedAt=now, answeredAt=null,
 *                          answerReference=null
 *   - status='PENDING'   → answeredAt=null, archivedAt=null,
 *                          answerReference=null  (revert state)
 * `updatedAt` is always set to now.
 *
 * Returns the updated row, or null if the row was missing or the write
 * failed. Caller (`updateQuestionStatusAction`) maps null to a `not_found`
 * or `database_error` response shape.
 */
export async function updateQuestionStatus(input: {
  id: string
  status: QuestionStatus
  answerReference: string | null
}): Promise<UserQuestion | null> {
  const now = new Date()
  const patch = ((): Partial<UserQuestion> => {
    if (input.status === 'ANSWERED') {
      return {
        status: 'ANSWERED',
        answeredAt: now,
        archivedAt: null,
        answerReference: input.answerReference,
        updatedAt: now,
      }
    }
    if (input.status === 'ARCHIVED') {
      return {
        status: 'ARCHIVED',
        archivedAt: now,
        answeredAt: null,
        answerReference: null,
        updatedAt: now,
      }
    }
    return {
      status: 'PENDING',
      answeredAt: null,
      archivedAt: null,
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
  Event,
  GalleryItem,
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
