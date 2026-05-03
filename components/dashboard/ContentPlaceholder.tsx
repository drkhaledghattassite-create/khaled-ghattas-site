'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { fadeUp, EASE_EDITORIAL } from '@/lib/motion/variants'

/**
 * Placeholder shown on /dashboard/library/read/[bookId] (Phase 2 target) and
 * /dashboard/library/session/[sessionId] (Phase 4 target). Same shell, two
 * copy variants. Ownership is verified on the server before this renders.
 */
export function ContentPlaceholder({ kind }: { kind: 'read' | 'session' }) {
  const t = useTranslations(`library.placeholder.${kind}`)
  const tLib = useTranslations('library')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className="mx-auto max-w-[640px] py-[clamp(48px,8vw,96px)]"
    >
      <div
        className={`rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] p-[clamp(32px,5vw,56px)] ${
          isRtl ? 'text-end' : 'text-start'
        }`}
      >
        <span
          className={`section-eyebrow eyebrow-accent ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {kind === 'read' ? tLib('type.book') : tLib('type.session')}
        </span>
        <h1
          className={`mt-3 mb-3 text-[clamp(22px,3vw,32px)] leading-[1.2] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {t('title')}
        </h1>
        <p
          className={`m-0 text-[16px] leading-[1.7] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('body')}
        </p>
      </div>
    </motion.section>
  )
}
