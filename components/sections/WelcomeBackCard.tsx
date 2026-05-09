'use client'

/**
 * Phase 5.2 — Welcome back banner (client side).
 *
 * Compact greeting strip mounted above the public homepage hero for
 * logged-in users. Two content shapes:
 *
 *   - With activity → greeting + the most-recent unfinished BOOK or
 *     SESSION + "Continue" CTA. Shape mirrors ContinueReadingHero but
 *     stripped down: no progress ring, no item-thumbnail. The library
 *     hero stays the canonical full-fat view.
 *   - Without activity → greeting + "Browse your library" CTA.
 *
 * The card is intentionally smaller and visually quieter than the hero
 * so it doesn't compete with the homepage Hero section that follows it.
 * Subtle accent-soft background, single row, no shadow.
 *
 * Logged-out path: this component never mounts (the parent server
 * component returns null), so the homepage stays unchanged for
 * visitors who haven't signed in.
 */

import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { useReducedMotion } from '@/lib/motion/hooks'
import { Link } from '@/lib/i18n/navigation'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export type WelcomeActivity =
  | {
      type: 'BOOK'
      title: string
      href: string
    }
  | {
      type: 'SESSION'
      title: string
      itemTitle: string
      href: string
    }

export function WelcomeBackCard({
  firstName,
  locale,
  activity,
}: {
  firstName: string
  locale: 'ar' | 'en'
  activity: WelcomeActivity | null
}) {
  const t = useTranslations('home.welcome_back')
  const tBook = useTranslations('library.continue_reading')
  const tSession = useTranslations('library.continue_watching')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()

  const fontDisplay = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  const cta = activity
    ? activity.type === 'SESSION'
      ? tSession('cta')
      : tBook('cta')
    : t('no_activity_cta')
  const ctaHref = activity ? activity.href : '/dashboard/library'

  return (
    <motion.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      dir={isRtl ? 'rtl' : 'ltr'}
      aria-label={t('greeting', { name: firstName })}
      className="relative w-full border-b border-[var(--color-border)] bg-[var(--color-accent-soft)]/40"
    >
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 [padding:14px_clamp(20px,4vw,48px)] sm:gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p
            className={`m-0 truncate text-[14px] font-bold leading-[1.3] text-[var(--color-fg1)] ${fontDisplay}`}
          >
            {t('greeting', { name: firstName })}
          </p>
          {activity && (
            <p
              className={`m-0 truncate text-[12px] leading-[1.4] text-[var(--color-fg2)] ${fontBody}`}
            >
              {/* The two-line label format borrows from the library hero —
                  "Continue reading: {title}" / "Continue watching: {item}".
                  Compact: no separate eyebrow, no progress %. */}
              <span className="font-semibold text-[var(--color-accent)]">
                {activity.type === 'SESSION' ? tSession('label') : tBook('label')}
              </span>
              <span className="mx-1.5 text-[var(--color-fg3)]" aria-hidden>·</span>
              <span className="truncate">
                {activity.type === 'SESSION'
                  ? `${activity.title} — ${activity.itemTitle}`
                  : activity.title}
              </span>
            </p>
          )}
        </div>

        <Link
          href={ctaHref}
          className={`btn-pill btn-pill-primary inline-flex !text-[12px] !py-2 !px-4 shrink-0 ${fontBody}`}
        >
          {cta}
        </Link>
      </div>
    </motion.section>
  )
}
