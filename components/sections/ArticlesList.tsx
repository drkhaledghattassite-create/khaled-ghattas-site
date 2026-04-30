'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Article } from '@/lib/db/queries'
import {
  blurRevealBidirectional,
  EASE_EDITORIAL,
  VIEWPORT_BIDIRECTIONAL,
} from '@/lib/motion/variants'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'

const EASE = EASE_EDITORIAL
const FALLBACK = '/dr khaled photo.jpeg'

function formatDate(date: Date, isRtl: boolean): string {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  if (isRtl) {
    return new Intl.DateTimeFormat('ar-EG', opts).format(date)
  }
  return new Intl.DateTimeFormat('en-US', opts).format(date)
}

function estimateReadMinutes(article: Article, locale: string): number {
  const text = (locale === 'ar' ? article.contentAr : article.contentEn) ?? ''
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 1
  const wpm = locale === 'ar' ? 180 : 220
  return Math.max(1, Math.round(words / wpm))
}

type ArticlesListProps = {
  articles: Article[]
  showHeader?: boolean
  featuredArticleSlug?: string | null
}

export function ArticlesList({
  articles,
  showHeader = true,
  featuredArticleSlug,
}: ArticlesListProps) {
  const locale = useLocale()
  const tSection = useTranslations('articles_section')
  const tArticles = useTranslations('articles')
  const isRtl = locale === 'ar'

  if (articles.length === 0) {
    return (
      <section className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]">
        <div className="mx-auto max-w-[var(--container-max)] text-center">
          <Link href="/articles" className="link-underline">
            {tSection('view_all')}
          </Link>
        </div>
      </section>
    )
  }

  // Pinned featured article — falls through to first published if missing.
  const pinned = featuredArticleSlug
    ? articles.find((a) => a.slug === featuredArticleSlug)
    : null
  const featured = pinned ?? articles[0]
  if (!featured) return null
  const rest = articles.filter((a) => a.id !== featured.id)

  const featuredTitle = isRtl ? featured.titleAr : featured.titleEn
  const featuredExcerpt = isRtl ? featured.excerptAr : featured.excerptEn
  const featuredCat = featured.category
    ? tArticles(`categories.${featured.category}`)
    : null
  const featuredDate = formatDate(featured.publishedAt ?? featured.createdAt, isRtl)
  const featuredMinutes = estimateReadMinutes(featured, locale)
  const featuredCover = featured.coverImage ?? FALLBACK

  const featuredKicker = tSection('kicker_recent')
  const minRead = tSection('min_read')
  const readArticleLabel = tArticles('read_article')

  return (
    <section
      id="articles"
      data-bg="var(--color-bg-deep)"
      className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        {showHeader && (
          <header className="grid items-end gap-6 pb-14 md:grid-cols-[1fr_auto]">
            <div>
              <span className="section-eyebrow">{tSection('eyebrow')}</span>
              <h2 className="section-title mt-3.5">{tSection('heading')}</h2>
            </div>
            <Link
              href="/articles"
              className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-accent)] transition-colors ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {tSection('view_all')}
              <span aria-hidden>{isRtl ? '←' : '→'}</span>
            </Link>
          </header>
        )}

        {/* Featured — editorial print-magazine treatment with folio number */}
        <motion.article
          variants={blurRevealBidirectional}
          initial="hidden"
          whileInView="visible"
          viewport={VIEWPORT_BIDIRECTIONAL}
          className="group relative grid items-stretch gap-[clamp(32px,5vw,72px)] [padding:clamp(40px,5vw,72px)_0_clamp(56px,6vw,80px)] mb-0 border-b border-[var(--color-border)] md:grid-cols-[1.1fr_1fr]"
        >
          {/* Folio number — top corner */}
          <span
            aria-hidden
            className={`absolute [top:clamp(40px,5vw,72px)] [inset-inline-end:0] text-[11px] font-semibold tracking-[0.18em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] z-[1] ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
            }`}
          >
            {tSection('folio')}
          </span>

          {/* Image with caption */}
          <div className="relative aspect-[5/6] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)]">
            <Image
              src={featuredCover}
              alt=""
              fill
              sizes="(min-width: 768px) 600px, 100vw"
              className="object-cover [filter:grayscale(0.08)] transition-transform duration-[400ms] ease-[var(--ease-out)] group-hover:scale-[1.02]"
              style={{ viewTransitionName: `article-${featured.slug}` }}
            />
            {/* Inset shadow ring */}
            <span
              aria-hidden
              className="absolute inset-0 pointer-events-none [box-shadow:inset_0_0_0_1px_rgba(0,0,0,0.04)]"
            />
            {/* Caption — bottom-left badge */}
            <span
              className={`absolute bottom-4 [inset-inline-start:16px] inline-flex items-center px-2.5 py-1.5 rounded-[2px] backdrop-blur-md text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 bg-black/40 ${
                isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case' : 'font-display'
              }`}
            >
              {featuredKicker}
            </span>
          </div>

          {/* Meta column */}
          <div className="flex flex-col justify-center gap-5 [padding-block:clamp(8px,2vw,24px)]">
            {/* Eyebrow row — tag + dot + category */}
            <div
              className={`flex items-center flex-wrap gap-3.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              <span
                className={`inline-flex items-center gap-2 text-[var(--color-accent)] before:content-[''] before:w-3.5 before:h-px before:bg-[var(--color-accent)] before:inline-block`}
              >
                {featuredKicker}
              </span>
              {featuredCat && (
                <>
                  <span aria-hidden className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--color-fg3)]" />
                  <span>{featuredCat}</span>
                </>
              )}
            </div>

            {/* Title */}
            <h3
              className={`m-0 text-[clamp(30px,4vw,52px)] leading-[1.08] font-bold tracking-[-0.015em] text-[var(--color-fg1)] [text-wrap:balance] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.025em]'
              }`}
            >
              <Link
                href={`/articles/${featured.slug}`}
                className="transition-colors duration-200 hover:text-[var(--color-accent)]"
              >
                {featuredTitle}
              </Link>
            </h3>

            {/* Dek */}
            {featuredExcerpt && (
              <ScrollRevealLine
                as="p"
                offset={['start 0.85', 'start 0.3']}
                className={`m-0 max-w-[540px] text-[clamp(16px,1.4vw,18px)] leading-[1.55] [text-wrap:pretty] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {featuredExcerpt}
              </ScrollRevealLine>
            )}

            {/* Foot — uppercase metadata + auto-margined link */}
            <div
              className={`flex items-center flex-wrap gap-3.5 mt-3 pt-[22px] border-t border-[var(--color-border)] text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              <span>{featuredDate}</span>
              <span aria-hidden className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--color-fg3)]" />
              <span>
                {featuredMinutes} {minRead}
              </span>
              <Link
                href={`/articles/${featured.slug}`}
                className={`ms-auto inline-flex items-center gap-2 text-[var(--color-fg1)] font-bold tracking-[0.04em] border-b border-[var(--color-fg1)] pb-[3px] transition-[color,border-color,gap] duration-200 hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] hover:gap-3 ${
                  isRtl ? 'font-arabic-body !tracking-normal' : 'font-display'
                }`}
              >
                {readArticleLabel}
                <span aria-hidden>{isRtl ? '←' : '→'}</span>
              </Link>
            </div>
          </div>
        </motion.article>

        {/* Dense numbered list */}
        {rest.length > 0 && (
          <ol className="grid grid-cols-1 m-0 p-0 list-none gap-x-[clamp(32px,5vw,72px)] md:grid-cols-2">
            {rest.map((article, i) => {
              const title = isRtl ? article.titleAr : article.titleEn
              const cat = article.category ? tArticles(`categories.${article.category}`) : null
              const date = formatDate(article.publishedAt ?? article.createdAt, isRtl)

              return (
                <motion.li
                  key={article.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.05 }}
                  transition={{ duration: 0.6, delay: i * 0.06, ease: EASE }}
                  className="border-b border-[var(--color-border)]"
                >
                  <Link
                    href={`/articles/${article.slug}`}
                    className="hover-shift grid grid-cols-[auto_1fr_auto] grid-rows-[auto_auto] gap-x-4 gap-y-1 items-baseline py-[22px]"
                  >
                    <span
                      className={`row-span-2 self-start pt-1 text-[12px] font-semibold tracking-[0.04em] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {String(i + 2).padStart(2, '0')}
                    </span>
                    {cat && (
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)] ${
                          isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                        }`}
                      >
                        {cat}
                      </span>
                    )}
                    <h4
                      className={`col-start-2 m-0 text-[19px] leading-[1.3] font-bold text-[var(--color-fg1)] ${
                        isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
                      }`}
                    >
                      {title}
                    </h4>
                    <span
                      className={`row-span-2 self-start pt-1 whitespace-nowrap text-[12px] text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {date}
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
