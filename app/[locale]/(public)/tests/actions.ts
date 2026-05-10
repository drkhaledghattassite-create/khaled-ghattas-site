'use server'

/**
 * Phase C1 — server actions for /tests/[slug]/take.
 *
 * v1 ships ONE action: submit-attempt. Tests are immutable from the user
 * surface (no edit, no delete, no save-and-resume). Retaking is a NEW
 * attempt; old attempts remain.
 *
 * SECURITY: userId is derived from the server session — the client never
 * tells us whose attempt this is. Untrusted input runs through zod, then
 * through three integrity checks the schema can't express:
 *   1. Every questionId in the payload belongs to the test addressed by slug.
 *   2. Every selectedOptionId belongs to its respective question.
 *   3. The user answered every question (no missing, no duplicates).
 * Plus a fourth app-layer rule: each question must have exactly one
 * isCorrect=true option (admin-data invariant). A test that violates this
 * fails the submission so the user isn't scored against bad data.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import {
  createTestAttempt,
  getTestBySlug,
  type TestWithDetail,
} from '@/lib/db/queries'
import {
  submitAttemptInputSchema,
  type SubmitAttemptInput,
} from '@/lib/validators/test'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

export type SubmitTestAttemptActionResult =
  | ActionOk<{ attemptId: string }>
  | ActionErr<
      | 'unauthorized'
      | 'not_found'
      | 'validation'
      | 'rate_limited'
      | 'database_error'
    >

export async function submitTestAttemptAction(
  raw: SubmitAttemptInput,
): Promise<SubmitTestAttemptActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const parsed = submitAttemptInputSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // 10 attempts per hour per user. Generous enough for legitimate retakes
  // (curiosity, sharing with others, comparing answers); cuts off attack-
  // shaped patterns. Fails OPEN when Upstash isn't configured (see
  // lib/redis/ratelimit.ts).
  const rl = await tryRateLimit(`test-attempt:${session.user.id}`, {
    limit: 10,
    window: '60 m',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const test = await getTestBySlug(parsed.data.testSlug)
  if (!test) return { ok: false, error: 'not_found' }
  // Defense: getTestBySlug already filters on isPublished, but be explicit
  // — if Phase C2 ships an admin preview path, we don't want this action
  // to start accepting attempts on unpublished tests by accident.
  if (!test.isPublished) return { ok: false, error: 'not_found' }
  if (test.questions.length === 0) return { ok: false, error: 'validation' }

  // ── Integrity checks ───────────────────────────────────────────────────
  const questionsById = new Map(test.questions.map((q) => [q.id, q]))
  const incomingQuestionIds = new Set<string>()

  // No duplicate questionIds in the payload, every id known to the test.
  for (const a of parsed.data.answers) {
    if (incomingQuestionIds.has(a.questionId)) {
      return { ok: false, error: 'validation' }
    }
    incomingQuestionIds.add(a.questionId)
    const q = questionsById.get(a.questionId)
    if (!q) return { ok: false, error: 'validation' }
    // selectedOptionId belongs to this question.
    const knownOption = q.options.some((o) => o.id === a.selectedOptionId)
    if (!knownOption) return { ok: false, error: 'validation' }
  }

  // Cardinality: one answer per question — count must match exactly.
  if (incomingQuestionIds.size !== test.questions.length) {
    return { ok: false, error: 'validation' }
  }

  // App-layer constraint check: each question has exactly one correct option.
  // If the seed data is malformed (admin created a test with zero or two
  // correct options), bail rather than misscore the user.
  for (const q of test.questions) {
    const correctCount = q.options.filter((o) => o.isCorrect).length
    if (correctCount !== 1) return { ok: false, error: 'validation' }
  }

  // ── Score ──────────────────────────────────────────────────────────────
  const computedAnswers = parsed.data.answers.map((a) => {
    const q = questionsById.get(a.questionId) as TestWithDetail['questions'][number]
    const selected = q.options.find((o) => o.id === a.selectedOptionId)
    return {
      questionId: a.questionId,
      selectedOptionId: a.selectedOptionId,
      isCorrect: !!selected?.isCorrect,
    }
  })
  const correctCount = computedAnswers.filter((a) => a.isCorrect).length
  const totalCount = test.questions.length
  const scorePercentage = Math.round((correctCount / totalCount) * 100)

  const attempt = await createTestAttempt({
    userId: session.user.id,
    testId: test.id,
    answers: computedAnswers,
    scorePercentage,
    correctCount,
    totalCount,
  })
  if (!attempt) return { ok: false, error: 'database_error' }

  // Refresh the dashboard history + the test detail page (its CTA changes
  // from "Ready" to "Taken").
  revalidatePath('/[locale]/(dashboard)/dashboard/tests', 'page')
  revalidatePath(`/[locale]/(public)/tests/${parsed.data.testSlug}`, 'page')

  return { ok: true, attemptId: attempt.id }
}
