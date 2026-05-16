import { z } from 'zod'
import { urlOrStorageKey } from './storage'

/**
 * Phase C1 — Tests & Quizzes validators.
 *
 * Test categories mirror the user_questions vocabulary exactly so a single
 * mental model spans both surfaces. Stored as plain text on `tests.category`;
 * this tuple is the single source of truth for the allowed values. The
 * catalog filter pills and admin form (Phase C2) read from the same list.
 */
export const TEST_CATEGORIES = [
  'psychology',
  'education',
  'relationships',
  'society',
  'career',
  'general',
] as const

export type TestCategory = (typeof TEST_CATEGORIES)[number]

export const testCategorySchema = z.enum(TEST_CATEGORIES)

/**
 * Submit-attempt payload — what the take page sends to the server action.
 *
 * The server action enforces three integrity rules that the schema cannot:
 *   1. Every questionId in `answers` must belong to the test identified
 *      by `testSlug`.
 *   2. Every selectedOptionId must belong to its respective question.
 *   3. The user must have answered every question in the test (no missing,
 *      no duplicates, no extras).
 *
 * App-layer constraint also enforced at submit time:
 *   - Each question must have exactly one option with isCorrect=true. If a
 *     test has zero or multiple correct options for a question (admin error),
 *     the action returns `validation`. Phase C2 admin form prevents this at
 *     write time.
 */
export const submitAttemptInputSchema = z.object({
  testSlug: z.string().min(1).max(120),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid(),
        selectedOptionId: z.string().uuid(),
      }),
    )
    .min(1)
    .max(50),
})

export type SubmitAttemptInput = z.infer<typeof submitAttemptInputSchema>

/* ── Phase C2 — admin schemas ──────────────────────────────────────────── */

/**
 * Slug rule: lowercase letters, digits, and hyphens only. The DB has a
 * UNIQUE constraint on `tests.slug` — uniqueness is enforced at write time
 * by the action layer (which catches the constraint error and surfaces
 * `slug_taken`). The regex is the lexical contract.
 */
const SLUG_REGEX = /^[a-z0-9-]+$/

const optionInputSchema = z.object({
  id: z.string().uuid().optional(),
  labelAr: z.string().min(1).max(300),
  labelEn: z.string().min(1).max(300),
  isCorrect: z.boolean(),
})

const questionInputSchema = z
  .object({
    id: z.string().uuid().optional(),
    promptAr: z.string().min(1).max(1000),
    promptEn: z.string().min(1).max(1000),
    explanationAr: z.string().max(2000).nullable().optional(),
    explanationEn: z.string().max(2000).nullable().optional(),
    options: z.array(optionInputSchema).min(2).max(6),
  })
  .superRefine((q, ctx) => {
    // Exactly one option must be flagged correct. The C1 submit action
    // already trips on this app-layer invariant; the admin form is where
    // we prevent bad data from being persisted in the first place.
    const correct = q.options.filter((o) => o.isCorrect).length
    if (correct !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'exactly_one_correct',
      })
    }
  })

const baseTestSchema = z.object({
  slug: z.string().min(1).max(80).regex(SLUG_REGEX, 'invalid_slug'),
  titleAr: z.string().min(1).max(200),
  titleEn: z.string().min(1).max(200),
  descriptionAr: z.string().min(1).max(300),
  descriptionEn: z.string().min(1).max(300),
  introAr: z.string().min(1).max(2000),
  introEn: z.string().min(1).max(2000),
  category: testCategorySchema,
  estimatedMinutes: z.number().int().min(1).max(120),
  // Phase F1+ — accepts external URLs (legacy paste) or R2 test-cover keys.
  // Form coerces '' → null client-side before submit; pass null explicitly to clear.
  coverImageUrl: urlOrStorageKey.nullable().optional(),
  isPublished: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  questions: z.array(questionInputSchema).min(1).max(50),
})

export const createTestSchema = baseTestSchema
export const updateTestSchema = baseTestSchema.extend({
  // The diff path only fires when the caller passes confirmRemovals=true,
  // OR when no questions/options are being removed. The action checks both
  // and returns 'confirm_removals_required' for the unconfirmed-removal
  // case. Default false so the safe path is the default.
  confirmRemovals: z.boolean().default(false),
})

export const deleteTestSchema = z.object({ id: z.string().uuid() })
export const publishTestSchema = z.object({
  id: z.string().uuid(),
  isPublished: z.boolean(),
})

export type CreateTestInput = z.infer<typeof createTestSchema>
export type UpdateTestInput = z.infer<typeof updateTestSchema>
export type DeleteTestInput = z.infer<typeof deleteTestSchema>
export type PublishTestInput = z.infer<typeof publishTestSchema>
export type TestQuestionInput = z.infer<typeof questionInputSchema>
export type TestOptionInput = z.infer<typeof optionInputSchema>
