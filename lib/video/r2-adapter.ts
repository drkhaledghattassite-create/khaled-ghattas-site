/**
 * R2 HTML5 video adapter — Phase F2.
 *
 * For session VIDEO items whose storageKey points at a Cloudflare R2 object.
 * Unlike the YouTube adapter (which mints an iframe `embedUrl`), the R2 adapter
 * defers URL signing to the runtime: `/api/content/access` is the gate that
 * verifies ownership and signs a short-lived URL — the same path AUDIO and
 * PDF items already use. The matching player component (`Html5VideoPlayer`)
 * fetches that URL on mount.
 *
 * Why not mint the signed URL here: signing requires the `userId` (audit log
 * + future per-viewer features like watermarking). The adapter is a pure,
 * sync helper that runs on the client during render — it has no access to
 * the storage adapter (server-only) or the requester identity. The signed URL
 * therefore lives behind `/api/content/access`.
 *
 * `embedUrl` is intentionally empty — `Html5VideoPlayer` ignores it and
 * goes through the signed-URL fetch path. The provider name `r2-html5`
 * routes the request to the right player sub-component inside
 * `VideoPlayer.tsx`.
 */

import type {
  VideoAdapter,
  VideoEmbedConfig,
  VideoSource,
} from './types'

export const r2Html5Adapter: VideoAdapter = {
  providerName: 'r2-html5',
  // `options` is omitted — R2 playback doesn't need `origin` (no
  // postMessage handshake) and `startSeconds` is handled by the HTML5
  // `<video>` element setting `currentTime` after loadedmetadata.
  getEmbedConfig(source: VideoSource): VideoEmbedConfig {
    return {
      // Empty — the player resolves the signed URL via /api/content/access
      // using the session_item id at runtime. See Html5VideoPlayer.
      embedUrl: '',
      providerName: 'r2-html5',
      allowFullscreen: true,
      // HTML5 video can autoplay when muted; we don't autoplay on first
      // mount (the viewer treats this as "ready to play" — user taps play).
      allowsAutoplay: false,
      extras: { storageKey: source.storageKey },
    }
  },
}
