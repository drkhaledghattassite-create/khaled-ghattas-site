'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament, FlourishRule } from '@/components/shared/Ornament'
import type { Article } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

function EmptyArticles({ isRtl, viewAllLabel }: { isRtl: boolean; viewAllLabel: string }) {
  return (
    <div className="paper-card flex flex-col items-center gap-4 px-8 py-14 text-center">
      <span className="text-brass">
        <Ornament glyph="fleuron" size={28} />
      </span>
      <p
        className="text-ink"
        style={{
          fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
          fontStyle: isRtl ? 'normal' : 'italic',
          fontWeight: isRtl ? 500 : 400,
          fontSize: 22,
          lineHeight: 1.3,
        }}
      >
        {isRtl ? 'لا توجد مقالات في الأرشيف بعد' : 'The archive is still in galley.'}
      </p>
      <Link href="/articles" className="pill pill-solid">
        <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
        {viewAllLabel}
      </Link>
      <FlourishRule className="mt-2 w-full max-w-[260px]" />
    </div>
  )
}

const FALLBACK_THUMBNAIL = '/dr khaled photo.jpeg'

function estimateReadMinutes(article: Article, locale: string): number {
  const text = (locale === 'ar' ? article.contentAr : article.contentEn) ?? ''
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 1
  const wpm = locale === 'ar' ? 180 : 220
  return Math.max(1, Math.round(words / wpm))
}

const EASE_IN_OUT_QUART: [number, number, number, number] = [0.77, 0, 0.175, 1]
const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

type ArticlesListProps = {
  articles: Article[]
  showHeader?: boolean
}

