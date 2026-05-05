'use server'

/**
 * Server actions for the admin session-content editor.
 *
 * Why server actions instead of /api/admin/* route handlers:
 * - Type-safe end to end — the editor imports the function directly.
 * - Encrypted action ids carry CSRF protection out of the box.
 * - One file collocated with the page; no parallel REST surface to maintain.
 *
 * Why we never throw: the editor surfaces errors via toast — every action
 * returns a discriminated `{ ok: false, code }` shape so the client can
 * map codes to translated messages without parsing thrown errors.
 *
 * Auth model: `requireAdmin(req)` is route-handler only (it needs a
 * Request for the same-origin check). Server actions don't have one, so
 * we inline the role check — Next.js's encrypted action ids already
 * cover the CSRF path that requireAdmin's origin check protects against.
 */

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSession } from '@/lib/auth/server'
import {
  createSessionItem,
  deleteSessionItem,
  getBookById,
  getSessionItemById,
  reorderSessionItems,
  updateSessionItem,
  type SessionItem,
} from '@/lib/db/queries'

// Item-type guard. Any new types added to the schema's session_item_type
// enum need to be mirrored here — keep this list in lockstep.
const itemTypeSchema = z.enum(['VIDEO', 'AUDIO', 'PDF'])

const sessionIdSchema = z.string().min(1).max(64)
const itemIdSchema = z.string().min(1).max(64)

const titleSchema = z.string().trim().min(1, 'title-required').max(200)
const descriptionSchema = z
  .string()
  .trim()
  .max(2000)
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : (v ?? null)))
// Storage key is free text in Phase 4 (the storage abstraction is mocked
// — see lib/storage/). Cap length to keep DB rows bounded.
const storageKeySchema = z.string().trim().min(1, 'storage-key-required').max(500)
const durationSchema = z
  .number()
  .int()
  .min(0)
  .max(60 * 60 * 24) // 24h cap — anything above is almost certainly a bad input
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? undefined : (v ?? null)))

// Per-type rule (mirrored on the client in SessionContentItemDialog):
// VIDEO/AUDIO require a positive duration (the playlist renders length
// next to the type chip and uses it as the progress denominator); PDF
// has no duration concept. Server is authoritative — even if a stale
// client bypasses the form, the action rejects.
const createInputSchema = z
  .object({
    sessionId: sessionIdSchema,
    itemType: itemTypeSchema,
    title: titleSchema,
    description: descriptionSchema,
    storageKey: storageKeySchema,
    durationSeconds: durationSchema,
  })
  .superRefine((value, ctx) => {
    if (value.itemType === 'VIDEO' || value.itemType === 'AUDIO') {
      if (value.durationSeconds == null || value.durationSeconds <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['durationSeconds'],
          message: 'duration-required',
        })
      }
    }
  })

const updateInputSchema = z
  .object({
    itemId: itemIdSchema,
    sessionId: sessionIdSchema,
    itemType: itemTypeSchema.optional(),
    title: titleSchema.optional(),
    description: descriptionSchema,
    storageKey: storageKeySchema.optional(),
    durationSeconds: durationSchema,
  })
  .superRefine((value, ctx) => {
    // Only enforce when itemType is being explicitly set (or kept) to
    // VIDEO/AUDIO with a duration in the patch. If the patch leaves
    // duration undefined, the existing row's value carries through —
    // we don't know it from the patch alone, so we don't false-positive
    // on a description-only edit.
    if (
      (value.itemType === 'VIDEO' || value.itemType === 'AUDIO') &&
      value.durationSeconds !== undefined &&
      (value.durationSeconds == null || value.durationSeconds <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['durationSeconds'],
        message: 'duration-required',
      })
    }
  })

const deleteInputSchema = z.object({
  itemId: itemIdSchema,
  sessionId: sessionIdSchema,
})

const reorderInputSchema = z.object({
  sessionId: sessionIdSchema,
  orderedItemIds: z.array(itemIdSchema).min(1).max(500),
})

type ActionResult<T = void> =
  | { ok: true; data: T extends void ? undefined : T }
  | { ok: false; code: string }

async function ensureAdminSession() {
  const session = await getServerSession()
  if (!session) return { ok: false as const, code: 'UNAUTHORIZED' }
  if (session.user.role !== 'ADMIN') {
    return { ok: false as const, code: 'FORBIDDEN' }
  }
  return { ok: true as const, session }
}

/**
 * Confirms the parent product is a SESSION. The schema does not enforce
 * the productType invariant on session_items.session_id (it points at
 * books.id without a CHECK), so the application layer guards it on every
 * write. Without this, an admin who guessed a BOOK's id could attach
 * SessionItems to it, polluting the storefront.
 */
