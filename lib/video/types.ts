/**
 * Video adapter contract for the session viewer.
 *
 * Mirrors the storage adapter at `lib/storage/types.ts`. Every video player
 * mount on the site goes through `videoProvider.getEmbedConfig(...)` —
 * `lib/video/index.ts` is the single line that decides which provider is in
 * play. Swapping the production video host (Cloudflare Stream, Vimeo, Mux,
 * …) is one import change and zero downstream edits.
 *
 * `storageKey` is whatever `session_items.storageKey` holds for VIDEO rows;
 * the adapter is the only thing that knows its format. YouTube accepts a
 * raw 11-char video id OR a full URL; future adapters declare their own.
 */
export type VideoSource = {
  storageKey: string
}

/**
 * Per-call options when minting an embed config. `origin` must come from the
 * runtime (browser `window.location.origin`) so YouTube's postMessage origin
 * check passes in dev without env-driven SITE_URL leakage. The adapter is
 * free to ignore options it doesn't use.
 */
export type GetEmbedConfigOptions = {
  origin?: string
  startSeconds?: number
}

/**
 * What the player wrapper component needs to actually mount the player.
 * `embedUrl` is the iframe `src` for iframe-based providers (YouTube,
 * Vimeo); future stream-API providers may attach their own state under
 * `extras` and let `embedUrl` be a no-op.
 */
export type VideoEmbedConfig = {
  embedUrl: string
  /** Used by `VideoPlayer` to pick the right provider-specific player. */
  providerName: VideoProviderName
  allowFullscreen: boolean
  allowsAutoplay: boolean
  /** Provider-specific extras — adapters may attach any JSON-serializable
   * state the matching player component needs (e.g. a parsed video id,
   * playback uid, captions config). */
  extras?: Record<string, unknown>
}

export type VideoProviderName =
  | 'youtube'
  | 'cloudflare-stream'
  | 'vimeo'
  | 'mux'

export interface VideoAdapter {
  /** Translate a `session_items.storageKey` into everything the player
   * wrapper needs to embed it. */
  getEmbedConfig(
    source: VideoSource,
    options?: GetEmbedConfigOptions,
  ): VideoEmbedConfig

  /** The active provider name. `VideoPlayer` reads this to pick which
   * player sub-component (YouTubeEmbedPlayer / CloudflareStreamPlayer /
   * VimeoPlayer / MuxPlayer) to render. */
  providerName: VideoProviderName
}
