'use client'

/**
 * Phase C1 — take a test, one question at a time.
 *
 * Owns: currentQuestionIndex, selectedAnswers (Map<questionId, optionId>),
 * isSubmitting, exit-modal state. Submission is the only async boundary —
 * everything else is local component state.
 *
 * Keyboard:
 *   - 1..N selects option N for the current question (where N is the
 *     option count, max 6)
 *   - ArrowLeft / ArrowRight navigate prev / next, mirrored under RTL
 *   - Enter advances when an option is selected
 *
 * The exit modal is rendered on confirm — there is NO save-and-resume by
 * design. The user is told plainly that progress will be lost.
 */

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  LogOut,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useRouter } from '@/lib/i18n/navigation'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { submitTestAttemptAction } from '@/app/[locale]/(public)/tests/actions'

type TakeOption = {
  id: string
  labelAr: string
  labelEn: string
}

type TakeQuestion = {
  id: string
  promptAr: string
  promptEn: string
  options: TakeOption[]
}

type TakeTest = {
  slug: string
  titleAr: string
  titleEn: string
  questions: TakeQuestion[]
}

type Props = {
  locale: 'ar' | 'en'
  test: TakeTest
}

const OPT_MARKERS_AR = ['أ', 'ب', 'ج', 'د', 'هـ', 'و']
const OPT_MARKERS_EN = ['A', 'B', 'C', 'D', 'E', 'F']

function toArDigits(n: number) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)])
}

function fmtNum(n: number, locale: 'ar' | 'en') {
  return locale === 'ar' ? toArDigits(n) : String(n)
}

