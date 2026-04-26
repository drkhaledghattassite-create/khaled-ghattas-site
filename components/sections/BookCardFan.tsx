'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament } from '@/components/shared/Ornament'
import type { Book } from '@/lib/db/queries'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]
const REST_ROTATIONS = [-5, -1, 2, 4]
const REST_ROTATIONS_MOBILE = [-4, 4, -4, 4]
const BOOKS_BG = '/dr khaled photo.jpeg'

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
    <section className="relative z-[2] overflow-hidden bg-paper px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
      {/* Warm portrait wash, like a backlit reading room */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{ opacity: 0.18 }}
      >
        <Image src={BOOKS_BG} alt="" fill sizes="100vw" className="object-cover duotone-warm" style={{ filter: 'sepia(0.45) saturate(1.1) brightness(0.94)' }} />
      </div>

      {/* Soft warm-paper veil over the photo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(240, 230, 216, 0.85) 0%, rgba(240, 230, 216, 0.7) 60%, rgba(240, 230, 216, 0.95) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1280px]">
        <header className="mb-[var(--spacing-xl)] flex flex-col gap-3">
          <ChapterMark number=".06" label={isRtl ? 'المتجر' : 'The Shelf'} />

          <p
            className="text-garnet"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: isRtl ? 600 : 400,
              fontSize: 'clamp(28px, 4.5vw, 52px)',
              letterSpacing: isRtl ? 0 : '-0.005em',
              lineHeight: 1.1,
            }}
          >
            {t('heading.part_1')}
          </p>
          <h2
            className="text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
              fontWeight: isRtl ? 500 : 400,
              fontSize: 'clamp(40px, 7vw, 92px)',
              lineHeight: 0.95,
              letterSpacing: isRtl ? 0 : '-0.024em',
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
                initial={{ rotate: 0, opacity: 0, scale: 0.92, x: 0 }}
                whileInView={{ rotate: rest, opacity: 1, scale: 1, x: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                animate={{
                  rotate: isHovered ? 0 : rest,
                  y: isHovered ? -16 : 0,
                  scale: isHovered ? 1.04 : 1,
                  opacity: otherHovered ? 0.55 : 1,
                }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: EASE_OUT_EXPO }}
                onMouseEnter={() => setHoveredIdx(i)}
                onFocus={() => setHoveredIdx(i)}
                onBlur={() => setHoveredIdx(null)}
                className="relative w-[260px] md:w-[300px]"
                style={{
                  transformOrigin: '50% 90%',
                  willChange: 'transform, opacity',
                  marginInlineStart: !isMobile && i !== 0 ? '-44px' : 0,
                  zIndex: isHovered ? 50 : i,
                }}
              >
                <Link href={`/books/${book.slug}`} className="group block">
                  <div className="frame-print relative aspect-[2/3] w-full">
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src={book.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 300px, 240px"
                        className="object-cover"
                      />
                      {/* Sky spine — printed strip on the inner edge */}
                      <span
                        aria-hidden
                        className="absolute inset-y-0 inset-inline-start-0 w-[8px]"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(168,196,214,0.7) 0%, rgba(107,143,168,0.6) 100%)',
                        }}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    <h3
                      className="text-balance text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                        fontWeight: isRtl ? 500 : 500,
                        fontSize: 18,
                        lineHeight: 1.2,
                        letterSpacing: isRtl ? 0 : '-0.014em',
                      }}
                    >
                      {title}
                    </h3>
                    <span className="inline-flex items-center gap-2 px-4 py-[7px] min-h-0 w-max rounded-full border border-brass bg-brass text-paper-soft text-[11px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold">
                      <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-current" />
                      {tCta('buy_now')}
                    </span>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-14 flex items-center justify-center gap-4 text-ink-muted/45">
          <span aria-hidden className="block h-px w-24 bg-current" />
          <Ornament glyph="fleuron" size={18} className="text-brass" />
          <span aria-hidden className="block h-px w-24 bg-current" />
        </div>
      </div>
    </section>
  )
}
