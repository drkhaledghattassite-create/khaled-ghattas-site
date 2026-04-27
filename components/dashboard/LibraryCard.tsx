'use client'

import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'

export type LibraryItem = {
  id: string
  type: 'BOOK' | 'LECTURE'
  titleAr: string
  titleEn: string
  cover: string
  href: string
  /** Reading or watch progress, 0–100 */
  progress: number
  /** Optional file or stream URL for primary action */
  primaryHref?: string
  /** Optional download URL (for books) */
  downloadHref?: string
}

export function LibraryCard({ item }: { item: LibraryItem }) {
  const t = useTranslations('dashboard.library_card')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const title = isRtl ? item.titleAr : item.titleEn

  const primaryLabel = item.type === 'BOOK' ? t('open_book') : t('watch_lecture')
  const primaryHref = item.primaryHref ?? item.href
  const typeLabel = item.type === 'BOOK' ? t('type_book') : t('type_lecture')
  const progressLabel = item.type === 'BOOK' ? t('progress_label') : t('progress_lecture')
  const progress = Math.max(0, Math.min(100, Math.round(item.progress)))

  return (
    <article
      dir={isRtl ? 'rtl' : 'ltr'}
      className="group flex flex-col gap-5 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:[box-shadow:var(--shadow-lift)]"
    >
      {/* Cover with optional play overlay */}
      <Link
        href={primaryHref}
        className={`relative block overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-bg-deep)] ${
          item.type === 'BOOK' ? 'aspect-[2/3]' : 'aspect-video'
        }`}
      >
        <Image
          src={item.cover}
          alt=""
          fill
          sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
          className={`object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03] ${
            item.type === 'LECTURE' ? '[filter:brightness(0.85)]' : ''
          }`}
        />
        {item.type === 'LECTURE' && (
          <>
            <span
              aria-hidden
              className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_50%,rgba(0,0,0,0.45))]"
            />
            <span
              aria-hidden
              className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </>
        )}
        <span
          className={`absolute z-10 [inset-block-start:10px] [inset-inline-start:10px] inline-flex items-center px-2.5 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[0.14em] backdrop-blur-md ${
            item.type === 'LECTURE'
              ? 'bg-black/80 text-white'
              : 'bg-white/95 text-[var(--color-fg1)]'
          } ${
            isRtl
              ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !px-3 !py-1'
              : 'font-display'
          }`}
        >
          {typeLabel}
        </span>
      </Link>

      <div className="flex flex-col gap-3">
        <h3
          className={`m-0 text-[17px] leading-[1.3] font-bold text-[var(--color-fg1)] [text-wrap:balance] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.01em]'
          }`}
        >
          <Link href={item.href} className="hover:text-[var(--color-accent)] transition-colors">
            {title}
          </Link>
        </h3>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
              }`}
            >
              {progressLabel}
            </span>
            <span
              className={`text-[12px] font-semibold text-[var(--color-fg2)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <span dir="ltr" className="inline-block num-latn">
                {progress}%
              </span>
            </span>
          </div>
          <div
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-bg-deep)] border border-[var(--color-border)]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={progressLabel}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 [inset-inline-start:0] block rounded-full bg-[var(--color-accent)] transition-[width] duration-500 ease-[var(--ease-out)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action row */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Link href={primaryHref} className="btn-pill btn-pill-primary flex-1 min-w-0 !py-2 !px-4 !text-[13px] justify-center">
            {primaryLabel}
          </Link>
          {item.type === 'BOOK' && item.downloadHref && (
            <a
              href={item.downloadHref}
              download
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] hover:bg-[var(--color-bg-deep)] transition-colors ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" />
              </svg>
              {t('download')}
            </a>
          )}
          <Link
            href={item.href}
            className={`inline-flex items-center justify-center px-3 py-2 rounded-full text-[13px] font-semibold text-[var(--color-fg3)] hover:text-[var(--color-fg1)] transition-colors ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('details')}
          </Link>
        </div>
      </div>
    </article>
  )
}
