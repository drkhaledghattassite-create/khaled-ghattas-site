/**
 * Mock-auth dev-only persistence for reader state.
 *
 * SECURITY / SCOPE: This module is for the mock-auth dev workflow ONLY. Its
 * only callers are inside `lib/db/queries.ts`, gated by `MOCK_AUTH_ENABLED`,
 * which is itself hard-disabled when `NODE_ENV === 'production'` (see
 * `lib/auth/mock.ts`). Production never executes any of the disk I/O below.
 *
 * Why this file exists:
 * The original mock implementation kept reading-progress + bookmarks in two
 * module-level `Map`s. Those maps are wiped on every dev-server restart and
 * — more subtly — Next.js HMR can produce multiple module instances of
 * `queries.ts` simultaneously. Each instance had its own `cached` Map; the
 * one a save mutated was not the one a subsequent read consulted, so writes
 * landed on disk but reads returned stale in-memory data.
 *
 * Fix: there is NO in-memory cache. Every `readStore()` reads from disk;
 * every `writeStore()` writes to disk synchronously. The file is the single
 * source of truth, immune to module-instance proliferation. The store is a
 * few hundred bytes — disk I/O cost is negligible for dev.
 *
 * Persistence target: `.next/cache/reader-mock-store.json`. `.next/` is
 * already gitignored. We never write outside it.
 *
 * Failure model: read errors (corrupt JSON, missing dir, EPERM) log a single
 * warning and return an empty store so the dev experience never crashes.
 * Write errors are logged and swallowed — the next save will retry.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type {
  BookingInterest,
  PdfBookmark,
  SessionItem,
  TourSuggestion,
  UserQuestion,
} from './schema'

export type MockProgressEntry = {
  lastPage: number
  totalPages: number
  lastReadAt: Date
}

export type MockMediaProgressEntry = {
  lastPositionSeconds: number
  completedAt: Date | null
  lastWatchedAt: Date
}

export type MockStore = {
  progress: Map<string, MockProgressEntry>
  bookmarks: Map<string, PdfBookmark[]>
  // Keyed by sessionId (a books.id with productType='SESSION'). Mock-mode
  // store for the admin session-content editor; mirrors the schema's
  // session_items table closely enough that swapping in the real DB is a
  // one-branch flip in the query helpers.
  sessionItems: Map<string, SessionItem[]>
  // Phase 4 — keyed by `${userId}:${sessionItemId}`. Mock-mode store for
  // session-viewer playback progress. Mirrors media_progress table shape:
  // lastPositionSeconds + completedAt + lastWatchedAt. Same disk file as
  // reading_progress + bookmarks + sessionItems so a single readStore call
  // hydrates everything the dev workflow needs.
  mediaProgress: Map<string, MockMediaProgressEntry>
  // Booking domain — Phase A1.
  // bookingInterest: keyed by `${userId}:${bookingId}` so the upsert pattern
  //   from createBookingInterestAction maps cleanly onto Map.set.
  // tourSuggestions: append-only list (no idempotency / unique constraint).
  // We deliberately do NOT mock the Stripe-driven holds/orders flow — when
  // STRIPE_SECRET_KEY is missing in dev, the action returns
  // 'stripe_unconfigured' and never creates a hold; that matches the
  // existing /api/checkout pattern.
  bookingInterest: Map<string, BookingInterest>
  tourSuggestions: TourSuggestion[]
  // Phase B1 — append-only list of "Ask Dr. Khaled" questions submitted in
  // mock-auth dev. Filtered by userId at read time. Status updates land here
  // too (PENDING → ANSWERED / ARCHIVED) once Phase B2 admin actions ship.
  userQuestions: UserQuestion[]
}

// JSON shape on disk — Maps serialised as [key, value][].
type SerializedProgressEntry = {
  lastPage: number
  totalPages: number
  lastReadAt: string
}
type SerializedBookmark = Omit<PdfBookmark, 'createdAt'> & {
  createdAt: string
}
type SerializedSessionItem = Omit<SessionItem, 'createdAt'> & {
  createdAt: string
}
type SerializedMediaProgressEntry = {
  lastPositionSeconds: number
  completedAt: string | null
  lastWatchedAt: string
}
type SerializedBookingInterest = Omit<
  BookingInterest,
  'createdAt' | 'contactedAt'
> & {
  createdAt: string
  contactedAt: string | null
}
type SerializedTourSuggestion = Omit<
  TourSuggestion,
  'createdAt' | 'reviewedAt'
> & {
  createdAt: string
  reviewedAt: string | null
}
type SerializedUserQuestion = Omit<
  UserQuestion,
  'createdAt' | 'updatedAt' | 'answeredAt' | 'archivedAt'
> & {
  createdAt: string
  updatedAt: string
  answeredAt: string | null
  archivedAt: string | null
}
type SerializedStore = {
  progress: Array<[string, SerializedProgressEntry]>
  bookmarks: Array<[string, SerializedBookmark[]]>
  sessionItems?: Array<[string, SerializedSessionItem[]]>
  mediaProgress?: Array<[string, SerializedMediaProgressEntry]>
  bookingInterest?: Array<[string, SerializedBookingInterest]>
  tourSuggestions?: SerializedTourSuggestion[]
  userQuestions?: SerializedUserQuestion[]
}

const STORE_FILE = join(
  process.cwd(),
  '.next',
  'cache',
  'reader-mock-store.json',
)

function emptyStore(): MockStore {
  return {
    progress: new Map(),
    bookmarks: new Map(),
    sessionItems: new Map(),
    mediaProgress: new Map(),
    bookingInterest: new Map(),
    tourSuggestions: [],
    userQuestions: [],
  }
}

/**
 * Read the current mock store from disk. Always reads fresh — there is no
 * in-memory cache. This is what makes the store immune to multi-module-
 * instance HMR weirdness: no matter which module instance is calling, every
 * read pulls the latest committed state.
 */