export function TestTakePage({ locale, test }: Props) {
  const t = useTranslations('tests.take')
  const tShared = useTranslations('tests')
  const router = useRouter()
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const ArrowBack = isRtl ? ArrowRight : ArrowLeft
  const markers = isRtl ? OPT_MARKERS_AR : OPT_MARKERS_EN

  const totalQuestions = test.questions.length
  const [idx, setIdx] = useState(0)
  // Map questionId -> selectedOptionId. Persists across prev/next navigation.
  const [selected, setSelected] = useState<Record<string, string>>({})
  const [showExit, setShowExit] = useState(false)
  const [pending, startTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const currentQuestion = test.questions[idx]
  const currentSelection = currentQuestion
    ? selected[currentQuestion.id]
    : undefined
  const isLast = idx === totalQuestions - 1
  const allAnswered = totalQuestions > 0
    && test.questions.every((q) => !!selected[q.id])

  const onSelect = useCallback(
    (questionId: string, optionId: string) => {
      setSelected((prev) => ({ ...prev, [questionId]: optionId }))
    },
    [],
  )

  const goPrev = useCallback(() => {
    if (idx > 0) setIdx(idx - 1)
  }, [idx])

  const onSubmit = useCallback(() => {
    if (!allAnswered || pending) return
    setSubmitError(null)
    startTransition(async () => {
      const answers = test.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: selected[q.id],
      }))
      const res = await submitTestAttemptAction({
        testSlug: test.slug,
        answers,
      })
      if (res.ok) {
        router.push(`/tests/${test.slug}/result/${res.attemptId}`)
        return
      }
      const code = res.error
      const message =
        code === 'rate_limited'
          ? t('error_rate_limited')
          : code === 'unauthorized'
            ? t('error_unauthorized')
            : code === 'not_found'
              ? t('error_not_found')
              : code === 'validation'
                ? t('error_validation')
                : t('error_generic')
      setSubmitError(message)
      toast.error(message)
    })
  }, [allAnswered, pending, router, selected, t, test.questions, test.slug])

  const goNext = useCallback(() => {
    if (!currentSelection) return
    if (isLast) {
      onSubmit()
      return
    }
    setIdx(idx + 1)
  }, [currentSelection, idx, isLast, onSubmit])

  // Keyboard shortcuts. Number keys select options; arrows navigate.
  // Mirror left/right under RTL so "next" is always physically the
  // direction the eye reads forward.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showExit) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return
      }
      if (!currentQuestion) return
      const num = Number.parseInt(e.key, 10)
      if (
        Number.isFinite(num) &&
        num >= 1 &&
        num <= currentQuestion.options.length
      ) {
        e.preventDefault()
        const opt = currentQuestion.options[num - 1]
        if (opt) onSelect(currentQuestion.id, opt.id)
        return
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (isRtl) goPrev()
        else goNext()
        return
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (isRtl) goNext()
        else goPrev()
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentQuestion, goNext, goPrev, isRtl, onSelect, showExit])

  if (!currentQuestion) {
    // Defense: a test with zero questions shouldn't be reachable (the
    // detail page disables the Start CTA), but if someone deep-links
    // to /take, render a quiet empty state.
    return (
      <div className="flex min-h-dvh items-center justify-center p-10 text-[var(--color-fg2)]">
        <p>{tShared('detail.cta.empty_test')}</p>
      </div>
    )
  }

  const progressPct = Math.round(((idx + 1) / totalQuestions) * 100)
  const title = isRtl ? test.titleAr : test.titleEn
  const prompt = isRtl ? currentQuestion.promptAr : currentQuestion.promptEn

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)]">
      {/* Custom focus chrome — separate from SiteHeader */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-bg)]/[0.92] backdrop-blur-md backdrop-saturate-[1.2]">
        <div className="mx-auto grid max-w-[980px] grid-cols-[auto_1fr_auto] items-center gap-[18px] [padding:16px_clamp(20px,4vw,40px)]">
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className={`inline-flex items-center gap-2 text-[14px] font-bold text-[var(--color-fg1)] transition-opacity duration-200 hover:opacity-70 ${
              isRtl ? 'font-arabic-display' : 'font-display !tracking-[-0.01em]'
            }`}
            aria-label={t('mark_aria')}
          >
            {isRtl ? 'خالد غطاس' : 'Khaled Ghattass'}
          </button>
          <span
            className={`truncate text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
              isRtl
                ? 'font-arabic-body !text-[13px] !normal-case !tracking-normal'
                : 'font-display'
            }`}
          >
            {title}
          </span>
          <button
            type="button"
            onClick={() => setShowExit(true)}
            className={`inline-flex items-center gap-1 rounded-full bg-transparent px-3 py-1.5 text-[12.5px] font-semibold text-[var(--color-fg3)] transition-colors duration-200 hover:bg-[var(--color-bg-deep)] hover:text-[var(--color-fg1)] ${
              isRtl ? 'font-arabic-body !text-[13px] !font-bold' : 'font-display'
            }`}
          >
            <LogOut aria-hidden className="h-[13px] w-[13px]" />
            <span>{t('exit')}</span>
          </button>
        </div>
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-2.5 [padding:10px_clamp(20px,4vw,40px)_16px]">
          <div
            className={`flex items-center justify-between text-[12px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
              isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
            }`}
          >
            <span>
              {t('progress', {
                current: fmtNum(idx + 1, locale),
                total: fmtNum(totalQuestions, locale),
              })}
            </span>
          </div>
          <div className="h-[3px] overflow-hidden rounded-full bg-[var(--color-bg-deep)]">
            <motion.div
              className="h-full rounded-[inherit] bg-[var(--color-accent)]"
              initial={false}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
            />
          </div>
        </div>
      </header>

      {/* Main question area — `section` (not `main`) because the focus
       * layout's <main id="main-content"> already wraps this page; nesting
       * a second `<main>` is a WCAG 1.3.1 / ARIA-only-one-main violation. */}
      <section className="flex flex-1 items-start justify-center [padding:clamp(40px,6vw,72px)_clamp(20px,4vw,40px)_clamp(120px,14vw,160px)]">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_EDITORIAL }}
          className="flex w-full max-w-[720px] flex-col gap-[clamp(28px,3vw,40px)]"
        >
          <span
            className={`inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg3)] after:block after:h-px after:max-w-[60px] after:flex-1 after:bg-[var(--color-border)] after:content-[''] ${
              isRtl
                ? 'font-arabic-body !text-[13px] !normal-case !tracking-normal'
                : 'font-display'
            }`}
          >
            {t('question_number', { current: fmtNum(idx + 1, locale) })}
          </span>
          <h2
            className={`m-0 text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.4] tracking-[-0.005em] text-[var(--color-fg1)] [text-wrap:balance] ${
              isRtl
                ? 'font-arabic-display'
                : 'font-display !tracking-[-0.015em] !leading-[1.3]'
            }`}
          >
            {prompt}
          </h2>

          <div role="radiogroup" aria-label={t('options_aria')} className="flex flex-col gap-3">
            {currentQuestion.options.map((opt, i) => {
              const isChecked = currentSelection === opt.id
              const label = isRtl ? opt.labelAr : opt.labelEn
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={isChecked}
                  onClick={() => onSelect(currentQuestion.id, opt.id)}
                  className={`grid grid-cols-[36px_1fr_24px] items-center gap-4 rounded-[var(--radius-md)] border px-5 py-4 text-start transition-[border-color,background-color,transform] duration-200 active:scale-[0.998] ${
                    isChecked
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : 'border-[var(--color-border)] bg-[var(--color-bg-elevated)] hover:border-[var(--color-fg2)]'
                  }`}
                >
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] font-bold transition-all duration-200 ${
                      isChecked
                        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                        : 'border-[var(--color-border-strong)] text-[var(--color-fg2)]'
                    } ${isRtl ? 'font-arabic-body text-[15px]' : 'font-display text-[13px]'}`}
                    aria-hidden
                  >
                    {markers[i] ?? String(i + 1)}
                  </span>
                  <span
                    className={`text-[17px] leading-[1.6] text-[var(--color-fg1)] ${
                      isRtl ? 'font-arabic-body' : 'font-display !text-[16px] !leading-[1.5]'
                    }`}
                  >
                    {label}
                  </span>
                  <span aria-hidden className="flex justify-end text-[var(--color-accent)]">
                    {isChecked ? <Check className="h-4 w-4" /> : null}
                  </span>
                </button>
              )
            })}
          </div>

          {submitError && (
            <div
              role="alert"
              className={`flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-destructive)] bg-[color-mix(in_srgb,var(--color-destructive)_8%,var(--color-bg-elevated))] px-4 py-3 text-[14px] text-[var(--color-destructive)] ${fontBody}`}
            >
              <AlertCircle aria-hidden className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Desktop nav row */}
          <div className="hidden items-center gap-3.5 pt-3 sm:grid sm:grid-cols-[auto_1fr_auto]">
            <button
              type="button"
              onClick={goPrev}
              disabled={idx === 0 || pending}
              className={`inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-6 py-3 text-[14px] font-semibold text-[var(--color-fg2)] transition-colors duration-200 hover:bg-[var(--color-bg-deep)] hover:text-[var(--color-fg1)] disabled:cursor-not-allowed disabled:opacity-45 ${
                isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
              }`}
            >
              <ArrowBack aria-hidden className="h-[13px] w-[13px]" />
              <span>{t('previous')}</span>
            </button>
            <span
              className={`text-center text-[12px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
              }`}
            >
              {t('keyboard_hint')}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={!currentSelection || pending}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
                isLast
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]'
                  : 'bg-[var(--color-fg1)] text-[var(--color-bg)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]'
              } ${isRtl ? 'font-arabic-body !text-[16px] !font-bold' : 'font-display'}`}
            >
              {pending ? (
                <Loader2 aria-hidden className="h-[13px] w-[13px] animate-spin" />
              ) : null}
              <span>{isLast ? t('submit') : t('next')}</span>
              {!isLast && !pending && <Arrow aria-hidden className="h-[13px] w-[13px]" />}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Mobile sticky bottom bar */}
      <div
        className="fixed start-0 end-0 bottom-0 z-30 grid grid-cols-2 gap-3 border-t border-[var(--color-border)] bg-[var(--color-bg)]/95 [padding:14px_16px_calc(14px+env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden"
        aria-hidden={false}
      >
        <button
          type="button"
          onClick={goPrev}
          disabled={idx === 0 || pending}
          className={`inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-4 py-3 text-[14px] font-semibold text-[var(--color-fg2)] transition-colors duration-200 hover:text-[var(--color-fg1)] disabled:cursor-not-allowed disabled:opacity-45 ${
            isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
          }`}
        >
          <ArrowBack aria-hidden className="h-[13px] w-[13px]" />
          <span>{t('previous')}</span>
        </button>
        <button
          type="button"
          onClick={goNext}
          disabled={!currentSelection || pending}
          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45 ${
            isLast
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)]'
              : 'bg-[var(--color-fg1)] text-[var(--color-bg)] hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-fg)]'
          } ${isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'}`}
        >
          {pending ? (
            <Loader2 aria-hidden className="h-[13px] w-[13px] animate-spin" />
          ) : null}
          <span>{isLast ? t('submit') : t('next')}</span>
          {!isLast && !pending && <Arrow aria-hidden className="h-[13px] w-[13px]" />}
        </button>
      </div>

      {/* Exit confirm modal */}
      <AlertDialog open={showExit} onOpenChange={setShowExit}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exit_modal.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('exit_modal.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('exit_modal.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowExit(false)
                router.push('/tests')
              }}
            >
              {t('exit_modal.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
