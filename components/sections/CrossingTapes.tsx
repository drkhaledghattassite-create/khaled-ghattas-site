'use client'

import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'motion/react'
import { Ornament } from '@/components/shared/Ornament'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

/**
 * Section .02 — twin journal banderoles. Two slow-drifting tape rows
 * (cream + ink) at gentle opposing angles, separated by a brass ornament.
 * Quieter than the original Webflow chaos: longer durations, calmer
 * angles, fleuron arbiter between them.
 */
export function CrossingTapes() {
  return (
    <motion.section
      className="relative z-[2] overflow-hidden bg-paper py-[var(--spacing-xl)]"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      aria-hidden
    >
      <div
        className="relative"
        style={{ transform: 'rotateZ(-3.4deg) translate3d(-3em, 0, 0)' }}
      >
        <motion.div
          variants={{
            hidden: { x: '-110%', opacity: 0 },
            show: { x: '0%', opacity: 1, transition: { duration: 1.2, ease: EASE_OUT_EXPO } },
          }}
          style={{ willChange: 'transform' }}
        >
          <Tape theme="paper" direction="left" translationKey="tapes.cream" />
        </motion.div>
      </div>

      {/* Brass ornament between the bands */}
      <div className="relative -my-6 flex justify-center text-brass">
        <motion.div
          variants={{
            hidden: { opacity: 0, scale: 0.6, rotate: -45 },
            show: { opacity: 1, scale: 1, rotate: 0, transition: { duration: 0.9, ease: EASE_OUT_EXPO, delay: 0.3 } },
          }}
          className="bg-paper px-3"
        >
          <Ornament glyph="fleuron" size={28} />
        </motion.div>
      </div>

      <div
        className="relative"
        style={{ transform: 'rotateZ(2.4deg) translate3d(2em, 0, 0)' }}
      >
        <motion.div
          variants={{
            hidden: { x: '110%', opacity: 0 },
            show: { x: '0%', opacity: 1, transition: { duration: 1.2, ease: EASE_OUT_EXPO } },
          }}
          style={{ willChange: 'transform' }}
        >
          <Tape theme="ink" direction="right" translationKey="tapes.dark" />
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
  theme: 'paper' | 'ink'
  direction: 'left' | 'right'
  translationKey: 'tapes.cream' | 'tapes.dark'
}) {
  const t = useTranslations()
  const reduce = useReducedMotion() ?? false
  const text = t(translationKey)
  const items = new Array(8).fill(text)
  const bg = theme === 'paper' ? 'var(--color-paper-warm)' : 'var(--color-ink)'
  const color = theme === 'paper' ? 'var(--color-ink)' : 'var(--color-paper-soft)'
  const accent = theme === 'paper' ? 'var(--color-brass-deep)' : 'var(--color-brass-soft)'
  const x = direction === 'left' ? '-50%' : '50%'

  return (
    <div
      className="w-[200vw] overflow-hidden py-4 hairline-t hairline-b"
      style={{ background: bg, borderColor: 'rgba(31,24,18,0.18)' }}
    >
      <motion.div
        className="flex items-center whitespace-nowrap"
        animate={reduce ? { x: 0 } : { x }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 38, ease: 'linear', repeat: Infinity, repeatType: 'loop' }
        }
        style={{ willChange: reduce ? undefined : 'transform' }}
      >
        {[...items, ...items].map((line, i) => (
          <span key={i} className="flex items-center pe-md">
            <span
              className="font-serif italic font-normal text-[clamp(22px,3.2vw,36px)] leading-none tracking-[-0.005em] [dir=rtl]:font-arabic-display [dir=rtl]:not-italic [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
              style={{ color }}
            >
              {line}
            </span>
            <span aria-hidden className="mx-4" style={{ color: accent }}>
              <Ornament glyph="asterism" size={14} />
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}
