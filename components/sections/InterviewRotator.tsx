'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Interview } from '@/lib/db/queries'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function InterviewRotator({ interviews }: { interviews: Interview[] }) {
  const locale = useLocale()
  const t = useTranslations('interviews_section')
  const isRtl = locale === 'ar'

  const featured = interviews[0]
  if (!featured) return null

  const title = isRtl ? featured.titleAr : featured.titleEn
  const description = (isRtl ? featured.descriptionAr : featured.descriptionEn) ?? ''
  const source = isRtl ? featured.sourceAr ?? featured.source ?? '' : featured.source ?? ''
  const year = featured.year ?? null
  const runtime = isRtl ? '٤٧ دقيقة' : '47 minutes'

  return (
    <section
      id="interview"
      className="bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <header className="grid items-end gap-6 pb-14">
          <div>
            <span className="section-eyebrow">{t('eyebrow')}</span>
            <h2 className="section-title mt-3.5">{t('heading')}</h2>
          </div>
        </header>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="grid items-center gap-[clamp(32px,5vw,64px)] md:grid-cols-[1.3fr_1fr]"
        >
          {/* Cinematic 16:9 frame */}
          <div className="group relative overflow-hidden rounded-[4px] aspect-video bg-[var(--color-fg1)]">
            <Image
              src={featured.thumbnailImage}
              alt={title}
              fill
              sizes="(min-width: 768px) 60vw, 100vw"
              className="object-cover object-[center_18%] [filter:brightness(0.78)_contrast(1.05)] transition-[transform,filter] duration-[400ms] ease-[var(--ease-out)] group-hover:scale-[1.02] group-hover:[filter:brightness(0.85)_contrast(1.05)]"
            />
            <div
              aria-hidden
              className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.55))] pointer-events-none"
            />
            {featured.videoUrl ? (
              <a
                href={featured.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10"
                aria-label={title}
              />
            ) : (
              <Link
                href={`/interviews/${featured.slug}`}
                className="absolute inset-0 z-10"
                aria-label={title}
              />
            )}
            <button
              type="button"
              aria-label={t('watch')}
              disabled={!featured.videoUrl}
              className="absolute z-20 top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 transition-transform duration-200 hover:scale-105 disabled:opacity-70"
              onClick={() => featured.videoUrl && window.open(featured.videoUrl, '_blank', 'noopener,noreferrer')}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <span
              className={`absolute z-20 [inset-block-end:16px] [inset-inline-end:16px] inline-flex items-center px-2.5 py-[5px] rounded-full bg-black/50 text-white/90 text-[11px] font-semibold tracking-[0.12em] backdrop-blur-md ${
                isRtl ? 'font-arabic-body !tracking-normal' : 'font-display'
              }`}
            >
              {runtime}
            </span>
            {(source || year) && (
              <div
                className={`absolute z-20 [inset-block-end:16px] [inset-inline-start:16px] inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md text-[12px] font-medium text-[var(--color-fg2)] [font-feature-settings:'tnum'] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {source && (
                  <span
                    className={`text-[13px] font-bold tracking-[-0.01em] text-[var(--color-fg1)] lowercase ${
                      isRtl ? 'font-arabic-body !normal-case' : 'font-display'
                    }`}
                  >
                    {source}
                  </span>
                )}
                {source && year && <span aria-hidden>·</span>}
                {year && <span>{year}</span>}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-[22px]">
            <blockquote className="m-0 p-0">
              <p
                className={`m-0 text-[clamp(20px,2.4vw,28px)] leading-[1.55] font-medium text-[var(--color-fg1)] [text-wrap:pretty] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !leading-[1.45] tracking-[-0.01em]'
                }`}
              >
                {description ? `«${description}»` : title}
              </p>
            </blockquote>
            <h3
              className={`m-0 text-[clamp(18px,2vw,22px)] leading-[1.35] font-bold text-[var(--color-fg1)] [text-wrap:balance] pt-5 border-t border-[var(--color-border)] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.015em]'
              }`}
            >
              {title}
            </h3>
            {description && (
              <p className="m-0 text-[14px] leading-[1.6] text-[var(--color-fg3)]">
                {description.length > 220 ? description.slice(0, 220) + '…' : description}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-4">
              {featured.videoUrl ? (
                <a
                  href={featured.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`link-underline self-start ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                >
                  {t('watch')}
                  <span aria-hidden>{isRtl ? '←' : '→'}</span>
                </a>
              ) : (
                <Link
                  href={`/interviews/${featured.slug}`}
                  className={`link-underline self-start ${isRtl ? 'font-arabic-body' : 'font-display'}`}
                >
                  {isRtl ? 'تفاصيل المقابلة' : 'Interview details'}
                  <span aria-hidden>{isRtl ? '←' : '→'}</span>
                </Link>
              )}
              <Link
                href="/interviews"
                className="btn-pill btn-pill-secondary text-[13px]"
              >
                {t('view_all')}
              </Link>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  )
}
