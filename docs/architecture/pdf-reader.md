# PDF reader (Phase 2)

In-browser PDF reader at `/dashboard/library/read/[bookId]`. Built on
`react-pdf@9` (transitively pins `pdfjs-dist@4.8.69`, the LEGACY build).

## Critical: pdfjs-dist is pinned to the legacy build

Do NOT "modernize" this. Why:

- `pdfjs-dist@5`'s modern build crashes at module-eval with
  "Object.defineProperty called on non-object" when bundled by Webpack/Next.
- `next.config.ts` aliases `pdfjs-dist$` →
  `pdfjs-dist/legacy/build/pdf.mjs` to force the legacy library build.
- `react-pdf` is pinned to v9 (which uses pdfjs-dist v4) to match.
- `scripts/copy-pdf-assets.mjs` (postinstall) copies the LEGACY worker,
  cMaps, and standard fonts into `public/`. These paths are gitignored;
  they regenerate per install.

If you want to upgrade later:
1. Test `pdfjs-dist@latest`'s modern build with the current Next version
2. If still broken, leave the legacy pinning in place
3. If fixed, update three places in lockstep:
   - Webpack alias in `next.config.ts`
   - `react-pdf` version in `package.json`
   - Worker source path in `scripts/copy-pdf-assets.mjs`

`next.config.ts` also aliases `canvas` → `false` so the optional
Node-side rendering dep doesn't break serverless builds.

## Architecture

`PdfReader.tsx` is the orchestrator that:
- Mounts a single `<Document>`
- Hosts `useReaderState` (page, bookmarks, progress save)
- Picks Mobile vs Desktop via `useViewport()` (hydration-safe `mounted` flag)

The route renders **full-bleed** as a `fixed inset-0 z-[100]` overlay.
DashboardLayout is intentionally NOT wrapped around the read path —
it would compete with the immersive surface. The layout still applies
to the "book has no digital file yet" notice path.

### Mobile (< 768px)
Full-bleed page · auto-hiding top/bottom bars · swipe / drag / tap-zone
navigation · double-tap zoom (1× ↔ 2×) · haptic feedback.

### Desktop (>= 768px)
Two-page spread · collapsible side rail (RTL leading edge — open by
default at >= 1280px) housing ToC (extracted via `pdf.getOutline()`),
bookmarks, theme picker, progress ring · full keyboard shortcuts
(`?`, `b`, `f`, `t`, `Esc`, `Space`, arrows).

### Themes
Three reader-only themes: `light` / `sepia` / `dark`. Scoped via
`data-reader-theme` attribute on the reader root, persisted in
`localStorage` under `reader-theme` — independent of site dark mode.
CSS tokens (`--reader-surface`, `--reader-fg`, `--reader-chrome`, …)
live in `app/globals.css` under "Reader themes — used in
/dashboard/library/read/[bookId] only".

## Save flow (two paths, both required)

In-page save (debounced 1.5s):
- `saveProgressAction` server action
- Writes via `saveReadingProgress` upsert

Unmount / `pagehide` flush:
- `fetch('/api/reader/progress', { keepalive: true })`
- The `keepalive` flag is what survives tab-close. Server actions
  cannot be invoked with `keepalive`, hence the API twin.

Both paths forward `totalPages` (the PDF's `numPages`) so the dashboard
library card can render `(lastPage / totalPages)` as a real percentage.
The `total_pages integer NOT NULL DEFAULT 0` column ships in
migration `0005_dizzy_luckman.sql`. `saveReadingProgress` retries
without the column on write failure so an un-applied migration
degrades gracefully.

On resume the reader hydrates from `getReadingProgress` and shows a
sonner toast ("Resuming from page N"). The "Saved" indicator pulse
is throttled to once per minute.

## Bookmarks

UX treats one bookmark per page as a toggle; the schema (`pdf_bookmarks`)
permits multiple. Server actions:
- `getBookmarksAction`
- `toggleBookmarkAction`
- `updateBookmarkLabelAction`

All Drizzle calls are wrapped in try/catch so a not-yet-applied
migration 0004 silently degrades to "no bookmarks" rather than crashing
the reader.

## Mock-mode persistence

`MOCK_AUTH_ENABLED=true` persists progress + bookmarks to
`.next/cache/reader-mock-store.json` via `lib/db/mock-store.ts`
(debounced 200ms write, gated behind `MOCK_AUTH_ENABLED` so the
disk read never fires in production). The file survives dev-server
restarts and Webpack HMR. Mock user ids ('1', '2', '3') aren't
UUIDs, so they can't go in the real `reading_progress` /
`pdf_bookmarks` tables — the JSON file is the dev substitute.

## Files

- `app/[locale]/(dashboard)/dashboard/library/read/[bookId]/page.tsx` — server entry
- `app/[locale]/(dashboard)/dashboard/library/read/[bookId]/actions.ts` — server actions
- `app/api/reader/progress/route.ts` — keepalive twin
- `components/library/PdfReader.tsx` — orchestrator
- `components/library/PdfReaderClient.tsx` — `next/dynamic` wrapper (ssr: false)
- `components/library/reader/{MobileReader,DesktopReader,ReaderTopBar,ReaderBottomBar,ReaderSideRail,ReaderSettingsSheet,ShortcutsOverlay,PageScrubber,ProgressRing,BookmarksList,LoadingState}.tsx`
- `components/library/hooks/{useReaderState,useReaderTheme,useReaderShortcuts,useSwipeGesture,useAutoHideChrome,useViewport}.ts`
- `lib/db/queries.ts` — `getReadingProgress`, `saveReadingProgress`, `getBookmarks`, `toggleBookmark`, `updateBookmarkLabel`
- `lib/db/mock-store.ts` — JSON-backed mock persistence
- `app/globals.css` — `--reader-*` tokens + `.reader-scrubber`
- `public/pdf.worker.min.mjs`, `public/cmaps/`, `public/standard_fonts/` — version-pinned to bundled `pdfjs-dist`
