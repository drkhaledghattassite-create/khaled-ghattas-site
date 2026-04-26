'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { ChapterMark, Ornament, FlourishRule } from '@/components/shared/Ornament'
import type { Article } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const FALLBACK_THUMBNAIL_FEATURED = '/dr khaled photo.jpeg'

function EmptyArticles({ isRtl, viewAllLabel }: { isRtl: boolean; viewAllLabel: string }) {
  return (
    <div className="paper-card flex flex-col items-center gap-4 px-8 py-14 text-center">
      <span className="text-brass">
        <Ornament glyph="fleuron" size={28} />
      </span>
      <p
        className="text-ink font-display italic font-normal text-[22px] leading-[1.3] [dir=rtl]:font-arabic-display [dir=rtl]:not-italic [dir=rtl]:font-medium"
      >
        {isRtl ? 'لا توجد مقالات في الأرشيف بعد' : 'The archive is still in galley.'}
      </p>
      <Link href="/articles" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
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
  const tSection = useTranslations('articles_section')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40">
      <div className="mx-auto max-w-[1200px]">
        {showHeader && (
          <header className="mb-[var(--spacing-lg)] space-y-3">
            <ChapterMark number=".04" label={isRtl ? 'أحدث الكتابات' : 'Recent Writing'} />

            <h2 className="m-0 text-balance">
              <MaskedLine delay={0}>
                <span
                  className="text-ink font-display font-normal text-[clamp(40px,7vw,92px)] leading-[0.96] tracking-[-0.024em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
                >
                  {tSection('heading')}
                </span>
              </MaskedLine>
            </h2>
          </header>
        )}

        {articles.length === 0 ? (
          <EmptyArticles isRtl={isRtl} viewAllLabel={tSection('view_all')} />
        ) : (
          <ul>
            {articles.map((article, i) =>
              i === 0 ? (
                <FeaturedArticleRow
                  key={article.id}
                  article={article}
                  isRtl={isRtl}
                  locale={locale}
                />
              ) : (
                <ArticleRow
                  key={article.id}
                  article={article}
                  index={i}
                  isRtl={isRtl}
                  locale={locale}
                />
              ),
            )}
          </ul>
        )}

        {/* View all CTA at section bottom */}
        <div className="pt-10 flex items-center gap-4">
          <Link href="/articles" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-transparent text-ink text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-ink hover:text-paper-soft active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
            <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
            {tSection('view_all')}
          </Link>
          <span aria-hidden className="text-ink-muted/60 hidden sm:inline">
            <Ornament glyph="asterism" size={14} />
          </span>
        </div>
      </div>
    </section>
  )
}

function FeaturedArticleRow({
  article,
  isRtl,
  locale,
}: {
  article: Article
  isRtl: boolean
  locale: string
}) {
  const [hovered, setHovered] = useState(false)
  const tSection = useTranslations('articles_section')
  const tArticles = useTranslations('articles')
  const dateLabel = (article.publishedAt ?? article.createdAt).toISOString().slice(0, 10)
  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const excerpt = locale === 'ar' ? article.excerptAr : article.excerptEn
  const thumbnail = article.coverImage ?? FALLBACK_THUMBNAIL_FEATURED
  const categoryLabel = tArticles(`categories.${article.category}`)

  return (
    <motion.li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      initial={{ y: 26, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, ease: EASE_OUT_QUART }}
      className="group relative isolate hairline-b py-8 md:py-12"
    >
      <Link
        href={`/articles/${article.slug}`}
        className="absolute inset-0 z-10"
        aria-label={title}
      />

      {/* Hover wash */}
      <motion.span
        aria-hidden
        className="absolute inset-x-[-12px] inset-y-0 -z-10"
        style={{
          background:
            'linear-gradient(180deg, rgba(232,217,190,0) 0%, rgba(232,217,190,0.55) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.5, ease: EASE_IN_OUT_QUART }}
      />

      <div className="grid gap-6 md:grid-cols-[1fr_300px] md:gap-8 md:items-start">
        {/* Content */}
        <div>
          {/* Meta row */}
          <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-ink-muted">
            <span
              className="text-brass-deep font-display font-semibold text-[10px] tracking-[0.18em] uppercase [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
            >
              {categoryLabel}
            </span>
            <span aria-hidden className="text-ink-muted/40">·</span>
            <span
              className="font-display italic text-[10.5px] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[12px]"
            >
              {dateLabel}
            </span>
            <span
              className="rounded-sm px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] bg-sky text-ink"
            >
              {tSection('featured_label')}
            </span>
          </div>

          {/* Title */}
          <h3
            className="text-balance text-ink font-display font-normal text-[clamp(26px,4vw,44px)] leading-[1.1] tracking-[-0.018em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {title}
          </h3>

          {/* Excerpt — 3 lines */}
          <p
            className="mt-3 line-clamp-3 text-pretty text-ink-soft font-serif italic text-[16px] leading-[1.6] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[15.5px] [dir=rtl]:leading-[1.9]"
          >
            {excerpt}
          </p>

          {/* Read article pill */}
          <div className="relative z-20 mt-5">
            <span className="inline-flex items-center gap-2 px-4 py-[7px] min-h-9 rounded-full border border-ink bg-ink text-paper-soft text-[11px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold">
              <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-current" />
              {isRtl ? 'اقرأ المقال' : 'READ ARTICLE'}
            </span>
          </div>
        </div>

        {/* Large thumbnail */}
        <div className="relative h-[200px] w-full overflow-hidden md:h-[240px]">
          <Image
            src={thumbnail}
            alt=""
            fill
            sizes="(min-width: 768px) 300px, 100vw"
            className={cn(
              'object-cover transition-transform duration-700 duotone-warm',
              hovered && 'scale-105',
            )}
          />
        </div>
      </div>
    </motion.li>
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
          className="text-[11.5px] tracking-[0.06em] tabular-nums font-display italic font-normal"
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
            className="font-display font-semibold text-[10px] tracking-[0.18em] uppercase text-brass-deep [dir=rtl]:font-arabic [dir=rtl]:text-[12px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
          >
            {categoryLabel}
          </span>
          <span aria-hidden className="text-ink-muted/40">·</span>
          <span
            className="font-display italic font-normal text-[10.5px] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[12px]"
          >
            {readLabel}
          </span>
        </div>
        <h3
          className="text-balance text-ink font-display font-normal text-[clamp(22px,3.3vw,36px)] leading-[1.15] tracking-[-0.018em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
        >
          {title}
        </h3>
        <p
          className="mt-2 line-clamp-1 text-pretty text-ink-soft font-serif italic text-[15px] leading-[1.5] [dir=rtl]:font-arabic [dir=rtl]:not-italic [dir=rtl]:text-[14.5px]"
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
