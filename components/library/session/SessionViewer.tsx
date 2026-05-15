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
import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'
import { useReducedMotion } from '@/lib/motion/hooks'
import { fadeUp, EASE_EDITORIAL } from '@/lib/motion/variants'
import { pickVideoProvider } from '@/lib/video'
import type { SessionItem } from '@/lib/db/schema'
import { saveSessionItemProgressAction } from '@/app/[locale]/(dashboard)/dashboard/library/session/[sessionId]/actions'
import { SessionPlaylist, type PlaylistProgress } from './SessionPlaylist'
import { VideoPlayer } from './VideoPlayer'
import { AudioPlayer } from './AudioPlayer'
import { PdfInline } from './PdfInline'

/**
 * Phase 5.1 — auto-advance countdown.
 * 5 seconds is long enough that "did I really want to skip?" registers,
 * short enough that a user expecting the next lecture isn't bored.
 * Mirroring YouTube/Netflix's auto-play prompt durations.
 */
const COUNTDOWN_TOTAL_SECONDS = 5
const COUNTDOWN_TOTAL_MS = COUNTDOWN_TOTAL_SECONDS * 1000

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

  // Phase 5 — inter-item navigation surface.
  //   currentIndex: position in the playlist (sortOrder-sorted upstream)
  //   nextItem: the item the user would advance to, or null at the end
  //   isLastItemCompleted: drives the celebration completion state
  // Phase 5.1 upgraded the v1 manual-advance to an auto-advance with
  // 5-second countdown — the user can cancel mid-count or click "Play
  // now" to skip the wait. Last-item completion still falls through to
  // the celebration card; the countdown only fires when nextItem exists.
  const currentIndex = useMemo(
    () => items.findIndex((i) => i.id === activeItemId),
    [items, activeItemId],
  )
  const nextItem =
    currentIndex >= 0 && currentIndex < items.length - 1
      ? items[currentIndex + 1]!
      : null
  const isCurrentCompleted = progress[activeItemId]?.completedAt != null
  const isLastItem = nextItem == null
  const showCompletionState = isLastItem && isCurrentCompleted

  // ─── Phase 5.1 auto-advance countdown ────────────────────────────────
  // Three pieces of state:
  //   countdownTarget: the item id we'll advance to when timer fires;
  //                    null = no countdown active
  //   countdownSeconds: the visible "5, 4, 3, 2, 1" digit
  //   countdownStartTs: a cache-buster for AnimatePresence so cancel-
  //                     then-recomplete remounts the section (drains the
  //                     ring fresh instead of reusing the stale instance)
  const [countdownTarget, setCountdownTarget] = useState<string | null>(null)
  const [countdownSeconds, setCountdownSeconds] = useState(COUNTDOWN_TOTAL_SECONDS)
  const [countdownStartTs, setCountdownStartTs] = useState<number | null>(null)
  const countdownActive = countdownTarget != null
  // Snapshot of the title at countdown start — protects the live-region
  // announcement from re-firing when the active-item title state evolves
  // mid-countdown (e.g., a stale render shouldn't re-announce).
  const [countdownTitle, setCountdownTitle] = useState<string>('')

  const stopCountdown = useCallback(() => {
    setCountdownTarget(null)
    setCountdownSeconds(COUNTDOWN_TOTAL_SECONDS)
    setCountdownStartTs(null)
  }, [])

  const startCountdown = useCallback(
    (targetItemId: string, targetTitle: string) => {
      setCountdownTarget(targetItemId)
      setCountdownSeconds(COUNTDOWN_TOTAL_SECONDS)
      setCountdownStartTs(Date.now())
      setCountdownTitle(targetTitle)
    },
    [],
  )

  // Signed URL cache + fetch state for AUDIO/PDF, and (Phase F2) for R2 VIDEO.
  const signedUrlCache = useRef<Map<string, SignedUrlEntry>>(new Map())
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [audioPhase, setAudioPhase] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pdfPhase, setPdfPhase] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [videoUrl, setVideoUrl] = useState<string | null>(null)

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

      // Phase 5.1 — any explicit item swap (playlist click, "Play now",
      // or the timer firing through handleSelectRef) is a clean point
      // to drop the countdown. Idempotent if no countdown was running.
      stopCountdown()

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
      setVideoUrl(null)
    },
    [activeItemId, fireSave, items, progress, stopCountdown],
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
    // Phase 5.1 — kick the auto-advance countdown when there's a next
    // item. Last-item completion falls through to the celebration
    // card via showCompletionState; no countdown there.
    if (nextItem) {
      startCountdown(nextItem.id, nextItem.title)
    }
  }, [activeItemId, fireSave, nextItem, startCountdown])

  // Phase 5.1 — countdown timer effect. Splits into a tick (visual
  // 5→4→3→2→1 readout, 250ms cadence so the digit updates promptly even
  // if a tab-throttle skews the 1s schedule) and a one-shot fire that
  // actually triggers the advance at COUNTDOWN_TOTAL_MS. Both clean up
  // on cancel / item-switch / unmount via the effect's return.
  //
  // handleSelectRef indirection: handleSelect's identity changes whenever
  // items/progress/activeItemId change, so depending on it directly here
  // would tear down + rebuild the timers mid-countdown. The ref lets us
  // call the freshest handleSelect without re-firing the effect.
  const handleSelectRef = useRef(handleSelect)
  useEffect(() => {
    handleSelectRef.current = handleSelect
  }, [handleSelect])

  useEffect(() => {
    if (!countdownActive || countdownStartTs == null) return
    const target = countdownTarget!
    const start = countdownStartTs

    const tickId = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((COUNTDOWN_TOTAL_MS - (Date.now() - start)) / 1000),
      )
      setCountdownSeconds(remaining)
    }, 250)

    const fireId = setTimeout(() => {
      // Reset state first so AnimatePresence transitions cleanly, then
      // delegate to handleSelect through the ref. handleSelect's own
      // stopCountdown call is then a no-op.
      setCountdownTarget(null)
      setCountdownSeconds(COUNTDOWN_TOTAL_SECONDS)
      setCountdownStartTs(null)
      handleSelectRef.current(target)
    }, COUNTDOWN_TOTAL_MS)

    return () => {
      clearInterval(tickId)
      clearTimeout(fireId)
    }
  }, [countdownActive, countdownStartTs, countdownTarget])

  // Esc cancels the countdown. Window-level keydown — works regardless
  // of which element currently has focus (player iframe, audio button,
  // or none). Listener mounts only while the countdown is active to
  // avoid swallowing Esc anywhere else in the viewer.
  useEffect(() => {
    if (!countdownActive) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        stopCountdown()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [countdownActive, stopCountdown])

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

  // Phase F2 — VIDEO fetch effect for R2-hosted items. YouTube videos don't
  // need a signed URL (the iframe embed handles delivery), so we only fetch
  // when the discriminator says r2-html5. The fetched URL drops into
  // VideoPlayer via the r2SignedUrl prop; YouTube items just see null and
  // render through the YouTube branch.
  useEffect(() => {
    if (activeItem.itemType !== 'VIDEO') return
    const provider = pickVideoProvider(activeItem.storageKey)
    if (provider.providerName !== 'r2-html5') {
      setVideoUrl(null)
      return
    }
    let cancelled = false
    setVideoUrl(null)
    fetchSignedUrl(activeItem).then((url) => {
      if (cancelled) return
      if (url) setVideoUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [activeItem, fetchSignedUrl])

  const tLibrary = useTranslations('library')

  return (
    <motion.div
      dir={isRtl ? 'rtl' : 'ltr'}
      variants={fadeUp}
      initial={reduceMotion ? 'visible' : 'hidden'}
      animate="visible"
      transition={{ duration: 0.5, ease: EASE_EDITORIAL }}
      className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-6 px-4 py-[clamp(20px,3vw,40px)] lg:gap-8"
    >
      {/* Slim "Library" chip — present at every breakpoint, leading edge.
          Keeps the back-affordance reachable without stealing vertical
          real estate from the media area below. The legacy in-header
          back-arrow link was removed to avoid two redundant back routes.
          a11y: min-h-[44px] meets the codebase's mobile touch-target
          standard; the chip looks slim because the content (12px text +
          14px icon) is centered vertically inside a 44px-tall hit area. */}
      <Link
        href="/dashboard/library"
        aria-label={tLibrary('back_to_library')}
        className={`inline-flex min-h-[44px] w-fit items-center gap-1.5 self-start rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-1.5 text-[12px] font-semibold text-[var(--color-fg2)] transition-colors hover:text-[var(--color-fg1)] hover:border-[var(--color-fg1)] ${fontDisplay}`}
      >
        {/* Arrow points AGAINST the reading direction (back toward
            origin) — LTR uses ←, RTL uses →. Lucide's ChevronLeft +
            ChevronRight handle the swap explicitly so the icon doesn't
            mirror via CSS [dir=rtl] (which can clash with bidi text). */}
        {isRtl ? (
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
        )}
        {tLibrary('back_to_library')}
      </Link>

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
                r2SignedUrl={videoUrl}
                poster={coverImage ?? undefined}
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

          {/* Inter-item navigation surface — countdown / completion / up-next.
              AnimatePresence fades the three cases cleanly. Branch order
              matters: the countdown takes precedence over the up-next pill
              (current item just completed AND a next item exists), and
              the completion celebration takes precedence when there's no
              next item. They are mutually exclusive — only one renders. */}
          <AnimatePresence mode="wait" initial={false}>
            {countdownActive && nextItem ? (
              <motion.section
                key={`countdown-${countdownStartTs}`}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
                role="region"
                aria-live="polite"
                // Accessible name on a SEPARATE sr-only element below
                // (not via aria-label which would re-fire on every state
                // tick). The label here is stable on mount.
                aria-labelledby={`countdown-label-${countdownStartTs}`}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[var(--color-accent)] bg-[var(--color-accent-soft)] p-4 sm:flex-row sm:items-center sm:gap-4"
              >
                {/* The polite announcement reads ONCE on mount because
                    its text doesn't change after the section enters the
                    DOM. Every other dynamic node (countdown digit, ring)
                    is aria-hidden so it doesn't trigger re-announcement. */}
                <span
                  id={`countdown-label-${countdownStartTs}`}
                  className="sr-only"
                >
                  {tLibrary('session.auto_advance.label', {
                    seconds: COUNTDOWN_TOTAL_SECONDS,
                  })}
                  {' — '}
                  {countdownTitle}
                </span>

                {/* Leading: countdown indicator (animated ring or static
                    digit when prefers-reduced-motion is set). aria-hidden
                    because the sr-only label above conveys the meaning;
                    a screen reader reading "5, 4, 3, 2, 1" is the spam
                    we're avoiding. */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div aria-hidden className="shrink-0">
                    {reduceMotion ? (
                      <span
                        dir="ltr"
                        className={`inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[15px] font-bold tabular-nums num-latn`}
                      >
                        {countdownSeconds}
                      </span>
                    ) : (
                      <CountdownRing seconds={countdownSeconds} />
                    )}
                  </div>

                  {/* Identity */}
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={`text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-accent)] ${
                        isRtl
                          ? `${fontDisplay} !text-[12px] !tracking-normal !normal-case !font-bold`
                          : 'font-display'
                      }`}
                    >
                      {tLibrary('session.auto_advance.label', {
                        seconds: countdownSeconds,
                      })}
                    </span>
                    <span
                      className={`block truncate text-[14px] font-semibold text-[var(--color-fg1)] ${fontHeading}`}
                    >
                      {countdownTitle}
                    </span>
                  </div>
                </div>

                {/* Actions row. Both buttons satisfy 44px mobile target
                    via min-h. "Play now" is the affirmative — gets the
                    primary pill. "Cancel" is the dismissive — outline. */}
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      // Skip the timer and advance immediately.
                      // handleSelect runs stopCountdown internally.
                      handleSelect(nextItem.id)
                    }}
                    aria-label={tLibrary('session.auto_advance.play_now')}
                    className={`btn-pill btn-pill-primary inline-flex min-h-[44px] !text-[12px] !py-1.5 !px-4 ${fontDisplay}`}
                  >
                    {tLibrary('session.auto_advance.play_now')}
                  </button>
                  <button
                    type="button"
                    onClick={stopCountdown}
                    aria-label={tLibrary('session.auto_advance.cancel')}
                    className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-3 text-[12px] font-semibold text-[var(--color-fg2)] transition-colors hover:text-[var(--color-fg1)] hover:border-[var(--color-fg1)] ${fontDisplay}`}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    <span className="hidden sm:inline">
                      {tLibrary('session.auto_advance.cancel')}
                    </span>
                  </button>
                </div>
              </motion.section>
            ) : showCompletionState ? (
              <motion.section
                key="completion"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
                aria-live="polite"
                className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-5 py-6 text-center"
              >
                <div
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)]"
                  aria-hidden
                >
                  <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
                </div>
                <h2
                  className={`m-0 text-[clamp(16px,2vw,20px)] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-fg1)] ${fontHeading}`}
                >
                  {tLibrary('session.completion_title')}
                </h2>
                <Link
                  href="/dashboard/library"
                  className={`btn-pill btn-pill-primary inline-flex !text-[13px] !py-2 !px-5 ${fontDisplay}`}
                >
                  {tLibrary('session.completion_cta')}
                </Link>
              </motion.section>
            ) : nextItem ? (
              <motion.button
                key={`upnext-${nextItem.id}`}
                type="button"
                onClick={() => handleSelect(nextItem.id)}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: EASE_EDITORIAL }}
                aria-label={`${tLibrary('session.next_item_label')} — ${nextItem.title}`}
                className={`group flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-4 py-3 text-start transition-colors hover:border-[var(--color-fg1)] hover:bg-[var(--color-bg-deep)] ${
                  isCurrentCompleted
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                    : ''
                }`}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={`text-[10px] uppercase tracking-[0.14em] font-semibold text-[var(--color-accent)] ${
                      isRtl
                        ? `${fontDisplay} !text-[12px] !tracking-normal !normal-case !font-bold`
                        : 'font-display'
                    }`}
                  >
                    {tLibrary('session.next_item_label')}
                  </span>
                  <span
                    className={`block truncate text-[14px] font-semibold text-[var(--color-fg1)] ${fontHeading}`}
                  >
                    {nextItem.title}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-deep)] text-[var(--color-fg2)] transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-accent-fg)]"
                >
                  {/* Arrow points WITH the reading direction (forward to
                      the next item) — LTR uses →, RTL uses ←. Mirrors
                      the back-chip's logic. */}
                  {isRtl ? (
                    <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  ) : (
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                </span>
              </motion.button>
            ) : null}
          </AnimatePresence>

          {/* Header — eyebrow + current item title + description.
              Phase 5: the legacy back-arrow link was hoisted out into
              the slim Library chip at the top of the viewer; the header
              now leads with the now-playing eyebrow. */}
          <header className="flex flex-col gap-3">
            <span
              className={`text-[11px] uppercase tracking-[0.16em] text-[var(--color-accent)] ${
                isRtl
                  ? `${fontDisplay} !text-[12px] !tracking-normal !normal-case !font-bold`
                  : 'font-display font-semibold'
              }`}
            >
              {t('now_playing')}
            </span>
            {/* Phase 6.1 a11y — demoted from h1 → h2.
                DashboardLayout owns the page-level h1 (the user's name),
                so the active item title slots in as h2. Visual styling
                is unchanged because the heading uses explicit Tailwind
                classes; only the semantic level shifts. */}
            <h2
              className={`m-0 text-[clamp(20px,2.6vw,28px)] leading-[1.2] font-bold tracking-[-0.01em] text-[var(--color-fg1)] ${fontHeading}`}
            >
              {activeItem.title}
            </h2>
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

        {/* Trailing column — playlist (sticky on desktop). The aside
            advertises itself as a complementary landmark; without an
            aria-label it announces as "complementary" with no name.
            SessionPlaylist's inner <section> also carries the same
            label (by design — the section is what AT users actually
            land in when navigating by region). */}
        <aside
          aria-label={t('aria.playlist_region')}
          className="lg:sticky lg:top-6 lg:self-start"
        >
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

/**
 * Auto-advance countdown ring — pure SVG, animated via motion/react.
 *
 * The drain runs continuously over COUNTDOWN_TOTAL_MS independent of the
 * `seconds` digit (which ticks per state update). That separation is on
 * purpose: the digit must update for AT and visual readout, but the ring
 * looks janky if it ticks in 1-second steps. The motion timing is
 * `linear` so the visible drain matches wall-clock time.
 *
 * Re-mount restarts the animation: AnimatePresence keys the parent
 * section by `countdownStartTs`, so a cancel-then-recomplete spins up a
 * fresh CountdownRing instance with `initial → animate` running again
 * from the start.
 */
function CountdownRing({ seconds }: { seconds: number }) {
  const size = 40
  const stroke = 3
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <div
      className="relative inline-flex h-10 w-10 items-center justify-center"
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-accent-soft)"
          strokeWidth={stroke}
          fill="var(--color-accent)"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-accent-fg)"
          strokeWidth={stroke}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: circumference }}
          transition={{ duration: COUNTDOWN_TOTAL_SECONDS, ease: 'linear' }}
        />
      </svg>
      <span
        dir="ltr"
        className="relative text-[14px] font-bold tabular-nums num-latn text-[var(--color-accent-fg)]"
      >
        {seconds}
      </span>
    </div>
  )
}
