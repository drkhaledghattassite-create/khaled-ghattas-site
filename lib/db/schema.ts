import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
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

export const sessionItemType = pgEnum('session_item_type', [
  'VIDEO',
  'AUDIO',
  'PDF',
])

export const corporateRequestStatus = pgEnum('corporate_request_status', [
  'NEW',
  'CONTACTED',
  'SCHEDULED',
  'COMPLETED',
  'CANCELLED',
])

// Booking domain enums. Scoped to the bookings table — we deliberately do NOT
// extend the existing productType (which is on books), since bookings have a
// fundamentally different lifecycle (capacity, cohort dates, holds).
export const bookingProductType = pgEnum('booking_product_type', [
  'RECONSIDER_COURSE',
  'ONLINE_SESSION',
])

export const bookingState = pgEnum('booking_state', [
  'OPEN',
  'CLOSED',
  'SOLD_OUT',
])

// Phase B1 — "Ask Dr. Khaled" Q&A queue. PENDING = submitted, awaiting review.
// ANSWERED = Dr. Khaled (or team) addressed the question (optionally with an
// answerReference URL/note pointing at the public reply). ARCHIVED = removed
// from the active queue without deletion (preserves audit trail).
export const questionStatus = pgEnum('question_status', [
  'PENDING',
  'ANSWERED',
  'ARCHIVED',
])

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
    bio: text('bio'),
    preferences: text('preferences'),
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
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
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
  updatedAt: timestamp('updated_at', { withTimezone: true })
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
    valueJson: jsonb('value_json'),
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
 * Content delivery (Phase 1 — digital content access)
 *
 * Reading + media progress and bookmarks live alongside session_items, the
 * collection of video/audio/PDF assets that hang off a books row whose
 * productType is 'SESSION'. We deliberately kept session items in a single
 * polymorphic table (itemType column) instead of three sibling tables so
 * cross-item navigation in Phase 5 is a single ORDER BY sort_order query.
 * ──────────────────────────────────────────────────────────────────────── */

export const readingProgress = pgTable(
  'reading_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    lastPage: integer('last_page').notNull().default(1),
    // totalPages is added in migration 0005. The library card renders
    // (lastPage / totalPages) as the progress percentage; leaving the
    // default 0 produces a 0% bar (the same UX as before this column
    // existed) until at least one save with a known total lands.
    totalPages: integer('total_pages').notNull().default(0),
    lastReadAt: timestamp('last_read_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index('reading_progress_user_idx').on(t.userId),
    bookIdx: index('reading_progress_book_idx').on(t.bookId),
    userBookIdx: uniqueIndex('reading_progress_user_book_idx').on(
      t.userId,
      t.bookId,
    ),
  }),
)

export const pdfBookmarks = pgTable(
  'pdf_bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    pageNumber: integer('page_number').notNull(),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index('pdf_bookmarks_user_idx').on(t.userId),
    bookIdx: index('pdf_bookmarks_book_idx').on(t.bookId),
  }),
)

// Single table for video AND audio progress — mediaType lives on the parent
// session_items row, so queries can join through to discover modality. Avoids
// duplicating identical schema (lastPosition, completedAt) across two tables.
export const mediaProgress = pgTable(
  'media_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionItemId: uuid('session_item_id')
      .notNull()
      .references(() => sessionItems.id, { onDelete: 'cascade' }),
    lastPositionSeconds: integer('last_position_seconds').notNull().default(0),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    lastWatchedAt: timestamp('last_watched_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    userIdx: index('media_progress_user_idx').on(t.userId),
    itemIdx: index('media_progress_item_idx').on(t.sessionItemId),
    userItemIdx: uniqueIndex('media_progress_user_item_idx').on(
      t.userId,
      t.sessionItemId,
    ),
  }),
)

// session_items.sessionId references books.id (productType='SESSION'). We do
// not enforce productType at the FK layer — that's an application invariant,
// not a schema one. The column is named sessionId for clarity at the call
// site even though it points at books.
export const sessionItems = pgTable(
  'session_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    itemType: sessionItemType('item_type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    storageKey: text('storage_key').notNull(),
    durationSeconds: integer('duration_seconds'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    sessionIdx: index('session_items_session_idx').on(t.sessionId),
    sessionSortIdx: index('session_items_session_sort_idx').on(
      t.sessionId,
      t.sortOrder,
    ),
  }),
)

