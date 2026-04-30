'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Props = { label: string }

/**
 * Suspense streaming fallback (rendered by app/[locale]/loading.tsx).
 *
 * Visual: blur backdrop matching AppLoader's nav-overlay state — keeps
 * in-portal navigation transitions visually consistent. Theme-aware.
 *
 * For the very first cold load (no sessionStorage gate), AppLoader will
 * mount on the client and immediately replace this with its black-bg
 * sequenced splash. The brief overlap is intentional and feels like a
 * single transition.
 */
export function LoadingSequence({ label }: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[var(--color-bg)]/[0.32] backdrop-blur-xl backdrop-saturate-[1.15] supports-[backdrop-filter]:bg-[var(--color-bg)]/[0.22]"
    >
      <span className="sr-only">{label}</span>

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="flex flex-col items-center gap-3"
      >
        <Logo height={48} alt="" priority />
        <motion.span
          aria-hidden
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
          className="block h-[2px] w-8 bg-[var(--color-accent)] origin-center"
        />
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.2 }}
          className={`mt-1 text-[10.5px] font-semibold uppercase tracking-[0.28em] text-[var(--color-fg3)] ${
            isRtl ? 'font-arabic-body !text-[12px] !tracking-[0.06em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          {isRtl ? 'قَلَم' : 'Qalem'}
        </motion.span>
      </motion.div>
    </div>
  )
}
