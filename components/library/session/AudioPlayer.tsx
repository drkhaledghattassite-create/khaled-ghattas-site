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
    setPhase('loading')
    setIsPlaying(false)
    setPosition(initialPositionSeconds)
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

  return (
    <div
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

      <div className="flex flex-1 items-center justify-center pb-4">
        {phase === 'loading' && (
          <span className="inline-flex items-center gap-2 text-[13px] text-white/80">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t('loading')}
          </span>
        )}
        {phase === 'error' && (
          <span className="inline-flex items-center gap-2 text-[13px] text-white">
            <AlertCircle className="h-4 w-4" aria-hidden />
            {t('error')}
          </span>
        )}
        {phase === 'ready' && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? t('pause') : t('play')}
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
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
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
                className={`inline-flex h-7 min-w-[36px] items-center justify-center rounded-full px-2 text-[12px] font-semibold transition-colors num-latn ${
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
    </div>
  )
}
