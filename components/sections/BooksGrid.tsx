'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'
import { cn } from '@/lib/utils'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

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
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1440px]">
        <div
          role="tablist"
          aria-label={tFilters('all')}
          className="mb-[var(--spacing-lg)] flex flex-wrap items-center gap-2"
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
                  'font-label rounded-full border border-dashed border-ink px-4 py-1.5 text-[12px] transition-colors duration-200',
                  active ? 'bg-ink text-cream' : 'bg-transparent text-ink hover:bg-ink/10',
                )}
                style={{ letterSpacing: '0.08em' }}
              >
                {tFilters(f.key)}
              </button>
            )
          })}
        </div>

        <ul className="grid grid-cols-2 gap-x-6 gap-y-[var(--spacing-lg)] md:grid-cols-3 lg:grid-cols-4">
          {visible.map((product, i) => {
            const title = locale === 'ar' ? product.titleAr : product.titleEn
            const typeKey = product.productType === 'SESSION' ? 'session' : 'book'
            return (
              <motion.li
                key={product.id}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: i * 0.06, ease: EASE_OUT_QUART }}
              >
                <Link href={`/books/${product.slug}`} className="group block">
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="dotted-outline relative aspect-[2/3] overflow-hidden bg-cream-soft"
                  >
                    <Image
                      src={product.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 260px, (min-width: 768px) 33vw, 50vw"
                      className="object-cover"
                    />
                    <span
                      className="font-label absolute end-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-cream-soft/95 px-2.5 py-1 text-[10px] text-ink backdrop-blur-sm"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          product.productType === 'SESSION' ? 'bg-amber' : 'bg-ink',
                        )}
                      />
                      {tType(typeKey)}
                    </span>
                  </motion.div>
                  <div className="mt-3 flex flex-col gap-2">
                    <h3
                      className="uppercase text-ink"
                      style={{
                        fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-oswald)',
                        fontWeight: isRtl ? 700 : 600,
                        fontSize: 16,
                        lineHeight: 1.2,
                        letterSpacing: isRtl ? 'normal' : '-0.3px',
                      }}
                    >
                      {title}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-ink"
                        style={{
                          fontFamily: 'var(--font-oswald)',
                          fontWeight: 600,
                          fontSize: 18,
                        }}
                      >
                        ${product.price}
                      </span>
                      <span className="font-label text-[10px] text-ink-muted">
                        {product.currency}
                      </span>
                    </div>
                    <span
                      className="font-label inline-flex w-max items-center gap-2 rounded-full border border-dashed border-ink bg-ink px-3 py-1 text-[11px] text-cream transition-colors duration-200 group-hover:bg-transparent group-hover:text-ink"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream group-hover:bg-ink" />
                      {tCta('buy_now')}
                    </span>
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
