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

import { and, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import { db } from '.'
import {
  articles,
  books,
  contactMessages,
  contentBlocks,
  events,
  gallery,
  interviews,
  orders,
  siteSettings,
  subscribers,
  users,
  type Article,
  type ArticleCategory,
  type Book,
  type ContactMessage,
  type ContentBlock,
  type Event,
  type GalleryItem,
  type Interview,
  type MessageStatus,
  type NewArticle,
  type NewBook,
  type NewEvent,
  type NewGalleryItem,
  type NewInterview,
  type Order,
  type SiteSetting,
  type Subscriber,
  type User,
  type UserRole,
} from './schema'
import {
  placeholderArticles,
  placeholderBooks,
  placeholderContactMessages,
  placeholderContentBlocks,
  placeholderEvents,
  placeholderGallery,
  placeholderInterviews,
  placeholderOrders,
  placeholderSettings,
  placeholderSubscribers,
  placeholderUsers,
} from '../placeholder-data'

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
    const conditions = [eq(articles.status, 'PUBLISHED')]
    if (featured !== undefined) conditions.push(eq(articles.featured, featured))
    if (category) conditions.push(eq(articles.category, category))
    return db
      .select()
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt), articles.orderIndex)
      .limit(limit ?? 100)
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
    const [row] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)
    return row ?? null
  }
  return placeholderArticles.find((a) => a.slug === slug) ?? null
}

export async function getRelatedArticles(slug: string, count = 3): Promise<Article[]> {
  if (HAS_DB) {
    return db
      .select()
      .from(articles)
      .where(and(ne(articles.slug, slug), eq(articles.status, 'PUBLISHED')))
      .orderBy(desc(articles.publishedAt))
      .limit(count)
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
    const conditions = [eq(books.status, 'PUBLISHED')]
    if (featured !== undefined) conditions.push(eq(books.featured, featured))
    return db
      .select()
      .from(books)
      .where(and(...conditions))
      .orderBy(books.orderIndex)
      .limit(limit ?? 100)
  }
  let rows = placeholderBooks.filter((b) => b.status === 'PUBLISHED').slice().sort(byOrder)
  if (featured !== undefined) rows = rows.filter((b) => b.featured === featured)
  return limit ? rows.slice(0, limit) : rows
}

export async function getBookBySlug(slug: string): Promise<Book | null> {
  if (HAS_DB) {
    const [row] = await db.select().from(books).where(eq(books.slug, slug)).limit(1)
    return row ?? null
  }
  return placeholderBooks.find((b) => b.slug === slug) ?? null
}

export async function getBookById(id: string): Promise<Book | null> {
  if (HAS_DB) {
    if (!isUuid(id)) return null
    const [row] = await db.select().from(books).where(eq(books.id, id)).limit(1)
    return row ?? null
  }
  return placeholderBooks.find((b) => b.id === id) ?? null
}

export async function getRelatedBooks(slug: string, count = 3): Promise<Book[]> {
  if (HAS_DB) {
    return db
      .select()
      .from(books)
      .where(and(ne(books.slug, slug), eq(books.status, 'PUBLISHED')))
      .orderBy(books.orderIndex)
      .limit(count)
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
    const conditions = [eq(interviews.status, 'PUBLISHED')]
    if (featured !== undefined) conditions.push(eq(interviews.featured, featured))
    return db
      .select()
      .from(interviews)
      .where(and(...conditions))
      .orderBy(desc(interviews.year), interviews.orderIndex)
      .limit(limit ?? 100)
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
    const [row] = await db.select().from(interviews).where(eq(interviews.slug, slug)).limit(1)
    return row ?? null
  }
  return placeholderInterviews.find((i) => i.slug === slug) ?? null
}

export async function getRelatedInterviews(slug: string, count = 3): Promise<Interview[]> {
  if (HAS_DB) {
    return db
      .select()
      .from(interviews)
      .where(and(ne(interviews.slug, slug), eq(interviews.status, 'PUBLISHED')))
      .orderBy(desc(interviews.year), interviews.orderIndex)
      .limit(count)
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
    const conditions = [eq(gallery.status, 'PUBLISHED')]
    if (category) conditions.push(eq(gallery.category, category))
    return db
      .select()
      .from(gallery)
      .where(and(...conditions))
      .orderBy(gallery.orderIndex)
      .limit(limit ?? 100)
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
    const rows = await db
      .selectDistinct({ category: gallery.category })
      .from(gallery)
      .where(eq(gallery.status, 'PUBLISHED'))
    return rows
      .map((r) => r.category)
      .filter((c): c is string => Boolean(c))
      .sort()
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
    return db
      .select()
      .from(events)
      .where(eq(events.status, 'UPCOMING'))
      .orderBy(events.startDate)
      .limit(limit ?? 100)
  }
  const rows = placeholderEvents
    .filter((e) => e.status === 'UPCOMING')
    .slice()
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  return limit ? rows.slice(0, limit) : rows
}

export async function getPastEvents(limit?: number): Promise<Event[]> {
  if (HAS_DB) {
    return db
      .select()
      .from(events)
      .where(eq(events.status, 'PAST'))
      .orderBy(desc(events.startDate))
      .limit(limit ?? 100)
  }
  const rows = placeholderEvents
    .filter((e) => e.status === 'PAST')
    .slice()
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
  return limit ? rows.slice(0, limit) : rows
}

export async function getEventBySlug(slug: string): Promise<Event | null> {
  if (HAS_DB) {
    const [row] = await db.select().from(events).where(eq(events.slug, slug)).limit(1)
    return row ?? null
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

/* ──────────────────────────────────────────────────────────────────────────
 * Re-export schema types so pages don't import from `db/schema` directly.
 * ──────────────────────────────────────────────────────────────────────── */

export type {
  Article,
  ArticleCategory,
  Book,
  ContactMessage,
  ContentBlock,
  ContentStatus,
  Event,
  GalleryItem,
  Interview,
  MessageStatus,
  Order,
  OrderItem,
  OrderStatus,
  SiteSetting,
  Subscriber,
  SubscriberStatus,
  User,
  UserRole,
} from './schema'

/** Whether the unified queries layer is talking to a real database. */
export const isDbConnected = HAS_DB

/** True iff the string parses as a Postgres uuid. Mock session IDs are not. */
export const isValidUuid = isUuid
