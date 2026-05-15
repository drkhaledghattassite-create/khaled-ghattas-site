'use client'

/**
 * HTML5 `<video>` player for R2-hosted session videos — Phase F2.
 *
 * Mirrors the public surface of `YouTubeEmbedPlayer`:
 *   - takes `src` (signed URL), `initialPositionSeconds`, `ariaLabel`
 *   - reports `onProgress(positionSeconds)` while playing
 *   - fires `onComplete()` on natural-end OR when current/duration ≥ 0.95
 *
 * Why not `react-player` or another wrapper: zero new deps. Native
 * `<video controls>` is keyboard-accessible by default (Tab focuses
 * controls; Space toggles play; arrows scrub on most browsers). The
 * polled-progress + completion model matches the existing AudioPlayer
 * pattern; the SessionViewer's debounce + keepalive flush handle the
 * server-save side.
 *
 * `prefers-reduced-motion` is respected: no autoplay, no JS-driven
 * animations. The component does no scroll-coupled motion of its own.
 *
 * Signed URLs expire mid-playback: media elements survive an expired URL
 * for the bytes they've already fetched. A new mount is needed to fetch
 * fresh segments — the SessionViewer's cache (`signedUrlCache` with
 * 5-minute skew + 1-hour TTL) keeps the URL fresh on item swap.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

const POLL_INTERVAL_MS = 2000
const COMPLETION_THRESHOLD = 0.95

export function Html5VideoPlayer({
  src,
  initialPositionSeconds,
  onProgress,
  onComplete,
  ariaLabel,
  poster,
}: {
  src: string
  initialPositionSeconds: number
  onProgress: (positionSeconds: number) => void
  onComplete: () => void
  ariaLabel: string
  poster?: string
}) {
  const t = useTranslations('session.video')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  const seekedRef = useRef(false)
  const initialPosRef = useRef(initialPositionSeconds)
  // Callback refs — keep effect from tearing down on parent re-renders.
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    initialPosRef.current = initialPositionSeconds
  }, [initialPositionSeconds])

  // Reset per-source flags. A new src means a fresh playback session.
  useEffect(() => {
    completedRef.current = false
    seekedRef.current = false
  }, [src])

  // Wire native media events to the parent's progress/complete callbacks.
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    function clearPoll() {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }

    function fireComplete() {
      if (completedRef.current) return
      completedRef.current = true
      try {
        onCompleteRef.current()
      } catch (err) {
        console.error('[Html5VideoPlayer] onComplete', err)
      }
    }

    function onLoadedMetadata() {
      setPhase('ready')
      // Seek to the saved position — only once per mount.
      const v = videoRef.current
      if (!v) return
      if (initialPosRef.current > 0 && !seekedRef.current) {
        try {
          v.currentTime = initialPosRef.current
          seekedRef.current = true
        } catch (err) {
          console.error('[Html5VideoPlayer] seek', err)
        }
      }
    }

    function onError() {
      setPhase('error')
    }

    function onPlay() {
      if (pollRef.current) return
      pollRef.current = setInterval(() => {
        const v = videoRef.current
        if (!v) return
        try {
          const current = v.currentTime
          if (Number.isFinite(current) && current >= 0) {
            onProgressRef.current(current)
            const duration = v.duration
            if (
              Number.isFinite(duration) &&
              duration > 0 &&
              current / duration >= COMPLETION_THRESHOLD
            ) {
              fireComplete()
            }
          }
        } catch (err) {
          console.error('[Html5VideoPlayer] poll', err)
        }
      }, POLL_INTERVAL_MS)
    }

    function onPauseOrSeeked() {
      clearPoll()
    }

    function onEnded() {
      clearPoll()
      fireComplete()
    }

    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('error', onError)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPauseOrSeeked)
    video.addEventListener('ended', onEnded)

    return () => {
      clearPoll()
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('error', onError)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPauseOrSeeked)
      video.removeEventListener('ended', onEnded)
    }
  }, [src])

  return (
    <div className="relative h-full w-full bg-black">
      <video
        ref={videoRef}
        // Disable autoplay — matches the YouTube branch where the user
        // taps play. Also keeps prefers-reduced-motion users in control.
        src={src}
        poster={poster}
        controls
        playsInline
        preload="metadata"
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full"
      />
      {phase === 'loading' && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 text-[13px] text-white/85"
        >
          {t('loading')}
        </div>
      )}
      {phase === 'error' && (
        <div
          role="alert"
          className="absolute inset-0 flex items-center justify-center bg-black/80 text-[13px] text-white"
        >
          {t('error')}
        </div>
      )}
    </div>
  )
}
