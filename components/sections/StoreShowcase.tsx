'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type StoreShowcaseProps = {
  books: Book[]
}

export function StoreShowcase({ books }: StoreShowcaseProps) {
  const t = useTranslations('store_showcase')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  const allBooks = books.filter((b) => b.productType === 'BOOK')
  const sessions = books.filter((b) => b.productType === 'SESSION')

  const heroBook = allBooks[0] ?? books[0]
  const shelfBooks = allBooks.slice(1, 6).length > 0 ? allBooks.slice(1, 6) : books.slice(1, 6)

  if (!heroBook) return null

  const heroTitle = isRtl ? heroBook.titleAr : heroBook.titleEn
  const heroPrice = Math.round(Number(heroBook.price))
  const heroHref = heroBook.externalUrl ?? `/books/${heroBook.slug}`

  const kickerHero = isRtl ? 'الإصدار الأحدث' : 'Latest title'
  const kickerOther = isRtl ? 'مجلّدات أخرى' : 'Other volumes'
  const kickerLectures = isRtl ? 'محاضرات مدفوعة' : 'Recorded lectures'
  const lecturesHeading = isRtl ? 'محاضرات مسجّلة' : 'Recorded Lectures'
  const lecturesIntro = isRtl
    ? 'محاضرات بصوت الدكتور خالد، تُشترى مرة وتُشاهد متى شئت.'
    : "Lectures in Dr. Khaled's own voice. Bought once, watched any time."
  const instant = isRtl ? 'وصول فوري' : 'Instant access'

  return (
    <section
      id="store"
      className="bg-[var(--color-bg)] border-b border-[var(--color-border)] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        {/* Section head */}
        <header className="grid items-end gap-6 pb-14 md:grid-cols-[1fr_auto] md:pb-14">
          <div>
            <span className="section-eyebrow">{t('eyebrow')}</span>
            <h2 className="section-title mt-3.5">{t('heading')}</h2>
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
          {/* Hero book */}
          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="grid grid-cols-1 gap-7"
          >
            <Link
              href={heroHref}
              className="relative block aspect-[4/5] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)] [box-shadow:var(--shadow-lift)]"
              {...(heroBook.externalUrl
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
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
              <p className="text-[17px] leading-[1.6] text-[var(--color-fg2)]">
                {isRtl ? heroBook.descriptionAr ?? '' : heroBook.descriptionEn ?? ''}
              </p>
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
                <Link
                  href={heroHref}
                  className="btn-pill btn-pill-primary"
                  {...(heroBook.externalUrl
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                >
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

          {/* Shelf */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.65, ease: EASE, delay: 0.1 }}
            className="flex flex-col gap-5 pt-6 border-t border-[var(--color-border)]"
          >
            <span
              className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              {kickerOther}
            </span>
            <ul className="grid grid-cols-1 m-0 p-0 list-none">
              {shelfBooks.map((b) => {
                const title = isRtl ? b.titleAr : b.titleEn
                const type = isRtl ? b.descriptionAr ?? '' : b.descriptionEn ?? ''
                const price = Math.round(Number(b.price))
                const lang = b.titleEn === b.titleAr ? 'EN' : 'AR'
                const href = b.externalUrl ?? `/books/${b.slug}`

                return (
                  <li key={b.id} className="border-b border-[var(--color-border)]">
                    <Link
                      href={href}
                      className="hover-shift grid items-center gap-[18px] py-[18px] grid-cols-[56px_1fr_auto]"
                      {...(b.externalUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-[2px] bg-[var(--color-bg-deep)] [box-shadow:0_2px_8px_rgba(0,0,0,0.08)]">
                        <Image
                          src={b.coverImage}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0">
                        <span
                          className={`self-start text-[10px] font-bold tracking-[0.12em] text-[var(--color-fg3)] ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {lang}
                        </span>
                        <h4
                          className={`m-0 text-[16px] font-bold leading-[1.3] text-[var(--color-fg1)] [text-wrap:balance] ${
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
                      </div>
                      <span
                        className={`text-[14px] font-semibold text-[var(--color-fg2)] [font-feature-settings:'tnum'] whitespace-nowrap ${
                          isRtl ? 'font-arabic-body' : 'font-display'
                        }`}
                      >
                        ${price}
                      </span>
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
              <p className="text-[16px] leading-[1.6] text-[var(--color-fg2)] m-0 max-w-[540px]">
                {lecturesIntro}
              </p>
            </header>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,2.5vw,28px)] list-none m-0 p-0">
              {sessions.slice(0, 2).map((l) => {
                const title = isRtl ? l.titleAr : l.titleEn
                const price = Math.round(Number(l.price))
                const href = l.externalUrl ?? `/books/${l.slug}`

                return (
                  <li key={l.id}>
                    <Link
                      href={href}
                      className="grid grid-cols-1 gap-[18px] items-stretch h-full group"
                      {...(l.externalUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      <div className="relative aspect-[16/10] overflow-hidden rounded-[4px] bg-[var(--color-fg1)]">
                        <Image
                          src={l.coverImage}
                          alt=""
                          fill
                          sizes="(min-width: 768px) 50vw, 100vw"
                          className="object-cover [filter:brightness(0.78)_contrast(1.04)] group-hover:scale-[1.03] group-hover:[filter:brightness(0.85)] transition-[transform,filter] duration-[400ms] ease-[var(--ease-out)]"
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
                        <div className="flex items-center gap-3.5 flex-wrap">
                          <span
                            className={`text-[18px] font-semibold text-[var(--color-fg1)] [font-feature-settings:'tnum'] ms-auto ${
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
