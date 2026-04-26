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
                        className="absolute start-3 top-3 inline-flex translate-y-1 items-center gap-2 rounded-full bg-ink/85 px-3 py-1.5 font-display font-medium text-[10.5px] tracking-[0.14em] uppercase text-paper-soft opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100 [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
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
                      className="text-balance text-ink font-display font-medium text-[18px] leading-[1.2] tracking-[-0.014em] [dir=rtl]:font-arabic-display [dir=rtl]:tracking-normal"
                    >
                      {title}
                    </h3>
                    <p
                      className="line-clamp-2 text-pretty text-ink-soft font-serif italic text-[14px] leading-[1.5] [dir=rtl]:font-arabic [dir=rtl]:not-italic"
                    >
                      {excerpt}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-ink-muted">
                      <span
                        className="font-display italic font-normal text-[12px] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[12.5px]"
                      >
                        {sourceLabel}
                      </span>
                      {interview.year !== null && (
                        <span
                          className="tabular-nums font-display italic font-normal text-[12px] text-brass-deep"
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
