'use client'

import { Hourglass } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { fadeUp, EASE_EDITORIAL } from '@/lib/motion/variants'

/**
 * Empty state shown when a SESSION-type book has zero session_items
 * attached. The user owns the product; the admin just hasn't uploaded the
 * content yet. Visual matches the reader's UnavailableNotice so the two
 * "owned but not yet ready" states look like siblings.
 */
export function SessionEmptyState({
  locale,
  title,
  body,
  backHref,
  backLabel,
}: {
  locale: 'ar' | 'en'
  title: string
  body: string
  backHref: string
  backLabel: string
}) {
  const isRtl = locale === 'ar'
  const fontHeading = 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <motion.section
      dir={isRtl ? 'rtl' : 'ltr'}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{ duration: 0.6, ease: EASE_EDITORIAL }}
      className="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center px-4 py-[clamp(48px,10vw,96px)] text-center min-h-[calc(100vh-260px)]"
    >
      <div
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
        aria-hidden="true"
      >
        <Hourglass className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <h1
        className={`m-0 mb-3 text-[clamp(24px,3.5vw,34px)] leading-[1.15] font-bold tracking-[-0.015em] text-[var(--color-fg1)] ${fontHeading}`}
      >
        {title}
      </h1>
      <p
        className={`m-0 mb-8 max-w-[440px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${fontBody}`}
      >
        {body}
      </p>
      <Link
        href={backHref}
        className={`btn-pill btn-pill-primary inline-flex !text-[14px] !py-2.5 !px-5 ${fontBody}`}
      >
        {backLabel}
      </Link>
    </motion.section>
  )
}