async function ensureSessionParent(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; code: 'NOT_FOUND' | 'NOT_SESSION' }> {
  const book = await getBookById(sessionId)
  if (!book) return { ok: false, code: 'NOT_FOUND' }
  if (book.productType !== 'SESSION') return { ok: false, code: 'NOT_SESSION' }
  return { ok: true }
}

function revalidateSessionContent(sessionId: string) {
  // Server actions don't auto-revalidate App-Router pages. Pin the
  // editor route + the parent edit route so a fresh navigation reflects
  // the mutation without a hard refresh.
  revalidatePath(`/admin/books/${sessionId}/content`)
  revalidatePath(`/admin/books/${sessionId}/edit`)
}

export async function createSessionItemAction(input: {
  sessionId: string
  itemType: SessionItem['itemType']
  title: string
  description?: string | null
  storageKey: string
  durationSeconds?: number | null
}): Promise<ActionResult<SessionItem>> {
  try {
    const auth = await ensureAdminSession()
    if (!auth.ok) return auth

    const parsed = createInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: parsed.error.issues[0]?.message ?? 'VALIDATION' }
    }

    const parent = await ensureSessionParent(parsed.data.sessionId)
    if (!parent.ok) return parent

    const created = await createSessionItem(parsed.data)
    if (!created) return { ok: false, code: 'CREATE_FAILED' }

    revalidateSessionContent(parsed.data.sessionId)
    return { ok: true, data: created }
  } catch (err) {
    console.error('[createSessionItemAction]', err)
    return { ok: false, code: 'INTERNAL' }
  }
}

export async function updateSessionItemAction(input: {
  itemId: string
  sessionId: string
  itemType?: SessionItem['itemType']
  title?: string
  description?: string | null
  storageKey?: string
  durationSeconds?: number | null
}): Promise<ActionResult<SessionItem>> {
  try {
    const auth = await ensureAdminSession()
    if (!auth.ok) return auth

    const parsed = updateInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: parsed.error.issues[0]?.message ?? 'VALIDATION' }
    }

    const parent = await ensureSessionParent(parsed.data.sessionId)
    if (!parent.ok) return parent

    // Cross-session guard — make sure the itemId belongs to this session
    // before issuing the UPDATE so an admin can't accidentally move an
    // item between sessions via a stale page.
    const existing = await getSessionItemById(
      parsed.data.itemId,
      parsed.data.sessionId,
    )
    if (!existing) return { ok: false, code: 'NOT_FOUND' }

    const { itemId, sessionId, ...patch } = parsed.data
    const updated = await updateSessionItem(itemId, sessionId, patch)
    if (!updated) return { ok: false, code: 'UPDATE_FAILED' }

    revalidateSessionContent(sessionId)
    return { ok: true, data: updated }
  } catch (err) {
    console.error('[updateSessionItemAction]', err)
    return { ok: false, code: 'INTERNAL' }
  }
}

export async function deleteSessionItemAction(input: {
  itemId: string
  sessionId: string
}): Promise<ActionResult> {
  try {
    const auth = await ensureAdminSession()
    if (!auth.ok) return auth

    const parsed = deleteInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: parsed.error.issues[0]?.message ?? 'VALIDATION' }
    }

    const parent = await ensureSessionParent(parsed.data.sessionId)
    if (!parent.ok) return parent

    const ok = await deleteSessionItem(parsed.data.itemId, parsed.data.sessionId)
    if (!ok) return { ok: false, code: 'NOT_FOUND' }

    revalidateSessionContent(parsed.data.sessionId)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[deleteSessionItemAction]', err)
    return { ok: false, code: 'INTERNAL' }
  }
}

export async function reorderSessionItemsAction(input: {
  sessionId: string
  orderedItemIds: string[]
}): Promise<ActionResult> {
  try {
    const auth = await ensureAdminSession()
    if (!auth.ok) return auth

    const parsed = reorderInputSchema.safeParse(input)
    if (!parsed.success) {
      return { ok: false, code: parsed.error.issues[0]?.message ?? 'VALIDATION' }
    }

    const parent = await ensureSessionParent(parsed.data.sessionId)
    if (!parent.ok) return parent

    const ok = await reorderSessionItems(
      parsed.data.sessionId,
      parsed.data.orderedItemIds,
    )
    if (!ok) return { ok: false, code: 'REORDER_FAILED' }

    revalidateSessionContent(parsed.data.sessionId)
    return { ok: true, data: undefined }
  } catch (err) {
    console.error('[reorderSessionItemsAction]', err)
    return { ok: false, code: 'INTERNAL' }
  }
}
