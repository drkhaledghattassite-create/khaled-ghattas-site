'use client'

/**
 * YouTube IFrame Player wrapper.
 *
 * THIS IS THE ONLY FILE on the site that touches the YouTube IFrame
 * Player API. Adding a sibling provider (Cloudflare Stream, Vimeo, Mux)
 * means dropping a new sibling component here and extending VideoPlayer's
 * provider switch — never editing this file.
 *
 * ─── Why a module-scoped singleton-promise loader ───────────────────────
 * `window.onYouTubeIframeAPIReady` is a single global callback that the
 * YouTube script invokes exactly once when it finishes loading. If two
 * `YouTubeEmbedPlayer` mounts each assigned `window.onYouTubeIframeAPIReady`
 * naively, the second would clobber the first and the first would never
 * see "ready." Wrapping the load in a module-scoped Promise that resolves
 * only the first time and is reused for every subsequent mount avoids
 * that race. Once resolved, all mounts immediately see the YT global.
 *
 * ─── Why `origin` comes from `window.location.origin` ───────────────────
 * The adapter exposes `getEmbedConfig(source, { origin })` so the component
 * passes the runtime origin in. Baking `NEXT_PUBLIC_APP_URL` into the
 * embed at adapter time would break dev (origin mismatch → YouTube
 * rejects postMessage → no progress events).
 *
 * ─── Completion: dual signal ────────────────────────────────────────────
 * `onComplete` fires on `YT.PlayerState.ENDED` OR when the player's
 * `getCurrentTime() / getDuration()` ratio reaches ≥ 0.95 — whichever
 * happens first. A ref guards re-fires on the second signal so the
 * server save isn't sent twice.
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { videoProvider } from '@/lib/video'
import type { VideoSource } from '@/lib/video'

// Minimal subset of the YT.Player API we depend on. We don't pull a
// `@types/youtube` dependency in (no new deps allowed); the surface we
// use is small enough to type by hand.
type YTPlayer = {
  getCurrentTime(): number
  getDuration(): number
  destroy(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead?: boolean): void
}

type YTPlayerEvent = { data: number; target: YTPlayer }

type YTConstructor = new (
  id: string | HTMLElement,
  config: {
    events: {
      onReady: (event: { target: YTPlayer }) => void
      onStateChange: (event: YTPlayerEvent) => void
    }
  },
) => YTPlayer

type YTNamespace = {
  Player: YTConstructor
  PlayerState: {
    ENDED: number
    PLAYING: number
    PAUSED: number
    BUFFERING: number
    CUED: number
  }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

const SCRIPT_SRC = 'https://www.youtube.com/iframe_api'

// Module-scoped — shared across every YouTubeEmbedPlayer mount in the
// same page lifecycle.
let ytApiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('YouTube API requires a browser environment'))
  }
  if (window.YT && typeof window.YT.Player === 'function') {
    return Promise.resolve(window.YT)
  }
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise<YTNamespace>((resolve, reject) => {
    // Defensive double-check — between the early returns above and now,
    // another tick of the event loop could already have populated it.
    if (window.YT && typeof window.YT.Player === 'function') {
      resolve(window.YT)
      return
    }

    // Chain ourselves to whatever onYouTubeIframeAPIReady the page may
    // already have set (some other library, future cohabitant). The
    // wrapper invokes the prior callback before resolving us.
    const previous = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.()
      } catch {
        // Swallow — the previous callback's failure is its own problem.
      }
      if (window.YT && typeof window.YT.Player === 'function') {
        resolve(window.YT)
      } else {
        reject(new Error('YouTube API loaded without YT.Player'))
      }
    }

    // Avoid double-injecting if another mount is mid-load (it can happen
    // with React 18 strict-mode double effects in dev).
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.onerror = () => reject(new Error('Failed to load YouTube IFrame API'))
      document.head.appendChild(script)
    }
  })

  return ytApiPromise
}

const POLL_INTERVAL_MS = 2000
const COMPLETION_THRESHOLD = 0.95

export function YouTubeEmbedPlayer({
  source,
  initialPositionSeconds,
  onProgress,
  onComplete,
  ariaLabel,
}: {
  source: VideoSource
  initialPositionSeconds: number
  onProgress: (positionSeconds: number) => void
  onComplete: () => void
  ariaLabel: string
}) {
  const t = useTranslations('session.video')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const completedRef = useRef(false)
  const seekedRef = useRef(false)
  const initialPosRef = useRef(initialPositionSeconds)
  // Latest callbacks captured in refs so the effect doesn't re-run (and
  // therefore doesn't tear down + rebuild the player) every parent render.
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

  useEffect(() => {
    let cancelled = false
    const container = containerRef.current
    if (!container) return

    // Reset per-source flags. A new source means a brand new player.
    completedRef.current = false
    seekedRef.current = false

    // Use the runtime origin so YouTube's postMessage origin check passes.
    const origin =
      typeof window !== 'undefined' ? window.location.origin : undefined

    const config = videoProvider.getEmbedConfig(source, {
      origin,
      // Server seek: include `start=...` in the embed URL so the player
      // begins at the saved position even if the API call to seek lands
      // late. We still call `seekTo` in onReady as belt-and-suspenders.
      startSeconds: initialPositionSeconds,
    })

    // Create a fresh inner div the YT API will replace with the iframe.
    container.innerHTML = ''
    const target = document.createElement('div')
    container.appendChild(target)

    // Build the iframe ourselves first so the user sees the cued video
    // poster immediately — the YT API will then re-mount its player on
    // top using our element as the seed.
    target.id = `yt-${Math.random().toString(36).slice(2, 10)}`
    const iframe = document.createElement('iframe')
    iframe.src = config.embedUrl
    iframe.title = ariaLabel
    iframe.setAttribute('frameborder', '0')
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
    if (config.allowFullscreen) iframe.allowFullscreen = true
    iframe.className = 'absolute inset-0 h-full w-full'
    target.replaceWith(iframe)
    iframe.id = target.id

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
        console.error('[YouTubeEmbedPlayer] onComplete', err)
      }
    }

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return
        const player = new YT.Player(iframe.id, {
          events: {
            onReady: ({ target }) => {
              if (cancelled) {
                target.destroy()
                return
              }
              setPhase('ready')
              if (initialPosRef.current > 0 && !seekedRef.current) {
                try {
                  target.seekTo(initialPosRef.current, true)
                  seekedRef.current = true
                } catch (err) {
                  console.error('[YouTubeEmbedPlayer] seekTo', err)
                }
              }
            },
            onStateChange: ({ data, target }) => {
              if (cancelled) return
              const ENDED = YT.PlayerState.ENDED
              const PLAYING = YT.PlayerState.PLAYING
              if (data === PLAYING) {
                if (!pollRef.current) {
                  pollRef.current = setInterval(() => {
                    try {
                      const current = target.getCurrentTime()
                      if (Number.isFinite(current) && current >= 0) {
                        onProgressRef.current(current)
                        const duration = target.getDuration()
                        if (
                          Number.isFinite(duration) &&
                          duration > 0 &&
                          current / duration >= COMPLETION_THRESHOLD
                        ) {
                          fireComplete()
                        }
                      }
                    } catch (err) {
                      console.error('[YouTubeEmbedPlayer] poll', err)
                    }
                  }, POLL_INTERVAL_MS)
                }
              } else {
                clearPoll()
              }
              if (data === ENDED) {
                fireComplete()
              }
            },
          },
        })
        playerRef.current = player
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[YouTubeEmbedPlayer] api load', err)
        setPhase('error')
      })

    return () => {
      cancelled = true
      clearPoll()
      // Best-effort cleanup. The YT API destroys the iframe inside the
      // container, so wiping container.innerHTML on the next mount
      // covers the case where destroy() throws.
      try {
        playerRef.current?.destroy()
      } catch {
        // ignore
      }
      playerRef.current = null
    }
    // The effect depends on the storageKey (which gets baked into the
    // adapter config). Anything that changes the underlying video should
    // tear down and rebuild the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.storageKey])

  return (
    <div className="relative h-full w-full bg-black">
      {/* The iframe inside this container carries `title={ariaLabel}`,
          which is the accessible name AT users get for the video. The
          wrapping div doesn't need a duplicate aria-label — divs without
          a landmark role can't expose accessible names anyway, and
          duplicating the iframe title here would just cause double
          announcement. */}
      <div ref={containerRef} className="absolute inset-0" />
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
        // role=alert auto-implies aria-live=assertive — matches the
        // urgency: a video that won't load is something the user needs
        // to hear about immediately, not at the next polite break.
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
