'use client'

import { useTranslations } from 'next-intl'
import { fmtAmount, type SelectedItem } from './types'

type Props = {
  isRtl: boolean
  locale: string
  selected: SelectedItem | null
  recipientEmail: string
  recipientLocale: 'ar' | 'en'
  message: string
  onBackToNote: () => void
  onSubmit: () => void
  isPending: boolean
  errorKey: string | null
}

export function Step4Review({
  isRtl,
  locale,
  selected,
  recipientEmail,
  recipientLocale,
  message,
  onBackToNote,
  onSubmit,
  isPending,
  errorKey,
}: Props) {
  const t = useTranslations('gifts.send')
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  if (!selected) {
    return (
      <div className="grid gap-3 max-w-[560px] mx-auto text-center py-8">
        <p
          className={`m-0 text-[14px] text-[var(--color-fg3)] ${fontBody}`}
        >
          {t('select_item_first')}
        </p>
      </div>
    )
  }

  const title = isRtl ? selected.titleAr : selected.titleEn
  const localeLabel = t(
    recipientLocale === 'ar' ? 'review.locale_ar' : 'review.locale_en',
  )
  const trimmed = message.trim()

  return (
    <div className="grid gap-6 max-w-[640px] mx-auto">
      <header className="grid gap-2 text-center">
        <h2
          className={`m-0 text-[clamp(22px,3vw,28px)] font-bold leading-[1.15] text-[var(--color-fg1)] ${fontDisplay}`}
        >
          {t('step_titles.review')}
        </h2>
        <p
          className={`m-0 mx-auto max-w-[440px] text-[15px] leading-[1.55] text-[var(--color-fg2)] ${fontBody}`}
        >
          {t('step_subs.review')}
        </p>
      </header>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)] divide-y divide-[var(--color-border)]">
        <div className="grid gap-3 p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <span
            className={`text-[12px] uppercase tracking-[0.06em] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
            }`}
          >
            {t('summary_item')}
          </span>
          <div className="flex items-center gap-3">
            <span
              className="relative shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--color-bg-deep)] w-[56px] h-[72px]"
              aria-hidden="true"
            >
              {selected.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.coverImage}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[var(--color-accent)]">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 7l9-4 9 4" />
                    <path d="M5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                    <path d="M9 19v-7h6v7" />
                  </svg>
                </span>
              )}
            </span>
            <div className="min-w-0">
              <p
                className={`m-0 text-[15px] font-semibold leading-[1.3] text-[var(--color-fg1)] line-clamp-2 ${fontBody}`}
              >
                {title}
              </p>
              <p
                className={`m-0 text-[12px] text-[var(--color-fg3)] mt-0.5 ${fontBody}`}
              >
                {t(`tabs.${selected.type}`)}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-[120px_1fr] sm:items-center">
          <span
            className={`text-[12px] uppercase tracking-[0.06em] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
            }`}
          >
            {t('summary_recipient')}
          </span>
          <div className="grid gap-1">
            <span
              dir="ltr"
              className={`text-[15px] text-[var(--color-fg1)] text-start ${fontBody}`}
            >
              {recipientEmail || '—'}
            </span>
            <span
              className={`text-[12px] text-[var(--color-fg3)] ${fontBody}`}
            >
              {localeLabel}
            </span>
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-[120px_1fr] sm:items-start">
          <span
            className={`text-[12px] uppercase tracking-[0.06em] text-[var(--color-fg3)] ${
              isRtl ? 'font-arabic-body normal-case tracking-normal' : 'font-display'
            }`}
          >
            {t('review.label_note')}
          </span>
          {trimmed ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-deep)] px-4 py-3">
              <p
                className={`m-0 text-[14px] leading-[1.65] text-[var(--color-fg1)] whitespace-pre-wrap ${
                  isRtl ? 'font-arabic-body' : 'font-display italic'
                }`}
              >
                {trimmed}
              </p>
            </div>
          ) : (
            <span
              className={`text-[14px] text-[var(--color-fg3)] ${fontBody}`}
            >
              {t('review.no_note')}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-5">
          <span
            className={`text-[13px] font-semibold text-[var(--color-fg2)] ${fontBody}`}
          >
            {t('summary_amount')}
          </span>
          <span
            className={`text-[20px] font-bold text-[var(--color-fg1)] ${fontDisplay}`}
          >
            {fmtAmount(selected.priceCents, selected.currency, locale)}
          </span>
        </div>
      </div>

      {errorKey && (
        <p
          role="alert"
          className={`m-0 text-center text-[14px] text-[var(--color-destructive)] ${fontBody}`}
        >
          {t(`errors.${errorKey}`)}
        </p>
      )}

      <div className="grid gap-3 sm:flex sm:items-center sm:justify-center">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isPending}
          className="btn-pill btn-pill-accent disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isPending
            ? t('submit_loading')
            : t('submit_cta', {
                amount: fmtAmount(
                  selected.priceCents,
                  selected.currency,
                  locale,
                ),
              })}
        </button>
        <button
          type="button"
          onClick={onBackToNote}
          className={`text-[14px] text-[var(--color-fg2)] hover:text-[var(--color-accent)] underline-offset-4 hover:underline transition-colors ${fontBody}`}
        >
          {t('review.back_to_edit')}
        </button>
      </div>
    </div>
  )
}
