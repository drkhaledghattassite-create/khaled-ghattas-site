'use client'

/**
 * Inline PDF viewer for session-item PDFs.
 *
 * ─── Why a native iframe and not the existing react-pdf reader ─────────
 * Phase 2's premium reader is built on react-pdf + the LEGACY pdfjs-dist
 * build. That stack is heavy: a worker chunk, cMap atlases, standard-font
 * payloads, and an SSR-incompatible module that requires a `next/dynamic`
 * `ssr: false` wrapper. Loading all of that for a 2-page workshop hand-
 * out attached to a session is overkill.
 *
 * The session-PDF use case has none of the reader's premium needs (no
 * last-page-read save, no per-user bookmarks, no sub-document themes,
 * no search). The browser's built-in PDF viewer renders the workshop
 * handout fine; users can use its native zoom/print/download. If we
 * later decide we want the premium reader experience for session PDFs,
 * the swap is one component (this file → existing PdfReaderClient) with
 * a session-aware ?item= flag on the read route. For now: simpler is
 * better.
 *
 * The iframe rule in the brief — "no iframe in SessionViewer" — is
 * specifically about VIDEO providers (which must go through the
 * VideoPlayer wrapper so providers stay swappable). PDF iframes don't
 * have a swappable-provider concern; the URL is the URL is the URL.
 *
 * The signed URL is minted on demand by the parent via
 * /api/content/access (matching LibraryCard.handleDownload). Same 1h
 * TTL: long enough to read, short enough that a leak expires fast.
 */

import { AlertCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export function PdfInline({
  src,
  phase,
  ariaLabel,
}: {
  src: string | null
  phase: 'loading' | 'ready' | 'error'
  ariaLabel: string
}) {
  const t = useTranslations('session.pdf')

  return (
    <div className="relative h-full w-full bg-black">
      {phase === 'loading' && (
        // Polite live region — a "loading PDF" announcement isn't
        // urgent; the user already knows they clicked the playlist row
        // and is waiting for it.
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex items-center justify-center bg-black/60"
        >
          <span className="inline-flex items-center gap-2 text-[13px] text-white/85">
            <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden />
            {t('loading')}
          </span>
        </div>
      )}
      {phase === 'error' && (
        // role=alert auto-implies aria-live=assertive — a PDF that
        // can't load (signed URL expired, X-Frame-Options block, etc.)
        // is recoverable but blocks the user's task, so it earns the
        // assertive announcement.
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-black/80"
        >
          <span className="inline-flex items-center gap-2 text-[13px] text-white">
            <AlertCircle className="h-4 w-4" aria-hidden />
            {t('error')}
          </span>
        </div>
      )}
      {phase === 'ready' && src ? (
        <iframe
          // The iframe rule is about VIDEO PROVIDERS — see file header.
          // PDFs have no swappable-provider concern.
          src={src}
          title={ariaLabel}
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : null}
    </div>
  )
}
