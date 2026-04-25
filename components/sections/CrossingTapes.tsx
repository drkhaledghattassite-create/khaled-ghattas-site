'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Section 2 — crossing marquee tapes. See FULL_AUDIT.md §3a.
 * Cream tape tilts -8.52°, drifts left over 28s. Dark tape tilts +5.29°,
 * drifts right. Both enter from off-screen opposite sides on scroll.
 */
export function CrossingTapes() {
  return (
    <motion.section
      className="relative z-[2] overflow-hidden bg-cream py-[var(--spacing-xl)]"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      aria-hidden
    >
      <div
        className="relative"
        style={{ transform: 'rotateZ(-8.52deg) translate3d(-6.5em, 0em, 0)' }}
      >
        <motion.div
          variants={{
            hidden: { x: '-120%' },
            show: { x: '0%', transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
          }}
          style={{ willChange: 'transform' }}
        >
          <Tape theme="cream" direction="left" translationKey="tapes.cream" />
        </motion.div>
      </div>

      <div
        className="relative -mt-10"
        style={{ transform: 'rotateZ(5.29deg) translate3d(5em, -5em, 0)' }}
      >
        <motion.div
          variants={{
            hidden: { x: '120%' },
            show: { x: '0%', transition: { duration: 0.9, ease: EASE_OUT_EXPO } },
          }}
          style={{ willChange: 'transform' }}
        >
          <Tape theme="dark" direction="right" translationKey="tapes.dark" />
        </motion.div>
      </div>
    </motion.section>
  )
}

function Tape({
  theme,
  direction,
  translationKey,
}: {
  theme: 'cream' | 'dark'
  direction: 'left' | 'right'
  translationKey: 'tapes.cream' | 'tapes.dark'
}) {
  const locale = useLocale()
  const t = useTranslations()
  const isRtl = locale === 'ar'
  const text = t(translationKey)
  const items = new Array(8).fill(text)
  const bg = theme === 'cream' ? '#EDE7DF' : '#252321'
  const color = theme === 'cream' ? '#252321' : '#F6F4F1'
  const x = direction === 'left' ? '-50%' : '50%'

  return (
    <div
      className="w-[200vw] overflow-hidden py-3"
      style={{ background: bg }}
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x }}
        transition={{ duration: 28, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
        style={{ willChange: 'transform' }}
      >
        {[...items, ...items].map((line, i) => (
          <span
            key={i}
            className="pe-md uppercase"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: '30.96px',
              lineHeight: 1,
              color,
            }}
          >
            {line}
          </span>
        ))}
      </motion.div>
    </div>
  )
}
