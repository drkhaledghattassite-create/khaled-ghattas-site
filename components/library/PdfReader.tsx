'use client'

/**
 * PdfReader — orchestrator for the premium reading experience.
 *
 * ─── Architecture ────────────────────────────────────────────────────────
 * The legacy single-file reader was rebuilt in Phase 2 of the digital-
 * content delivery system. This file is now an orchestrator that:
 *
 *  1. Wraps a single <Document> from react-pdf so the PDF is fetched ONCE,
 *     not once per variant. (Two Documents would also fight over the
 *     pdfjs worker pool.)
 *  2. Resolves the saved page + initial bookmarks through useReaderState.
 *  3. Picks the variant (MobileReader vs DesktopReader) at runtime via
 *     useViewport(), with hydration safety — a LoadingState renders during
 *     the SSR-to-client handshake to avoid a flash of the wrong layout.
 *  4. Pulls the PDF outline into ResolvedOutlineEntry[] (page numbers
 *     resolved via pdf.getPageIndex()) for the desktop side rail's ToC.
 *
 * The exported `PdfReader` symbol matches the legacy export so
 * PdfReaderClient.tsx's dynamic import is unchanged.
 *
 * ─── Worker config ────────────────────────────────────────────────────────
 * APPROACH B (static asset):
 *   public/pdf.worker.min.mjs is auto-copied at install time
 *   (scripts/copy-pdf-assets.mjs). cMaps + standard_fonts likewise.
 * Why B over `new URL(..., import.meta.url)`: Webpack and Turbopack disagree
 * on resolution semantics, and the static-asset path is deterministic across
 * all Next 15 build modes.
 *
 * IMPORTANT: keep public/pdf.worker.min.mjs in sync with pdfjs-dist when
 * upgrading react-pdf (which transitively upgrades the lib). Version drift
 * between worker and API is silently catastrophic.
 *
 * ─── Decisions made under ambiguity ───────────────────────────────────────
 *  - Pinch-to-zoom: not implemented as true pinch. The mobile reader uses
 *    double-tap to toggle 1x ↔ 2x via react-pdf's `scale` (well — `width`)
 *    prop. The brief permits this fallback because reliable pinch across
 *    iOS/Android requires either a vendor library (which we can't add) or
 *    manual gesture math that's not load-bearing for the v1 launch.
 *  - PdfReader.tsx kept as orchestrator (NOT as a parallel "fallback"
 *    component). The dynamic-import target stays stable; the file's job
 *    just changed from monolithic reader to component selector.
 *  - Reader theme isolation: data-reader-theme is on this file's outermost
 *    div, NOT on <html>. The site's light/dark mode is unrelated to the
 *    reader's theme; switching reader theme does not touch the rest of the
 *    site, and switching site dark-mode does not touch the reader.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Document, pdfjs } from 'react-pdf'
import { EASE_EDITORIAL } from '@/lib/motion/variants'

// react-pdf 9.x calls `onLoadSuccess(pdf)` with a pdfjs PDFDocumentProxy.
// We don't import the type from react-pdf/dist/* (the deep path isn't
// in the package's exports map and breaks the moduleResolution: bundler
// lookup). Instead we mirror the minimal shape we use here. The casts to
// `unknown` for getDestination/getPageIndex stay because pdfjs's TS
// surface lacks public typings for those — the API shape is documented
// and stable across pdfjs-dist 4.x.
type PdfDocProxy = {
  numPages: number
  getOutline: () => Promise<unknown[] | null>
}
import { useReducedMotion } from '@/lib/motion/hooks'
import { useReaderState, type PdfOutlineNode, type ResolvedOutlineEntry } from './hooks/useReaderState'
import { useReaderTheme } from './hooks/useReaderTheme'
import { useViewport } from './hooks/useViewport'
import { LoadingState } from './reader/LoadingState'
import { MobileReader } from './reader/MobileReader'
import { DesktopReader } from './reader/DesktopReader'
import type { PdfBookmark } from '@/lib/db/queries'

// react-pdf's AnnotationLayer.css + TextLayer.css are imported in
// app/globals.css (NOT here) because this component loads via next/dynamic
// with ssr:false. If the CSS were imported here, its chunk would arrive
// AFTER the TextLayer's runtime "styles loaded?" check fires on mount,
// spamming "TextLayer styles not found" warnings into the console once
// per page render. Loading via globals.css ensures the :root CSS variables
// the check reads are present before hydration.

// One-time worker setup. Module-level so re-mounts don't re-assign.
// The .mjs extension matters — pdf.js worker is shipped as an ES module.
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

type PdfReaderProps = {
  bookId: string
  pdfUrl: string
  initialPage?: number
  initialBookmarks?: PdfBookmark[]
  locale: 'ar' | 'en'
  title: string
}

export function PdfReader({
  bookId,
  pdfUrl,
  initialPage = 1,
  initialBookmarks = [],
  locale,
  title,
}: PdfReaderProps) {
  const reduceMotion = useReducedMotion()
  const isRtl = locale === 'ar'

  const { variant, mounted } = useViewport(768)
  const { theme, setTheme, cycleTheme } = useReaderTheme()

  // Reader state owns: page, bookmarks, save flow, ToC outline.
  const state = useReaderState({
    bookId,
    initialPage,
    initialBookmarks,
  })

  // ToC after the document loads — resolved page numbers per outline node.
  const [outlineEntries, setOutlineEntries] = useState<
    ResolvedOutlineEntry[] | null
  >(null)

  // Document loading + error.
  const [docReady, setDocReady] = useState(false)
  const [loadError, setLoadError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Container metrics so child variants can size pages correctly. We
  // measure on resize (passive) and read once at mount.
  const shellRef = useRef<HTMLDivElement>(null)
  const [containerSize, setContainerSize] = useState<{
    width: number
    height: number
  }>(() => ({
    width: typeof window === 'undefined' ? 900 : window.innerWidth,
    height: typeof window === 'undefined' ? 700 : window.innerHeight,
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return
    const update = () => {
      const node = shellRef.current
      if (node) {
        const rect = node.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      } else {
        setContainerSize({
          width: window.innerWidth,
          height: window.innerHeight,
        })
      }
    }
    update()
    window.addEventListener('resize', update, { passive: true })
    return () => window.removeEventListener('resize', update)
  }, [])

  // Memoize Document props — passing fresh objects forces a re-mount of
  // the PDF (and a re-fetch of the worker), which kills text-layer
  // selection and triggers a full reload spinner.
  const documentOptions = useMemo(
    () => ({
      cMapUrl: '/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/standard_fonts/',
    }),
    [],
  )

  const onDocumentLoadSuccess = useCallback(
    async (pdf: PdfDocProxy) => {
      setDocReady(true)
      setLoadError(null)
      state.setTotalPages(pdf.numPages)

      // Load and resolve the outline for the desktop side rail. This is
      // a no-op when the PDF has no outline; we hide the ToC section in
      // that case rather than render an empty heading.
      try {
        const rawOutline = (await pdf.getOutline()) as PdfOutlineNode[] | null
        if (!rawOutline || rawOutline.length === 0) {
          setOutlineEntries([])
          return
        }
        const flat: ResolvedOutlineEntry[] = []
        const visit = async (
          nodes: PdfOutlineNode[],
          depth: number,
        ): Promise<void> => {
          for (const node of nodes) {
            let pageNumber: number | null = null
            if (node.dest) {
              try {
                let dest = node.dest
                if (typeof dest === 'string') {
                  // Named destinations need resolution to an array form.
                  // pdf.js exposes a getDestination method on the Document
                  // proxy. The DocumentCallback type doesn't include it
                  // explicitly, so we cast through unknown. This is the
                  // single intentional cast in this file — pdfjs's API
                  // contract guarantees the call shape.
                  const resolved = await (
                    pdf as unknown as {
                      getDestination: (n: string) => Promise<unknown[] | null>
                    }
                  ).getDestination(dest)
                  if (Array.isArray(resolved)) dest = resolved
                }
                if (Array.isArray(dest)) {
                  const ref = dest[0]
                  if (ref) {
                    const idx = await (
                      pdf as unknown as {
                        getPageIndex: (r: unknown) => Promise<number>
                      }
                    ).getPageIndex(ref)
                    pageNumber = idx + 1
                  }
                }
              } catch {
                // Outline entry without a resolvable dest — render the title
                // but disable the click. Defensive: some old PDFs ship
                // malformed destinations.
                pageNumber = null
              }
            }
            flat.push({ title: node.title, pageNumber, depth })
            if (node.items && node.items.length > 0) {
              await visit(node.items, depth + 1)
            }
          }
        }
        await visit(rawOutline, 0)
        setOutlineEntries(flat)
      } catch (err) {
        // Outline failure is non-fatal. Hide the ToC section.
        console.error('[PdfReader] outline load error:', err)
        setOutlineEntries([])
      }
    },
    [state],
  )

  const onDocumentLoadError = useCallback((err: Error) => {
    console.error('[PdfReader] document load error:', err)
    setLoadError(err)
    setDocReady(false)
  }, [])

  const handleRetry = useCallback(() => {
    setLoadError(null)
    setRetryCount((c) => c + 1)
  }, [])

  // Initial-load gate. We render the splash until BOTH the viewport has
  // mounted (so we know which variant to pick) AND the document has at
  // least signalled docReady. This avoids:
  //   - hydration mismatch from a server-rendered Mobile vs client Desktop
  //   - flash of "Page 1" while the saved page is still being honored
  const shouldShowReader = mounted && variant && docReady && !loadError

  return (
    <div
      ref={shellRef}
      data-reader-theme={theme}
      dir={isRtl ? 'rtl' : 'ltr'}
      className="absolute inset-0 overflow-hidden bg-[var(--reader-surface)] text-[var(--reader-fg)]"
    >
      {/* Document mounts the LoadingState as `loading={...}` so it
          actually renders during the PDF fetch (react-pdf only renders
          children after onLoadSuccess fires). Same for the error state.
          Children gate on the viewport handshake (mounted && variant) —
          docReady is implicit, since react-pdf won't render children
          until the document has loaded.

          docReady remains in state because the orchestrator uses it for
          the variant-fade-in animation (we want a deliberate 300ms fade
          when the picked variant first mounts, not just an instant pop). */}
      <Document
        key={retryCount}
        file={pdfUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        options={documentOptions}
        loading={<LoadingState title={title} isRtl={isRtl} />}
        error={<ErrorPanel onRetry={handleRetry} isRtl={isRtl} />}
      >
        {/* Children only render after the PDF loads. We still gate on
            mounted+variant so the right variant is chosen post-hydration
            without a flicker. While that handshake is in flight, the
            LoadingState above keeps showing (it's a sibling render of
            the document loader, not a child here). */}
        {!shouldShowReader ? (
          // mounted/variant pending — keep the splash up. The document
          // loader has already cleared, so we render our own splash here.
          <LoadingState title={title} isRtl={isRtl} />
        ) : (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE_EDITORIAL }}
            className="absolute inset-0"
          >
            {variant === 'mobile' ? (
              <MobileReader
                title={title}
                isRtl={isRtl}
                state={state}
                theme={theme}
                onThemeChange={setTheme}
                containerWidth={containerSize.width}
                containerHeight={containerSize.height}
              />
            ) : (
              <DesktopReader
                title={title}
                isRtl={isRtl}
                state={state}
                theme={theme}
                onThemeChange={setTheme}
                cycleTheme={cycleTheme}
                containerWidth={containerSize.width}
                outlineEntries={outlineEntries}
              />
            )}
          </motion.div>
        )}
      </Document>
    </div>
  )
}

function ErrorPanel({
  onRetry,
  isRtl,
}: {
  onRetry: () => void
  isRtl: boolean
}) {
  const t = useTranslations('reader.error')
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHead = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  return (
    <div
      role="alert"
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <div
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--reader-surface-elev)] text-[var(--reader-fg-muted)]"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h0" />
        </svg>
      </div>
      <p
        className={`m-0 max-w-[420px] text-[15px] leading-snug text-[var(--reader-fg)] ${fontHead}`}
      >
        {t('load_failed')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={`btn-pill btn-pill-secondary ${fontBody}`}
      >
        {t('retry')}
      </button>
    </div>
  )
}