/* ──────────────────────────────────────────────────────────────────────────
 * Corporate programs
 *
 * Three tables behind /corporate:
 *   - corporate_programs: the catalog of offerings (e.g. "Leadership Essence",
 *     "Mastering the Art of Influence"). Bilingual.
 *   - corporate_clients: trust-strip logos (Pepsi, Zain, Tamer, etc.).
 *   - corporate_requests: form submissions from organizations interested in
 *     a program. Distinct from contact_messages because the workflow fields
 *     (organization, programId, attendee count, status enum) don't fit there.
 * ──────────────────────────────────────────────────────────────────────── */

export const corporatePrograms = pgTable(
  'corporate_programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en').notNull(),
    durationAr: text('duration_ar'),
    durationEn: text('duration_en'),
    audienceAr: text('audience_ar'),
    audienceEn: text('audience_en'),
    coverImage: text('cover_image'),
    status: contentStatus('status').notNull().default('PUBLISHED'),
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
    slugIdx: uniqueIndex('corporate_programs_slug_idx').on(t.slug),
  }),
)

export const corporateClients = pgTable('corporate_clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  nameAr: text('name_ar'),
  logoUrl: text('logo_url').notNull(),
  websiteUrl: text('website_url'),
  status: contentStatus('status').notNull().default('PUBLISHED'),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const corporateRequests = pgTable(
  'corporate_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    phone: text('phone'),
    organization: text('organization').notNull(),
    position: text('position'),
    // Optional FK so a deleted program doesn't take its history with it.
    programId: uuid('program_id').references(() => corporatePrograms.id, {
      onDelete: 'set null',
    }),
    preferredDate: text('preferred_date'),
    attendeeCount: integer('attendee_count'),
    message: text('message'),
    status: corporateRequestStatus('status').notNull().default('NEW'),
    adminNotes: text('admin_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusIdx: index('corporate_requests_status_idx').on(t.status),
    programIdx: index('corporate_requests_program_idx').on(t.programId),
  }),
)

/* ──────────────────────────────────────────────────────────────────────────
 * Booking — Services for Individuals
 *
 * Six tables behind /booking:
 *   - tours: external in-person events (no internal Stripe path; the booking
 *     URL points at the host's site).
 *   - tour_suggestions: form submissions when a user wants a city we don't
 *     visit yet.
 *   - bookings: umbrella for the Reconsider course (productType =
 *     RECONSIDER_COURSE) and the 8 Online Sessions (ONLINE_SESSION). Each row
 *     has its own capacity, state, and price. Reconsider is one row; sessions
 *     are eight rows.
 *   - booking_interest: waitlist for closed/sold-out bookings. Idempotent
 *     (unique on user_id + booking_id).
 *   - bookings_pending_holds: 15-min TTL seat holds bridging "user clicked
 *     Reserve" and "Stripe webhook confirmed payment". Solves the capacity
 *     race — see createBookingCheckoutAction in app/[locale]/(public)/booking/
 *     actions.ts for the FOR UPDATE flow that protects against overbooking.
 *   - booking_orders: persistent Stripe purchase records for bookings.
 *     Separate from `orders` because the lifecycle differs (cohort dates,
 *     capacity, no library access — just a confirmation email + admin
 *     audit trail).
 * ──────────────────────────────────────────────────────────────────────── */

export const tours = pgTable(
  'tours',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    cityAr: text('city_ar').notNull(),
    cityEn: text('city_en').notNull(),
    countryAr: text('country_ar').notNull(),
    countryEn: text('country_en').notNull(),
    // Region label shown as a chip on the card ("MENA", "GCC", "EUROPE").
    // Bilingual so admin can localise (ar might prefer "الخليج" over "GCC").
    regionAr: text('region_ar'),
    regionEn: text('region_en'),
    date: timestamp('date', { withTimezone: true }).notNull(),
    venueAr: text('venue_ar'),
    venueEn: text('venue_en'),
    descriptionAr: text('description_ar'),
    descriptionEn: text('description_en'),
    // null = "Booking opens soon" (host site not ready yet).
    externalBookingUrl: text('external_booking_url'),
    coverImage: text('cover_image'),
    // Only meaningful for past tours; design surfaces this as "240 attended".
    attendedCount: integer('attended_count'),
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('tours_slug_idx').on(t.slug),
    activeDateIdx: index('tours_active_date_idx').on(t.isActive, t.date),
  }),
)

