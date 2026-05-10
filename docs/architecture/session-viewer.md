# Session viewer (Phase 4)

Customer-facing playback surface for paid sessions at
`/dashboard/library/session/[sessionId]`. Server-verifies ownership via
`userOwnsProduct`; on miss redirects to `/dashboard/library` rather
than 404 to avoid leaking catalog membership. Wraps the page in
`DashboardLayout` (the reader is full-bleed by contrast — the session
viewer keeps the chrome because the playlist + surrounding navigation
feel natural alongside it).

Empty `session_items` list renders `SessionEmptyState` ("This session
is being prepared") instead of crashing or 404ing — the user owns the
product; admin just hasn't populated content yet.

## Layout

In `components/library/session/SessionViewer.tsx`:
- Mobile: stacks media → header → playlist
- `lg+` (1024px): two-column with the playlist sticky in the trailing
  column (RTL trailing edge)

## Initial item selection (server-side, in `pickInitialItemId`)

Most-recently-watched non-completed item → first not-yet-started item
by `sortOrder` → first item (replay UX when everything's completed).

## Player picker

`VideoPlayer.tsx` consults the video adapter (see below) and switches
on `providerName`. Per item type:

| Item type | Player | Source URL |
|---|---|---|
| VIDEO | `VideoPlayer` → `YouTubeEmbedPlayer` (today's only adapter) | `videoProvider.getEmbedConfig({ storageKey }, { origin, startSeconds })` minted at component mount, with `origin` from `window.location.origin` (NOT from `NEXT_PUBLIC_APP_URL` — env-driven origin breaks dev's postMessage origin check) |
| AUDIO | `AudioPlayer` (HTML5 `<audio>` + Qalem custom controls; play/pause, scrub, volume + mute, 1×/1.25×/1.5×/2× playback speed for educational content) | On-demand `POST /api/content/access` (`{ productType: 'SESSION_ITEM', productId }`), cached in a ref keyed by sessionItemId until ~5 min before expiry |
| PDF | `PdfInline` (browser-native iframe) | Same on-demand `/api/content/access` URL fetch as audio |

### Why native iframe for PDF, not the Phase 2 reader

react-pdf's pdfjs-dist machinery (worker, cMaps, fonts, ssr:false
wrapper) is overkill for short workshop handouts; the browser's
built-in PDF viewer renders them fine with native zoom/print/download.
The "no iframe in SessionViewer" rule is specifically about VIDEO
providers (which MUST go through the swappable VideoPlayer wrapper) —
PDFs have no swappable-provider concern. Trivial to swap to the
premium reader later by replacing one component.

### YouTube IFrame Player API

Loaded via a module-scoped singleton-Promise so concurrent mounts
don't race `window.onYouTubeIframeAPIReady`. The ONLY file on the
site that touches `window.YT` / `iframe_api` is
`components/library/session/YouTubeEmbedPlayer.tsx`. Any future
provider's runtime code stays inside its own sibling component.

## Video adapter abstraction

Mirrors the storage abstraction. `lib/video/index.ts` exports a single
`videoProvider: VideoAdapter` that the session viewer's `VideoPlayer`
wrapper calls.

`youtube-adapter.ts` is today's default — free dev hosting, accepts
video-id / watch-URL / short-URL / embed-URL formats in `storageKey`,
normalizes to a `youtube-nocookie.com` embed URL with
`rel=0 modestbranding=1 playsinline=1 enablejsapi=1 origin=…` query
params. YouTube branding (logo watermark, "More videos" panel on pause)
cannot be fully removed — that's an inherent constraint acceptable for
dev.

To swap to a cleaner provider (Cloudflare Stream / Vimeo / Mux):
1. Add a sibling adapter file implementing `VideoAdapter`
2. Add a sibling player component under
   `components/library/session/<Provider>Player.tsx` that knows the
   provider's runtime API
3. Extend `VideoPlayer.tsx`'s switch on `providerName`
4. Replace the import in `lib/video/index.ts`

No other files change. The session viewer's UI stays put.

## Progress save flow

Mirrors the Phase 2 reader's two-path pattern:

In-page debounced save (1.5s):
- `saveSessionItemProgressAction` server action

Unmount / tab-close flush:
- `fetch('/api/session/progress', { keepalive: true })`

Server actions can't be invoked with `keepalive`, so the API route
twin is required. Cross-session-item-guarded —
`getSessionItemById(itemId, sessionId)` rejects when itemId belongs
to a different session. Idempotent via `onConflictDoUpdate` on
`media_progress_user_item_idx`. Rate-limited per-user
(`session-progress:<userId>`).

`handleComplete` bypasses the debounce — completion is rare and the
playlist's check-mark feedback should be immediate. **Item switch**
flushes the outgoing item's progress (fire-and-forget) before swapping,
so a half-watched item is durable. Replays of completed items start
at position 0, not the saved last-position (which would pin the
player at the very end).

### Completion is dual-signal

YouTube `PlayerState.ENDED` OR position/duration ≥ 0.95, whichever
fires first. A ref guards the second fire so the server save isn't
sent twice.

### Sticky-completion invariant

`saveMediaProgress` with `completed=false` will NEVER clear a
previously-set `completedAt`. Both the mock branch and the Drizzle
branch (`onConflictDoUpdate` with `coalesce`) preserve the existing
value. A user re-watching a finished item shouldn't toggle the
playlist badge back to "in progress."

## Mock-mode

`MOCK_AUTH_ENABLED=true` persists media progress to
`.next/cache/reader-mock-store.json` via `lib/db/mock-store.ts` —
the same file already used by reading_progress + bookmarks +
sessionItems. Keyed by `${userId}:${sessionItemId}`.

Mock-mode AUDIO/PDF surface error states because
`/placeholder-content/<key>` 404s — by design; matches every other
Phase-1 signed-URL flow.

## Files

- `app/[locale]/(dashboard)/dashboard/library/session/[sessionId]/page.tsx` — server entry
- `app/[locale]/(dashboard)/dashboard/library/session/[sessionId]/actions.ts`
- `app/api/session/progress/route.ts` — keepalive twin
- `components/library/session/{SessionViewer,SessionPlaylist,SessionEmptyState,VideoPlayer,YouTubeEmbedPlayer,AudioPlayer,PdfInline}.tsx`
- `lib/video/{index,types,youtube-adapter}.ts`
- `lib/db/queries.ts` — `getMediaProgress`, `saveMediaProgress`, `getAllMediaProgressForSession`
- `messages/{ar,en}.json` — `session.*` namespace + `session.audio.*` a11y leaves

## Admin counterpart

Session-content CRUD (Phase 4 admin) lives at `/admin/books/[id]/content`
and is gated on `productType === 'SESSION'`. Server actions:
- `createSessionItemAction`
- `updateSessionItemAction`
- `deleteSessionItemAction`
- `reorderSessionItemsAction`

Each action does its own admin role check inline (server actions can't
call `requireAdmin(req)` without a Request); CSRF is covered by Next's
encrypted action ids. Mutations call `revalidatePath` on the editor
and edit routes. The parent's productType=SESSION invariant is
enforced at the action layer via `getBookById`. Storage keys are
free-text in this phase — the storage adapter is mocked.

Query helpers in `lib/db/queries.ts`: `getSessionItemById(id, sessionId?)`
(optional second arg adds a cross-session guard for admin mutations),
`getSessionItemsBySessionId`, `createSessionItem` (auto-places at end
when sortOrder is omitted), `updateSessionItem`, `deleteSessionItem`,
`reorderSessionItems`.
