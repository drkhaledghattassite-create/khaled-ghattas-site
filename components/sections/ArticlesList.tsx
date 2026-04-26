'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Article } from '@/lib/db/queries'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]
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
}

export function ArticlesList({ articles, showHeader = true }: ArticlesListProps) {
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

  const featured = articles[0]
  if (!featured) return null
  const rest = articles.slice(1)

  const featuredTitle = isRtl ? featured.titleAr : featured.titleEn
  const featuredExcerpt = isRtl ? featured.excerptAr : featured.excerptEn
  const featuredCat = featured.category
    ? tArticles(`categories.${featured.category}`)
    : null
  const featuredDate = formatDate(featured.publishedAt ?? featured.createdAt, isRtl)
  const featuredMinutes = estimateReadMinutes(featured, locale)
  const featuredCover = featured.coverImage ?? FALLBACK

  const featuredKicker = isRtl ? 'الأحدث' : 'Most recent'
  const minRead = isRtl ? 'دقائق قراءة' : 'min read'
  const readArticleLabel = tArticles('read_article')

  return (
    <section
      id="articles"
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

        {/* Featured */}
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="group grid items-stretch gap-[clamp(32px,5vw,72px)] pb-14 mb-0 border-b border-[var(--color-border)] md:grid-cols-[1.1fr_1fr]"
        >
          <div className="aspect-[5/6] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)]">
            <Image
              src={featuredCover}
              alt=""
              width={720}
              height={864}
              className="w-full h-full object-cover [filter:grayscale(0.1)] transition-transform duration-[400ms] ease-[var(--ease-out)] group-hover:scale-[1.02]"
              sizes="(min-width: 768px) 600px, 100vw"
            />
          </div>
          <div className="flex flex-col justify-center gap-[18px] py-6">
            <span
              className={`inline-flex items-center gap-2 w-max text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent)] before:content-[''] before:w-2.5 before:h-px before:bg-[var(--color-accent)] ${
                isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case' : 'font-display'
              }`}
            >
              {featuredKicker}
            </span>
            {featuredCat && (
              <span
                className={`text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--color-fg2)] ${
                  isRtl ? '!tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {featuredCat}
              </span>
            )}
            <h3
              className={`m-0 text-[clamp(28px,3.6vw,46px)] leading-[1.15] font-bold tracking-[-0.01em] text-[var(--color-fg1)] [text-wrap:balance] ${
                isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.025em]'
              }`}
            >
              <Link href={`/articles/${featured.slug}`} className="hover:text-[var(--color-accent)] transition-colors">
                {featuredTitle}
              </Link>
            </h3>
            {featuredExcerpt && (
              <p className="m-0 max-w-[520px] text-[17px] leading-[1.6] text-[var(--color-fg2)]">
                {featuredExcerpt}
              </p>
            )}
            <div
              className={`flex items-center flex-wrap gap-3 mt-1.5 text-[13px] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <span>{featuredDate}</span>
              <span aria-hidden>·</span>
              <span>
                {featuredMinutes} {minRead}
              </span>
              <Link
                href={`/articles/${featured.slug}`}
                className="link-underline ms-auto"
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
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.05 }}
                  transition={{ duration: 0.55, delay: i * 0.04, ease: EASE }}
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