export function readStore(): MockStore {
  if (!existsSync(STORE_FILE)) return emptyStore()
  try {
    const raw = readFileSync(STORE_FILE, 'utf8')
    if (!raw.trim()) return emptyStore()
    const parsed = JSON.parse(raw) as SerializedStore
    const progress = new Map<string, MockProgressEntry>()
    for (const [key, entry] of parsed.progress ?? []) {
      const lastReadAt = new Date(entry.lastReadAt)
      if (Number.isNaN(lastReadAt.getTime())) continue
      progress.set(key, {
        lastPage: Number(entry.lastPage) || 1,
        totalPages: Number(entry.totalPages) || 0,
        lastReadAt,
      })
    }
    const bookmarks = new Map<string, PdfBookmark[]>()
    for (const [key, list] of parsed.bookmarks ?? []) {
      const next: PdfBookmark[] = []
      for (const bm of list) {
        const createdAt = new Date(bm.createdAt)
        if (Number.isNaN(createdAt.getTime())) continue
        next.push({
          id: bm.id,
          userId: bm.userId,
          bookId: bm.bookId,
          pageNumber: Number(bm.pageNumber) || 1,
          label: bm.label ?? null,
          createdAt,
        })
      }
      bookmarks.set(key, next)
    }
    const sessionItemsMap = new Map<string, SessionItem[]>()
    for (const [key, list] of parsed.sessionItems ?? []) {
      const next: SessionItem[] = []
      for (const it of list) {
        const createdAt = new Date(it.createdAt)
        if (Number.isNaN(createdAt.getTime())) continue
        next.push({
          id: it.id,
          sessionId: it.sessionId,
          itemType: it.itemType,
          title: it.title,
          description: it.description ?? null,
          storageKey: it.storageKey,
          durationSeconds:
            it.durationSeconds != null ? Number(it.durationSeconds) : null,
          sortOrder: Number(it.sortOrder) || 0,
          createdAt,
        })
      }
      sessionItemsMap.set(key, next)
    }
    const mediaProgressMap = new Map<string, MockMediaProgressEntry>()
    for (const [key, entry] of parsed.mediaProgress ?? []) {
      const lastWatchedAt = new Date(entry.lastWatchedAt)
      if (Number.isNaN(lastWatchedAt.getTime())) continue
      const completedAt =
        entry.completedAt != null ? new Date(entry.completedAt) : null
      mediaProgressMap.set(key, {
        lastPositionSeconds: Number(entry.lastPositionSeconds) || 0,
        completedAt:
          completedAt != null && !Number.isNaN(completedAt.getTime())
            ? completedAt
            : null,
        lastWatchedAt,
      })
    }
    const bookingInterestMap = new Map<string, BookingInterest>()
    for (const [key, entry] of parsed.bookingInterest ?? []) {
      const createdAt = new Date(entry.createdAt)
      if (Number.isNaN(createdAt.getTime())) continue
      const contactedAt = entry.contactedAt ? new Date(entry.contactedAt) : null
      bookingInterestMap.set(key, {
        id: entry.id,
        userId: entry.userId,
        bookingId: entry.bookingId,
        additionalNotes: entry.additionalNotes ?? null,
        createdAt,
        contactedAt:
          contactedAt && !Number.isNaN(contactedAt.getTime())
            ? contactedAt
            : null,
      })
    }
    const tourSuggestionsList: TourSuggestion[] = []
    for (const entry of parsed.tourSuggestions ?? []) {
      const createdAt = new Date(entry.createdAt)
      if (Number.isNaN(createdAt.getTime())) continue
      const reviewedAt = entry.reviewedAt ? new Date(entry.reviewedAt) : null
      tourSuggestionsList.push({
        id: entry.id,
        userId: entry.userId,
        suggestedCity: entry.suggestedCity,
        suggestedCountry: entry.suggestedCountry,
        additionalNotes: entry.additionalNotes ?? null,
        createdAt,
        reviewedAt:
          reviewedAt && !Number.isNaN(reviewedAt.getTime()) ? reviewedAt : null,
      })
    }
    const userQuestionsList: UserQuestion[] = []
    for (const entry of parsed.userQuestions ?? []) {
      const createdAt = new Date(entry.createdAt)
      if (Number.isNaN(createdAt.getTime())) continue
      const updatedAt = new Date(entry.updatedAt)
      const answeredAt = entry.answeredAt ? new Date(entry.answeredAt) : null
      const archivedAt = entry.archivedAt ? new Date(entry.archivedAt) : null
      userQuestionsList.push({
        id: entry.id,
        userId: entry.userId,
        subject: entry.subject,
        body: entry.body,
        category: entry.category ?? null,
        isAnonymous: Boolean(entry.isAnonymous),
        status: entry.status,
        answerReference: entry.answerReference ?? null,
        answeredAt:
          answeredAt && !Number.isNaN(answeredAt.getTime()) ? answeredAt : null,
        archivedAt:
          archivedAt && !Number.isNaN(archivedAt.getTime()) ? archivedAt : null,
        createdAt,
        updatedAt: !Number.isNaN(updatedAt.getTime()) ? updatedAt : createdAt,
      })
    }
    return {
      progress,
      bookmarks,
      sessionItems: sessionItemsMap,
      mediaProgress: mediaProgressMap,
      bookingInterest: bookingInterestMap,
      tourSuggestions: tourSuggestionsList,
      userQuestions: userQuestionsList,
    }
  } catch (err) {
    console.warn(
      '[mock-store] failed to read reader-mock-store.json — returning empty store',
      err,
    )
    return emptyStore()
  }
}

