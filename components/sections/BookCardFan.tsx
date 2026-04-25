'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const REST_ROTATIONS = [-6, -2, 1, 5]
const REST_ROTATIONS_MOBILE = [-5, 5, -5, 5]
const BOOKS_BG = '/placeholder/hero/portrait-bw.jpg'

export function BookCardFan({ books }: { books: Book[] }) {
  const locale = useLocale()
  const t = useTranslations('books')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'
  const fan = books.slice(0, 4)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    setIsMobile(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <section className="relative z-[2] overflow-hidden bg-cream px-[var(--spacing-md)] py-[var(--spacing-xl)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{ opacity: 0.25, filter: 'grayscale(100%) contrast(1.05)' }}
      >
        <Image src={BOOKS_BG} alt="" fill sizes="100vw" className="object-cover" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1440px]">
        <header className="mb-[var(--spacing-xl)] space-y-3">
          <p
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 700 : 400,
              fontSize: 'clamp(24px, 6vw, 43.2px)',
            }}
          >
            {t('heading.part_1')}
          </p>
          <h2
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
              fontWeight: isRtl ? 700 : 600,
              fontSize: 'clamp(42px, 11vw, 92.88px)',
              lineHeight: 0.95,
              letterSpacing: isRtl ? 'normal' : '-3px',
            }}
          >
            {t('heading.part_2')}
          </h2>
        </header>

        <div
          className="relative mx-auto flex flex-col items-center gap-14 md:flex-row md:items-end md:justify-center md:gap-0"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          {fan.map((book, i) => {
            const baseRest = isMobile
              ? REST_ROTATIONS_MOBILE[i] ?? 0
              : REST_ROTATIONS[i] ?? 0
            const rest = isRtl ? -baseRest : baseRest
            const isHovered = hoveredIdx === i
            const otherHovered = hoveredIdx !== null && !isHovered
            const title = locale === 'ar' ? book.titleAr : book.titleEn

            return (
              <motion.div
                key={book.id}
                initial={{ rotate: 0, opacity: 0, scale: 0.9, x: 0 }}
                whileInView={{ rotate: rest, opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                animate={{
                  rotate: isHovered ? 0 : rest,
                  y: isHovered ? -12 : 0,
                  scale: isHovered ? 1.03 : 1,
                  opacity: otherHovered ? 0.6 : 1,
                }}
                transition={{ duration: 0.7, delay: i * 0.09, ease: EASE_OUT_EXPO }}
                onMouseEnter={() => setHoveredIdx(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                className="relative w-[260px] md:w-[300px]"
                style={{
                  transformOrigin: '50% 90%',
                  willChange: 'transform, opacity',
                  marginInlineStart: i === 0 ? 0 : '-36px',
                  zIndex: isHovered ? 50 : i,
                }}
              >
                <Link href={`/books/${book.slug}`} className="block">
                  <div className="relative aspect-[2/3] w-full border border-dashed border-ink bg-cream-soft">
                    <Image
                      src={book.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 300px, 240px"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-3 flex flex-col gap-3">
                    <h3
                      className="uppercase text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                        fontWeight: isRtl ? 700 : 600,
                        fontSize: 18,
                        lineHeight: 1.2,
                        letterSpacing: isRtl ? 'normal' : '-0.5px',
                      }}
                    >
                      {title}
                    </h3>
                    <span
                      className="font-label inline-flex w-max items-center gap-2 rounded-full border border-dashed border-ink px-3 py-1 text-[11px] text-ink"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
                      {tCta('read_book')}
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
