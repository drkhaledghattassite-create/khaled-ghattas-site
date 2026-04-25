'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import type { Interview } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]
const TILTS = [-6, 4, -4, 6, -5, 3, -3, 5]

export function InterviewsGallery({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1440px]">
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
                initial={{ y: 30, opacity: 0, rotate: 0 }}
                whileInView={{ y: 0, opacity: 1, rotate: tilt }}
                viewport={{ once: true, amount: 0.15 }}
                whileHover={{ rotate: 0, scale: 1.02 }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE_OUT_QUART }}
              >
                <a
                  href={interview.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block"
                  aria-label={title}
                >
                  <div className="dotted-outline relative aspect-[4/3] overflow-hidden bg-cream-soft">
                    <Image
                      src={interview.thumbnailImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <span
                      className="font-label absolute start-3 top-3 inline-flex translate-y-1 items-center gap-2 rounded-full border border-dashed border-cream-soft bg-ink/70 px-3 py-1 text-[11px] text-cream-soft opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream-soft" />
                      {tCta('view_interview')}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    <h3
                      className="uppercase text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                        fontWeight: isRtl ? 700 : 600,
                        fontSize: 18,
                        lineHeight: 1.2,
                        letterSpacing: isRtl ? 'normal' : '-0.3px',
                      }}
                    >
                      {title}
                    </h3>
                    <p
                      className="text-ink-muted"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                        fontStyle: isRtl ? 'normal' : 'italic',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[12px] text-ink-muted">
                      <span className="font-label">{sourceLabel}</span>
                      {interview.year !== null && (
                        <span className="font-label">{interview.year}</span>
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
