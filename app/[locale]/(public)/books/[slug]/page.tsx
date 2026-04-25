import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import {
  getBookBySlug,
  getBooks,
  getRelatedBooks,
} from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; slug: string }> }

export async function generateStaticParams() {
  const books = await getBooks()
  return books.flatMap((b) =>
    ['ar', 'en'].map((locale) => ({ locale, slug: b.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const book = await getBookBySlug(slug)
  if (!book) return {}
  const title = locale === 'ar' ? book.titleAr : book.titleEn
  const description = locale === 'ar' ? book.descriptionAr : book.descriptionEn
  return { title, description }
}

export default async function BookPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const book = await getBookBySlug(slug)
  if (!book) notFound()

  const t = await getTranslations('book')
  const tNav = await getTranslations('nav')
  const related = await getRelatedBooks(slug, 3)
  const isRtl = locale === 'ar'

  const title = locale === 'ar' ? book.titleAr : book.titleEn
  const subtitle = locale === 'ar' ? book.subtitleAr : book.subtitleEn
  const description = locale === 'ar' ? book.descriptionAr : book.descriptionEn

  return (
    <article className="bg-cream pt-[calc(43px+var(--spacing-md))] pb-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-md)]">
        <Breadcrumbs
          crumbs={[
            { href: '/', label: tNav('home') },
            { href: '/books', label: tNav('books') },
            { href: `/books/${book.slug}`, label: title },
          ]}
        />

        <div className="mt-[var(--spacing-md)] grid grid-cols-1 gap-[var(--spacing-xl)] md:grid-cols-[1fr_1.2fr]">
          <div className="dotted-outline relative mx-auto aspect-[2/3] w-full max-w-[420px] overflow-hidden bg-cream-soft">
            <Image
              src={book.coverImage}
              alt=""
              fill
              sizes="(min-width: 768px) 420px, 100vw"
              className="object-cover"
              priority
            />
          </div>

          <div className="flex flex-col gap-[var(--spacing-md)]">
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

            {subtitle && (
              <p
                className="text-ink-muted"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                  fontStyle: isRtl ? 'normal' : 'italic',
                  fontSize: 22,
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </p>
            )}

            <p
              className="text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontSize: 16,
                lineHeight: 1.7,
              }}
            >
              {description}
            </p>

            {book.price && (
              <div className="flex items-baseline gap-2">
                <span
                  className="text-ink"
                  style={{
                    fontFamily: 'var(--font-oswald)',
                    fontWeight: 600,
                    fontSize: 34,
                  }}
                >
                  ${book.price}
                </span>
                <span className="font-label text-[12px] text-ink-muted">{book.currency}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="font-label inline-flex items-center gap-2 rounded-full border border-dashed border-ink bg-ink px-5 py-2.5 text-[12px] text-cream-soft transition-colors duration-300 hover:bg-transparent hover:text-ink"
                style={{ letterSpacing: '0.08em' }}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream-soft" />
                {t('buy')}
              </button>
              <button
                type="button"
                className="font-label inline-flex items-center gap-2 rounded-full border border-dashed border-ink px-5 py-2.5 text-[12px] text-ink transition-colors duration-300 hover:bg-ink hover:text-cream-soft"
                style={{ letterSpacing: '0.08em' }}
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
                {t('sample')}
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-dashed border-ink/30 pt-4 text-[13px] text-ink-muted">
              <div>
                <dt className="font-label text-[11px] text-ink-muted">{t('format')}</dt>
                <dd className="mt-0.5 text-ink">
                  {book.digitalFile ? t('format_digital') : t('format_print')}
                </dd>
              </div>
              {book.publisher && (
                <div>
                  <dt className="font-label text-[11px] text-ink-muted">{t('publisher')}</dt>
                  <dd className="mt-0.5 text-ink">{book.publisher}</dd>
                </div>
              )}
              {book.publicationYear && (
                <div>
                  <dt className="font-label text-[11px] text-ink-muted">{t('year')}</dt>
                  <dd className="mt-0.5 text-ink">{book.publicationYear}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <section className="mt-[var(--spacing-xl)]">
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
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {related.map((r) => (
              <li key={r.id}>
                <Link href={`/books/${r.slug}`} className="group block">
                  <div className="dotted-outline relative aspect-[2/3] overflow-hidden bg-cream-soft">
                    <Image
                      src={r.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p
                    className="mt-2 uppercase text-ink"
                    style={{
                      fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                      fontWeight: isRtl ? 700 : 600,
                      fontSize: 14,
                      lineHeight: 1.3,
                      letterSpacing: isRtl ? 'normal' : '-0.3px',
                    }}
                  >
                    {locale === 'ar' ? r.titleAr : r.titleEn}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  )
}
