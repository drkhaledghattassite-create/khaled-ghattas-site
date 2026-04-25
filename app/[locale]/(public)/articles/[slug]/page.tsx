import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { ShareButtons } from '@/components/shared/ShareButtons'
import {
  getArticleBySlug,
  getArticles,
  getRelatedArticles,
} from '@/lib/db/queries'
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
  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const description = locale === 'ar' ? article.excerptAr : article.excerptEn
  return { title, description }
}

export default async function ArticlePage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const article = await getArticleBySlug(slug)
  if (!article) notFound()

  const t = await getTranslations('article')
  const tNav = await getTranslations('nav')
  const tCommon = await getTranslations('common')
  const related = await getRelatedArticles(slug, 3)
  const isRtl = locale === 'ar'
  const Back = isRtl ? ChevronRight : ChevronLeft

  const title = locale === 'ar' ? article.titleAr : article.titleEn
  const excerpt = locale === 'ar' ? article.excerptAr : article.excerptEn
  const content = locale === 'ar' ? article.contentAr : article.contentEn
  const dateLabel = (article.publishedAt ?? article.createdAt)
    .toISOString()
    .slice(0, 10)

  return (
    <article className="bg-cream pt-[calc(43px+var(--spacing-md))] pb-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[900px] px-[var(--spacing-md)]">
        <div className="mb-6 flex items-center justify-between">
          <Breadcrumbs
            crumbs={[
              { href: '/', label: tNav('home') },
              { href: '/articles', label: tNav('articles') },
              { href: `/articles/${article.slug}`, label: title },
            ]}
          />
          <Link
            href="/articles"
            className="font-label inline-flex items-center gap-1 text-[12px] text-ink-muted transition-colors hover:text-ink"
          >
            <Back className="h-3 w-3" aria-hidden />
            {tCommon('back')}
          </Link>
        </div>

        <header className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="font-label rounded-full border border-dashed border-amber bg-amber/10 px-3 py-1 text-[11px] text-amber">
              {article.category}
            </span>
            <time
              dateTime={dateLabel}
              className="font-label text-[12px] text-ink-muted"
            >
              {dateLabel}
            </time>
          </div>
          <h1
            className="uppercase text-ink"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
              fontWeight: isRtl ? 700 : 600,
              fontSize: 'clamp(32px, 6vw, 60px)',
              lineHeight: 1.1,
              letterSpacing: isRtl ? 'normal' : '-1.5px',
            }}
          >
            {title}
          </h1>
          <p
            className="text-ink-muted"
            style={{
              fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
              fontStyle: isRtl ? 'normal' : 'italic',
              fontSize: 20,
              lineHeight: 1.6,
            }}
          >
            {excerpt}
          </p>
        </header>

        {article.coverImage && (
          <div className="dotted-outline relative my-10 aspect-[16/9] overflow-hidden bg-cream-warm">
            <Image
              src={article.coverImage}
              alt=""
              fill
              sizes="(min-width: 768px) 900px, 100vw"
              className="object-cover"
              priority
            />
          </div>
        )}

        <div
          className="text-ink"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
            fontSize: 18,
            lineHeight: 1.8,
          }}
        >
          {content.split('\n').map((p, i) => (
            <p key={i} className="mb-5">
              {p}
            </p>
          ))}
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-dashed border-ink/30 pt-6">
          <div className="flex items-center gap-3">
            <span className="relative block h-10 w-10 overflow-hidden rounded-full border border-dashed border-ink bg-cream-soft">
              <Image
                src="/placeholder/hero/portrait-bw.jpg"
                alt=""
                fill
                sizes="40px"
                className="object-cover grayscale"
              />
            </span>
            <div className="flex flex-col">
              <span className="font-label text-[11px] text-ink-muted">{t('author')}</span>
              <span
                className="text-ink"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                  fontWeight: isRtl ? 700 : 600,
                  letterSpacing: isRtl ? 'normal' : '0.02em',
                }}
              >
                {tNav('brand')}
              </span>
            </div>
          </div>
          <ShareButtons url={`${SITE_URL}/${locale === 'ar' ? '' : 'en/'}articles/${article.slug}`} title={title} />
        </div>
      </div>

      <section className="mx-auto mt-[var(--spacing-xl)] max-w-[1200px] px-[var(--spacing-md)]">
        <h2
          className="mb-8 uppercase text-ink"
          style={{
            fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
            fontWeight: isRtl ? 700 : 600,
            fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: isRtl ? 'normal' : '-0.5px',
          }}
        >
          {t('related')}
        </h2>
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {related.map((r) => (
            <li key={r.id} className="group">
              <Link href={`/articles/${r.slug}`} className="block">
                {r.coverImage && (
                  <div className="relative aspect-[4/3] overflow-hidden border border-dashed border-ink bg-cream-soft">
                    <Image
                      src={r.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 400px, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="mt-3 space-y-1">
                  <span className="font-label text-[11px] text-amber">
                    {(r.publishedAt ?? r.createdAt).toISOString().slice(0, 10)}
                  </span>
                  <p
                    className="uppercase text-ink"
                    style={{
                      fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                      fontWeight: isRtl ? 700 : 600,
                      fontSize: 18,
                      lineHeight: 1.25,
                      letterSpacing: isRtl ? 'normal' : '-0.5px',
                    }}
                  >
                    {locale === 'ar' ? r.titleAr : r.titleEn}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
