'use client'

/**
 * Custom HTML5 audio player.
 *
 * Why custom controls and not `<audio controls>`:
 *   - Native controls render in the browser default style — fights the
 *     Qalem aesthetic and breaks dark mode in some browsers.
 *   - We need a playback-speed selector for educational content (1x,
 *     1.25x, 1.5x, 2x). No native control offers that.
 *   - Custom progress polling for the viewer's per-item save flow.
 *
 * The `<audio>` element itself is still the engine — we only wrap it
 * with our own UI. Browser MediaSession metadata, native picture-in-
 * picture (where available), and AirPlay all keep working because the
 * underlying element is unchanged.
 *
 * Source URL: minted on demand by the parent component via
 * /api/content/access. Same pattern LibraryCard.handleDownload uses.
 * 1h TTL is fine for a single play session.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Loader2,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

const PLAYBACK_RATES = [1, 1.25, 1.5, 2] as const
const POLL_INTERVAL_MS = 2000
const COMPLETION_THRESHOLD = 0.95
// Phase 6.1 M2 — screen-reader announcements throttle. The visible
// clock updates ~once per second; that's far too noisy to forward to
// AT (some readers queue every change, others interrupt the prior one).
// Every 30s is the sweet spot: long enough that a focused listener
// won't be talked over while reading other content, short enough that
// a casual user gets durable progress feedback.
const ANNOUNCE_INTERVAL_MS = 30_000
// M3 — keyboard shortcuts step (5s). Matches the de-facto standard
// across Spotify / YouTube / podcast apps for "skip a sentence."
const SHORTCUT_SCRUB_SECONDS = 5

function formatClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`
  return `${minutes}:${pad(secs)}`
}

export function AudioPlayer({
  src,
  initialPositionSeconds,
  initialDurationSeconds,
  onProgress,
  onComplete,
  ariaLabel,
  locale,
}: {
  src: string
  initialPositionSeconds: number
  initialDurationSeconds: number | null
  onProgress: (positionSeconds: number) => void
  onComplete: () => void
  ariaLabel: string
  locale: 'ar' | 'en'
}) {
  const t = useTranslations('session.audio')
  const isRtl = locale === 'ar'
  const fontDisplay = isRtl ? 'font-arabic-body' : 'font-display'

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const onProgressRef = useRef(onProgress)
  const onCompleteRef = useRef(onComplete)
  const completedRef = useRef(false)
  const seekedRef = useRef(false)
  const initialPosRef = useRef(initialPositionSeconds)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // M2 — last wall-clock time we updated the live-region announcement.
  // Initialised to 0 so the first elapsed milestone after playback
  // starts produces an announcement instead of waiting 30s for the
  // ref to "ripen".
  const lastAnnouncedRef = useRef(0)

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(initialPositionSeconds)
  const [duration, setDuration] = useState<number>(
    initialDurationSeconds && initialDurationSeconds > 0
      ? initialDurationSeconds
      : 0,
  )
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState<(typeof PLAYBACK_RATES)[number]>(1)
  // M2 — content of the polite live region. Empty string until the
  // first 30s milestone fires; emptying it back out on src change so
  // the next item starts with no stale "Played 1:30 of 8:00".
  const [announcement, setAnnouncement] = useState('')

  useEffect(() => {
    onProgressRef.current = onProgress
  }, [onProgress])
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    initialPosRef.current = initialPositionSeconds
  }, [initialPositionSeconds])

  // Reset play state and seek flags whenever the source changes — the
  // parent uses one AudioPlayer instance per item, but a key change in
  // the parent will tear this down anyway. This belt is cheap.
  useEffect(() => {
    completedRef.current = false
    seekedRef.current = false
    lastAnnouncedRef.current = 0
    setPhase('loading')
    setIsPlaying(false)
    setPosition(initialPositionSeconds)
    setAnnouncement('')
    if (initialDurationSeconds && initialDurationSeconds > 0) {
      setDuration(initialDurationSeconds)
    }
  }, [src, initialPositionSeconds, initialDurationSeconds])

  const startPolling = useCallback(() => {
    if (pollRef.current) return
    pollRef.current = setInterval(() => {
      const audio = audioRef.current
      if (!audio) return
      const current = audio.currentTime
      onProgressRef.current(current)
      if (
        audio.duration > 0 &&
        current / audio.duration >= COMPLETION_THRESHOLD &&
        !completedRef.current
      ) {
        completedRef.current = true
        try {
          onCompleteRef.current()
        } catch (err) {
          console.error('[AudioPlayer] onComplete', err)
        }
      }
    }, POLL_INTERVAL_MS)
  }, [])

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  // M3 — keyboard shortcuts.
  //
  // Window-level keydown listener, mounted only when the player is in
  // the 'ready' phase. Pattern lifted from useReaderShortcuts:
  //   - bail on input/textarea/contenteditable focus (don't steal Space
  //     from a search box)
  //   - bail on metaKey/ctrlKey/altKey (browser/OS shortcuts win)
  //   - bail when the player itself is loading or errored
  //
  // Arrow direction is RTL-aware: in Arabic, ArrowLeft is the visual
  // "forward" direction (matches every other RTL media UI). In English
  // ArrowRight is forward.
  //
  // We intentionally do NOT bind shortcuts to a specific element-focus
  // requirement. The visible big "Play" button has standard focus +
  // enter/space behaviour for keyboard users who prefer explicit
  // activation. These shortcuts are ergonomic accelerators on top.
  useEffect(() => {
    if (phase !== 'ready') return
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target) {
        const tag = target.tagName
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target.isContentEditable
        ) {
          return
        }
      }
      const audio = audioRef.current
      if (!audio) return
      const forwardKey = isRtl ? 'ArrowLeft' : 'ArrowRight'
      const backKey = isRtl ? 'ArrowRight' : 'ArrowLeft'

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault()
        if (audio.paused) {
          audio.play().catch((err: unknown) => {
            if (err instanceof DOMException && err.name === 'AbortError') return
            console.error('[AudioPlayer] play (shortcut)', err)
          })
        } else {
          audio.pause()
        }
      } else if (e.key === forwardKey) {
        e.preventDefault()
        const next = Math.min(
          audio.duration || Infinity,
          audio.currentTime + SHORTCUT_SCRUB_SECONDS,
        )
        audio.currentTime = next
        setPosition(next)
      } else if (e.key === backKey) {
        e.preventDefault()
        const next = Math.max(0, audio.currentTime - SHORTCUT_SCRUB_SECONDS)
        audio.currentTime = next
        setPosition(next)
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        const nextMuted = !audio.muted
        audio.muted = nextMuted
        setMuted(nextMuted)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [phase, isRtl])

  function handleLoadedMetadata() {
    const audio = audioRef.current
    if (!audio) return
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration)
    }
    if (initialPosRef.current > 0 && !seekedRef.current) {
      try {
        audio.currentTime = initialPosRef.current
        seekedRef.current = true
        setPosition(initialPosRef.current)
      } catch (err) {
        console.error('[AudioPlayer] seek', err)
      }
    }
    setPhase('ready')
  }

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch((err: unknown) => {
        // AbortError fires when src changes while play() is in-flight — benign.
        if (err instanceof DOMException && err.name === 'AbortError') return
        console.error('[AudioPlayer] play', err)
        setPhase('error')
      })
    } else {
      audio.pause()
    }
  }

  function handlePlay() {
    setIsPlaying(true)
    startPolling()
  }
  function handlePause() {
    setIsPlaying(false)
    stopPolling()
  }
  function handleEnded() {
    setIsPlaying(false)
    stopPolling()
    if (!completedRef.current) {
      completedRef.current = true
      try {
        onCompleteRef.current()
      } catch (err) {
        console.error('[AudioPlayer] onEnded onComplete', err)
      }
    }
  }
  function handleTimeUpdate() {
    const audio = audioRef.current
    if (!audio) return
    setPosition(audio.currentTime)
    // M2 — throttled SR announcement. The visible clock above this line
    // still updates every second; this branch only refreshes the
    // sr-only live region every 30s of wall-clock time. Gate on
    // duration > 0 so a not-yet-loaded stream doesn't announce
    // "Played 0:00 of 0:00".
    if (audio.duration > 0) {
      const now = Date.now()
      if (now - lastAnnouncedRef.current >= ANNOUNCE_INTERVAL_MS) {
        lastAnnouncedRef.current = now
        setAnnouncement(
          t('aria.elapsed_announcement', {
            elapsed: formatClock(audio.currentTime),
            total: formatClock(audio.duration),
          }),
        )
      }
    }
  }
  function handleError() {
    setPhase('error')
    setIsPlaying(false)
    stopPolling()
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const next = Number(e.currentTarget.value)
    if (Number.isFinite(next)) {
      audio.currentTime = next
      setPosition(next)
    }
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const next = Number(e.currentTarget.value)
    if (Number.isFinite(next)) {
      audio.volume = next
      setVolume(next)
      if (next > 0 && audio.muted) {
        audio.muted = false
        setMuted(false)
      }
    }
  }

  function toggleMute() {
    const audio = audioRef.current
    if (!audio) return
    const next = !audio.muted
    audio.muted = next
    setMuted(next)
  }

  function changeRate(next: (typeof PLAYBACK_RATES)[number]) {
    const audio = audioRef.current
    setRate(next)
    if (audio) audio.playbackRate = next
  }

  // Human-readable scrub aria-valuetext using the same translated
  // "{elapsed} / {total}" pattern the visible clock uses. Without this,
  // screen readers announce raw seconds (e.g. "current value 1247") and
  // the user has to mentally divide by 60.
  const scrubValueText = t('elapsed', {
    elapsed: formatClock(position),
    total: formatClock(duration || 0),
  })
  const volumePercent = Math.round((muted ? 0 : volume) * 100)

  return (
    // role=region + aria-label promotes this into the landmark tree so
    // AT users can jump to the player by region. Plain <div aria-label>
    // does nothing — divs need a role for aria-label to expose a name.
    <section
      role="region"
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex h-full w-full flex-col items-stretch justify-end bg-black/85 p-5"
      aria-label={ariaLabel}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
        onError={handleError}
        className="sr-only"
      />

      {/* Phase 6.1 M2 — throttled (30s) live region. The visible clock
          updates every second above; this is the SR-only mirror that
          announces "Played 1:30 of 8:00" at a humane cadence. role=status
          implies aria-live=polite which is what we want — progress isn't
          urgent, the listener should finish whatever they're hearing
          before getting a milestone. Empty string until the first 30s
          tick fires. */}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>

      <div className="flex flex-1 items-center justify-center pb-4">
        {phase === 'loading' && (
          <span
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-2 text-[13px] text-white/80"
          >
            <Loader2
              // Phase 6.1 — motion-reduce halts the spin so users with
              // prefers-reduced-motion don't get a constantly-rotating
              // glyph. The icon stays visible (still indicates loading
              // state visually); just frozen.
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
            {t('loading')}
          </span>
        )}
        {phase === 'error' && (
          <span
            role="alert"
            className="inline-flex items-center gap-2 text-[13px] text-white"
          >
            <AlertCircle className="h-4 w-4" aria-hidden />
            {t('error')}
          </span>
        )}
        {phase === 'ready' && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? t('pause') : t('play')}
            aria-pressed={isPlaying}
            // Phase 6.1 M3 — declare the keyboard shortcut so AT users
            // get the affordance announced on focus. The handler itself
            // is window-scoped (see effect above) — this attribute is
            // documentation, not wiring.
            aria-keyshortcuts="Space"
            title={t('shortcut.play_pause')}
            className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            {isPlaying ? (
              <Pause className="h-9 w-9" aria-hidden strokeWidth={1.6} />
            ) : (
              <Play className="ms-1 h-9 w-9" aria-hidden strokeWidth={1.6} />
            )}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[var(--radius-md)] bg-black/60 p-3 backdrop-blur-sm">
        {/* Scrub bar */}
        <div className="flex items-center gap-3">
          <span
            dir="ltr"
            className={`min-w-[52px] text-[12px] text-white/85 num-latn ${fontDisplay}`}
          >
            {formatClock(position)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={1}
            value={position}
            onChange={handleScrub}
            disabled={phase !== 'ready' || duration <= 0}
            aria-label={t('scrub')}
            aria-valuetext={scrubValueText}
            // M3 — declare ±5s arrow shortcut so AT announces it on
            // focus. Window-scoped handler runs even without focus, but
            // this attribute makes the ergonomic feature discoverable.
            aria-keyshortcuts="ArrowLeft ArrowRight"
            title={t('shortcut.scrub')}
            className="session-scrubber flex-1"
          />
          <span
            dir="ltr"
            className={`min-w-[52px] text-[12px] text-white/85 num-latn text-end ${fontDisplay}`}
          >
            {formatClock(duration)}
          </span>
        </div>

        {/* Volume + speed row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? t('unmute') : t('mute')}
              aria-pressed={muted}
              aria-keyshortcuts="M"
              title={t('shortcut.mute')}
              // Touch target bumped to 44x44 (codebase mobile a11y
              // standard). The icon stays h-4 w-4; extra space is
              // padding around it.
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
            >
              {muted ? (
                <VolumeX className="h-4 w-4" aria-hidden />
              ) : (
                <Volume2 className="h-4 w-4" aria-hidden />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={handleVolume}
              aria-label={t('volume')}
              // Percent readout — universal-locale, no translation
              // needed (the % symbol reads as "percent" in every screen
              // reader I'm aware of).
              aria-valuetext={`${volumePercent}%`}
              className="session-scrubber w-[120px]"
            />
          </div>

          <div
            className={`flex items-center gap-1 ${fontDisplay}`}
            role="group"
            aria-label={t('speed')}
          >
            <span className="text-[11px] uppercase tracking-[0.08em] text-white/60">
              {t('speed')}
            </span>
            {PLAYBACK_RATES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => changeRate(r)}
                aria-pressed={rate === r}
                // 44x44 minimum target on mobile. The pill stays slim
                // visually because the row content (12px text) is
                // center-justified inside the larger hit area.
                className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full px-2 text-[12px] font-semibold transition-colors num-latn ${
                  rate === r
                    ? 'bg-white text-black'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span dir="ltr">{r}x</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
