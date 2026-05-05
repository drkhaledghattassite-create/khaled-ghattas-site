'use client'

/**
 * Provider-agnostic video player wrapper.
 *
 * The session viewer ALWAYS renders this component, never an iframe
 * directly. The wrapper consults the active adapter at
 * `lib/video/index.ts` and mounts the matching provider-specific player
 * sub-component. Adding a new provider = drop in a new sibling component
 * + extend this switch. The viewer doesn't know which provider is in
 * play; that's the whole point of the abstraction.
 */

import { useTranslations } from 'next-intl'
import { videoProvider } from '@/lib/video'
import type { VideoSource } from '@/lib/video'
import { YouTubeEmbedPlayer } from './YouTubeEmbedPlayer'

export function VideoPlayer({
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
  const providerName = videoProvider.providerName

  switch (providerName) {
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
    // Sibling provider components land here as they're added (no other
    // file changes — the SessionViewer keeps importing VideoPlayer).
    case 'cloudflare-stream':
    case 'vimeo':
    case 'mux':
    default:
      // Safety net for adapter-config drift. The producer of the active
      // `videoProvider` is supposed to have a matching player here; if
      // the build ever runs without one, we surface the error rather
      // than rendering a blank rectangle.
      return (
        <div className="flex h-full w-full items-center justify-center bg-black/85 text-[13px] text-white">
          {t('error')}
        </div>
      )
  }
}
