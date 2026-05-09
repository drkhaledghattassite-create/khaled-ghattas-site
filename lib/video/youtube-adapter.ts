/**
 * YouTube video adapter — Phase 4 dev default.
 *
 * Why YouTube: zero-cost video hosting for development and content
 * verification before Dr. Khaled's production video provider is decided
 * (Cloudflare Stream / Vimeo / Mux are all candidates). The cost is
 * branding visibility — YouTube embeds always show a small YT watermark
 * during play and a "More videos" panel on pause. `modestbranding=1` and
 * `rel=0` (limit related videos to the same channel) reduce but cannot
 * eliminate this. That's an acceptable trade-off for dev — production
 * deploys against a cleaner provider.
 *
 * The youtube-nocookie.com domain is YouTube's privacy-enhanced mode: no
 * cookies are set until the user presses play, no cross-domain tracking
 * until then. Using it instead of www.youtube.com is the small win that
 * costs us nothing.
 *
 * `storageKey` accepts:
 *   - a raw 11-character video id, e.g. `dQw4w9WgXcQ`
 *   - a watch URL, e.g. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
 *   - a short URL, e.g. `https://youtu.be/dQw4w9WgXcQ`
 *   - an embed URL, e.g. `https://www.youtube.com/embed/dQw4w9WgXcQ`
 * Anything else falls through to the literal storageKey — YouTube will
 * render its "Video unavailable" state, which is the right user-facing
 * behavior for an admin-side typo.
 */

import type {
  GetEmbedConfigOptions,
  VideoAdapter,
  VideoEmbedConfig,
  VideoSource,
} from './types'

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
const EMBED_BASE = 'https://www.youtube-nocookie.com/embed/'

/**
 * Best-effort extraction of an 11-char YouTube video id from any of the
 * supported `storageKey` shapes. Returns the input unchanged when nothing
 * looks like a video id — the adapter is not responsible for validation,
 * only for resolving the embed.
 */
export function parseYouTubeId(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''
  if (YOUTUBE_ID_RE.test(trimmed)) return trimmed

  // URL-shaped storage keys. Use URL parser so we don't have to maintain
  // a query-string regex by hand.
  let url: URL | null = null
  try {
    // Allow protocol-relative inputs ("//youtu.be/…") by prefixing https.
    url = new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed)
  } catch {
    return trimmed
  }

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\/+/, '').split('/')[0] ?? ''
    return YOUTUBE_ID_RE.test(id) ? id : trimmed
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname.startsWith('/embed/')) {
      const id = url.pathname.slice('/embed/'.length).split('/')[0] ?? ''
      return YOUTUBE_ID_RE.test(id) ? id : trimmed
    }
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v') ?? ''
      return YOUTUBE_ID_RE.test(v) ? v : trimmed
    }
    if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.slice('/shorts/'.length).split('/')[0] ?? ''
      return YOUTUBE_ID_RE.test(id) ? id : trimmed
    }
  }
  return trimmed
}

function buildEmbedUrl(videoId: string, options: GetEmbedConfigOptions): string {
  // Embed param dossier:
  //   rel=0             — show suggested videos only from the same channel
  //   modestbranding=1  — reduce YouTube logo prominence (does not remove it)
  //   playsinline=1     — iOS Safari plays inline instead of forcing fullscreen
  //   enablejsapi=1     — allow postMessage control via the IFrame Player API
  //   cc_load_policy=1  — Phase 6.1 a11y win: starts the embed with captions
  //                       enabled IF the source video has captions. Most of
  //                       Dr. Khaled's Arabic content has AR captions, so
  //                       defaulting them on is the right call for hearing-
  //                       impaired Arabic speakers. The toggle is still
  //                       reachable via YouTube's CC button. NB: when the
  //                       production provider is decided (Cloudflare Stream
  //                       / Vimeo / Mux), this maps to that provider's
  //                       caption-default flag — see CLAUDE.md.
  //   origin=…          — postMessage origin allowlist (security recommendation)
  //   start=…           — initial seek position (seconds), only when > 0
  // Order is stable so URLs are deterministic across renders, which avoids
  // unnecessary iframe reloads when React reconciles.
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    cc_load_policy: '1',
  })
  if (options.origin) params.set('origin', options.origin)
  if (options.startSeconds && options.startSeconds > 0) {
    params.set('start', String(Math.floor(options.startSeconds)))
  }
  return `${EMBED_BASE}${encodeURIComponent(videoId)}?${params.toString()}`
}

export const youtubeAdapter: VideoAdapter = {
  providerName: 'youtube',
  getEmbedConfig(
    source: VideoSource,
    options: GetEmbedConfigOptions = {},
  ): VideoEmbedConfig {
    const videoId = parseYouTubeId(source.storageKey)
    return {
      embedUrl: buildEmbedUrl(videoId, options),
      providerName: 'youtube',
      allowFullscreen: true,
      // YouTube allows autoplay only when muted on most platforms (iOS
      // blocks autoplay-with-sound entirely). The viewer treats this as
      // "ready to play" — user taps play to start.
      allowsAutoplay: false,
      extras: { videoId },
    }
  },
}
