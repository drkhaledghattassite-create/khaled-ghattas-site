import { z } from 'zod'

/**
 * Phase B1 — "Ask Dr. Khaled" validators.
 *
 * The category vocabulary is enforced at THIS layer, not in the DB. We picked
 * a free-text column on `user_questions.category` so admin can add/remove
 * categories without a migration. The tuple below is the single source of
 * truth for the allowed values; the form's <select> options come from
 * translations keyed off these literals.
 *
 * The list mirrors the design bundle (psychology / education / relationships
 * / society / career / general). If admin wants to extend it later, add the
 * literal here AND a translation leaf under
 * `dashboard.ask.form.category_<value>`.
 */
export const QUESTION_CATEGORIES = [
  'psychology',
  'education',
  'relationships',
  'society',
  'career',
  'general',
] as const

export type QuestionCategory = (typeof QUESTION_CATEGORIES)[number]

/**
 * Body limits. The prompt's spec says max 1000 chars; the design's char
 * counter renders against this cap. The min (10 chars) catches accidental
 * blank submissions while staying generous.
 */
export const QUESTION_BODY_MIN = 10
export const QUESTION_BODY_MAX = 1000
export const QUESTION_SUBJECT_MIN = 5
export const QUESTION_SUBJECT_MAX = 120

/**
 * Submission payload — what the form sends to the server action. The action
 * derives userId from the session, so it is intentionally absent here.
 *
 * `category` is typed as `string` (not the QuestionCategory union) to match
 * the form's <select>, which always emits a string. The empty string is
 * the "no selection" sentinel and is mapped to NULL at the action layer.
 * The `refine` check rejects any non-empty string that isn't one of the
 * allowed categories, so DB inserts are still constrained to the tuple.
 *
 * NOTE: the `is_anonymous` column on `user_questions` (migration 0009) is
 * preserved but dormant. The user-facing anonymity toggle was removed; new
 * inserts always write the DB default (`false`). Reintroducing the toggle
 * would re-add the field here.
 */
export const createUserQuestionSchema = z.object({
  subject: z
    .string()
    .trim()
    .min(QUESTION_SUBJECT_MIN, { message: 'subject_too_short' })
    .max(QUESTION_SUBJECT_MAX, { message: 'subject_too_long' }),
  body: z
    .string()
    .trim()
    .min(QUESTION_BODY_MIN, { message: 'body_too_short' })
    .max(QUESTION_BODY_MAX, { message: 'body_too_long' }),
  category: z
    .string()
    .refine(
      (val) =>
        val === '' ||
        (QUESTION_CATEGORIES as readonly string[]).includes(val),
      { message: 'invalid_category' },
    ),
})

export type CreateUserQuestionInput = z.infer<typeof createUserQuestionSchema>

/* ──────────────────────────────────────────────────────────────────────────
 * Phase B2 — admin schemas
 *
 * The admin queue at /admin/questions uses these for status transitions and
 * deletion. ANSWERED requires a non-empty answerReference (URL or free text);
 * PENDING and ARCHIVED MUST clear it (revert state) — enforced via refine.
 * ──────────────────────────────────────────────────────────────────────── */

export const QUESTION_STATUSES = ['PENDING', 'ANSWERED', 'ARCHIVED'] as const
export type QuestionStatusLiteral = (typeof QUESTION_STATUSES)[number]

export const ANSWER_REFERENCE_MAX = 500

export const updateQuestionStatusSchema = z
  .object({
    id: z.string().uuid(),
    status: z.enum(QUESTION_STATUSES),
    // The form sends '' when the input is empty; we treat that as "no
    // reference". Trimmed length is what `refine` checks.
    answerReference: z
      .string()
      .trim()
      .max(ANSWER_REFERENCE_MAX, { message: 'answer_reference_too_long' })
      .optional(),
  })
  .superRefine((data, ctx) => {
    const ref = (data.answerReference ?? '').trim()
    if (data.status === 'ANSWERED' && ref.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['answerReference'],
        message: 'answer_reference_required',
      })
    }
    // PENDING / ARCHIVED → ref is silently cleared by the action layer; we
    // don't reject submissions that include one (admin may have typed it
    // before changing their mind on status), but we also don't persist it.
  })

export type UpdateQuestionStatusInput = z.infer<
  typeof updateQuestionStatusSchema
>

export const deleteQuestionSchema = z.object({
  id: z.string().uuid(),
})

export type DeleteQuestionInput = z.infer<typeof deleteQuestionSchema>

/**
 * Admin queue read params. `status='all'` is the default no-filter view; the
 * three concrete statuses narrow to that group only. `page` is 1-indexed to
 * match the URL query convention used elsewhere on the admin surface.
 */
export const adminQuestionListSchema = z.object({
  status: z.enum([...QUESTION_STATUSES, 'all']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
})

export type AdminQuestionListInput = z.infer<typeof adminQuestionListSchema>
