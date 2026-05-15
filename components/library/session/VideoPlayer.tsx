'use client'

/**
 * Provider-agnostic video player wrapper.
 *
 * The session viewer ALWAYS renders this component, never an iframe
 * directly. Phase F2: the dispatch is per-item rather than module-level,
 * so a single session can mix YouTube-hosted and R2-hosted videos at the
 * item level. `pickVideoProvider(storageKey)` is the discriminator.
 *
 * Adding a new provider = drop in a new sibling component + extend this
 * switch + extend `pickVideoProvider` in `lib/video/index.ts`. The viewer
 * doesn't know which provider is in play; that's the whole point of the
 * abstraction.
 */

import { useTranslations } from 'next-intl'
import { pickVideoProvider } from '@/lib/video'
import type { VideoSource } from '@/lib/video'
import { YouTubeEmbedPlayer } from './YouTubeEmbedPlayer'
import { Html5VideoPlayer } from './Html5VideoPlayer'

export function VideoPlayer({
  source,
  initialPositionSeconds,
  onProgress,
  onComplete,
  ariaLabel,
  // Phase F2 — when the provider is the R2 HTML5 adapter, the parent has
  // already fetched a signed URL via /api/content/access and passes it
  // here. YouTube branch ignores this prop.
  r2SignedUrl,
  poster,
}: {
  source: VideoSource
  initialPositionSeconds: number
  onProgress: (positionSeconds: number) => void
  onComplete: () => void
  ariaLabel: string
  r2SignedUrl?: string | null
  poster?: string
}) {
  const t = useTranslations('session.video')
  const provider = pickVideoProvider(source.storageKey)

  switch (provider.providerName) {
    case 'youtube':
      return (
        <YouTubeEmbedPlayer
          source={source}
          initialPositionSeconds={initialPositionSeconds}
          onProgress={onProgress}
          onComplete={onComplete}
          ariaLabel={ariaLabel}
        />
      )
    case 'r2-html5':
      if (!r2SignedUrl) {
        // Parent hasn't supplied the signed URL yet — render the loading
        // shell. SessionViewer mirrors the AUDIO/PDF pattern of fetching
        // /api/content/access on item-switch.
        return (
          <div
            role="status"
            aria-live="polite"
            className="flex h-full w-full items-center justify-center bg-black/60 text-[13px] text-white/85"
          >
            {t('loading')}
          </div>
        )
      }
      return (
        <Html5VideoPlayer
          src={r2SignedUrl}
          initialPositionSeconds={initialPositionSeconds}
          onProgress={onProgress}
          onComplete={onComplete}
          ariaLabel={ariaLabel}
          poster={poster ?? undefined}
        />
      )
    case 'cloudflare-stream':
    case 'vimeo':
    case 'mux':
    default:
      return (
        <div className="flex h-full w-full items-center justify-center bg-black/85 text-[13px] text-white">
          {t('error')}
        </div>
      )
  }
}
