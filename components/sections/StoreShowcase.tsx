'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'
import { blurRevealBidirectional, EASE_EDITORIAL, VIEWPORT_BIDIRECTIONAL } from '@/lib/motion/variants'
import { ScrollReveal } from '@/components/motion/ScrollReveal'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'

const EASE = EASE_EDITORIAL

type StoreShowcaseProps = {
  books: Book[]
  featuredBookId?: string | null
}

export function StoreShowcase({ books, featuredBookId }: StoreShowcaseProps) {
  const t = useTranslations('store_showcase')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const allBooks = books.filter((b) => b.productType === 'BOOK')
  const sessions = books.filter((b) => b.productType === 'SESSION')

  // Admin can pin a featured book via site settings; otherwise fall back to
  // the first BOOK-type item, then to any book in the list.
  const pinnedBook = featuredBookId
    ? books.find((b) => b.id === featuredBookId) ?? null
    : null
  const heroBook = pinnedBook ?? allBooks[0] ?? books[0]
  const shelfPool = allBooks.length > 0 ? allBooks : books
  const shelfBooks = heroBook
    ? shelfPool.filter((b) => b.id !== heroBook.id).slice(0, 5)
    : shelfPool.slice(0, 5)

  if (!heroBook) return null

  const heroTitle = isRtl ? heroBook.titleAr : heroBook.titleEn
  const heroPrice = Math.round(Number(heroBook.price))
  const heroHref = `/books/${heroBook.slug}`

  const kickerHero = t('kicker_hero')
  const kickerOther = t('kicker_other')
  const kickerLectures = t('kicker_lectures')
  const lecturesHeading = t('lectures_heading')
  const lecturesIntro = t('lectures_intro')
  const instant = t('instant')

  return (
    <section
      id="store"
      data-bg="var(--color-bg)"
      className="bg-[var(--color-bg)] border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        {/* Section head */}
        <header className="grid items-end gap-6 pb-14 md:grid-cols-[1fr_auto] md:pb-14">
          <div>
            <span className="section-eyebrow">{t('eyebrow')}</span>
            <h2 className="section-title mt-3.5">{t('heading')}</h2>
            <ScrollReveal
              as="p"
              offset={['start 0.85', 'start 0.4']}
              className={`mt-4 max-w-[560px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] [text-wrap:pretty] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('description')}
            </ScrollReveal>
          </div>
          <Link
            href="/books"
            className={`inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-accent)] transition-colors ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('cta_browse_all')}
            <span aria-hidden>{isRtl ? '←' : '→'}</span>
          </Link>
        </header>

        {/* Books — asymmetric: hero featured + shelf list */}
        <div className="grid items-start gap-[clamp(32px,5vw,80px)] lg:grid-cols-[1.05fr_1fr]">
          {/* Hero book — bidirectional reveal so it dims back out when scrolled past */}
          <motion.article
            variants={blurRevealBidirectional}
            initial="hidden"
            whileInView="visible"
            viewport={VIEWPORT_BIDIRECTIONAL}
            className="grid grid-cols-1 gap-7"
          >
            <Link
              href={heroHref}
              className="relative block aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)] [box-shadow:var(--shadow-lift)]"
            >
              <span
                className={`absolute z-10 [inset-block-start:14px] [inset-inline-start:14px] inline-flex items-center px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] bg-white/95 text-[var(--color-fg1)] backdrop-blur-md ${
                  isRtl
                    ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !px-3 !py-1'
                    : 'font-display'
                }`}
              >
                {t('type.book')}
              </span>
              <Image
                src={heroBook.coverImage}
                alt={heroTitle}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
                style={{ viewTransitionName: `book-${heroBook.slug}` }}
              />
            </Link>

            <div className="flex flex-col gap-3.5">
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {kickerHero}
              </span>
              <h3
                className={`text-[clamp(28px,3.5vw,44px)] leading-[1.05] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.02em]'
                }`}
              >
                {heroTitle}
              </h3>
              <ScrollRevealLine
                as="p"
                offset={['start 0.85', 'start 0.3']}
                className="text-[17px] leading-[1.6]"
              >
                {(isRtl ? heroBook.descriptionAr : heroBook.descriptionEn) ?? ''}
              </ScrollRevealLine>
              <div className="flex items-center gap-5 mt-2">
                <span
                  className={`text-[24px] font-semibold text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  ${heroPrice}{' '}
                  <span className="text-[11px] font-medium tracking-[0.12em] text-[var(--color-fg3)] ms-1.5">
                    USD
                  </span>
                </span>
                <Link href={heroHref} className="btn-pill btn-pill-primary">
                  {t('cta_buy')}
                </Link>
              </div>
              <span
                className={`inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-[var(--color-accent)] before:inline-block ${
                  isRtl
                    ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                    : 'font-display'
                }`}
              >
                {instant}
              </span>
            </div>
          </motion.article>

          {/* Shelf — horizontal carousel */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
            className="flex flex-col gap-7 min-w-0"
          >
            <header className="flex items-baseline justify-between gap-4">
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {kickerOther}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--color-fg3)] ${
                  isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case' : 'font-display'
                }`}
              >
                {shelfBooks.length} {t('unit_titles')}
              </span>
            </header>
            <ul
              className="m-0 p-0 list-none grid auto-cols-[minmax(220px,240px)] grid-flow-col gap-7 overflow-x-auto overflow-y-hidden snap-x snap-mandatory pb-4 pt-1 [scroll-padding:8px] [scrollbar-width:thin] [scrollbar-color:var(--color-border-strong)_transparent]"
            >
              {shelfBooks.map((b) => {
                const title = isRtl ? b.titleAr : b.titleEn
                const type = isRtl ? b.descriptionAr ?? '' : b.descriptionEn ?? ''
                const price = Math.round(Number(b.price))
                const lang = b.titleEn === b.titleAr ? 'EN' : 'AR'

                return (
                  <li key={b.id} className="snap-start min-w-0">
                    <Link
                      href={`/books/${b.slug}`}
                      className="group flex flex-col gap-3.5 transition-transform duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-[3px]"
                    >
                      <div className="relative w-full aspect-[2/3] overflow-hidden rounded-[2px] bg-[var(--color-bg-deep)] [box-shadow:0_6px_20px_rgba(0,0,0,0.10)] group-hover:[box-shadow:0_12px_32px_rgba(0,0,0,0.18)] transition-shadow duration-[240ms]">
                        <Image
                          src={b.coverImage}
                          alt=""
                          fill
                          sizes="240px"
                          className="object-cover"
                          style={{ viewTransitionName: `book-${b.slug}` }}
                        />
                      </div>
                      <div className="flex flex-col gap-1 px-0.5">
                        <span
                          className={`self-start text-[10px] font-bold tracking-[0.12em] text-[var(--color-fg3)] ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {lang}{b.publicationYear ? ` · ${b.publicationYear}` : ''}
                        </span>
                        <h4
                          className={`m-0 mt-0.5 text-[16px] font-bold leading-[1.3] text-[var(--color-fg1)] [text-wrap:balance] ${
                            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
                          }`}
                        >
                          {title}
                        </h4>
                        {type && (
                          <span className="text-[12px] leading-[1.4] text-[var(--color-fg3)]">
                            {type}
                          </span>
                        )}
                        <span
                          className={`self-start mt-1.5 text-[13px] font-bold text-[var(--color-fg1)] [font-feature-settings:'tnum'] ${
                            isRtl ? 'font-display' : 'font-display'
                          }`}
                        >
                          ${price}
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </motion.aside>
        </div>

        {/* Lectures sub-section */}
        {sessions.length > 0 && (
          <div className="mt-[clamp(64px,8vw,112px)] pt-[clamp(48px,6vw,72px)] border-t border-[var(--color-border)]">
            <header className="grid grid-cols-1 gap-3 mb-[clamp(28px,4vw,48px)] max-w-[720px]">
              <span className="section-eyebrow">{kickerLectures}</span>
              <h3
                className={`text-[clamp(26px,3.4vw,36px)] leading-[1.1] font-bold tracking-[-0.005em] text-[var(--color-fg1)] m-0 ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.02em]'
                }`}
              >
                {lecturesHeading}
              </h3>
              <ScrollReveal
                as="p"
                offset={['start 0.85', 'start 0.4']}
                className="text-[16px] leading-[1.6] m-0 max-w-[540px]"
              >
                {lecturesIntro}
              </ScrollReveal>
            </header>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2.5vw,28px)] list-none m-0 p-0">
              {/* Show up to 6 sessions (3 rows on desktop). The earlier cap
                  of 2 hid most of Dr. Khaled's catalogue on the homepage —
                  /books still surfaces the rest under the "جلسات" filter. */}
              {sessions.slice(0, 6).map((l, idx) => {
                const title = isRtl ? l.titleAr : l.titleEn
                const duration = isRtl ? l.subtitleAr : l.subtitleEn
                const price = Math.round(Number(l.price))

                return (
                  <li key={l.id}>
                    <Link
                      href={`/books/${l.slug}`}
                      className="grid grid-cols-1 gap-[18px] items-stretch h-full group"
                    >
                      <div className="relative aspect-[16/10] min-h-[180px] overflow-hidden rounded-[4px] bg-[var(--color-fg1)]">
                        <Image
                          src={l.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          priority={idx === 0}
                          loading={idx === 0 ? 'eager' : undefined}
                          className="object-cover [filter:brightness(0.78)_contrast(1.04)] group-hover:scale-[1.03] group-hover:[filter:brightness(0.85)] transition-[transform,filter] duration-[400ms] ease-[var(--ease-out)]"
                          style={{ viewTransitionName: `book-${l.slug}` }}
                        />
                        <div className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.45))]" aria-hidden />
                        <span
                          aria-hidden
                          className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                        <span
                          className={`absolute z-20 [inset-block-start:14px] [inset-inline-start:14px] inline-flex items-center px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] bg-black/80 text-white backdrop-blur-md ${
                            isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !px-3 !py-1' : 'font-display'
                          }`}
                        >
                          {t('type.session')}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <h4
                          className={`m-0 text-[20px] leading-[1.3] font-bold text-[var(--color-fg1)] [text-wrap:balance] ${
                            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.015em]'
                          }`}
                        >
                          {title}
                        </h4>
                        {/* Lecture foot — gap 14, with 1×12px vertical separator before price */}
                        <div className="flex items-center gap-3.5 flex-wrap">
                          {duration && (
                            <span
                              className={`text-[13px] font-medium text-[var(--color-fg3)] [font-feature-settings:'tnum'] ${
                                isRtl ? 'font-arabic-body' : 'font-display tracking-[0.04em]'
                              }`}
                            >
                              {duration}
                            </span>
                          )}
                          <span
                            className={`relative text-[18px] font-semibold text-[var(--color-fg1)] [font-feature-settings:'tnum'] ms-auto inline-flex items-center gap-3.5 before:content-[''] before:w-px before:h-3 before:bg-[var(--color-border-strong)] before:inline-block ${
                              isRtl ? 'font-arabic-body' : 'font-display'
                            }`}
                          >
                            ${price}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