/**
 * Write the given store to disk synchronously. Synchronous on purpose — a
 * debounced write would race against the read-modify-write pattern that
 * callers use (a debounced save A could be silently overwritten by a save B
 * that read disk before A's debounce fired). The file is small; the cost is
 * negligible.
 */
export function writeStore(store: MockStore): void {
  const payload: SerializedStore = {
    progress: Array.from(store.progress.entries()).map(([k, v]) => [
      k,
      {
        lastPage: v.lastPage,
        totalPages: v.totalPages,
        lastReadAt: v.lastReadAt.toISOString(),
      },
    ]),
    bookmarks: Array.from(store.bookmarks.entries()).map(([k, list]) => [
      k,
      list.map((b) => ({
        id: b.id,
        userId: b.userId,
        bookId: b.bookId,
        pageNumber: b.pageNumber,
        label: b.label ?? null,
        createdAt: b.createdAt.toISOString(),
      })),
    ]),
    sessionItems: Array.from(store.sessionItems.entries()).map(([k, list]) => [
      k,
      list.map((it) => ({
        id: it.id,
        sessionId: it.sessionId,
        itemType: it.itemType,
        title: it.title,
        description: it.description ?? null,
        storageKey: it.storageKey,
        durationSeconds: it.durationSeconds ?? null,
        sortOrder: it.sortOrder,
        createdAt: it.createdAt.toISOString(),
      })),
    ]),
    mediaProgress: Array.from(store.mediaProgress.entries()).map(([k, v]) => [
      k,
      {
        lastPositionSeconds: v.lastPositionSeconds,
        completedAt: v.completedAt ? v.completedAt.toISOString() : null,
        lastWatchedAt: v.lastWatchedAt.toISOString(),
      },
    ]),
    bookingInterest: Array.from(store.bookingInterest.entries()).map(
      ([k, v]) => [
        k,
        {
          id: v.id,
          userId: v.userId,
          bookingId: v.bookingId,
          additionalNotes: v.additionalNotes ?? null,
          createdAt: v.createdAt.toISOString(),
          contactedAt: v.contactedAt ? v.contactedAt.toISOString() : null,
        },
      ],
    ),
    tourSuggestions: store.tourSuggestions.map((s) => ({
      id: s.id,
      userId: s.userId,
      suggestedCity: s.suggestedCity,
      suggestedCountry: s.suggestedCountry,
      additionalNotes: s.additionalNotes ?? null,
      createdAt: s.createdAt.toISOString(),
      reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
    })),
    userQuestions: store.userQuestions.map((q) => ({
      id: q.id,
      userId: q.userId,
      subject: q.subject,
      body: q.body,
      category: q.category ?? null,
      isAnonymous: q.isAnonymous,
      status: q.status,
      answerReference: q.answerReference ?? null,
      answeredAt: q.answeredAt ? q.answeredAt.toISOString() : null,
      archivedAt: q.archivedAt ? q.archivedAt.toISOString() : null,
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    })),
  }
  try {
    mkdirSync(dirname(STORE_FILE), { recursive: true })
    writeFileSync(STORE_FILE, JSON.stringify(payload), 'utf8')
  } catch (err) {
    console.warn('[mock-store] failed to write reader-mock-store.json', err)
  }
}
