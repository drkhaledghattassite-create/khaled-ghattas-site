'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion, useScroll, useTransform } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark } from '@/components/shared/Ornament'
import { cn } from '@/lib/utils'
import type { Interview } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

function PlayIcon() {
  return (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden>
      <circle cx="32" cy="32" r="32" fill="var(--color-sky)" />
      <polygon points="26,20 50,32 26,44" fill="var(--color-ink)" />
    </svg>
  )
}

export function InterviewRotator({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const t = useTranslations('interviews_section')
  const isRtl = locale === 'ar'
  const featured = interviews[0]
  const sectionRef = useRef<HTMLElement>(null)
  const [thumbHovered, setThumbHovered] = useState(false)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const thumbY = useTransform(scrollYProgress, [0, 1], [20, -20])

  if (!featured) return null

  const title = locale === 'ar' ? featured.titleAr : featured.titleEn
  const description =
    (locale === 'ar' ? featured.descriptionAr : featured.descriptionEn) ?? ''
  const source =
    locale === 'ar'
      ? (featured.sourceAr ?? featured.source ?? '')
      : (featured.source ?? '')
  const year = featured.year

  return (
    <motion.section
      ref={sectionRef}
      className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, ease: EASE_OUT_QUART }}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Section header */}
        <header className="mb-[var(--spacing-lg)]">
          <ChapterMark number=".05" label={isRtl ? 'أصوات وصور' : 'Voices & Frames'} />

          <p
            className="mt-4 font-display font-medium text-[11px] tracking-[0.18em] uppercase text-sky-deep [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
          >
            {t('eyebrow')}
          </p>

          <h2
            className="mt-1 text-balance text-ink font-display font-normal text-[clamp(36px,6vw,72px)] leading-[0.96] tracking-[-0.022em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {t('heading')}
          </h2>
        </header>

        {/* Featured interview — 2-column desktop, stacked mobile */}
        <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12 lg:gap-16">
          {/* Thumbnail with play overlay */}
          <div
            className="relative cursor-pointer"
            onMouseEnter={() => setThumbHovered(true)}
            onMouseLeave={() => setThumbHovered(false)}
          >
            <motion.div
              className="relative aspect-video overflow-hidden"
              style={{
                y: thumbY,
                boxShadow: '0 8px 48px -16px rgba(31,24,18,0.32)',
                outline: '1px solid var(--color-sky)',
              }}
            >
              <Image
                src={featured.thumbnailImage}
                alt={title}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className={cn(
                  'object-cover transition-transform duration-500',
                  thumbHovered && 'scale-[1.02]',
                )}
              />
            </motion.div>

            {/* Play button */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                  'transition-transform duration-300',
                  thumbHovered && 'scale-110',
                )}
              >
                <PlayIcon />
              </motion.div>
            </div>

            <a
              href={featured.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0"
              aria-label={title}
            />
          </div>

          {/* Content */}
          <div>
            {(source || year) && (
              <p
                className="mb-3 font-display font-medium text-[12px] tracking-[0.14em] uppercase text-sky-deep [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
              >
                {[source, year].filter(Boolean).join(' — ')}
              </p>
            )}

            <h3
              className="text-balance text-ink font-display font-normal text-[clamp(26px,3.6vw,40px)] leading-[1.08] tracking-[-0.018em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
            >
              {title}
            </h3>

            <p
              className="mt-4 line-clamp-3 font-serif italic text-[16px] leading-[1.6] text-ink-muted [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:leading-[1.9]"
            >
              {description}
            </p>

            <div className="mt-6">
              <a
                href={featured.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]"
              >
                <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
                {t('watch')}
              </a>
            </div>
          </div>
        </div>

        {/* View all — simple text link, not pill */}
        <div className="mt-12 text-center">
          <Link href="/interviews" className="editorial-link">
            {t('view_all')} →
          </Link>
        </div>
      </div>
    </motion.section>
  )
}
