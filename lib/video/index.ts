/**
 * Video provider entry point.
 *
 * ─── Why this abstraction exists ──────────────────────────────────────────
 * The session viewer needs to play videos today (dev) on a different host
 * than it will use in production. Dr. Khaled's video provider is undecided
 * (Cloudflare Stream, Vimeo, Mux, and self-hosted via Bunny are all on the
 * table). Every video player mount in the app calls
 * `videoProvider.getEmbedConfig(...)` — neither the SessionViewer nor the
 * generic VideoPlayer wrapper knows or cares which provider answers. The
 * provider-specific player sub-component (YouTubeEmbedPlayer today; a
 * sibling per future provider) is the only place that touches the
 * provider's runtime API.
 *
 * ─── How to swap adapters ─────────────────────────────────────────────────
 * 1. Implement the `VideoAdapter` interface (see `./types.ts`) in a new
 *    file `./cloudflare-stream-adapter.ts` (or similar).
 * 2. Add a sibling player component under
 *    `components/library/session/CloudflareStreamPlayer.tsx` that knows
 *    the runtime API (postMessage events, HLS playback, seek, etc.).
 * 3. Extend `VideoPlayer.tsx`'s switch on `providerName` to mount the new
 *    player.
 * 4. Replace the `videoProvider` export below with the new adapter.
 * 5. Add provider env vars to `.env.local.example` and the deployment.
 * 6. NO other files need to change. If they do, the abstraction is wrong.
 *
 * ─── Why YouTube as today's default ───────────────────────────────────────
 * Free dev hosting + zero account setup so Dr. Khaled can preview content
 * without committing to a paid provider. Branding limitations (the YT logo
 * watermark, "More videos" panel on pause) are inherent and acceptable
 * for dev — production will swap to a cleaner provider. See
 * `./youtube-adapter.ts` for the embed-param choices that minimize
 * branding within YouTube's constraints.
 */

import { youtubeAdapter } from './youtube-adapter'
import { r2Html5Adapter } from './r2-adapter'
import type { VideoAdapter } from './types'

// Default adapter — kept for the (legacy) one-line provider switch. Today's
// SessionViewer never reads this directly; it calls `pickVideoProvider` per
// item so a session can mix YouTube + R2-hosted videos at the item level.
const adapter: VideoAdapter = youtubeAdapter

export const videoProvider = adapter

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

/**
 * Per-item adapter selection — Phase F2.
 *
 * A `session_items.storageKey` is one of:
 *   - a YouTube URL (any youtu.be / youtube.com / youtube-nocookie.com shape)
 *   - a raw 11-char YouTube video id (e.g. `dQw4w9WgXcQ`)
 *   - an R2 object key (e.g. `session-item-video/<uuid>/<slug>.mp4`)
 *
 * The first two go to the YouTube adapter; the third goes to the R2 HTML5
 * adapter. The discriminator is deliberately conservative: anything that
 * looks like a YouTube id/URL falls into the YouTube bucket (preserving the
 * legacy behavior), so the only way to land on R2 is to upload a real file
 * (which produces a slash-containing key with a `session-item-video/` prefix).
 *
 * Returns the YouTube adapter when nothing about the key implies R2 — that
 * preserves existing dev data and keeps "paste a YouTube id" working.
 */
export function pickVideoProvider(storageKey: string): VideoAdapter {
  const trimmed = storageKey.trim()
  if (!trimmed) return youtubeAdapter

  // YouTube URLs — any host with a youtube domain
  if (
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be') ||
    trimmed.includes('youtube-nocookie.com')
  ) {
    return youtubeAdapter
  }

  // Raw 11-char YouTube id
  if (YOUTUBE_ID_RE.test(trimmed)) {
    return youtubeAdapter
  }

  // Default — treat as R2 storage key
  return r2Html5Adapter
}

export type {
  GetEmbedConfigOptions,
  VideoAdapter,
  VideoEmbedConfig,
  VideoProviderName,
  VideoSource,
} from './types'