export const tourSuggestions = pgTable(
  'tour_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    suggestedCity: text('suggested_city').notNull(),
    suggestedCountry: text('suggested_country').notNull(),
    additionalNotes: text('additional_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Admin marks this when a suggestion has been triaged (added to the
    // tour roadmap, intentionally skipped, or merged with another). Nullable
    // because the default is "untouched". Ships in migration 0008.
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('tour_suggestions_user_idx').on(t.userId),
  }),
)

export const bookings = pgTable(
  'bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    productType: bookingProductType('product_type').notNull(),
    titleAr: text('title_ar').notNull(),
    titleEn: text('title_en').notNull(),
    descriptionAr: text('description_ar').notNull(),
    descriptionEn: text('description_en').notNull(),
    coverImage: text('cover_image'),
    // Price in CENTS — integer. Existing `books.price` is numeric(10,2) for
    // legacy reasons; bookings use the cleaner integer-cents convention so
    // amount math (Stripe expects cents anyway) is round-trip exact.
    priceUsd: integer('price_usd').notNull(),
    currency: text('currency').notNull().default('USD'),
    nextCohortDate: timestamp('next_cohort_date', { withTimezone: true }),
    // Human-readable cohort label, e.g. "March 15 — May 10, 2026". Bilingual
    // because Arabic uses different month names + Arabic-Indic numerals.
    cohortLabelAr: text('cohort_label_ar'),
    cohortLabelEn: text('cohort_label_en'),
    durationMinutes: integer('duration_minutes'),
    formatAr: text('format_ar'),
    formatEn: text('format_en'),
    maxCapacity: integer('max_capacity').notNull(),
    bookedCount: integer('booked_count').notNull().default(0),
    bookingState: bookingState('booking_state').notNull().default('CLOSED'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    slugIdx: uniqueIndex('bookings_slug_idx').on(t.slug),
    activeIdx: index('bookings_active_idx').on(
      t.productType,
      t.bookingState,
      t.displayOrder,
    ),
  }),
)

export const bookingInterest = pgTable(
  'booking_interest',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    additionalNotes: text('additional_notes'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    contactedAt: timestamp('contacted_at', { withTimezone: true }),
  },
  (t) => ({
    // Unique → enforces idempotency at the DB level. The action does
    // onConflictDoUpdate so re-submissions land cleanly.
    userBookingIdx: uniqueIndex('booking_interest_user_booking_idx').on(
      t.userId,
      t.bookingId,
    ),
    createdIdx: index('booking_interest_created_idx').on(t.createdAt),
  }),
)

// Holds bridge "user clicked Reserve" → "Stripe webhook confirmed payment".
// 15-minute TTL. Effective seat math:
//   remaining = max_capacity - booked_count - COUNT(holds WHERE expires_at > NOW())
// The action's transaction does SELECT FOR UPDATE on the booking row + count
// of active holds; if booked + holds < cap, INSERT a hold. Webhook deletes the
// hold on completion / expiry / payment failure. Lazy cleanup runs at the
// top of the transaction and inside read helpers.
export const bookingsPendingHolds = pgTable(
  'bookings_pending_holds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    // Set immediately after the Stripe Checkout Session is created, so the
    // webhook can DELETE WHERE stripe_session_id = $1.
    stripeSessionId: text('stripe_session_id'),
    expiresAt: timestamp('expires_at', { withTimezone: true })
      .notNull()
      .default(sql`(now() + interval '15 minutes')`),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    bookingExpiresIdx: index('bookings_pending_holds_booking_expires_idx').on(
      t.bookingId,
      t.expiresAt,
    ),
    userBookingIdx: index('bookings_pending_holds_user_booking_idx').on(
      t.userId,
      t.bookingId,
    ),
    stripeSessionIdx: index('bookings_pending_holds_stripe_session_idx').on(
      t.stripeSessionId,
    ),
  }),
)

