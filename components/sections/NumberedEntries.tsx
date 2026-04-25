'use client'

import { useLocale } from 'next-intl'
import { motion } from 'motion/react'

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]

export type NumberedEntry = {
  number: string
  text: string
}

/**
 * Numbered biography entries for /about.
 * FULL_AUDIT.md §12a: number floats at end side, mask reveal on text,
 * amber number fades in after text (delay 200ms), separator draws left→right.
 */
export function NumberedEntries({ entries }: { entries: NumberedEntry[] }) {
  const locale = useLocale()
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1440px]">
        <ul>
          {entries.map((entry, i) => {
            const base = i * 0.12
            return (
              <li key={entry.number} className="relative">
                <div className="grid grid-cols-[1fr_auto] items-start gap-6 py-[var(--spacing-md)] md:gap-[var(--spacing-lg)]">
                  <div className="overflow-hidden">
                    <motion.p
                      initial={{ y: '100%', opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.8, delay: base, ease: EASE_IN_OUT_QUART }}
                      className="uppercase text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                        fontWeight: isRtl ? 700 : 600,
                        fontSize: 'clamp(26px, 4.8vw, 56px)',
                        lineHeight: 1.1,
                        letterSpacing: isRtl ? 'normal' : '-1.5px',
                      }}
                    >
                      {entry.text}
                    </motion.p>
                  </div>
                  <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.6, delay: base + 0.2, ease: 'easeOut' }}
                    className="block text-amber"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 'clamp(44px, 8vw, 96px)',
                      lineHeight: 0.9,
                    }}
                  >
                    .{entry.number}
                  </motion.span>
                </div>
                <motion.span
                  aria-hidden
                  className="block h-px w-full origin-[inline-start] border-b border-dashed border-ink/40"
                  style={{ transformOrigin: isRtl ? 'right center' : 'left center' }}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.8, delay: base + 0.35, ease: EASE_IN_OUT_QUART }}
                />
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
