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
  Gift,
  PdfBookmark,
  SessionItem,
  Test,
  TestAttempt,
  TestAttemptAnswer,
  TestOption,
  TestQuestion,
  TourSuggestion,
  UserQuestion,
} from './schema'

/**
 * Phase C1 mock-store shape for a test attempt — the row + all of its
 * answers in a single envelope. Mirrors the action's "create attempt + N
 * answer rows" contract. The result page reads via `attemptId`, the
 * dashboard history reads via `userId`.
 */
export type MockTestAttempt = TestAttempt & {
  answers: TestAttemptAnswer[]
}

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
  // Phase C1 — append-only list of completed test attempts. Each entry holds
  // the attempt header + its denormalised answer rows (the same shape the
  // result page consumes after a JOIN). Read paths filter by attemptId or
  // userId.
  testAttempts: MockTestAttempt[]
  // Phase C2 — admin-managed catalog. When an admin first writes via the
  // /admin/tests CRUD in mock-auth dev mode, the C2 query helpers seed
  // these maps from `placeholderTests`/etc and apply the mutation on top.
  // Reads layered: store-first, placeholder-fallback (the seed is
  // idempotent, so subsequent reads see the merged state).
  // Keyed by test id. Tracks the FULL Test row (including isPublished).
  tests: Map<string, Test>
  // Keyed by testId → list of questions in displayOrder.
  testQuestions: Map<string, TestQuestion[]>
  // Keyed by questionId → list of options in displayOrder.
  testOptions: Map<string, TestOption[]>
  // Phase D — append-only list of gifts. Mock-mode supports the full
  // ADMIN_GRANT lifecycle (create → claim auto-on-existing-account → revoke
  // → resend). USER_PURCHASE flow is gated behind Stripe in production; in
  // mock-auth dev the action returns 'stripe_unconfigured' before reaching
  // the queries layer, so PENDING USER_PURCHASE gifts never land here.
  gifts: Gift[]
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
type SerializedTestAttemptAnswer = Omit<TestAttemptAnswer, 'createdAt'> & {
  createdAt: string
}
type SerializedTestAttempt = Omit<
  TestAttempt,
  'completedAt' | 'createdAt'
> & {
  completedAt: string
  createdAt: string
  answers: SerializedTestAttemptAnswer[]
}
type SerializedTest = Omit<Test, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}
type SerializedTestQuestion = Omit<
  TestQuestion,
  'createdAt' | 'updatedAt'
> & {
  createdAt: string
  updatedAt: string
}
type SerializedTestOption = Omit<TestOption, 'createdAt'> & {
  createdAt: string
}
type SerializedGift = Omit<
  Gift,
  | 'claimedAt'
  | 'expiresAt'
  | 'revokedAt'
  | 'refundedAt'
  | 'emailSentAt'
  | 'createdAt'
  | 'updatedAt'
