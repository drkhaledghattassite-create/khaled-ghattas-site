'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Ornament } from '@/components/shared/Ornament'
import type { Interview } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const TILTS = [-4, 3, -3, 5, -4, 2, -2, 4]

export function InterviewsGallery({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1280px]">
        <ul className="grid grid-cols-1 gap-[var(--spacing-lg)] sm:grid-cols-2 lg:grid-cols-3">
          {interviews.map((interview, i) => {
            const title = locale === 'ar' ? interview.titleAr : interview.titleEn
            const excerpt =
              (locale === 'ar' ? interview.descriptionAr : interview.descriptionEn) ?? ''
            const sourceLabel =
              (locale === 'ar' ? interview.sourceAr : interview.source) ?? ''
            const baseTilt = TILTS[i % TILTS.length]
            const tilt = isRtl ? -baseTilt : baseTilt

            return (
              <motion.li
                key={interview.id}
                initial={{ y: 26, opacity: 0, rotate: 0 }}
                whileInView={{ y: 0, opacity: 1, rotate: tilt }}
                viewport={{ once: true, amount: 0.15 }}
                whileHover={{ rotate: 0, y: -6 }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: EASE_OUT_QUART }}
              >
                <a
                  href={interview.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                  aria-label={title}
                >
                  <div className="frame-print relative aspect-[4/3]">
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src={interview.thumbnailImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover duotone-warm transition-transform duration-700 group-hover:scale-[1.04]"
                      />
                      <span
                        className="absolute start-3 top-3 inline-flex translate-y-1 items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 text-[11px] text-paper-soft opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100"
                        style={{
                          fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                          fontWeight: 500,
                          letterSpacing: isRtl ? 0 : '0.14em',
                          textTransform: isRtl ? 'none' : 'uppercase',
                          fontSize: isRtl ? 12 : 10.5,
                        }}
                      >
                        <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-brass" />
                        {tCta('view_interview')}
                      </span>
                      {/* Tiny ornament corner */}
                      <span aria-hidden className="absolute end-2 bottom-2 text-paper-soft/70">
                        <Ornament glyph="asterism" size={11} />
                      </span>
                    </div>
                  </div>
                  <div className="mt-3.5 flex flex-col gap-2">
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
                    <p
                      className="line-clamp-2 text-pretty text-ink-soft"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                        fontStyle: isRtl ? 'normal' : 'italic',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span
                        style={{
                          fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                          fontStyle: isRtl ? 'normal' : 'italic',
                          fontSize: isRtl ? 12.5 : 12,
                          fontWeight: 400,
                        }}
                      >
                        {sourceLabel}
                      </span>
                      {interview.year !== null && (
                        <span
                          className="tabular-nums"
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontStyle: 'italic',
                            fontWeight: 400,
                            fontSize: 12,
                            color: 'var(--color-brass-deep)',
                          }}
                        >
                          {interview.year}
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
