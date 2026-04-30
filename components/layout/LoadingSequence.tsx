'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Logo } from '@/components/shared/Logo'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Props = { label: string }

export function LoadingSequence({ label }: Props) {
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center bg-[#000]"
    >
      <span className="sr-only">{label}</span>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex flex-col items-center gap-5"
      >
        {/* Top line — draws from center outward */}
        <motion.span
          aria-hidden
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          style={{ transformOrigin: 'bottom' }}
          className="block h-7 w-px bg-white/40"
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.25 }}
          className="invert"
        >
          <Logo height={56} alt="" priority />
        </motion.div>

        {/* Bottom line — draws from center outward */}
        <motion.span
          aria-hidden
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}
          style={{ transformOrigin: 'top' }}
          className="block h-7 w-px bg-white/40"
        />

        {/* Wordmark */}
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
          className={`mt-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-white/60 ${
            isRtl ? 'font-arabic-body !text-[12.5px] !tracking-[0.06em] !normal-case !font-bold' : 'font-display'
          }`}
        >
          {isRtl ? 'قَلَم' : 'Qalem'}
        </motion.span>
      </motion.div>
    </div>
  )
}
