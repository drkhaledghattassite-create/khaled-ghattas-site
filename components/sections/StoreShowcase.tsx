'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Link } from '@/lib/i18n/navigation'
import { cn } from '@/lib/utils'
import { ChapterMark } from '@/components/shared/Ornament'
import type { Book } from '@/lib/db/queries'

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1]

// Desktop 12-col spans per grid position
const COL_SPANS = [
  'md:col-span-4',
  'md:col-span-4',
  'md:col-span-4',
  'md:col-span-3',
  'md:col-span-3',
  'md:col-span-6',
  'md:col-span-4',
  'md:col-span-8',
] as const

function sortForGrid(books: Book[]): Book[] {
  const nonSessions = books.filter((b) => b.productType !== 'SESSION')
  const sessions = books.filter((b) => b.productType === 'SESSION')
  const grid: Book[] = []
  let bookIdx = 0
  let sessionIdx = 0
  for (let i = 0; i < 8; i++) {
    if ((i === 5 || i === 7) && sessionIdx < sessions.length) {
      grid.push(sessions[sessionIdx++])
    } else if (bookIdx < nonSessions.length) {
      grid.push(nonSessions[bookIdx++])
    } else if (sessionIdx < sessions.length) {
      grid.push(sessions[sessionIdx++])
    }
  }
  return grid
}

function ProductCard({ book, index }: { book: Book; index: number }) {
  const locale = useLocale()
  const t = useTranslations('store_showcase')
  const isSession = book.productType === 'SESSION'
  const title = locale === 'ar' ? book.titleAr : book.titleEn
  const priceNum = Math.round(Number(book.price))
  const href = book.externalUrl ?? `/books/${book.slug}`

  return (
    <motion.div
      className="group relative flex flex-col"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.7, delay: index * 0.07, ease: EASE_OUT_EXPO }}
    >
      <a
        href={href}
        target={book.externalUrl ? '_blank' : undefined}
        rel={book.externalUrl ? 'noopener noreferrer' : undefined}
        className="block flex-1"
      >
        {/* Cover with type badge */}
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={book.coverImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          <span
            className={cn(
              'absolute end-3 top-3 rounded-sm px-2 py-1 font-display font-medium text-[10px] tracking-[0.12em] uppercase [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case',
              isSession ? 'bg-sky text-ink' : 'bg-ink text-paper-soft',
            )}
          >
            {isSession ? t('type.session') : t('type.book')}
          </span>
        </div>

        {/* Title + price */}
        <div className="p-3 pb-2">
          <h3
            className="text-balance text-ink font-display font-normal text-[clamp(16px,2vw,22px)] leading-[1.15] tracking-[-0.016em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {title}
          </h3>
          <p
            className="mt-2 num-latn font-display font-normal text-[26px] leading-none tracking-[-0.01em] text-ink"
          >
            ${priceNum}
          </p>
        </div>

        {/* Buy CTA */}
        <div className="px-3 pb-4">
          <span
            className="inline-flex items-center gap-2 px-4 py-[7px] min-h-9 rounded-full border border-brass bg-brass text-paper-soft text-[11px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold"
          >
            <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-current" />
            {t('cta_buy')}
          </span>
        </div>
      </a>
    </motion.div>
  )
}

type StoreShowcaseProps = {
  books: Book[]
}

export function StoreShowcase({ books }: StoreShowcaseProps) {
  const locale = useLocale()
  const t = useTranslations('store_showcase')
  const isRtl = locale === 'ar'

  const grid = sortForGrid(books)

  return (
    <section className="relative z-[2] px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40 bg-paper-soft">
      <div className="mx-auto max-w-[1200px]">
        {/* Header */}
        <header className="mb-[var(--spacing-lg)]">
          <ChapterMark number=".03" label={isRtl ? 'الأعمال والمتجر' : 'Works & Store'} />

          <p
            className="mt-4 font-display font-medium text-[11px] tracking-[0.18em] uppercase text-sky-deep [dir=rtl]:font-arabic [dir=rtl]:font-semibold [dir=rtl]:tracking-normal [dir=rtl]:normal-case"
          >
            {t('eyebrow')}
          </p>

          <h2
            className="mt-1 text-balance text-ink font-display font-normal text-[clamp(40px,7vw,88px)] leading-[0.95] tracking-[-0.024em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {t('heading')}
          </h2>

          <p
            className="mt-4 text-ink-muted font-serif italic text-[18px] leading-[1.5] [dir=rtl]:font-arabic [dir=rtl]:not-italic"
          >
            {t('description')}
          </p>
        </header>

        {/* Editorial asymmetric grid */}
        <div className="grid grid-cols-12 gap-4 md:gap-5">
          {grid.map((book, i) => (
            <div key={book.id} className={cn('col-span-12', COL_SPANS[i])}>
              <ProductCard book={book} index={i} />
            </div>
          ))}
        </div>

        {/* Browse all CTA */}
        <div className="mt-[var(--spacing-lg)] flex justify-center">
          <Link href="/books" className="inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]">
            <span aria-hidden className="block h-[7px] w-[7px] rounded-full bg-current" />
            {t('cta_browse_all')}
          </Link>
        </div>
      </div>
    </section>
  )
}
