'use client'

/**
 * Phase B1 — empty state when the user has never submitted a question.
 *
 * The CTA focuses the form's subject input (the form lives above this
 * component on the page) so the user can start typing without scrolling.
 */

import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, PenLine } from 'lucide-react'

type Props = {
  locale: 'ar' | 'en'
}

export function AskEmptyState({ locale }: Props) {
  const t = useTranslations('dashboard.ask.empty')
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const focusForm = () => {
    if (typeof document !== 'undefined') {
      const el = document.getElementById('ask-subject') as HTMLInputElement | null
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="flex flex-col items-center gap-3.5 rounded-lg border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] px-[clamp(20px,4vw,40px)] py-[clamp(48px,7vw,80px)] text-center">
      <span
        aria-hidden
        className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <PenLine className="h-5 w-5" strokeWidth={1.8} />
      </span>
      <h3
        className={`m-0 text-[22px] font-bold text-[var(--color-fg1)] font-arabic-display ${
          isRtl ? '' : '!tracking-[-0.015em]'
        }`}
      >
        {t('title')}
      </h3>
      <p
        className={`m-0 max-w-[44ch] text-[var(--color-fg2)] ${
          isRtl
            ? 'font-arabic-body text-[16px] leading-[1.85]'
            : 'font-display text-[15px] leading-[1.65]'
        }`}
      >
        {t('body')}
      </p>
      <button
        type="button"
        onClick={focusForm}
        className={`btn-pill inline-flex items-center gap-2 mt-1.5 bg-[var(--color-accent)] text-[var(--color-accent-fg)] hover:bg-[var(--color-accent-hover)] ${fontBody}`}
      >
        {t('cta')}
        {isRtl ? (
          <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        ) : (
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}
