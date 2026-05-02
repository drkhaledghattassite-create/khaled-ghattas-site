'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

const STORAGE_KEY = 'qalem.maintenance-banner.dismissed'
const BODY_CLASS = 'has-maintenance'

type Props = {
  /** Localized message picked server-side from settings.maintenance. */
  message: string
  /** Optional ISO date string ("2026-06-15"). */
  until: string | null
}

export function MaintenanceBanner({ message, until }: Props) {
  const t = useTranslations('maintenance')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [dismissed, setDismissed] = useState(false)

  // Read sessionStorage after mount (avoids hydration mismatch).
  // If the user already dismissed in this session, drop the body class so
  // the layout collapses back up.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === '1') {
        setDismissed(true)
        document.body.classList.remove(BODY_CLASS)
      }
    } catch {
      /* sessionStorage may be unavailable (privacy mode); keep banner visible. */
    }
  }, [])

  function handleDismiss() {
    try {
      sessionStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
    document.body.classList.remove(BODY_CLASS)
  }

  let formattedDate: string | null = null
  if (until) {
    const parsed = new Date(until)
    if (!Number.isNaN(parsed.getTime())) {
      formattedDate = new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(parsed)
    }
  }

  const text = message || t('default_message')

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          key="maintenance-banner"
          role="status"
          aria-live="polite"
          dir={isRtl ? 'rtl' : 'ltr'}
          initial={{ y: -56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -56, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE_EDITORIAL }}
          className="fixed top-0 inset-x-0 z-[70] h-11 md:h-12 bg-[var(--color-accent)] text-[var(--color-accent-fg)] overflow-hidden"
        >
          <div className="relative mx-auto h-full flex max-w-[var(--container-max)] items-center justify-center [padding-inline:clamp(48px,4vw,56px)]">
            <p
              className={`m-0 text-center text-[12.5px] font-semibold leading-[1.4] md:text-[13px] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {text}
              {formattedDate && (
                <>
                  {' '}
                  <span className="num-latn">
                    {t('until', { date: formattedDate })}
                  </span>
                </>
              )}
            </p>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label={t('dismiss')}
              className="absolute [inset-inline-end:2px] top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--color-accent-fg)]/80 transition-[background-color,opacity,transform] duration-200 hover:bg-white/15 hover:text-[var(--color-accent-fg)] active:translate-y-[calc(-50%+1px)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
