'use server'

/**
 * Phase C2 — admin server actions for the Tests & Quizzes catalog.
 *
 * Auth model: action functions can't receive a Request, so we inline the
 * role check via getServerSession + UserRole — same pattern as the
 * questions and booking action files. Next.js encrypted action ids cover
 * the CSRF surface.
 *
 * Four actions:
 *   - createTestAction
 *   - updateTestAction (with a confirm-removals gate for cascade-delete)
 *   - deleteTestAction
 *   - publishTestAction
 *
 * Validation order:
 *   1. requireAdminSession — gate non-admins out fast.
 *   2. zod parse — shape + bounds + the "exactly one correct" refinement.
 *   3. domain checks — slug uniqueness pre-check, empty-test publish block,
 *      removal-confirmation gate.
 *   4. mutation via the lib/db/queries helpers.
 *   5. revalidatePath the affected admin + public surfaces.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import {
  countAttemptAnswersForQuestions,
  createTest,
  deleteTest,
  getTestForAdmin,
  isTestSlugTaken,
  setTestPublished,
  updateTest,
  type CreateAdminTestInput,
  type UpdateAdminTestInput,
} from '@/lib/db/queries'
import {
  createTestSchema,
  deleteTestSchema,
  publishTestSchema,
  updateTestSchema,
  type CreateTestInput,
  type DeleteTestInput,
  type PublishTestInput,
  type UpdateTestInput,
} from '@/lib/validators/test'

type Ok<T> = { ok: true } & T
type Err<E extends string, D = undefined> = D extends undefined
  ? { ok: false; error: E }
  : { ok: false; error: E; data: D }

async function requireAdminSession(): Promise<
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' }
> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  // ADMIN (developer) + CLIENT (site owner) — both trusted operators.
  // See lib/auth/admin-guard.ts for the project-wide role policy.
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false, error: 'forbidden' }
  }
  return { ok: true }
}

function revalidateTestPaths(slug?: string) {
  // Admin surfaces.
  revalidatePath('/admin/tests')
  // Public catalog and per-slug pages — admin publish/unpublish flows
  // through here. Both locales because Next App Router won't auto-derive.
  revalidatePath('/tests')
  revalidatePath('/en/tests')
  if (slug) {
    revalidatePath(`/tests/${slug}`)
    revalidatePath(`/en/tests/${slug}`)
  }
}

/* ── createTestAction ──────────────────────────────────────────────────── */

export type CreateTestActionResult =
  | Ok<{ id: string; slug: string }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'slug_taken'
      | 'database_error'
    >

export async function createTestAction(
  raw: CreateTestInput,
): Promise<CreateTestActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = createTestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // Pre-check slug — surfaces a friendly error before the DB UNIQUE
  // constraint fires. The createTest helper ALSO catches the constraint
  // error (race window between two simultaneous admin creates), so
  // skipping this pre-check would still be safe — but the explicit
  // surface is friendlier.
  const taken = await isTestSlugTaken(parsed.data.slug)
  if (taken) return { ok: false, error: 'slug_taken' }

  const payload: CreateAdminTestInput = {
    slug: parsed.data.slug,
    titleAr: parsed.data.titleAr,
    titleEn: parsed.data.titleEn,
    introAr: parsed.data.introAr,
    introEn: parsed.data.introEn,
    descriptionAr: parsed.data.descriptionAr,
    descriptionEn: parsed.data.descriptionEn,
    category: parsed.data.category,
    estimatedMinutes: parsed.data.estimatedMinutes,
    coverImageUrl: parsed.data.coverImageUrl ?? null,
    isPublished: parsed.data.isPublished,
    displayOrder: parsed.data.displayOrder,
    questions: parsed.data.questions.map((q) => ({
      promptAr: q.promptAr,
      promptEn: q.promptEn,
      explanationAr: q.explanationAr ?? null,
      explanationEn: q.explanationEn ?? null,
      options: q.options.map((o) => ({
        labelAr: o.labelAr,
        labelEn: o.labelEn,
        isCorrect: o.isCorrect,
      })),
    })),
  }

  const test = await createTest(payload)
  if (!test) {
    // Either DB failure or race-loss on the slug. Surface slug_taken if a
    // post-hoc check confirms the row landed under another id.
    const racedSlug = await isTestSlugTaken(parsed.data.slug)
    if (racedSlug) return { ok: false, error: 'slug_taken' }
    return { ok: false, error: 'database_error' }
  }

  revalidateTestPaths(test.slug)
  return { ok: true, id: test.id, slug: test.slug }
}

/* ── updateTestAction ──────────────────────────────────────────────────── */

export type UpdateTestActionResult =
  | Ok<{ id: string }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'not_found'
      | 'slug_taken'
      | 'database_error'
    >
  | {
      ok: false
      error: 'confirm_removals_required'
      data: {
        removedQuestionCount: number
        removedOptionCount: number
        affectedAttemptCount: number
      }
    }

