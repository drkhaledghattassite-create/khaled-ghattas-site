'use client'

import { useState } from 'react'
import Image from 'next/image'
import { CheckCircle2, Play } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Link } from '@/lib/i18n/navigation'

export type LibraryItem = {
  id: string
  type: 'BOOK' | 'LECTURE'
  /** UUID of the underlying books row. Used by the access API to mint a
   * signed download URL for BOOK items. */
  bookId: string
  titleAr: string
  titleEn: string
  cover: string
  /** Marketing detail page (public /books/[slug]). */
  href: string
  /** Reading or watch progress, 0–100 */
  progress: number
  /** In-app primary CTA target — e.g. /dashboard/library/read/[bookId]. */
  primaryHref?: string
  /** Set to true for BOOK items that have a downloadable digital file. The
   * card uses this as the gate for showing the "Download PDF" button; the
   * actual URL is fetched from /api/content/access on click. */
  hasDownload?: boolean
  /** ISO timestamp of when the user purchased this item (order.createdAt).
   * Used by LibraryView for the "Recently purchased" sort. */
  purchasedAt: string
  /** ISO timestamp of the last reading session, or null if never opened.
   * Used by LibraryView for the "Continue reading" hero card and the
   * "Recently read" sort. SESSION items default to null until Phase 4. */
  lastReadAt: string | null
  /** Last page read. Defaults to 1 when no progress recorded. SESSION
   * items default to 0 until Phase 4 wires media_progress. */
  lastPage: number
  /** Total page count of the PDF. 0 when unknown. */
  totalPages: number
  /** Phase 5 — total session_items count for SESSION cards (drives the
   * "X of Y items" readout + the all-complete check mark). 0 for BOOKs. */
  sessionItemsTotal?: number
  /** Phase 5 — count of session_items with completedAt set. 0 for BOOKs. */
  sessionItemsCompleted?: number
  /** Phase 5 — count of session_items with playback > 0 but not completed.
   * Used to decide whether to surface a "continue" affordance even when
   * nothing is fully complete. 0 for BOOKs. */
  sessionItemsPartial?: number
}

