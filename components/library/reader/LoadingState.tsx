'use client'

import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { EASE_EDITORIAL } from '@/lib/motion/variants'
import { useReducedMotion } from '@/lib/motion/hooks'

/**
 * First-load reader splash. Centred title in display font, soft pulse
 * underneath. Renders inside the reader's themed container so it
 * respects the active reader theme (light/sepia/dark).
 */
export function LoadingState({
  title,
  isRtl,
}: {
  title: string
  isRtl: boolean
}) {
  const t = useTranslations('reader.first_load')
  const reduceMotion = useReducedMotion()

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
    >
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_EDITORIAL }}
        className="flex flex-col items-center gap-5 text-center"
      >
        <p
          className={`m-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--reader-fg-faint)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('title')}
        </p>
        <h1
          className={`m-0 max-w-[24ch] text-[clamp(22px,3.5vw,34px)] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--reader-fg)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {title}
        </h1>
        <motion.div
          aria-hidden
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 1 }
              : { opacity: [0.3, 0.7, 0.3] }
          }
          transition={
            reduceMotion
              ? undefined
              : { duration: 1.6, repeat: Infinity, ease: EASE_EDITORIAL }
          }
          className="h-[2px] w-[120px] rounded-full bg-[var(--reader-border-strong)]"
        />
        <p
          className={`m-0 text-[13px] text-[var(--reader-fg-muted)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('subtitle')}
        </p>
      </motion.div>
    </div>
  )
}
