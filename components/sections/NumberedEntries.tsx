'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'
import { Ornament } from '@/components/shared/Ornament'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

export type NumberedEntry = {
  number: string
  text: string
}

/**
 * Numbered biography entries — journal-chapter style. Each row is a
 * mask-revealed line, with a brass display numeral at the side and a
 * fleuron rule that draws under it. Quieter than the original.
 */
export function NumberedEntries({ entries }: { entries: NumberedEntry[] }) {
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1280px]">
        <ul>
          {entries.map((entry, i) => {
            const base = i * 0.13
            return (
              <li key={entry.number} className="relative">
                <div className="grid grid-cols-[auto_1fr] items-baseline gap-6 py-[var(--spacing-md)] md:gap-[var(--spacing-lg)]">
                  <motion.span
                    initial={{ opacity: 0, x: isRtl ? 16 : -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.7, delay: base, ease: 'easeOut' }}
                    className="block text-brass"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 'clamp(40px, 7vw, 92px)',
                      lineHeight: 0.85,
                    }}
                  >
                    .{entry.number}
                  </motion.span>
                  <div className="overflow-hidden">
                    <motion.p
                      initial={{ y: '100%', opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.85, delay: base, ease: EASE_IN_OUT_QUART }}
                      className="text-balance text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                        fontWeight: isRtl ? 500 : 400,
                        fontSize: 'clamp(24px, 4.4vw, 52px)',
                        lineHeight: 1.15,
                        letterSpacing: isRtl ? 0 : '-0.018em',
                      }}
                    >
                      {entry.text}
                    </motion.p>
                  </div>
                </div>
                <motion.div
                  className="flex items-center gap-3 text-ink-muted/35 origin-[inline-start]"
                  style={{ transformOrigin: isRtl ? 'right center' : 'left center' }}
                  initial={{ scaleX: 0, opacity: 0 }}
                  whileInView={{ scaleX: 1, opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.85, delay: base + 0.35, ease: EASE_IN_OUT_QUART }}
                >
                  <span aria-hidden className="block h-px flex-1 bg-current" />
                  {i % 2 === 0 && (
                    <Ornament glyph="asterism" size={11} className="text-brass" />
                  )}
                  <span aria-hidden className="block h-px flex-1 bg-current" />
                </motion.div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
