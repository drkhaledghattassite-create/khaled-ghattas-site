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
  const [filter, setFilter] = useState<Filter>('all')

  const visible = useMemo(
    () => (filter === 'all' ? books : books.filter((b) => b.productType === filter)),
    [books, filter],
  )

  return (
    <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1280px]">
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
                  'rounded-full border px-4 py-1.5 font-display font-medium text-[11px] tracking-[0.16em] uppercase transition-colors duration-200 [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:text-[13px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case',
                  active
                    ? 'border-ink bg-ink text-paper-soft'
                    : 'border-ink/40 bg-paper-soft text-ink-muted hover:border-ink hover:text-ink',
                )}
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
                initial={{ y: 26, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: EASE_OUT_QUART }}
              >
                <Link href={`/books/${product.slug}`} className="group block">
                  <motion.div
                    whileHover={{ y: -10 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="frame-print relative aspect-[2/3]"
                  >
                    <div className="relative h-full w-full overflow-hidden">
                      <Image
                        src={product.coverImage}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 260px, (min-width: 768px) 33vw, 50vw"
                        className="object-cover"
                      />
                      <span
                        aria-hidden
                        className="absolute inset-y-0 inset-inline-start-0 w-[6px]"
                        style={{
                          background:
                            'linear-gradient(180deg, rgba(168,196,214,0.7) 0%, rgba(107,143,168,0.6) 100%)',
                        }}
                      />
                      <span
                        className="absolute end-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-paper-soft/95 px-2.5 py-1 font-display font-medium text-[10px] tracking-[0.16em] uppercase text-ink backdrop-blur-sm [dir=rtl]:font-arabic [dir=rtl]:text-[11px] [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            product.productType === 'SESSION' ? 'bg-garnet' : 'bg-brass',
                          )}
                        />
                        {tType(typeKey)}
                      </span>
                    </div>
                  </motion.div>
                  <div className="mt-3 flex flex-col gap-2">
                    <h3
                      className="text-balance text-ink font-display font-medium text-[17px] leading-[1.2] tracking-[-0.012em] [dir=rtl]:font-arabic-display [dir=rtl]:tracking-normal"
                    >
                      {title}
                    </h3>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="tabular-nums text-ink font-serif italic font-normal text-[22px]"
                      >
                        ${product.price}
                      </span>
                      <span
                        className="font-display font-medium text-[10px] tracking-[0.16em] text-ink-muted uppercase"
                      >
                        {product.currency}
                      </span>
                    </div>
                    <span
                      className="inline-flex items-center gap-2 px-4 py-[7px] min-h-0 w-max rounded-full border border-ink bg-ink text-paper-soft text-[11px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold"
                    >
                      <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-current" />
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
