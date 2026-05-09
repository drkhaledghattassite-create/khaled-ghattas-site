'use client'

/**
 * Phase B1 — submission form for /dashboard/ask.
 *
 * Three fields: subject / body / optional category. Validation runs
 * client-side via zodResolver and server-side inside
 * `createUserQuestionAction`. Errors map to localized strings; the
 * rate-limit case has its own dedicated copy ("wait an hour").
 *
 * NOTE: an anonymity toggle was specced for the original design but
 * removed before launch. The `is_anonymous` column on `user_questions`
 * (migration 0009) is dormant — every insert writes the DB default
 * (`false`).
 */

import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  createUserQuestionSchema,
  QUESTION_BODY_MAX,
  QUESTION_CATEGORIES,
  type CreateUserQuestionInput,
} from '@/lib/validators/user-question'
import { createUserQuestionAction } from '@/app/[locale]/(dashboard)/dashboard/ask/actions'
import type { ClientUserQuestion } from './AskDrKhaledPage'

type Props = {
  locale: 'ar' | 'en'
  onSubmitted: (q: ClientUserQuestion) => void
}

const inputClass =
  'w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-4 py-3 text-[15px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)] outline-none transition-[border-color,box-shadow] duration-200 focus:border-[var(--color-accent)] focus:shadow-[var(--shadow-focus)]'
const inputErrorClass =
  'border-[var(--color-danger)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-danger)_18%,transparent)]'

