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
import type { VideoAdapter } from './types'

const adapter: VideoAdapter = youtubeAdapter

export const videoProvider = adapter

export type {
  GetEmbedConfigOptions,
  VideoAdapter,
  VideoEmbedConfig,
  VideoProviderName,
  VideoSource,
} from './types'
