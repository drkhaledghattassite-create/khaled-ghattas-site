import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { BookJsonLd } from '@/components/seo/StructuredData'
import { BookBuyButton } from '@/components/sections/BookBuyButton'
import {
  getBookBySlug,
  getBooks,
  getRelatedBooks,
} from '@/lib/db/queries'
import { SITE_URL } from '@/lib/constants'

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
  const isAr = locale === 'ar'
  const title = isAr ? book.titleAr : book.titleEn
  const description = isAr ? book.descriptionAr : book.descriptionEn
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/books/${slug}`
  const image = book.coverImage ?? '/opengraph-image'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/books/${slug}`,
        en: `${SITE_URL}/en/books/${slug}`,
      },
    },
    openGraph: {
      type: 'website',
      title,
      description,
      url,
      siteName: 'Dr. Khaled Ghattass',
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: isAr ? 'ar_LB' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function BookPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const book = await getBookBySlug(slug)
  if (!book) notFound()

  const t = await getTranslations('book')
  const tNav = await getTranslations('nav')
  const tBookType = await getTranslations('books.type')
  const related = await getRelatedBooks(slug, 3)
  const isRtl = locale === 'ar'

  const title = locale === 'ar' ? book.titleAr : book.titleEn
  const subtitle = locale === 'ar' ? book.subtitleAr : book.subtitleEn
  const description = locale === 'ar' ? book.descriptionAr : book.descriptionEn
  const isSession = book.productType === 'SESSION'
  const aspect = isSession ? 'aspect-[16/10]' : 'aspect-[2/3]'
  const price = book.price ? Math.round(Number(book.price)) : null

  return (
    <article
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-[var(--color-bg)]"
    >
      <BookJsonLd book={book} locale={locale} />
      <div className="[padding:clamp(48px,6vw,80px)_clamp(20px,5vw,56px)_clamp(24px,3vw,40px)]">
        <div className="mx-auto max-w-[var(--container-max)]">
          <Breadcrumbs
            crumbs={[
              { href: '/', label: tNav('home') },
              { href: '/books', label: tNav('store') },
              { href: `/books/${book.slug}`, label: title },
            ]}
          />
        </div>
      </div>

      <section className="border-b border-[var(--color-border)] [padding:0_clamp(20px,5vw,56px)_clamp(64px,8vw,112px)]">
        <div className="mx-auto max-w-[var(--container-max)] grid gap-[clamp(40px,6vw,80px)] md:grid-cols-[1fr_1.2fr] md:items-start">
          <div className="relative mx-auto w-full max-w-[440px]">
            <div
              className={`relative ${aspect} overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)] [box-shadow:var(--shadow-lift)]`}
            >
              <Image
                src={book.coverImage}
                alt={title}
                fill
                sizes="(min-width: 768px) 440px, 100vw"
                className="object-cover"
                priority
              />
              <span
                className={`absolute z-10 [inset-block-start:14px] [inset-inline-start:14px] inline-flex items-center px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md ${
                  isSession
                    ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                    : 'bg-white/95 text-[var(--color-fg1)]'
                } ${
                  isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !px-3 !py-1' : 'font-display'
                }`}
              >
                {tBookType(isSession ? 'session' : 'book')}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-7">
            <header className="flex flex-col gap-4">
              <span className="section-eyebrow">
                {tBookType(isSession ? 'session' : 'book')}
              </span>
              <h1
                className={`m-0 text-[clamp(36px,5.5vw,64px)] leading-[0.98] font-extrabold tracking-[-0.02em] text-[var(--color-fg1)] [text-wrap:balance] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.035em]'
                }`}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className={`m-0 text-[clamp(17px,1.7vw,21px)] leading-[1.45] font-medium text-[var(--color-accent)] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.012em]'
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </header>

            <span aria-hidden className="block w-12 h-[3px] bg-[var(--color-accent)]" />

            {description && (
              <p
                className={`m-0 text-[16px] leading-[1.75] text-[var(--color-fg2)] [text-wrap:pretty] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {description}
              </p>
            )}

            {price !== null && (
              <div className="flex items-baseline gap-2 pt-2">
                <span
                  className={`text-[clamp(28px,3.4vw,40px)] font-extrabold text-[var(--color-fg1)] [font-feature-settings:"tnum"] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display'
                  }`}
                >
                  ${price}
                </span>
                <span
                  className={`text-[12px] font-semibold tracking-[0.12em] text-[var(--color-fg3)] uppercase ${
                    isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                  }`}
                >
                  {book.currency}
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <BookBuyButton bookId={book.id} className="btn-pill btn-pill-accent">
                {t('buy')}
              </BookBuyButton>
              {!isSession && book.digitalFile && (
                <button type="button" className="btn-pill btn-pill-secondary">
                  {t('sample')}
                </button>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-4 mt-2 pt-7 border-t border-[var(--color-border)] text-[13px] text-[var(--color-fg2)]">
              <div>
                <dt
                  className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                    isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                  }`}
                >
                  {t('format')}
                </dt>
                <dd
                  className={`mt-1 m-0 text-[14px] font-semibold text-[var(--color-fg1)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {book.digitalFile ? t('format_digital') : t('format_print')}
                </dd>
              </div>
              {book.publisher && (
                <div>
                  <dt
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                    }`}
                  >
                    {t('publisher')}
                  </dt>
                  <dd
                    className={`mt-1 m-0 text-[14px] font-semibold text-[var(--color-fg1)] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {book.publisher}
                  </dd>
                </div>
              )}
              {book.publicationYear && (
                <div>
                  <dt
                    className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                      isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                    }`}
                  >
                    {t('year')}
                  </dt>
                  <dd
                    className={`mt-1 m-0 text-[14px] font-semibold text-[var(--color-fg1)] [font-feature-settings:"tnum"] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    }`}
                  >
                    {book.publicationYear}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="[padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]">
          <div className="mx-auto max-w-[var(--container-max)]">
            <header className="grid items-end gap-2 pb-10 md:pb-12">
              <span className="section-eyebrow">{t('also_browse')}</span>
              <h2 className="section-title">{t('related')}</h2>
            </header>

            <ul className="m-0 p-0 list-none grid grid-cols-2 gap-[clamp(20px,3vw,32px)] md:grid-cols-3">
              {related.map((r) => {
                const rTitle = isRtl ? r.titleAr : r.titleEn
                const rPrice = r.price ? Math.round(Number(r.price)) : null
                const rIsSession = r.productType === 'SESSION'
                return (
                  <li key={r.id}>
                    <Link
                      href={`/books/${r.slug}`}
                      className="group flex flex-col gap-3.5 transition-transform duration-[240ms] hover:-translate-y-1"
                    >
                      <div
                        className={`relative ${rIsSession ? 'aspect-[16/10]' : 'aspect-[2/3]'} overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)] [box-shadow:0_4px_16px_-4px_rgba(0,0,0,0.10)] group-hover:[box-shadow:0_12px_32px_-8px_rgba(0,0,0,0.18)] transition-shadow duration-[240ms]`}
                      >
                        <Image
                          src={r.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 33vw, 50vw"
                          className="object-cover transition-transform duration-[400ms] group-hover:scale-[1.03]"
                        />
                      </div>
                      <div className="flex flex-col gap-1 px-0.5">
                        <h3
                          className={`m-0 text-[15px] leading-[1.3] font-bold text-[var(--color-fg1)] [text-wrap:balance] group-hover:text-[var(--color-accent)] transition-colors ${
                            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]'
                          }`}
                        >
                          {rTitle}
                        </h3>
                        {rPrice !== null && (
                          <span
                            className={`text-[13px] font-bold text-[var(--color-fg2)] [font-feature-settings:"tnum"] ${
                              isRtl ? 'font-arabic-body' : 'font-display'
                            }`}
                          >
                            ${rPrice}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </article>
  )
}
