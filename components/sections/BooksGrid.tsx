'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import type { Book } from '@/lib/db/queries'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

export function BooksGrid({ books }: { books: Book[] }) {
  const locale = useLocale()
  const tCta = useTranslations('cta')
  const isRtl = locale === 'ar'

  return (
    <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-lg)]">
      <div className="mx-auto max-w-[1440px]">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-[var(--spacing-lg)] md:grid-cols-3 lg:grid-cols-4">
          {books.map((book, i) => {
            const title = locale === 'ar' ? book.titleAr : book.titleEn
            return (
              <motion.li
                key={book.id}
                initial={{ y: 30, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.55, delay: i * 0.08, ease: EASE_OUT_QUART }}
              >
                <Link href={`/books/${book.slug}`} className="group block">
                  <motion.div
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="dotted-outline relative aspect-[2/3] overflow-hidden bg-cream-soft"
                  >
                    <Image
                      src={book.coverImage}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 260px, (min-width: 768px) 33vw, 50vw"
                      className="object-cover"
                    />
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
                    <span
                      className="font-label inline-flex w-max items-center gap-2 rounded-full border border-dashed border-ink px-3 py-1 text-[11px] text-ink"
                      style={{ letterSpacing: '0.1em' }}
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-ink" />
                      {tCta('read_book')}
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
