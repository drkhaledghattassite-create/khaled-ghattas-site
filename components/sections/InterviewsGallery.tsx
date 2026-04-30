'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Interview } from '@/lib/db/queries'
import { cn } from '@/lib/utils'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function InterviewsGallery({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  if (interviews.length === 0) return null

  const featured = interviews[0]
  const rest = interviews.slice(1)

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        {featured && <FeaturedCard interview={featured} isRtl={isRtl} watchLabel={tCta('view_interview')} />}

        {rest.length > 0 && (
          <ul className="grid grid-cols-1 gap-[clamp(28px,4vw,40px)] m-0 p-0 list-none mt-[clamp(48px,6vw,72px)] pt-[clamp(48px,6vw,72px)] border-t border-[var(--color-border)] sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((interview, i) => {
              const title = isRtl ? interview.titleAr : interview.titleEn
              const description = (isRtl ? interview.descriptionAr : interview.descriptionEn) ?? ''
              const source = (isRtl ? interview.sourceAr : interview.source) ?? ''
              const year = interview.year

              return (
                <motion.li
                  key={interview.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.6, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
                >
                  <Link
                    href={`/interviews/${interview.slug}`}
                    className="group flex flex-col gap-4 transition-transform duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-1"
                    aria-label={title}
                  >
                    <div className="relative aspect-video overflow-hidden rounded-[4px] bg-[var(--color-fg1)]">
                      <Image
                        src={interview.thumbnailImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                        className="object-cover [filter:brightness(0.78)_contrast(1.05)] transition-[transform,filter] duration-[400ms] group-hover:scale-[1.03] group-hover:[filter:brightness(0.86)_contrast(1.05)]"
                        style={{ viewTransitionName: `interview-${interview.slug}` }}
                      />
                      <div
                        aria-hidden
                        className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.5))] pointer-events-none"
                      />
                      <span
                        aria-hidden
                        className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                      {source && (
                        <span
                          className={cn(
                            'absolute z-10 [inset-block-end:12px] [inset-inline-start:12px] inline-flex items-center px-2.5 py-1 rounded-full bg-white/95 text-[11px] font-bold tracking-[0.04em] text-[var(--color-fg1)] backdrop-blur-md',
                            isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !font-bold' : 'font-display',
                          )}
                        >
                          {source}
                        </span>
                      )}
                      {year !== null && (
                        <span
                          className={cn(
                            'absolute z-10 [inset-block-end:12px] [inset-inline-end:12px] inline-flex items-center px-2.5 py-1 rounded-full bg-black/55 text-[11px] font-semibold text-white/95 backdrop-blur-md [font-feature-settings:"tnum"]',
                            isRtl ? 'font-arabic-body' : 'font-display',
                          )}
                        >
                          {year}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 px-0.5">
                      <h3
                        className={cn(
                          'm-0 text-[18px] font-bold leading-[1.3] text-[var(--color-fg1)] [text-wrap:balance] group-hover:text-[var(--color-accent)] transition-colors',
                          isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]',
                        )}
                      >
                        {title}
                      </h3>
                      {description && (
                        <p className="m-0 text-[14px] leading-[1.55] text-[var(--color-fg3)] line-clamp-2">
                          {description}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

function FeaturedCard({
  interview,
  isRtl,
  watchLabel,
}: {
  interview: Interview
  isRtl: boolean
  watchLabel: string
}) {
  const title = isRtl ? interview.titleAr : interview.titleEn
  const description = (isRtl ? interview.descriptionAr : interview.descriptionEn) ?? ''
  const source = (isRtl ? interview.sourceAr : interview.source) ?? ''
  const year = interview.year

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="grid items-center gap-[clamp(32px,5vw,64px)] md:grid-cols-[1.3fr_1fr]"
    >
      <Link
        href={`/interviews/${interview.slug}`}
        className="group relative block overflow-hidden rounded-[4px] aspect-video bg-[var(--color-fg1)]"
        aria-label={title}
      >
        <Image
          src={interview.thumbnailImage}
          alt=""
          fill
          sizes="(min-width: 768px) 60vw, 100vw"
          className="object-cover [filter:brightness(0.8)_contrast(1.05)] transition-[transform,filter] duration-[400ms] group-hover:scale-[1.02] group-hover:[filter:brightness(0.86)_contrast(1.05)]"
          style={{ viewTransitionName: `interview-${interview.slug}` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.55))] pointer-events-none"
        />
        <span
          aria-hidden
          className="absolute z-20 top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        {(source || year !== null) && (
          <div
            className={cn(
              'absolute z-20 [inset-block-end:16px] [inset-inline-start:16px] inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[12px] text-[var(--color-fg2)] [font-feature-settings:"tnum"]',
              isRtl ? 'font-arabic-body' : 'font-display',
            )}
          >
            {source && (
              <span className="text-[13px] font-bold text-[var(--color-fg1)]">{source}</span>
            )}
            {source && year !== null && <span aria-hidden>·</span>}
            {year !== null && <span>{year}</span>}
          </div>
        )}
      </Link>

      <div className="flex flex-col gap-5">
        <span className="section-eyebrow">{isRtl ? 'الأبرز' : 'Featured'}</span>
        <h2
          className={cn(
            'm-0 text-[clamp(24px,3vw,36px)] leading-[1.15] font-bold text-[var(--color-fg1)] tracking-[-0.015em] [text-wrap:balance]',
            isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.025em]',
          )}
        >
          {title}
        </h2>
        {description && (
          <ScrollRevealLine
            as="p"
            offset={['start 0.85', 'start 0.35']}
            className={cn(
              'm-0 text-[15px] leading-[1.65] [text-wrap:pretty]',
              isRtl ? 'font-arabic-body' : 'font-display',
            )}
          >
            {description}
          </ScrollRevealLine>
        )}
        <Link
          href={`/interviews/${interview.slug}`}
          className="link-underline self-start"
        >
          {watchLabel}
          <span aria-hidden>{isRtl ? '←' : '→'}</span>
        </Link>
      </div>
    </motion.article>
  )
}