export function QuestionForm({ locale, onSubmitted }: Props) {
  const t = useTranslations('dashboard.ask.form')
  const tShared = useTranslations('dashboard.ask.shared')
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const [pending, startTransition] = useTransition()

  const form = useForm<CreateUserQuestionInput>({
    resolver: zodResolver(createUserQuestionSchema),
    mode: 'onBlur',
    defaultValues: {
      subject: '',
      body: '',
      category: '',
    },
  })

  const subjectError = form.formState.errors.subject?.message
  const bodyError = form.formState.errors.body?.message

  const bodyValue = form.watch('body') ?? ''
  const charCount = bodyValue.length
  const charClass =
    charCount > QUESTION_BODY_MAX
      ? 'text-[var(--color-danger)] font-bold'
      : charCount > QUESTION_BODY_MAX * 0.9
        ? 'text-[var(--color-accent)]'
        : 'text-[var(--color-fg3)]'

  const onSubmit = (raw: CreateUserQuestionInput) => {
    startTransition(async () => {
      try {
        const res = await createUserQuestionAction(raw)
        if (res.ok) {
          // Optimistic project of the submitted question. The server action
          // returns just the id; we synthesise the rest from the form state.
          // Empty string (no selection) maps to null in the same way the
          // action layer does, so the optimistic card matches the DB row.
          const optimistic: ClientUserQuestion = {
            id: res.id,
            subject: raw.subject,
            body: raw.body,
            category: raw.category === '' ? null : raw.category,
            status: 'PENDING',
            answerReference: null,
            answeredAt: null,
            createdAt: new Date().toISOString(),
          }
          form.reset({
            subject: '',
            body: '',
            category: '',
          })
          toast.success(t('success_toast'))
          onSubmitted(optimistic)
          return
        }
        const errorKey =
          res.error === 'unauthorized'
            ? 'error_unauthorized'
            : res.error === 'rate_limited'
              ? 'error_rate_limited'
              : res.error === 'validation'
                ? 'error_validation'
                : 'error_generic'
        toast.error(t(errorKey))
      } catch (err) {
        // Network or runtime crash — defensive. The action layer is
        // already resilient (returns discriminated unions for known
        // failures), so reaching this branch typically means a fetch
        // abort or a Next.js runtime hiccup.
        console.error('[QuestionForm]', err)
        toast.error(t('error_generic'))
      }
    })
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(24px,3vw,36px)] shadow-[var(--shadow-card)]">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-[22px]"
        noValidate
      >
        {/* Section heading */}
        <div className="flex flex-col gap-1.5">
          <span
            className={`text-[var(--color-fg3)] ${
              isRtl
                ? 'font-arabic-body text-[13px] font-bold'
                : 'font-display text-[11px] font-semibold uppercase tracking-[0.16em]'
            }`}
          >
            {t('section_eyebrow')}
          </span>
          <p
            className={`m-0 text-[var(--color-fg3)] ${
              isRtl
                ? 'font-arabic-body text-[15px] leading-[1.7]'
                : 'font-display text-[14px] leading-[1.5]'
            }`}
          >
            {t('section_sub')}
          </p>
        </div>

        {/* Subject */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="ask-subject"
              className={`text-[var(--color-fg2)] ${
                isRtl
                  ? 'font-arabic-body text-[13px] font-bold'
                  : 'font-display text-[12px] font-semibold tracking-[0.04em]'
              }`}
            >
              {t('subject_label')}
            </label>
            <span
              className={`text-[var(--color-fg3)] ${
                isRtl
                  ? 'font-arabic-body text-[12px]'
                  : 'font-display text-[11px]'
              }`}
            >
              {t('subject_hint')}
            </span>
          </div>
          <input
            id="ask-subject"
            type="text"
            maxLength={120}
            placeholder={t('subject_placeholder')}
            disabled={pending}
            aria-invalid={subjectError ? true : undefined}
            aria-describedby={subjectError ? 'ask-subject-error' : undefined}
            {...form.register('subject')}
            className={`${inputClass} ${subjectError ? inputErrorClass : ''} ${fontBody}`}
          />
          {subjectError && (
            <span
              id="ask-subject-error"
              className={`inline-flex items-center gap-1.5 text-[var(--color-danger)] ${
                isRtl
                  ? 'font-arabic-body text-[13px]'
                  : 'font-display text-[12.5px]'
              }`}
            >
              <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {tShared(subjectError)}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="ask-body"
              className={`text-[var(--color-fg2)] ${
                isRtl
                  ? 'font-arabic-body text-[13px] font-bold'
                  : 'font-display text-[12px] font-semibold tracking-[0.04em]'
              }`}
            >
              {t('body_label')}
            </label>
            <span
              aria-live="polite"
              className={`[font-feature-settings:'tnum'] ${
                isRtl
                  ? 'font-arabic-body text-[12px]'
                  : 'font-display text-[11px]'
              } ${charClass}`}
            >
              {t('body_counter', { count: charCount, max: QUESTION_BODY_MAX })}
            </span>
          </div>
          <textarea
            id="ask-body"
            rows={6}
            placeholder={t('body_placeholder')}
            disabled={pending}
            aria-invalid={bodyError ? true : undefined}
            aria-describedby={bodyError ? 'ask-body-error' : undefined}
            {...form.register('body')}
            className={`${inputClass} min-h-[160px] resize-y leading-[1.7] ${bodyError ? inputErrorClass : ''} ${fontBody}`}
          />
          {bodyError && (
            <span
              id="ask-body-error"
              className={`inline-flex items-center gap-1.5 text-[var(--color-danger)] ${
                isRtl
                  ? 'font-arabic-body text-[13px]'
                  : 'font-display text-[12.5px]'
              }`}
            >
              <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
              {tShared(bodyError)}
            </span>
          )}
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor="ask-category"
              className={`text-[var(--color-fg2)] ${
                isRtl
                  ? 'font-arabic-body text-[13px] font-bold'
                  : 'font-display text-[12px] font-semibold tracking-[0.04em]'
              }`}
            >
              {t('category_label')}
            </label>
            <span
              className={`text-[var(--color-fg3)] ${
                isRtl
                  ? 'font-arabic-body text-[12px]'
                  : 'font-display text-[11px]'
              }`}
            >
              {t('category_hint')}
            </span>
          </div>
          <div className="relative">
            <select
              id="ask-category"
              disabled={pending}
              {...form.register('category')}
              className={`${inputClass} appearance-none cursor-pointer pe-10 ${fontBody}`}
            >
              <option value="">{t('category_placeholder')}</option>
              {QUESTION_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`category_${cat}`)}
                </option>
              ))}
            </select>
            <span
              aria-hidden
              className="pointer-events-none absolute end-4 top-1/2 inline-block h-2 w-2 -translate-y-[70%] rotate-[-45deg] border-b-[1.5px] border-s-[1.5px] border-[var(--color-fg2)]"
            />
          </div>
        </div>

        {/* Footer — disclaimer + submit */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <span
            className={`text-[var(--color-fg3)] ${
              isRtl
                ? 'font-arabic-body text-[13px]'
                : 'font-display text-[12.5px]'
            }`}
          >
            {t('foot_note')}
          </span>
          <button
            type="submit"
            disabled={pending}
            className={`btn-pill btn-pill-primary inline-flex items-center gap-2 ${fontBody} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {pending ? (
              <>
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                {t('submitting')}
              </>
            ) : (
              <>
                {t('submit')}
                {isRtl ? (
                  <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
                ) : (
                  <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                )}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
