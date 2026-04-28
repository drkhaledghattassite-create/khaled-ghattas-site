'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

type Filter = 'all' | 'BOOK' | 'SESSION'

const FILTERS: { id: Filter; key: 'all' | 'books' | 'sessions' }[] = [
  { id: 'all', key: 'all' },
  { id: 'BOOK', key: 'books' },
  { id: 'SESSION', key: 'sessions' },
]

export function BooksGrid({ books }: { books: Book[] }) {
  const locale = useLocale()
  const tCta = useTranslations('cta')
  const tFilters = useTranslations('books.filters')
  const tType = useTranslations('books.type')
  const isRtl = locale === 'ar'
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () => (filter === 'all' ? books : books.filter((b) => b.productType === filter)),
    [books, filter],
  )

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <div
          role="tablist"
          aria-label={tFilters('all')}
          className="mb-[clamp(40px,5vw,64px)] flex flex-wrap items-center gap-2"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'inline-flex items-center px-5 py-2 rounded-full text-[12px] font-semibold tracking-[0.06em] transition-colors duration-200',
                  active
                    ? 'bg-[var(--color-fg1)] text-[var(--color-bg)] border border-[var(--color-fg1)]'
                    : 'bg-transparent text-[var(--color-fg2)] border border-[var(--color-border-strong)] hover:border-[var(--color-fg1)] hover:text-[var(--color-fg1)]',
                  isRtl ? 'font-arabic-body !text-[14px] !tracking-normal !font-bold' : 'font-display uppercase',
                )}
              >
                {tFilters(f.key)}
              </button>
            )
          })}
        </div>

        <ul className="grid grid-cols-2 gap-x-[clamp(16px,2.5vw,28px)] gap-y-[clamp(40px,5vw,64px)] m-0 p-0 list-none md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product, i) => {
            const title = isRtl ? product.titleAr : product.titleEn
            const description = (isRtl ? product.descriptionAr : product.descriptionEn) ?? ''
            const isSession = product.productType === 'SESSION'
            const typeKey = isSession ? 'session' : 'book'
            const price = Math.round(Number(product.price))
            const aspect = isSession ? 'aspect-[16/10]' : 'aspect-[2/3]'

            return (
              <motion.li
                key={product.id}
                initial={{ y: 20, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.6, delay: Math.min(i * 0.04, 0.3), ease: EASE }}
              >
                <Link
                  href={`/books/${product.slug}`}
                  className="group flex flex-col gap-3.5 transition-transform duration-[240ms] ease-[var(--ease-out)] hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      'relative overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)] [box-shadow:0_4px_16px_-4px_rgba(0,0,0,0.10)] group-hover:[box-shadow:0_12px_32px_-8px_rgba(0,0,0,0.18)] transition-shadow duration-[240ms]',
                      aspect,
                    )}
                  >
                    <Image
                      src={product.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 280px, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition-transform duration-[400ms] ease-[var(--ease-out)] group-hover:scale-[1.03]"
                    />
                    <span
                      className={cn(
                        'absolute z-10 [inset-block-start:12px] [inset-inline-start:12px] inline-flex items-center px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md',
                        isSession
                          ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)]'
                          : 'bg-white/95 text-[var(--color-fg1)]',
                        isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !px-3 !py-1' : 'font-display',
                      )}
                    >
                      {tType(typeKey)}
                    </span>
                    {isSession && (
                      <span
                        aria-hidden
                        className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 px-0.5">
                    <h3
                      className={cn(
                        'm-0 text-[16px] font-bold leading-[1.3] text-[var(--color-fg1)] [text-wrap:balance] group-hover:text-[var(--color-accent)] transition-colors',
                        isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]',
                      )}
                    >
                      {title}
                    </h3>
                    {description && (
                      <p className="m-0 text-[13px] leading-[1.5] text-[var(--color-fg3)] line-clamp-2">
                        {description}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className={cn(
                          'text-[15px] font-bold text-[var(--color-fg1)] [font-feature-settings:"tnum"]',
                          isRtl ? 'font-arabic-body' : 'font-display',
                        )}
                      >
                        ${price}
                        <span className="ms-1 text-[10px] font-medium tracking-[0.12em] text-[var(--color-fg3)]">
                          USD
                        </span>
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--color-fg2)] group-hover:text-[var(--color-accent)] transition-colors',
                          isRtl ? 'font-arabic-body' : 'font-display',
                        )}
                      >
                        {tCta('buy_now')}
                        <span aria-hidden>{isRtl ? '←' : '→'}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