export const bookingOrders = pgTable(
  'booking_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // Nullable + ON DELETE SET NULL — matches the existing `orders.userId`
    // pattern. Preserves order history when a user deletes their account.
    // (NOT NULL + SET NULL would be a Postgres invariant violation.)
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    bookingId: uuid('booking_id')
      .notNull()
      .references(() => bookings.id, { onDelete: 'restrict' }),
    stripeSessionId: text('stripe_session_id').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    // Cents.
    amountPaid: integer('amount_paid').notNull(),
    currency: text('currency').notNull().default('USD'),
    // Reuses the project-canonical `orderStatus` lifecycle.
    status: orderStatus('status').notNull().default('PENDING'),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    stripeSessionIdx: uniqueIndex('booking_orders_stripe_session_idx').on(
      t.stripeSessionId,
    ),
    userBookingIdx: index('booking_orders_user_booking_idx').on(
      t.userId,
      t.bookingId,
    ),
  }),
)

/* ──────────────────────────────────────────────────────────────────────────
 * Phase B1 — "Ask Dr. Khaled" Q&A
 *
 * Logged-in users submit a question for Dr. Khaled to answer publicly via his
 * social channels (Instagram videos, stories, …). Submissions land in a
 * PENDING queue Dr. Khaled (or his team) reviews offline. Answering itself
 * happens off-platform; the site is the intake channel.
 *
 * `category` is a free-text column (not a pgEnum) so the admin can adjust the
 * vocabulary without a migration. The application enforces the allowed values
 * via a zod tuple in `lib/validators/user-question.ts`.
 *
 * `isAnonymous` is a USER PREFERENCE expressed at submit time — not a hard
 * privacy guarantee. Admin still sees the user's identity in the queue (Phase
 * B2). Dr. Khaled chooses whether to honor the anonymity when answering
 * publicly. The form helper text spells this out.
 * ──────────────────────────────────────────────────────────────────────── */

