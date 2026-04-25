import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

/* ──────────────────────────────────────────────────────────────────────────
 * Enums
 * ──────────────────────────────────────────────────────────────────────── */

export const userRole = pgEnum('user_role', ['USER', 'ADMIN', 'CLIENT'])

export const contentStatus = pgEnum('content_status', [
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
])

export const orderStatus = pgEnum('order_status', [
  'PENDING',
  'PAID',
  'FULFILLED',
  'REFUNDED',
  'FAILED',
])

export const messageStatus = pgEnum('message_status', [
  'UNREAD',
  'READ',
  'ARCHIVED',
])

export const subscriberStatus = pgEnum('subscriber_status', [
  'ACTIVE',
  'UNSUBSCRIBED',
  'BOUNCED',
])

export const eventStatus = pgEnum('event_status', [
  'UPCOMING',
  'PAST',
  'CANCELLED',
])

export const articleCategory = pgEnum('article_category', [
  'PHILOSOPHY',
  'PSYCHOLOGY',
  'SOCIETY',
  'POLITICS',
  'CULTURE',
  'OTHER',
])

export const productType = pgEnum('product_type', ['BOOK', 'SESSION'])

/* ──────────────────────────────────────────────────────────────────────────
 * Auth (Better Auth + role)
 * ──────────────────────────────────────────────────────────────────────── */

export const users = pgTable(
  'user',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    name: text('name'),
    image: text('image'),
    role: userRole('role').notNull().default('USER'),
    passwordHash: text('password_hash'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('user_email_idx').on(t.email),
  }),
)

export const sessions = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const accounts = pgTable('account', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const verifications = pgTable('verification', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/* ──────────────────────────────────────────────────────────────────────────
 * Content
 * ──────────────────────────────────────────────────────────────────────── */

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    excerptAr: text('excerpt_ar').notNull(),
    excerptEn: text('excerpt_en').notNull(),
    contentAr: text('content_ar').notNull(),
    contentEn: text('content_en').notNull(),
    coverImage: text('cover_image'),
    category: articleCategory('category').notNull().default('OTHER'),
    status: contentStatus('status').notNull().default('DRAFT'),
    featured: boolean('featured').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('articles_slug_idx').on(t.slug),
  }),
)

export const books = pgTable(
  'books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    subtitleAr: text('subtitle_ar'),
    subtitleEn: text('subtitle_en'),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en').notNull(),
    coverImage: text('cover_image').notNull(),
    productType: productType('product_type').notNull().default('BOOK'),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('USD'),
    digitalFile: text('digital_file'),
    externalUrl: text('external_url'),
    publisher: text('publisher'),
    publicationYear: integer('publication_year'),
    status: contentStatus('status').notNull().default('DRAFT'),
    featured: boolean('featured').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('books_slug_idx').on(t.slug),
  }),
)

export const interviews = pgTable(
  'interviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    thumbnailImage: text('thumbnail_image').notNull(),
    videoUrl: text('video_url').notNull(),
    source: text('source'),
    sourceAr: text('source_ar'),
    year: integer('year'),
    status: contentStatus('status').notNull().default('DRAFT'),
    featured: boolean('featured').notNull().default(false),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('interviews_slug_idx').on(t.slug),
  }),
)