export function LibraryCard({ item }: { item: LibraryItem }) {
  const t = useTranslations('dashboard.library_card')
  // New top-level `library.*` namespace, parallel to the legacy
  // `dashboard.library_card` keys above. See messages/{ar,en}.json.
  const tLib = useTranslations('library')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const title = isRtl ? item.titleAr : item.titleEn
  const [downloading, setDownloading] = useState(false)

  // CTA label uses the new keys; old keys remain for any callers we missed.
  const primaryLabel =
    item.type === 'BOOK' ? tLib('cta.read') : tLib('cta.watch')
  const primaryHref = item.primaryHref ?? item.href
  const typeLabel =
    item.type === 'BOOK' ? tLib('type.book') : tLib('type.session')
  const progressLabel =
    item.type === 'BOOK' ? t('progress_label') : t('progress_lecture')
  const progress = Math.max(0, Math.min(100, Math.round(item.progress)))

  // Phase 5 — session aggregate signals. The progress bar already shows
  // completedItems/totalItems via the `progress` prop set in
  // buildLibraryItems. The check-mark badge is the dopamine moment for
  // "you finished this one."
  const isBook = item.type === 'BOOK'
  const isSession = item.type === 'LECTURE'
  const sessionTotal = item.sessionItemsTotal ?? 0
  const sessionCompleted = item.sessionItemsCompleted ?? 0
  const sessionPartial = item.sessionItemsPartial ?? 0
  const allSessionComplete =
    isSession && sessionTotal > 0 && sessionCompleted === sessionTotal

  // Phase 5.1 — "Continue" pill surfaces on cards with meaningful
  // in-progress state. Desktop reveals it on hover; mobile shows it
  // persistently (no hover state on touch). Same primaryHref as the
  // cover Link — both routes go to the in-app reader/viewer which
  // auto-resumes via existing logic. The pill exists to call attention
  // to the resume affordance, not to differentiate destinations.
  //
  // BOOK in-progress = lastPage > 1 AND lastPage < totalPages
  //   (gate on totalPages > 0 too — totalPages=0 means we don't know
  //   the length yet, so we can't claim the user is mid-book.)
  // SESSION in-progress = at least one item touched AND not fully done
  const bookInProgress =
    isBook &&
    item.lastPage > 1 &&
    item.totalPages > 0 &&
    item.lastPage < item.totalPages
  const sessionInProgress =
    isSession &&
    sessionTotal > 0 &&
    (sessionPartial > 0 || sessionCompleted > 0) &&
    sessionCompleted < sessionTotal
  const showContinuePill = bookInProgress || sessionInProgress
  const continueAriaLabel = isBook
    ? tLib('continue_pill.aria_book', { title })
    : tLib('continue_pill.aria_session', { title })

  async function handleDownload() {
    if (downloading) return
    setDownloading(true)
    try {
      const res = await fetch('/api/content/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ productType: 'BOOK', productId: item.bookId }),
      })
      if (!res.ok) {
        toast.error(tLib('download.error'))
        return
      }
      const data = (await res.json()) as { url: string }
      // Programmatically click an <a download> so the browser treats the
      // response as a save action rather than a navigation.
      const a = document.createElement('a')
      a.href = data.url
      a.rel = 'noopener'
      a.setAttribute('download', '')
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch (err) {
      console.error('[LibraryCard] download failed', err)
      toast.error(tLib('download.error'))
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article
      dir={isRtl ? 'rtl' : 'ltr'}
      // `relative` so the absolute-positioned Continue pill anchors to
      // this article (overlaying the cover at the trailing-top corner).
      className="group relative flex flex-col gap-5 rounded-[var(--radius-md)] bg-[var(--color-bg-elevated)] border border-[var(--color-border)] p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:[box-shadow:var(--shadow-lift)]"
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

      {/* Phase 5.1 — Continue pill (in-progress affordance).
          Sibling of the cover Link rather than nested (HTML doesn't
          allow nested <a> elements). Anchored to the article via the
          parent's `relative`; sits at the trailing-top corner of the
          cover area (article p-5 = 20px, plus 12px gives ~32px).
          Mobile = always visible, Desktop = hover or focus reveal.
          Both viewports satisfy the 44px touch-target floor via
          min-h-[44px]. CSS-only transitions because the show/hide is
          purely hover-driven (no React state needed); the visual
          fade+slide respects prefers-reduced-motion via tailwind's
          `motion-reduce:` variants. */}
      {showContinuePill && (
        <Link
          href={primaryHref}
          aria-label={continueAriaLabel}
          className={`absolute z-20 [inset-block-start:32px] [inset-inline-end:32px] inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-[13px] font-semibold text-[var(--color-accent-fg)] [box-shadow:0_4px_14px_-4px_rgba(0,0,0,0.35)] opacity-100 transition-[opacity,transform] duration-200 ease-out md:opacity-0 md:translate-y-1 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-focus-within:opacity-100 md:group-focus-within:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          <Play
            className="h-3.5 w-3.5 ms-0.5"
            aria-hidden
            fill="currentColor"
          />
          {tLib('continue_pill.label')}
        </Link>
      )}

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
              className={`inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--color-fg2)] [font-feature-settings:'tnum'] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {/* Tiny check mark when an entire session is complete —
                  the playlist's per-item check uses the same icon, so a
                  user who's seen it inside the viewer recognises the
                  finished state at a glance from the library grid.
                  The sr-only span carries the meaning for AT users; the
                  raw "75%" without "Completed" doesn't differentiate a
                  fully-complete session from one that happens to be at
                  the same numeric percent for any other reason. */}
              {allSessionComplete && (
                <>
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-success"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span className="sr-only">
                    {tLib('session_progress.completed')}
                  </span>
                </>
              )}
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
          {item.type === 'BOOK' && item.hasDownload && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              aria-busy={downloading}
              className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold text-[var(--color-fg2)] hover:text-[var(--color-fg1)] hover:bg-[var(--color-bg-deep)] transition-colors disabled:opacity-60 disabled:cursor-progress ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" />
              </svg>
              {downloading ? tLib('download.preparing') : tLib('cta.download_pdf')}
            </button>
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