> & {
  claimedAt: string | null
  expiresAt: string
  revokedAt: string | null
  refundedAt: string | null
  emailSentAt: string | null
  createdAt: string
  updatedAt: string
}
type SerializedStore = {
  progress: Array<[string, SerializedProgressEntry]>
  bookmarks: Array<[string, SerializedBookmark[]]>
  sessionItems?: Array<[string, SerializedSessionItem[]]>
  mediaProgress?: Array<[string, SerializedMediaProgressEntry]>
  bookingInterest?: Array<[string, SerializedBookingInterest]>
  tourSuggestions?: SerializedTourSuggestion[]
  userQuestions?: SerializedUserQuestion[]
  testAttempts?: SerializedTestAttempt[]
  tests?: Array<[string, SerializedTest]>
  testQuestions?: Array<[string, SerializedTestQuestion[]]>
  testOptions?: Array<[string, SerializedTestOption[]]>
  gifts?: SerializedGift[]
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
    testAttempts: [],
    tests: new Map(),
    testQuestions: new Map(),
    testOptions: new Map(),
    gifts: [],
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
    const testAttemptsList: MockTestAttempt[] = []
    for (const entry of parsed.testAttempts ?? []) {
      const completedAt = new Date(entry.completedAt)
      if (Number.isNaN(completedAt.getTime())) continue
      const createdAt = new Date(entry.createdAt)
      const answers: TestAttemptAnswer[] = []
      for (const a of entry.answers ?? []) {
        const aCreatedAt = new Date(a.createdAt)
        if (Number.isNaN(aCreatedAt.getTime())) continue
        answers.push({
          id: a.id,
          attemptId: a.attemptId,
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
          isCorrect: Boolean(a.isCorrect),
          createdAt: aCreatedAt,
        })
      }
      testAttemptsList.push({
        id: entry.id,
        testId: entry.testId,
        userId: entry.userId,
        scorePercentage: Number(entry.scorePercentage) || 0,
        correctCount: Number(entry.correctCount) || 0,
        totalCount: Number(entry.totalCount) || 0,
        completedAt,
        createdAt: !Number.isNaN(createdAt.getTime()) ? createdAt : completedAt,
        answers,
      })
    }
    const testsMap = new Map<string, Test>()
    for (const [key, entry] of parsed.tests ?? []) {
      const createdAt = new Date(entry.createdAt)
      const updatedAt = new Date(entry.updatedAt)
      if (Number.isNaN(createdAt.getTime())) continue
      testsMap.set(key, {
        id: entry.id,
        slug: entry.slug,
        titleAr: entry.titleAr,
        titleEn: entry.titleEn,
        introAr: entry.introAr,
        introEn: entry.introEn,
        descriptionAr: entry.descriptionAr,
        descriptionEn: entry.descriptionEn,
        category: entry.category,
        estimatedMinutes: Number(entry.estimatedMinutes) || 0,
        coverImageUrl: entry.coverImageUrl ?? null,
        priceUsd: entry.priceUsd ?? null,
        isPaid: Boolean(entry.isPaid),
        isPublished: Boolean(entry.isPublished),
        displayOrder: Number(entry.displayOrder) || 0,
        createdAt,
        updatedAt: !Number.isNaN(updatedAt.getTime()) ? updatedAt : createdAt,
      })
    }
    const testQuestionsMap = new Map<string, TestQuestion[]>()
    for (const [key, list] of parsed.testQuestions ?? []) {
      const next: TestQuestion[] = []
      for (const q of list) {
        const createdAt = new Date(q.createdAt)
        const updatedAt = new Date(q.updatedAt)
        if (Number.isNaN(createdAt.getTime())) continue
        next.push({
          id: q.id,
          testId: q.testId,
          displayOrder: Number(q.displayOrder) || 0,
          promptAr: q.promptAr,
          promptEn: q.promptEn,
          explanationAr: q.explanationAr ?? null,
          explanationEn: q.explanationEn ?? null,
          createdAt,
          updatedAt: !Number.isNaN(updatedAt.getTime()) ? updatedAt : createdAt,
        })
      }
      testQuestionsMap.set(key, next)
    }
    const testOptionsMap = new Map<string, TestOption[]>()
    for (const [key, list] of parsed.testOptions ?? []) {
      const next: TestOption[] = []
      for (const o of list) {
        const createdAt = new Date(o.createdAt)
        if (Number.isNaN(createdAt.getTime())) continue
        next.push({
          id: o.id,
          questionId: o.questionId,
          displayOrder: Number(o.displayOrder) || 0,
          labelAr: o.labelAr,
          labelEn: o.labelEn,
          isCorrect: Boolean(o.isCorrect),
          createdAt,
        })
      }
      testOptionsMap.set(key, next)
    }
    const giftsList: Gift[] = []
    for (const entry of parsed.gifts ?? []) {
      const expiresAt = new Date(entry.expiresAt)
      if (Number.isNaN(expiresAt.getTime())) continue
      const createdAt = new Date(entry.createdAt)
      const updatedAt = new Date(entry.updatedAt)
      const claimedAt = entry.claimedAt ? new Date(entry.claimedAt) : null
      const revokedAt = entry.revokedAt ? new Date(entry.revokedAt) : null
      const refundedAt = entry.refundedAt ? new Date(entry.refundedAt) : null
      const emailSentAt = entry.emailSentAt
        ? new Date(entry.emailSentAt)
        : null
      giftsList.push({
        id: entry.id,
        token: entry.token,
        source: entry.source,
        status: entry.status,
        itemType: entry.itemType,
        itemId: entry.itemId,
        senderUserId: entry.senderUserId ?? null,
        recipientEmail: entry.recipientEmail,
        recipientUserId: entry.recipientUserId ?? null,
        senderMessage: entry.senderMessage ?? null,
        amountCents: entry.amountCents ?? null,
        currency: entry.currency ?? 'usd',
        stripeSessionId: entry.stripeSessionId ?? null,
        stripePaymentIntentId: entry.stripePaymentIntentId ?? null,
        claimedAt: claimedAt && !Number.isNaN(claimedAt.getTime()) ? claimedAt : null,
        expiresAt,
        revokedAt: revokedAt && !Number.isNaN(revokedAt.getTime()) ? revokedAt : null,
        revokedReason: entry.revokedReason ?? null,
        refundedAt:
          refundedAt && !Number.isNaN(refundedAt.getTime()) ? refundedAt : null,
        locale: entry.locale ?? 'ar',
        adminGrantedByUserId: entry.adminGrantedByUserId ?? null,
        emailSentAt:
          emailSentAt && !Number.isNaN(emailSentAt.getTime()) ? emailSentAt : null,
        emailSendFailedReason: entry.emailSendFailedReason ?? null,
        createdAt: !Number.isNaN(createdAt.getTime()) ? createdAt : new Date(),
        updatedAt: !Number.isNaN(updatedAt.getTime()) ? updatedAt : new Date(),
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
      testAttempts: testAttemptsList,
      tests: testsMap,
      testQuestions: testQuestionsMap,
      testOptions: testOptionsMap,
      gifts: giftsList,
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
    testAttempts: store.testAttempts.map((a) => ({
      id: a.id,
      testId: a.testId,
      userId: a.userId,
      scorePercentage: a.scorePercentage,
      correctCount: a.correctCount,
      totalCount: a.totalCount,
      completedAt: a.completedAt.toISOString(),
      createdAt: a.createdAt.toISOString(),
      answers: a.answers.map((ans) => ({
        id: ans.id,
        attemptId: ans.attemptId,
        questionId: ans.questionId,
        selectedOptionId: ans.selectedOptionId,
        isCorrect: ans.isCorrect,
        createdAt: ans.createdAt.toISOString(),
      })),
    })),
    tests: Array.from(store.tests.entries()).map(([k, t]) => [
      k,
      {
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
        coverImageUrl: t.coverImageUrl ?? null,
        priceUsd: t.priceUsd ?? null,
        isPaid: t.isPaid,
        isPublished: t.isPublished,
        displayOrder: t.displayOrder,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      },
    ]),
    testQuestions: Array.from(store.testQuestions.entries()).map(
      ([k, list]) => [
        k,
        list.map((q) => ({
          id: q.id,
          testId: q.testId,
          displayOrder: q.displayOrder,
          promptAr: q.promptAr,
          promptEn: q.promptEn,
          explanationAr: q.explanationAr ?? null,
          explanationEn: q.explanationEn ?? null,
          createdAt: q.createdAt.toISOString(),
          updatedAt: q.updatedAt.toISOString(),
        })),
      ],
    ),
    testOptions: Array.from(store.testOptions.entries()).map(([k, list]) => [
      k,
      list.map((o) => ({
        id: o.id,
        questionId: o.questionId,
        displayOrder: o.displayOrder,
        labelAr: o.labelAr,
        labelEn: o.labelEn,
        isCorrect: o.isCorrect,
        createdAt: o.createdAt.toISOString(),
      })),
    ]),
    gifts: store.gifts.map((g) => ({
      id: g.id,
      token: g.token,
      source: g.source,
      status: g.status,
      itemType: g.itemType,
      itemId: g.itemId,
      senderUserId: g.senderUserId ?? null,
      recipientEmail: g.recipientEmail,
      recipientUserId: g.recipientUserId ?? null,
      senderMessage: g.senderMessage ?? null,
      amountCents: g.amountCents ?? null,
      currency: g.currency,
      stripeSessionId: g.stripeSessionId ?? null,
      stripePaymentIntentId: g.stripePaymentIntentId ?? null,
      claimedAt: g.claimedAt ? g.claimedAt.toISOString() : null,
      expiresAt: g.expiresAt.toISOString(),
      revokedAt: g.revokedAt ? g.revokedAt.toISOString() : null,
      revokedReason: g.revokedReason ?? null,
      refundedAt: g.refundedAt ? g.refundedAt.toISOString() : null,
      locale: g.locale,
      adminGrantedByUserId: g.adminGrantedByUserId ?? null,
      emailSentAt: g.emailSentAt ? g.emailSentAt.toISOString() : null,
      emailSendFailedReason: g.emailSendFailedReason ?? null,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    })),
  }
  try {
    mkdirSync(dirname(STORE_FILE), { recursive: true })
    writeFileSync(STORE_FILE, JSON.stringify(payload), 'utf8')
  } catch (err) {
    console.warn('[mock-store] failed to write reader-mock-store.json', err)
  }
}
