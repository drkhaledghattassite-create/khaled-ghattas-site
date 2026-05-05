'use client'

/**
 * Customer-facing session viewer (Phase 4).
 *
 * One screen, three surfaces:
 *   - Media area (top on mobile, leading column on desktop): renders the
 *     currently-selected item via the right player — VideoPlayer for
 *     VIDEO, AudioPlayer for AUDIO, PdfInline for PDF.
 *   - Session header (under the media area on desktop, between media
 *     and playlist on mobile): title + description + back link.
 *   - Playlist (under the header on mobile, sticky trailing column on
 *     desktop ≥ lg): clickable items with type badge, duration, progress,
 *     completion state, "now playing" indicator.
 *
 * Layout breakpoint: lg (1024px). Below: stack. At/above: two-column
 * grid with the playlist sticky to viewport top.
 *
 * ─── Progress save flow ─────────────────────────────────────────────────
 * The active media component fires `onProgress(positionSeconds)` every
 * ~2s while playing. We debounce by 1.5s and call
 * `saveSessionItemProgressAction` (server action). On `onComplete`, we
 * fire an immediate completed=true save that bypasses the debounce.
 *
 * Unmount / tab-close flush goes through /api/session/progress with
 * `keepalive: true` because server actions cannot be invoked with that
 * flag. Same pattern Phase 2's reader uses with /api/reader/progress.
 *
 * Item-switch flush: when the user clicks a different playlist item, we
 * fire-and-forget a save for the OUTGOING item before we swap, so the
 * outgoing item's lastPosition is durable.
 *
 * ─── Signed URLs ────────────────────────────────────────────────────────
 * Minted on demand by the client when the user activates an AUDIO or
 * PDF item — matches LibraryCard.handleDownload's POST to
 * /api/content/access. Server actions can't return signed URLs cleanly
 * either (they'd snapshot at page-load when the user might play hours
 * later). Cached in a ref keyed by sessionItemId so repeated clicks
 * don't re-mint while the URL is still fresh.
 *
 * VIDEO items don't go through /api/content/access — the video adapter's
 * embed config is built from the storageKey directly (YouTube doesn't
 * need a signed URL).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'
import { useReducedMotion } from '@/lib/motion/hooks'
import { fadeUp, EASE_EDITORIAL } from '@/lib/motion/variants'
import type { SessionItem } from '@/lib/db/schema'
import { saveSessionItemProgressAction } from '@/app/[locale]/(dashboard)/dashboard/library/session/[sessionId]/actions'
import { SessionPlaylist, type PlaylistProgress } from './SessionPlaylist'
import { VideoPlayer } from './VideoPlayer'
import { AudioPlayer } from './AudioPlayer'
import { PdfInline } from './PdfInline'

type SerializedProgress = {
  lastPositionSeconds: number
  completedAt: string | null
  lastWatchedAt: string
}

type SignedUrlEntry = {
  url: string
  expiresAt: number
}

type AccessResponse = {
  url: string
  expiresAt: string
}

const SAVE_DEBOUNCE_MS = 1500

export function SessionViewer({
  sessionId,
  sessionTitle,
  sessionDescription,
  coverImage,
  items,
  initialItemId,
  progress: initialProgress,
  locale,
}: {
  sessionId: string
  sessionTitle: string
  sessionDescription: string | null
  coverImage: string | null
  items: SessionItem[]
  initialItemId: string
  progress: Record<string, SerializedProgress>
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('session')
  const isRtl = locale === 'ar'
  const reduceMotion = useReducedMotion()
  const fontDisplay = isRtl ? 'font-arabic-body' : 'font-display'
  const fontHeading = 'font-arabic-display'

  // Progress map kept as Map<itemId, PlaylistProgress> in client state
  // so completion + position updates render immediately as the user
  // watches. Initialized from the server-supplied serialized progress.
  const [progress, setProgress] = useState<Record<string, PlaylistProgress>>(
    () => {
      const out: Record<string, PlaylistProgress> = {}
      for (const [k, v] of Object.entries(initialProgress)) {
        out[k] = {
          lastPositionSeconds: v.lastPositionSeconds,
          completedAt: v.completedAt,
        }
      }
      return out
    },
  )

  const [activeItemId, setActiveItemId] = useState<string>(initialItemId)
  // Initial position for the currently-mounted player. Snapshot once at
  // mount and only updated when activeItemId changes — re-rendering the
  // player with a new initial position mid-playback would yank the user
  // back to the saved point.
  const [pendingInitialPosition, setPendingInitialPosition] = useState<number>(
    () => initialProgress[initialItemId]?.lastPositionSeconds ?? 0,
  )

  const activeItem = useMemo(
    () => items.find((i) => i.id === activeItemId) ?? items[0]!,
    [items, activeItemId],
  )

  // Signed URL cache + fetch state for AUDIO/PDF.
  const signedUrlCache = useRef<Map<string, SignedUrlEntry>>(new Map())
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioPhase, setAudioPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfPhase, setPdfPhase] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  // Latest position ref for the active item — keepalive flush + item-
  // switch flush both read this without going through React state (which
  // would close over stale values inside the unmount cleanup).
  const latestPositionRef = useRef<{
    itemId: string
    positionSeconds: number
    completed: boolean
  }>({
    itemId: activeItemId,
    positionSeconds: pendingInitialPosition,
    completed: progress[activeItemId]?.completedAt != null,
  })

  // Debounced save timer for in-page progress saves.
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fireSave = useCallback(
    async (
      itemId: string,
      positionSeconds: number,
      completed: boolean,
    ): Promise<void> => {
      try {
        await saveSessionItemProgressAction({
          sessionId,
          itemId,
          positionSeconds: Math.max(0, Math.floor(positionSeconds)),
          completed,
        })
      } catch (err) {
        console.error('[SessionViewer] saveSessionItemProgressAction', err)
      }
    },
    [sessionId],
  )

  const fireKeepaliveSave = useCallback(
    (itemId: string, positionSeconds: number, completed: boolean) => {
      // Best-effort keepalive flush. Errors here are unrecoverable
      // anyway (the tab is dying); the next session-open just resumes
      // from the most recent successful debounced save.
      try {
        const blob = new Blob(
          [
            JSON.stringify({
              sessionId,
              itemId,
              positionSeconds: Math.max(0, Math.floor(positionSeconds)),
              completed,
            }),
          ],
          { type: 'application/json' },
        )
        // Why fetch + keepalive instead of navigator.sendBeacon: sendBeacon
        // doesn't carry credentials cross-origin reliably, and our route
        // requires the session cookie. fetch keepalive does.
        void fetch('/api/session/progress', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: blob,
          keepalive: true,
        })
      } catch (err) {
        console.error('[SessionViewer] keepalive flush', err)
      }
    },
    [sessionId],
  )

  const scheduleSave = useCallback(
    (itemId: string, positionSeconds: number, completed: boolean) => {
      latestPositionRef.current = { itemId, positionSeconds, completed }
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      saveTimerRef.current = setTimeout(() => {
        const snapshot = latestPositionRef.current
        // Guard against the active item having changed before the
        // debounce fired — in that case the item-switch flush already
        // saved this item, so skip.
        if (snapshot.itemId !== itemId) return
        void fireSave(snapshot.itemId, snapshot.positionSeconds, snapshot.completed)
      }, SAVE_DEBOUNCE_MS)
    },
    [fireSave],
  )

  // Latest snapshot ref for the unmount cleanup. Capturing latestPositionRef
  // alone is fine, but Strict Mode can call cleanups from prior renders
  // with stale closures.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      const snap = latestPositionRef.current
      if (snap.positionSeconds > 0) {
        fireKeepaliveSave(snap.itemId, snap.positionSeconds, snap.completed)
      }
    }
  }, [fireKeepaliveSave])

  // Also flush on pagehide for explicit tab-close survival.
  useEffect(() => {
    function onPagehide() {
      const snap = latestPositionRef.current
      if (snap.positionSeconds > 0) {
        fireKeepaliveSave(snap.itemId, snap.positionSeconds, snap.completed)
      }
    }
    window.addEventListener('pagehide', onPagehide)
    return () => window.removeEventListener('pagehide', onPagehide)
  }, [fireKeepaliveSave])

  // ─── Item switch flow ─────────────────────────────────────────────
  // 1. Fire-and-forget save for the OUTGOING item (so its lastPosition
  //    is durable) — uses the latest debounced snapshot.
  // 2. Cancel any pending debounced save (we just fired it).
  // 3. Set new active item id; snapshot its initial position from the
  //    progress map.
  // 4. Reset signed-URL phase for the new item — the URL will be re-
  //    fetched on demand by the audio/pdf phase effects.
  const handleSelect = useCallback(
    (nextItemId: string) => {
      if (nextItemId === activeItemId) return

      const outgoing = latestPositionRef.current
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (outgoing.positionSeconds > 0) {
        void fireSave(outgoing.itemId, outgoing.positionSeconds, outgoing.completed)
      }

      const incoming = items.find((i) => i.id === nextItemId)
      if (!incoming) return
      const incomingProgress = progress[nextItemId]
      const incomingPosition =
        incomingProgress?.completedAt != null
          ? 0 // Replays start from the beginning — past completion shouldn't pin them at the end.
          : incomingProgress?.lastPositionSeconds ?? 0

      setActiveItemId(nextItemId)
      setPendingInitialPosition(incomingPosition)
      latestPositionRef.current = {
        itemId: nextItemId,
        positionSeconds: incomingPosition,
        completed: incomingProgress?.completedAt != null,
      }

      // Reset URL phases for the NEW item; effects below will re-fetch.
      setAudioUrl(null)
      setAudioPhase('idle')
      setPdfUrl(null)
      setPdfPhase('loading')
    },
    [activeItemId, fireSave, items, progress],
  )

  const handleProgress = useCallback(
    (positionSeconds: number) => {
      const completed = progress[activeItemId]?.completedAt != null
      // Keep the local progress state in sync so the playlist's progress
      // bar updates as we go.
      setProgress((prev) => {
        const existing = prev[activeItemId]
        const nextCompletedAt = existing?.completedAt ?? null
        return {
          ...prev,
          [activeItemId]: {
            lastPositionSeconds: Math.floor(positionSeconds),
            completedAt: nextCompletedAt,
          },
        }
      })
      scheduleSave(activeItemId, positionSeconds, completed)
    },
    [activeItemId, progress, scheduleSave],
  )

  const handleComplete = useCallback(() => {
    const completedAtIso = new Date().toISOString()
    setProgress((prev) => {
      const existing = prev[activeItemId]
      // Sticky-true: don't reset a previously completed item.
      const completedAt = existing?.completedAt ?? completedAtIso
      return {
        ...prev,
        [activeItemId]: {
          lastPositionSeconds: existing?.lastPositionSeconds ?? 0,
          completedAt,
        },
      }
    })
    // Bypass debounce for completion — small UX win to see the check
    // mark in the playlist immediately, plus completion is rare enough
    // that the extra save is fine.
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }
    const snap = latestPositionRef.current
    latestPositionRef.current = {
      itemId: activeItemId,
      positionSeconds: snap.itemId === activeItemId ? snap.positionSeconds : 0,
      completed: true,
    }
    void fireSave(
      activeItemId,
      snap.itemId === activeItemId ? snap.positionSeconds : 0,
      true,
    )
  }, [activeItemId, fireSave])

  // ─── On-demand signed-URL fetch for AUDIO + PDF items ─────────────
  // Returns a cached URL when one exists and isn't near expiry, else
  // hits /api/content/access. Min cache-skew of 5min covers the brief
  // moment when an in-flight 1h URL is technically valid but the user
  // is about to start a 50-min play.
  const fetchSignedUrl = useCallback(
    async (item: SessionItem): Promise<string | null> => {
      const cached = signedUrlCache.current.get(item.id)
      const now = Date.now()
      if (cached && cached.expiresAt - now > 5 * 60 * 1000) {
        return cached.url
      }
      try {
        const res = await fetch('/api/content/access', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            productType: 'SESSION_ITEM',
            productId: item.id,
          }),
        })
        if (!res.ok) return null
        const data = (await res.json()) as AccessResponse
        signedUrlCache.current.set(item.id, {
          url: data.url,
          expiresAt: new Date(data.expiresAt).getTime(),
        })
        return data.url
      } catch (err) {
        console.error('[SessionViewer] /api/content/access', err)
        return null
      }
    },
    [],
  )

  // Audio fetch effect.
  useEffect(() => {
    if (activeItem.itemType !== 'AUDIO') return
    let cancelled = false
    setAudioPhase('loading')
    setAudioUrl(null)
    fetchSignedUrl(activeItem).then((url) => {
      if (cancelled) return
      if (!url) {
        setAudioPhase('error')
        return
      }
      setAudioUrl(url)
      setAudioPhase('ready')
    })
    return () => {
      cancelled = true
    }
  }, [activeItem, fetchSignedUrl])

  // PDF fetch effect.
  useEffect(() => {
    if (activeItem.itemType !== 'PDF') return
    let cancelled = false
    setPdfPhase('loading')
    setPdfUrl(null)
    fetchSignedUrl(activeItem).then((url) => {
      if (cancelled) return
      if (!url) {
        setPdfPhase('error')
        return
      }
      setPdfUrl(url)
      setPdfPhase('ready')
    })
    return () => {
      cancelled = true
    }
  }, [activeItem, fetchSignedUrl])

  return (
    <motion.div
      dir={isRtl ? 'rtl' : 'ltr'}
      variants={fadeUp}
      initial={reduceMotion ? 'visible' : 'hidden'}
      animate="visible"
      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
      className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-6 px-4 py-[clamp(20px,3vw,40px)] lg:gap-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        {/* Leading column — media + header */}
        <div className="flex flex-col gap-5">
          {/* Media area. Aspect-video for VIDEO/AUDIO/PDF gives a uniform
              shell; the players adapt their inner layout. The PDF mode
              breaks out of the aspect ratio on tall devices via min-h. */}
          <div
            className={`relative w-full overflow-hidden rounded-[var(--radius-md)] bg-black ${
              activeItem.itemType === 'PDF'
                ? 'min-h-[480px] aspect-[4/5] sm:aspect-[16/10] lg:aspect-video'
                : 'aspect-video'
            }`}
          >
            {activeItem.itemType === 'VIDEO' && (
              <VideoPlayer
                key={activeItem.id}
                source={{ storageKey: activeItem.storageKey }}
                initialPositionSeconds={pendingInitialPosition}
                onProgress={handleProgress}
                onComplete={handleComplete}
                ariaLabel={activeItem.title}
              />
            )}
            {activeItem.itemType === 'AUDIO' && (
              <>
                {coverImage && (
                  <Image
                    src={coverImage}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 60vw, 100vw"
                    className="object-cover opacity-30 pointer-events-none"
                    aria-hidden
                  />
                )}
                {audioPhase === 'ready' && audioUrl ? (
                  <AudioPlayer
                    key={activeItem.id}
                    src={audioUrl}
                    initialPositionSeconds={pendingInitialPosition}
                    initialDurationSeconds={activeItem.durationSeconds}
                    onProgress={handleProgress}
                    onComplete={handleComplete}
                    ariaLabel={activeItem.title}
                    locale={locale}
                  />
                ) : audioPhase === 'error' ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white">
                    {t('audio.error')}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-[13px] text-white/85">
                    {t('audio.loading')}
                  </div>
                )}
              </>
            )}
            {activeItem.itemType === 'PDF' && (
              <PdfInline
                key={activeItem.id}
                src={pdfUrl}
                phase={pdfPhase}
                ariaLabel={`${activeItem.title} — ${t('pdf.iframe_label')}`}
              />
            )}
          </div>

          {/* Header — session title, current item title, description */}
          <header className="flex flex-col gap-3">
            <Link
              href="/dashboard/library"
              className={`inline-flex items-center gap-1 self-start text-[12px] text-[var(--color-fg3)] hover:text-[var(--color-fg1)] transition-colors ${fontDisplay}`}
            >
              {/* Back-link arrow points AGAINST the reading direction
                  (LTR: ←, RTL: →). The forward-CTA pattern in
                  CorporateProgramsGrid is the opposite — that one
                  points WITH the reading direction. */}
              <span aria-hidden>{isRtl ? '→' : '←'}</span>
              {t('back_to_library')}
            </Link>
            <span
              className={`text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] ${
                isRtl
                  ? `${fontDisplay} !text-[12px] !tracking-normal !normal-case !font-bold`
                  : 'font-display font-semibold'
              }`}
            >
              {t('now_playing')}
            </span>
            <h1
              className={`m-0 text-[clamp(20px,2.6vw,28px)] leading-[1.2] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${fontHeading}`}
            >
              {activeItem.title}
            </h1>
            <p
              className={`m-0 text-[14px] leading-[1.6] text-[var(--color-fg2)] ${fontDisplay}`}
            >
              <span className="block text-[12px] uppercase tracking-[0.08em] text-[var(--color-fg3)] mb-1">
                {sessionTitle}
              </span>
              {activeItem.description ?? sessionDescription ?? null}
            </p>
          </header>
        </div>

        {/* Trailing column — playlist (sticky on desktop) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <SessionPlaylist
            items={items}
            activeItemId={activeItemId}
            progress={progress}
            locale={locale}
            onSelect={handleSelect}
          />
        </aside>
      </div>
    </motion.div>
  )
}