export const gallery = pgTable('gallery', {
  id: uuid('id').primaryKey().defaultRandom(),
  titleAr: text('title_ar'),
  titleEn: text('title_en'),
  image: text('image').notNull(),
  category: text('category'),
  status: contentStatus('status').notNull().default('PUBLISHED'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const events = pgTable(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en').notNull(),
    locationAr: text('location_ar'),
    locationEn: text('location_en'),
    coverImage: text('cover_image'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    registrationUrl: text('registration_url'),
    status: eventStatus('status').notNull().default('UPCOMING'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('events_slug_idx').on(t.slug),
  }),
)

/* ──────────────────────────────────────────────────────────────────────────
 * Commerce
 * ──────────────────────────────────────────────────────────────────────── */

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  status: orderStatus('status').notNull().default('PENDING'),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('USD'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  stripeSessionId: text('stripe_session_id'),
  customerEmail: text('customer_email').notNull(),
  customerName: text('customer_name'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  bookId: uuid('book_id').references(() => books.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(1),
  priceAtPurchase: numeric('price_at_purchase', { precision: 10, scale: 2 })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/* ──────────────────────────────────────────────────────────────────────────
 * Audience
 * ──────────────────────────────────────────────────────────────────────── */

export const subscribers = pgTable(
  'subscribers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    nameAr: text('name_ar'),
    nameEn: text('name_en'),
    status: subscriberStatus('status').notNull().default('ACTIVE'),
    source: text('source'),
    unsubscribeToken: text('unsubscribe_token'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    emailIdx: uniqueIndex('subscribers_email_idx').on(t.email),
    tokenIdx: uniqueIndex('subscribers_unsubscribe_token_idx').on(
      t.unsubscribeToken,
    ),
  }),
)

export const contactMessages = pgTable('contact_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: messageStatus('status').notNull().default('UNREAD'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

/* ──────────────────────────────────────────────────────────────────────────
 * Site config
 * ──────────────────────────────────────────────────────────────────────── */

export const siteSettings = pgTable(
  'site_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    value: text('value').notNull().default(sql`''`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyIdx: uniqueIndex('site_settings_key_idx').on(t.key),
  }),
)

export const contentBlocks = pgTable(
  'content_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: text('key').notNull(),
    valueAr: text('value_ar').notNull().default(sql`''`),
    valueEn: text('value_en').notNull().default(sql`''`),
    description: text('description'),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    keyIdx: uniqueIndex('content_blocks_key_idx').on(t.key),
  }),
)

/* ──────────────────────────────────────────────────────────────────────────
 * Relations
 * ──────────────────────────────────────────────────────────────────────── */

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  orders: many(orders),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const booksRelations = relations(books, ({ many }) => ({
  orderItems: many(orderItems),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
}))

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  book: one(books, { fields: [orderItems.bookId], references: [books.id] }),
}))

/* ──────────────────────────────────────────────────────────────────────────
 * Type exports — single source of truth used by queries.ts and pages.
 * ──────────────────────────────────────────────────────────────────────── */

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Session = InferSelectModel<typeof sessions>
export type Account = InferSelectModel<typeof accounts>
export type Verification = InferSelectModel<typeof verifications>

export type Article = InferSelectModel<typeof articles>
export type NewArticle = InferInsertModel<typeof articles>

export type Book = InferSelectModel<typeof books>
export type NewBook = InferInsertModel<typeof books>

export type Interview = InferSelectModel<typeof interviews>
export type NewInterview = InferInsertModel<typeof interviews>

export type GalleryItem = InferSelectModel<typeof gallery>
export type NewGalleryItem = InferInsertModel<typeof gallery>

export type Event = InferSelectModel<typeof events>
export type NewEvent = InferInsertModel<typeof events>

export type Order = InferSelectModel<typeof orders>
export type NewOrder = InferInsertModel<typeof orders>
export type OrderItem = InferSelectModel<typeof orderItems>
export type NewOrderItem = InferInsertModel<typeof orderItems>

export type Subscriber = InferSelectModel<typeof subscribers>
export type NewSubscriber = InferInsertModel<typeof subscribers>

export type ContactMessage = InferSelectModel<typeof contactMessages>
export type NewContactMessage = InferInsertModel<typeof contactMessages>

export type SiteSetting = InferSelectModel<typeof siteSettings>
export type ContentBlock = InferSelectModel<typeof contentBlocks>

export type UserRole = (typeof userRole.enumValues)[number]
export type ContentStatus = (typeof contentStatus.enumValues)[number]
export type OrderStatus = (typeof orderStatus.enumValues)[number]
export type MessageStatus = (typeof messageStatus.enumValues)[number]
export type SubscriberStatus = (typeof subscriberStatus.enumValues)[number]
export type EventStatus = (typeof eventStatus.enumValues)[number]
export type ArticleCategory = (typeof articleCategory.enumValues)[number]
export type ProductType = (typeof productType.enumValues)[number]
