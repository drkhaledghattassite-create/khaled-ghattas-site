'use server'

/**
 * Server actions for the in-browser PDF reader.
 *
 * Why server actions and not route handlers:
 * - Lower overhead than fetch + JSON (no manual parsing, no headers dance).
 * - Built-in CSRF protection from Next.js's encrypted action ids.
 * - Type-safe end to end — the client imports the function directly.
 *
 * Why we never throw: failing to save reading progress or toggle a
 * bookmark is a non-blocking background concern. The user shouldn't see
 * an error toast for "we'll re-open at page 1 next time you visit."
 * Caller silently degrades on { ok: false }.
 *
 * Note on `saveProgressAction`: the in-page debounced save uses this
 * action; the unmount/pagehide flush uses /api/reader/progress with
 * `keepalive: true` because server actions cannot be invoked with that
 * flag (Next.js's action runtime cancels in-flight POSTs on tab teardown).
 */

import { z } from 'zod'
import { getServerSession } from '@/lib/auth/server'
import {
  getBookmarks,
  saveReadingProgress,
  toggleBookmark,
  updateBookmarkLabel,
  userOwnsProduct,
  type PdfBookmark,
} from '@/lib/db/queries'

// bookId max length 64 covers UUIDs (36 chars) plus the placeholder ids
// used in dev (`00000000-0000-0000-0000-0000000000b1` etc.).
const bookIdSchema = z.string().min(1).max(64)

const progressInputSchema = z.object({
  bookId: bookIdSchema,
  // 10000 is a generous upper bound — Dr. Khaled's longest book is
  // unlikely to exceed it but the cap stops obvious garbage payloads.
  page: z.number().int().min(1).max(10000),
  // Total page count — used by the dashboard library card to render
  // (lastPage / totalPages) as a real progress percentage. Optional
  // because early saves may fire before react-pdf's onLoadSuccess
  // returns numPages; saveReadingProgress preserves an existing total
  // when the new save omits one.
  totalPages: z.number().int().min(0).max(10000).optional(),
})

const toggleBookmarkInputSchema = z.object({
  bookId: bookIdSchema,
  pageNumber: z.number().int().min(1).max(10000),
  // 280 chars is enough for a Twitter-length annotation; longer notes
  // are out of scope for the reader UX.
  label: z.string().trim().max(280).nullable().optional(),
})

const updateBookmarkLabelInputSchema = z.object({
  bookmarkId: z.string().min(1).max(64),
  label: z.string().trim().max(280).nullable(),
})

const getBookmarksInputSchema = z.object({
  bookId: bookIdSchema,
})

export async function saveProgressAction(input: {
  bookId: string
  page: number
  totalPages?: number
}): Promise<{ ok: boolean }> {
  try {
    const parsed = progressInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false }

    const session = await getServerSession()
    if (!session) return { ok: false }

    // Re-verify ownership server-side — never trust the client to gate
    // its own writes. This duplicates the page-level check but the cost
    // is one query per save (debounced 1.5s in the client).
    const owns = await userOwnsProduct(session.user.id, parsed.data.bookId)
    if (!owns) return { ok: false }

    await saveReadingProgress(
      session.user.id,
      parsed.data.bookId,
      parsed.data.page,
      parsed.data.totalPages,
    )
    return { ok: true }
  } catch (err) {
    console.error('[saveProgressAction]', err)
    return { ok: false }
  }
}

/**
 * Returns all bookmarks for the current user on a given book, sorted by
 * pageNumber ascending. Returns an empty array on any failure (auth, owner-
 * ship, DB) so the UI can render the empty state without flickering an error.
 */
export async function getBookmarksAction(input: {
  bookId: string
}): Promise<{ ok: boolean; bookmarks: PdfBookmark[] }> {
  try {
    const parsed = getBookmarksInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, bookmarks: [] }

    const session = await getServerSession()
    if (!session) return { ok: false, bookmarks: [] }

    const owns = await userOwnsProduct(session.user.id, parsed.data.bookId)
    if (!owns) return { ok: false, bookmarks: [] }

    const bookmarks = await getBookmarks(session.user.id, parsed.data.bookId)
    return { ok: true, bookmarks }
  } catch (err) {
    console.error('[getBookmarksAction]', err)
    return { ok: false, bookmarks: [] }
  }
}

/**
 * Toggles the bookmark on (user, book, page). On add, returns the created
 * row; on remove, returns null. The wrapper ok/result shape lets the client
 * distinguish "nothing happened (auth/ownership)" from "removed by request".
 */
export async function toggleBookmarkAction(input: {
  bookId: string
  pageNumber: number
  label?: string | null
}): Promise<{ ok: boolean; bookmark: PdfBookmark | null }> {
  try {
    const parsed = toggleBookmarkInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, bookmark: null }

    const session = await getServerSession()
    if (!session) return { ok: false, bookmark: null }

    const owns = await userOwnsProduct(session.user.id, parsed.data.bookId)
    if (!owns) return { ok: false, bookmark: null }

    const bookmark = await toggleBookmark(
      session.user.id,
      parsed.data.bookId,
      parsed.data.pageNumber,
      parsed.data.label ?? null,
    )
    return { ok: true, bookmark }
  } catch (err) {
    console.error('[toggleBookmarkAction]', err)
    return { ok: false, bookmark: null }
  }
}

export async function updateBookmarkLabelAction(input: {
  bookmarkId: string
  label: string | null
}): Promise<{ ok: boolean; bookmark: PdfBookmark | null }> {
  try {
    const parsed = updateBookmarkLabelInputSchema.safeParse(input)
    if (!parsed.success) return { ok: false, bookmark: null }

    const session = await getServerSession()
    if (!session) return { ok: false, bookmark: null }

    // Ownership check is enforced inside updateBookmarkLabel — the WHERE
    // clause filters on the session userId, so a bookmark id owned by
    // another user produces a no-op.
    const bookmark = await updateBookmarkLabel(
      parsed.data.bookmarkId,
      session.user.id,
      parsed.data.label,
    )
    return { ok: bookmark != null, bookmark }
  } catch (err) {
    console.error('[updateBookmarkLabelAction]', err)
    return { ok: false, bookmark: null }
  }
}
