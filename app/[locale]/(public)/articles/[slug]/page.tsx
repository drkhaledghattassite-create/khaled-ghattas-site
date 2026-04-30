import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ShareButtons } from '@/components/shared/ShareButtons'
import { ArticleJsonLd } from '@/components/seo/StructuredData'
import { ReadingProgress } from '@/components/motion/ReadingProgress'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'
import { PullQuote } from '@/components/motion/PullQuote'
import { FocusModeToggle } from '@/components/motion/FocusModeToggle'
import { ComingSoon } from '@/components/shared/ComingSoon'
import {
  getArticleBySlug,
  getArticles,
  getRelatedArticles,
} from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { SITE_URL } from '@/lib/constants'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const articles = await getArticles()
  return articles.flatMap((a) =>
    ['ar', 'en'].map((locale) => ({ locale, slug: a.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const article = await getArticleBySlug(slug)
  if (!article) return {}
  const isAr = locale === 'ar'
  const title = isAr ? article.titleAr : article.titleEn
  const description = isAr ? article.excerptAr : article.excerptEn
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/articles/${slug}`
  const image = article.coverImage ?? '/opengraph-image'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/articles/${slug}`,
        en: `${SITE_URL}/en/articles/${slug}`,
      },
    },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'Dr. Khaled Ghattass',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: isAr ? 'ar_LB' : 'en_US',
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt?.toISOString(),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

function formatDate(date: Date, isRtl: boolean): string {
  const opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
  return new Intl.DateTimeFormat(isRtl ? 'ar-EG' : 'en-US', opts).format(date)
}

function estimateReadMinutes(content: string, isRtl: boolean): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  if (words === 0) return 1
  return Math.max(1, Math.round(words / (isRtl ? 180 : 220)))
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('articles')) {
    return <ComingSoon pageKey="articles" />
  }

  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const t = await getTranslations('article')
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const tArticles = await getTranslations('articles')
  const related = await getRelatedArticles(slug, 3)
  const isRtl = locale === 'ar'
  const Back = isRtl ? ChevronRight : ChevronLeft

  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const excerpt = locale === 'ar' ? article.excerptAr : article.excerptEn
  const content = locale === 'ar' ? article.contentAr : article.contentEn
  const date = formatDate(article.publishedAt ?? article.createdAt, isRtl)
  const minutes = estimateReadMinutes(content, isRtl)
  const minRead = t('min_read')

  return (
    <article
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-[var(--color-bg)]"
    >
      <ReadingProgress />
      <FocusModeToggle />
      <ArticleJsonLd article={article} locale={locale} />
      {/* Hero header */}
      <header className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)_clamp(40px,5vw,72px)]">
        <div className="mx-auto max-w-[860px]">
          <div className="flex items-center justify-between mb-8">
            <Breadcrumbs
              crumbs={[
                { href: '/', label: tNav('home') },
                { href: '/articles', label: tNav('articles') },
                { href: `/articles/${article.slug}`, label: title },
              ]}
            />
            <Link
              href="/articles"
              className={`inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-fg3)] hover:text-[var(--color-fg1)] transition-colors ${
                isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
              }`}
            >
              <Back className="h-3 w-3" aria-hidden />
              {tCommon('back')}
            </Link>
          </div>

          <span
            aria-hidden
            className={`inline-block mb-6 text-[11px] font-semibold tracking-[0.18em] text-[var(--color-fg3)] [font-feature-settings:"tnum"] ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !font-bold' : 'font-display'
            }`}
          >
            {t('folio')}
          </span>

          <div
            className={`flex items-center flex-wrap gap-3.5 mb-6 text-[11px] font-bold uppercase tracking-[0.14em] ${
              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
            }`}
          >
            {article.category && (
              <span className="text-[var(--color-accent)]">
                {tArticles(`categories.${article.category}`)}
              </span>
            )}
            <span aria-hidden className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--color-fg3)]" />
            <time dateTime={(article.publishedAt ?? article.createdAt).toISOString()} className="text-[var(--color-fg3)]">
              {date}
            </time>
            <span aria-hidden className="inline-block w-[3px] h-[3px] rounded-full bg-[var(--color-fg3)]" />
            <span className="text-[var(--color-fg3)]">{minutes} {minRead}</span>
          </div>

          <h1
            className={`m-0 text-[clamp(36px,5.5vw,64px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-[var(--color-fg1)] [text-wrap:balance] ${
              isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.035em]'
            }`}
          >
            {title}
          </h1>

          <span
            aria-hidden
            className="block w-12 h-[3px] bg-[var(--color-accent)] my-7"
          />

          {excerpt && (
            <ScrollRevealLine
              as="p"
              offset={['start 0.85', 'start 0.3']}
              className={`m-0 text-[clamp(17px,1.7vw,21px)] leading-[1.6] [text-wrap:pretty] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {excerpt}
            </ScrollRevealLine>
          )}
        </div>
      </header>

      {article.coverImage && (
        <div className="relative aspect-[16/9] w-full max-w-[1200px] mx-auto overflow-hidden bg-[var(--color-bg-deep)] [margin-block:clamp(40px,5vw,72px)]">
          <Image
            src={article.coverImage}
            alt={title}
            fill
            sizes="(min-width: 1200px) 1200px, 100vw"
            className="object-cover"
            priority
            style={{ viewTransitionName: `article-${article.slug}` }}
          />
        </div>
      )}

      {/* Body */}
      <section className="[padding:clamp(40px,5vw,72px)_clamp(20px,5vw,56px)]" data-focus-content>
        <div className="mx-auto max-w-[680px]">
          <div
            className={`text-[var(--color-fg1)] text-[18px] leading-[1.85] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {content.split('\n').filter(Boolean).map((raw, i) => {
              const trimmed = raw.trim()
              if (trimmed.startsWith('> ')) {
                const body = trimmed.slice(2).trim()
                return (
                  <PullQuote key={i}>
                    {body}
                  </PullQuote>
                )
              }
              return (
                <ScrollRevealLine
                  key={i}
                  as="p"
                  offset={['start 0.85', 'start 0.3']}
                  className={`mb-6 ${i === 0 ? 'dropcap' : ''}`}
                >
                  {raw}
                </ScrollRevealLine>
              )
            })}
          </div>

          <div className="mt-12 flex items-center justify-between border-t border-[var(--color-border)] pt-8">
            <div className="flex items-center gap-3">
              <span className="relative block h-11 w-11 overflow-hidden rounded-full bg-[var(--color-bg-deep)]">
                <Image
                  src="/dr khaled photo.jpeg"
                  alt=""
                  fill
                  sizes="44px"
                  className="object-cover"
                />
              </span>
              <div className="flex flex-col">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                  }`}
                >
                  {t('author')}
                </span>
                <span
                  className={`text-[14px] font-bold text-[var(--color-fg1)] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.012em]'
                  }`}
                >
                  {tNav('brand')}
                </span>
              </div>
            </div>
            <ShareButtons url={`${SITE_URL}/${locale === 'ar' ? '' : 'en/'}articles/${article.slug}`} title={title} />
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section
          className="border-t border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
        >
          <div className="mx-auto max-w-[var(--container-max)]">
            <header className="grid items-end gap-2 pb-10 md:pb-12">
              <span className="section-eyebrow">{t('continue_reading')}</span>
              <h2 className="section-title">{t('related')}</h2>
            </header>

            <ul className="m-0 p-0 list-none grid grid-cols-1 gap-[clamp(28px,4vw,40px)] md:grid-cols-3">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/articles/${r.slug}`}
                    className="group flex flex-col gap-3.5 transition-transform duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-1"
                  >
                    {r.coverImage && (
                      <div className="relative aspect-[4/3] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)]">
                        <Image
                          src={r.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 400px, 100vw"
                          className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-2 px-0.5">
                      {r.category && (
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
                            isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                          }`}
                        >
                          {tArticles(`categories.${r.category}`)}
                        </span>
                      )}
                      <h3
                        className={`m-0 text-[18px] leading-[1.3] font-bold text-[var(--color-fg1)] group-hover:text-[var(--color-accent)] transition-colors ${
                          isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]'
                        }`}
                      >
                        {locale === 'ar' ? r.titleAr : r.titleEn}
                      </h3>
                      <span
                        className={`text-[12px] font-medium text-[var(--color-fg3)] [font-feature-settings:"tnum"] ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        {formatDate(r.publishedAt ?? r.createdAt, isRtl)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </article>
  )
}