export const userQuestions = pgTable(
  'user_questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    subject: text('subject').notNull(),
    body: text('body').notNull(),
    // Free-text — vocabulary enforced at the validator layer, NOT in DB.
    category: text('category'),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    status: questionStatus('status').notNull().default('PENDING'),
    // Admin field. URL pointing at the public reply (Instagram reel, story,
    // …) OR a free-text note. The card UI auto-detects URL vs note.
    answerReference: text('answer_reference'),
    answeredAt: timestamp('answered_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    // User-history page — order by most-recent first.
    userIdx: index('user_questions_user_idx').on(t.userId, t.createdAt.desc()),
    // Admin queue (Phase B2).
    statusIdx: index('user_questions_status_idx').on(
      t.status,
      t.createdAt.desc(),
    ),
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

export const sessionItemsRelations = relations(sessionItems, ({ one, many }) => ({
  session: one(books, {
    fields: [sessionItems.sessionId],
    references: [books.id],
  }),
  mediaProgress: many(mediaProgress),
}))

export const readingProgressRelations = relations(readingProgress, ({ one }) => ({
  user: one(users, { fields: [readingProgress.userId], references: [users.id] }),
  book: one(books, { fields: [readingProgress.bookId], references: [books.id] }),
}))

export const pdfBookmarksRelations = relations(pdfBookmarks, ({ one }) => ({
  user: one(users, { fields: [pdfBookmarks.userId], references: [users.id] }),
  book: one(books, { fields: [pdfBookmarks.bookId], references: [books.id] }),
}))

export const mediaProgressRelations = relations(mediaProgress, ({ one }) => ({
  user: one(users, { fields: [mediaProgress.userId], references: [users.id] }),
  item: one(sessionItems, {
    fields: [mediaProgress.sessionItemId],
    references: [sessionItems.id],
  }),
}))

export const corporateProgramsRelations = relations(
  corporatePrograms,
  ({ many }) => ({
    requests: many(corporateRequests),
  }),
)

export const corporateRequestsRelations = relations(
  corporateRequests,
  ({ one }) => ({
    program: one(corporatePrograms, {
      fields: [corporateRequests.programId],
      references: [corporatePrograms.id],
    }),
  }),
)

export const tourSuggestionsRelations = relations(
  tourSuggestions,
  ({ one }) => ({
    user: one(users, {
      fields: [tourSuggestions.userId],
      references: [users.id],
    }),
  }),
)

export const userQuestionsRelations = relations(userQuestions, ({ one }) => ({
  user: one(users, {
    fields: [userQuestions.userId],
    references: [users.id],
  }),
}))

export const bookingsRelations = relations(bookings, ({ many }) => ({
  interest: many(bookingInterest),
  holds: many(bookingsPendingHolds),
  orders: many(bookingOrders),
}))

export const bookingInterestRelations = relations(
  bookingInterest,
  ({ one }) => ({
    user: one(users, {
      fields: [bookingInterest.userId],
      references: [users.id],
    }),
    booking: one(bookings, {
      fields: [bookingInterest.bookingId],
      references: [bookings.id],
    }),
  }),
)

export const bookingsPendingHoldsRelations = relations(
  bookingsPendingHolds,
  ({ one }) => ({
    user: one(users, {
      fields: [bookingsPendingHolds.userId],
      references: [users.id],
    }),
    booking: one(bookings, {
      fields: [bookingsPendingHolds.bookingId],
      references: [bookings.id],
    }),
  }),
)

export const bookingOrdersRelations = relations(bookingOrders, ({ one }) => ({
  user: one(users, {
    fields: [bookingOrders.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [bookingOrders.bookingId],
    references: [bookings.id],
  }),
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

export type ReadingProgress = InferSelectModel<typeof readingProgress>
export type NewReadingProgress = InferInsertModel<typeof readingProgress>

export type PdfBookmark = InferSelectModel<typeof pdfBookmarks>
export type NewPdfBookmark = InferInsertModel<typeof pdfBookmarks>

export type MediaProgress = InferSelectModel<typeof mediaProgress>
export type NewMediaProgress = InferInsertModel<typeof mediaProgress>

export type SessionItem = InferSelectModel<typeof sessionItems>
export type NewSessionItem = InferInsertModel<typeof sessionItems>

export type CorporateProgram = InferSelectModel<typeof corporatePrograms>
export type NewCorporateProgram = InferInsertModel<typeof corporatePrograms>

export type CorporateClient = InferSelectModel<typeof corporateClients>
export type NewCorporateClient = InferInsertModel<typeof corporateClients>

export type CorporateRequest = InferSelectModel<typeof corporateRequests>
export type NewCorporateRequest = InferInsertModel<typeof corporateRequests>

export type UserRole = (typeof userRole.enumValues)[number]
export type ContentStatus = (typeof contentStatus.enumValues)[number]
export type OrderStatus = (typeof orderStatus.enumValues)[number]
export type MessageStatus = (typeof messageStatus.enumValues)[number]
export type SubscriberStatus = (typeof subscriberStatus.enumValues)[number]
export type EventStatus = (typeof eventStatus.enumValues)[number]
export type ArticleCategory = (typeof articleCategory.enumValues)[number]
export type ProductType = (typeof productType.enumValues)[number]
export type SessionItemType = (typeof sessionItemType.enumValues)[number]
export type CorporateRequestStatus =
  (typeof corporateRequestStatus.enumValues)[number]

export type Tour = InferSelectModel<typeof tours>
export type NewTour = InferInsertModel<typeof tours>

export type TourSuggestion = InferSelectModel<typeof tourSuggestions>
export type NewTourSuggestion = InferInsertModel<typeof tourSuggestions>

export type Booking = InferSelectModel<typeof bookings>
export type NewBooking = InferInsertModel<typeof bookings>

export type BookingInterest = InferSelectModel<typeof bookingInterest>
export type NewBookingInterest = InferInsertModel<typeof bookingInterest>

export type BookingsPendingHold = InferSelectModel<typeof bookingsPendingHolds>
export type NewBookingsPendingHold = InferInsertModel<
  typeof bookingsPendingHolds
>

export type BookingOrder = InferSelectModel<typeof bookingOrders>
export type NewBookingOrder = InferInsertModel<typeof bookingOrders>

export type BookingProductType = (typeof bookingProductType.enumValues)[number]
export type BookingState = (typeof bookingState.enumValues)[number]

export type UserQuestion = InferSelectModel<typeof userQuestions>
export type NewUserQuestion = InferInsertModel<typeof userQuestions>
export type QuestionStatus = (typeof questionStatus.enumValues)[number]
