'use client'

/**
 * Phase B1 — sticky "before you send" guide.
 *
 * Sits next to the form on desktop. Renders a short list of writing pointers
 * + a footer note about the public nature of replies. Pure presentation —
 * no state, no interactivity.
 */

import { useTranslations } from 'next-intl'

type Props = {
  locale: 'ar' | 'en'
}

const POINT_KEYS = [
  'point_one_question',
  'point_set_context',
  'point_personal_ok',
  'point_no_clinical',
] as const

export function AskGuide({ locale }: Props) {
  const t = useTranslations('dashboard.ask.guide')
  const isRtl = locale === 'ar'
  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'

  return (
    <aside
      aria-labelledby="ask-guide-heading"
      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-[clamp(20px,2.5vw,28px)] shadow-[var(--shadow-card)]"
    >
      <h3
        id="ask-guide-heading"
        className={`m-0 mb-3 text-[17px] font-bold text-[var(--color-fg1)] ${fontDisplay} ${
          isRtl ? '' : '!tracking-[-0.01em]'
        }`}
      >
        {t('title')}
      </h3>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {POINT_KEYS.map((key) => (
          <li
            key={key}
            className={`grid grid-cols-[18px_1fr] gap-2.5 text-[var(--color-fg2)] ${
              isRtl
                ? 'font-arabic-body text-[15px] leading-[1.7]'
                : 'font-display text-[14px] leading-[1.55]'
            }`}
          >
            <span
              aria-hidden
              className="mt-2 inline-block h-1.5 w-1.5 self-start rounded-full bg-[var(--color-accent)]"
            />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <p
        className={`mt-4 border-t border-[var(--color-border)] pt-4 text-[var(--color-fg3)] ${
          isRtl
            ? 'font-arabic-body text-[13px] leading-[1.75]'
            : 'font-display text-[12.5px] leading-[1.6]'
        }`}
      >
        {t('foot')}
      </p>
    </aside>
  )
}