export async function updateTestAction(
  raw: UpdateTestInput & { id: string },
): Promise<UpdateTestActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = updateTestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }
  // updateTestSchema doesn't include id — pull it from the raw payload
  // and guard the shape explicitly.
  const id = typeof raw.id === 'string' ? raw.id : null
  if (!id) return { ok: false, error: 'validation' }

  const existing = await getTestForAdmin(id)
  if (!existing) return { ok: false, error: 'not_found' }

  // Compute removals: existing question/option ids that don't appear in
  // the payload. The diff is the source of truth for whether this is a
  // destructive write.
  const incomingQIds = new Set(
    parsed.data.questions
      .map((q) => q.id)
      .filter((x): x is string => typeof x === 'string'),
  )
  const removedQIds = existing.questions
    .filter((q) => !incomingQIds.has(q.id))
    .map((q) => q.id)
  // Per-question option removals — only count options on questions that
  // are NOT being removed (cascade-delete on the question covers removed-
  // question options anyway).
  let removedOptionCount = 0
  for (const eq of existing.questions) {
    if (!incomingQIds.has(eq.id)) continue
    const matching = parsed.data.questions.find((p) => p.id === eq.id)
    if (!matching) continue
    const incomingOIds = new Set(
      matching.options
        .map((o) => o.id)
        .filter((x): x is string => typeof x === 'string'),
    )
    removedOptionCount += eq.options.filter((o) => !incomingOIds.has(o.id))
      .length
  }

  if (
    !parsed.data.confirmRemovals &&
    (removedQIds.length > 0 || removedOptionCount > 0)
  ) {
    // Count historical answer rows that will cascade-delete with the
    // removed questions. (Removed options also cascade, but the user-
    // facing message focuses on questions because they're the bigger
    // editorial unit.)
    const affectedAttemptCount =
      removedQIds.length > 0
        ? await countAttemptAnswersForQuestions(removedQIds)
        : 0
    return {
      ok: false,
      error: 'confirm_removals_required',
      data: {
        removedQuestionCount: removedQIds.length,
        removedOptionCount,
        affectedAttemptCount,
      },
    }
  }

  const payload: UpdateAdminTestInput = {
    id,
    slug: parsed.data.slug,
    titleAr: parsed.data.titleAr,
    titleEn: parsed.data.titleEn,
    introAr: parsed.data.introAr,
    introEn: parsed.data.introEn,
    descriptionAr: parsed.data.descriptionAr,
    descriptionEn: parsed.data.descriptionEn,
    category: parsed.data.category,
    estimatedMinutes: parsed.data.estimatedMinutes,
    coverImageUrl: parsed.data.coverImageUrl ?? null,
    isPublished: parsed.data.isPublished,
    displayOrder: parsed.data.displayOrder,
    questions: parsed.data.questions.map((q) => ({
      id: q.id,
      promptAr: q.promptAr,
      promptEn: q.promptEn,
      explanationAr: q.explanationAr ?? null,
      explanationEn: q.explanationEn ?? null,
      options: q.options.map((o) => ({
        id: o.id,
        labelAr: o.labelAr,
        labelEn: o.labelEn,
        isCorrect: o.isCorrect,
      })),
    })),
  }

  const result = await updateTest(payload)
  if (!result.ok) {
    if (result.error === 'not_found') return { ok: false, error: 'not_found' }
    if (result.error === 'slug_taken') return { ok: false, error: 'slug_taken' }
    return { ok: false, error: 'database_error' }
  }

  // Revalidate the admin + public surfaces. The slug may have changed —
  // revalidate both the new and the old to avoid stale renders on the
  // previous URL.
  revalidateTestPaths(result.test.slug)
  if (existing.slug !== result.test.slug) {
    revalidatePath(`/tests/${existing.slug}`)
    revalidatePath(`/en/tests/${existing.slug}`)
  }
  revalidatePath(`/admin/tests/${result.test.id}/edit`)
  revalidatePath(`/admin/tests/${result.test.id}/analytics`)
  return { ok: true, id: result.test.id }
}

/* ── deleteTestAction ──────────────────────────────────────────────────── */

export type DeleteTestActionResult =
  | Ok<{ id: string }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'database_error'
    >

export async function deleteTestAction(
  raw: DeleteTestInput,
): Promise<DeleteTestActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = deleteTestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // Look up the slug so we can revalidate the public per-slug page after
  // the cascade fires. Test may have already been deleted by a sibling
  // action — that's fine; we just revalidate the catalog only.
  const existing = await getTestForAdmin(parsed.data.id)
  const ok = await deleteTest(parsed.data.id)
  if (!ok) return { ok: false, error: 'database_error' }

  revalidateTestPaths(existing?.slug)
  return { ok: true, id: parsed.data.id }
}

/* ── publishTestAction ─────────────────────────────────────────────────── */

export type PublishTestActionResult =
  | Ok<{ id: string; isPublished: boolean }>
  | Err<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'not_found'
      | 'no_questions'
      | 'database_error'
    >

export async function publishTestAction(
  raw: PublishTestInput,
): Promise<PublishTestActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return guard

  const parsed = publishTestSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  // Block: publishing an empty test puts a no-op in front of users.
  if (parsed.data.isPublished) {
    const existing = await getTestForAdmin(parsed.data.id)
    if (!existing) return { ok: false, error: 'not_found' }
    if (existing.questions.length === 0)
      return { ok: false, error: 'no_questions' }
  }

  const updated = await setTestPublished(parsed.data.id, parsed.data.isPublished)
  if (!updated) return { ok: false, error: 'database_error' }

  revalidateTestPaths(updated.slug)
  return { ok: true, id: updated.id, isPublished: updated.isPublished }
}
