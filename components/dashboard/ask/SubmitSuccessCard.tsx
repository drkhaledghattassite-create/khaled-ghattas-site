'use client'

/**
 * Phase B1 — replaces the form briefly after a successful submission.
 *
 * Two CTAs: "Ask another" returns to the editing form; "View my questions"
 * smooth-scrolls to the history list (where the optimistically-prepended
 * card is now at the top).
 */

import { useTranslations } from 'next-intl'
import { Check, ArrowLeft, ArrowRight } from 'lucide-react'

type Props = {
  locale: 'ar' | 'en'
  onAskAnother: () => void
  onViewList: () => void
}

export function SubmitSuccessCard({ locale, onAskAnother, onViewList }: Props) {
  const t = useTranslations('dashboard.ask.success')
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex flex-col items-start gap-4 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(32px,4vw,56px)] shadow-[var(--shadow-card)]"
    >
      {/* Top accent rule */}
      <span
        aria-hidden
        className="absolute start-0 top-0 inline-block h-[3px] w-14 bg-[var(--color-accent)]"
      />

      <span
        aria-hidden
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <Check className="h-5 w-5" strokeWidth={2.5} />
      </span>

      <h3
        className={`m-0 text-[24px] font-bold leading-[1.25] text-[var(--color-fg1)] font-arabic-display ${
          isRtl ? '' : '!tracking-[-0.02em]'
        }`}
      >
        {t('title')}
      </h3>
      <p
        className={`m-0 max-w-[52ch] text-[var(--color-fg2)] ${
          isRtl
            ? 'font-arabic-body text-[16px] leading-[1.85]'
            : 'font-display text-[15px] leading-[1.7]'
        }`}
      >
        {t('body')}
      </p>

      <div className="mt-2 flex flex-wrap gap-2.5">
        <button
          type="button"
          onClick={onAskAnother}
          className={`btn-pill btn-pill-primary inline-flex items-center gap-2 ${fontBody}`}
        >
          {t('ask_another')}
          {isRtl ? (
            <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={onViewList}
          className={`btn-pill btn-pill-secondary ${fontBody}`}
        >
          {t('view_list')}
        </button>
      </div>
    </div>
  )
}