export function ArticlesList({ articles, showHeader = true }: ArticlesListProps) {
  const locale = useLocale()
  const t = useTranslations('articles.heading')
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
      <div className="mx-auto max-w-[1200px]">
        {showHeader && (
          <header className="mb-[var(--spacing-lg)] space-y-3">
            <ChapterMark number=".04" label={isRtl ? 'الأرشيف الفكري' : 'The Archive'} />

            <h2 className="m-0 space-y-3 text-balance">
              <MaskedLine delay={0}>
                <span
                  className="text-garnet"
                  style={{
                    fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                    fontStyle: isRtl ? 'normal' : 'italic',
                    fontWeight: isRtl ? 600 : 400,
                    fontSize: 'clamp(36px, 6vw, 72px)',
                    lineHeight: 1.05,
                    letterSpacing: isRtl ? 0 : '-0.005em',
                  }}
                >
                  {t('part_1')}
                </span>
              </MaskedLine>

              <MaskedLine delay={0.18}>
                <span
                  className="text-ink"
                  style={{
                    fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
                    fontWeight: isRtl ? 500 : 400,
                    fontSize: 'clamp(40px, 7vw, 92px)',
                    lineHeight: 0.96,
                    letterSpacing: isRtl ? 0 : '-0.024em',
                  }}
                >
                  {t('part_2')}
                </span>
              </MaskedLine>
            </h2>

            <div className="pt-6 flex items-center gap-4">
              <Link href="/articles" className="pill">
                <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
                {tCta('view_all_articles')}
              </Link>
              <span aria-hidden className="text-ink-muted/60 hidden sm:inline">
                <Ornament glyph="asterism" size={14} />
              </span>
            </div>
          </header>
        )}

        {articles.length === 0 ? (
          <EmptyArticles isRtl={isRtl} viewAllLabel={tCta('view_all_articles')} />
        ) : (
          <ul>
            {articles.map((article, i) => (
              <ArticleRow
                key={article.id}
                article={article}
                index={i}
                isRtl={isRtl}
                locale={locale}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function ArticleRow({
  article,
  index,
  isRtl,
  locale,
}: {
  article: Article
  index: number
  isRtl: boolean
  locale: string
}) {
  const [hovered, setHovered] = useState(false)
  const t = useTranslations('articles')
  const dateLabel = (article.publishedAt ?? article.createdAt)
    .toISOString()
    .slice(0, 10)
  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const excerpt = locale === 'ar' ? article.excerptAr : article.excerptEn
  const minutes = estimateReadMinutes(article, locale)
  const readLabel = minutes === 1 ? t('meta.read_time_one') : t('meta.read_time', { minutes })
  const categoryLabel = t(`categories.${article.category}`)
  const thumbnail = article.coverImage ?? FALLBACK_THUMBNAIL
  const shift = isRtl ? -16 : 16

  return (
    <motion.li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      initial={{ y: 26, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.7, delay: index * 0.06, ease: EASE_OUT_QUART }}
      className={cn(
        'group relative isolate hairline-b py-7 md:py-8',
        'grid grid-cols-[auto_1fr_72px] items-center gap-5 md:grid-cols-[110px_1fr_96px] md:gap-7',
      )}
    >
      <Link
        href={`/articles/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={title}
      />

      {/* Soft warm wash on hover — paper-warm bleed instead of hard wipe */}
      <motion.span
        aria-hidden
        className="absolute inset-x-[-12px] inset-y-0 -z-10 paper-warm/0"
        style={{
          background:
            'linear-gradient(180deg, rgba(232, 217, 190, 0) 0%, rgba(232, 217, 190, 0.55) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE_IN_OUT_QUART }}
      />

      {/* Date column with brass dot */}
      <div className="relative flex items-center gap-2 text-ink-muted">
        <motion.span
          aria-hidden
          className="block h-1.5 w-1.5 rounded-full bg-brass"
          animate={{ scale: hovered ? 1.4 : 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
        <span
          className="text-[11.5px] tracking-[0.06em] tabular-nums"
          style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontWeight: 400,
          }}
        >
          {dateLabel}
        </span>
      </div>

      {/* Headline + meta */}
      <motion.div
        className="min-w-0"
        animate={{ x: hovered ? shift : 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
      >
        <div className="mb-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ink-muted">
          <span
            className="text-[10px] tracking-[0.18em] uppercase text-brass-deep"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontWeight: 600,
              letterSpacing: isRtl ? 0 : '0.18em',
              textTransform: isRtl ? 'none' : 'uppercase',
              fontSize: isRtl ? 12 : 10,
            }}
          >
            {categoryLabel}
          </span>
          <span aria-hidden className="text-ink-muted/40">·</span>
          <span
            className="text-[10.5px]"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontWeight: 400,
              fontSize: isRtl ? 12 : 10.5,
            }}
          >
            {readLabel}
          </span>
        </div>
        <h3
          className="text-balance text-ink"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic-display)' : 'var(--font-display)',
            fontWeight: isRtl ? 500 : 400,
            fontSize: 'clamp(22px, 3.3vw, 36px)',
            lineHeight: 1.15,
            letterSpacing: isRtl ? 0 : '-0.018em',
          }}
        >
          {title}
        </h3>
        <p
          className="mt-2 line-clamp-1 text-pretty text-ink-soft"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
            fontStyle: isRtl ? 'normal' : 'italic',
            fontSize: isRtl ? 14.5 : 15,
            lineHeight: 1.5,
          }}
        >
          {excerpt}
        </p>
      </motion.div>

      {/* Thumbnail with printed frame */}
      <div className="relative">
        <div className="frame-print h-[68px] w-[68px] md:h-[92px] md:w-[92px]">
          <div className="relative h-full w-full overflow-hidden">
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="(min-width: 768px) 92px, 68px"
              className="object-cover transition-transform duration-700 group-hover:scale-105 duotone-warm"
            />
          </div>
        </div>
      </div>
    </motion.li>
  )
}

function MaskedLine({ children, delay }: { children: React.ReactNode; delay: number }) {
  return (
    <span className="relative block overflow-hidden">
      <motion.span
        className="relative inline-block"
        initial={{ y: '102%', opacity: 0 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.95, delay, ease: EASE_IN_OUT_QUART }}
        style={{ willChange: 'transform, opacity' }}
      >
        {children}
      </motion.span>
    </span>
  )
}
