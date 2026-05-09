'use server'

/**
 * Server actions for /dashboard/ask — the "Ask Dr. Khaled" Q&A surface.
 *
 * v1 ships ONE action only: `createUserQuestionAction`. Users can submit and
 * view their own questions; they cannot edit or delete them. Status
 * transitions (PENDING → ANSWERED / ARCHIVED) happen via the Phase B2 admin
 * surface, not from this dashboard tab. Reasoning is documented in the
 * Phase B1 spec — TL;DR: edit-after-submit invites gaming, delete-after-
 * submit kills the audit trail, and "I want to revise" maps to "submit a
 * new question."
 *
 * SECURITY: userId is derived from the server session. The client never
 * tells us whose question this is. Untrusted input runs through zod before
 * touching the DB.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { createUserQuestion } from '@/lib/db/queries'
import {
  createUserQuestionSchema,
  type CreateUserQuestionInput,
} from '@/lib/validators/user-question'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

export type CreateUserQuestionActionResult =
  | ActionOk<{ id: string }>
  | ActionErr<
      | 'unauthorized'
      | 'validation'
      | 'rate_limited'
      | 'database_error'
    >

export async function createUserQuestionAction(
  raw: CreateUserQuestionInput,
): Promise<CreateUserQuestionActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const parsed = createUserQuestionSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // 5 questions per hour per user. Generous enough for legitimate use; defeats
  // accidental rapid-fire double-submits and basic spam. Fails OPEN when
  // Upstash isn't configured (see lib/redis/ratelimit.ts) — we'd rather let
  // a real question through than 500 because the rate-limit infra is broken.
  const rl = await tryRateLimit(`user-question:${session.user.id}`, {
    limit: 5,
    window: '60 m',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  // Empty string from the form's <select> means "no category" — store as
  // null. The zod schema's `.refine` enforces that any non-empty value is
  // one of the allowed categories.
  const category =
    parsed.data.category === '' ? null : parsed.data.category

  const row = await createUserQuestion({
    userId: session.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    category,
  })
  if (!row) return { ok: false, error: 'database_error' }

  // Refresh the question list. force-dynamic is set on the page so this is
  // largely belt-and-suspenders, but keeps the contract obvious.
  revalidatePath('/[locale]/(dashboard)/dashboard/ask', 'page')

  return { ok: true, id: row.id }
}
