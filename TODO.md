# TODO

Outstanding follow-ups created during the Phase 1+2 plumbing pass. Each
item is independently shippable.

## Image upload pipeline (Phase 5D follow-up)

Admin forms currently accept image URLs as strings. To move to direct
uploads:

1. `npm install uploadthing @uploadthing/react`
2. Create `app/api/uploadthing/core.ts` with an `imageRouter` (max 4 MB,
   image MIME types) and an admin-only `middleware` calling
   `requireAdmin()` from `lib/auth/admin-guard`.
3. Create `app/api/uploadthing/route.ts` exporting `createRouteHandler`.
4. Add `components/admin/ImageUpload.tsx` wrapping
   `UploadDropzone` from `@uploadthing/react`.
5. Replace the `coverImage`/`thumbnailImage`/`image` `<Input>` fields in
   `ArticleForm`, `BookForm`, `InterviewForm`, `EventForm`, `BulkUpload`,
   and `GalleryAdminGrid` with the new `ImageUpload` component.
6. Add `UPLOADTHING_TOKEN` to `.env.local.example` and document required
   env var on Netlify.

## Stripe checkout integration (Phase 6)

`app/api/stripe/webhook/route.ts` validates signatures but doesn't
process events yet. Wire `checkout.session.completed` to write rows to
`orders` + `order_items`, and `payment_intent.payment_failed` /
`charge.refunded` to mirror state.

Books with `externalUrl` link out to a third-party store. Books without
`externalUrl` need a checkout flow under `/checkout` that calls
`stripe.checkout.sessions.create` and redirects to Stripe-hosted
checkout.

## TipTap rich editor

Currently article/book/event bodies use plain `<Textarea>`. To swap in:

1. `npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-link`
2. Add `components/admin/RichEditor.tsx` wrapping `useEditor` with the
   StarterKit + Link extensions.
3. Replace `Textarea` for `contentAr`/`contentEn` and `descriptionAr`/
   `descriptionEn` fields. Server-side, the editor returns HTML — no DB
   change needed.

## Pagination on admin lists

`/admin/articles`, `/admin/books`, `/admin/interviews`, `/admin/events`,
`/admin/orders`, `/admin/subscribers`, `/admin/users`,
`/admin/messages` currently render the full list. Add `?page` /
`?perPage` URL params and slice the queries.

## Markdown article body parser

`articles[].contentAr|En` are rendered with `split('\n')` per
paragraph. Swap that for a real markdown renderer (`remark` +
`rehype-react`) so links, headings, blockquotes render correctly.

## Site-wide search

Wire a `/search` page that fans out to `searchArticles`,
`searchBooks` (to add), `searchInterviews` (to add). Use
`@upstash/search` once Redis is enabled.

## Analytics, cookie banner, PWA manifest

Out of scope for the current pass. Track separately.

## fg3 contrast bump (Phase 6.1 deferral)

The `--color-fg3` token (`#737373` in both `:root` and `.dark`) is
consumed by ~88 source files. Light-mode contrast on `#FAFAFA` is
~4.52:1 (just above WCAG AA). **Dark-mode contrast on `#0A0A0A` is
~4.26:1 — fails AA**.

Why deferred from Phase 6.1: blast radius is well above the >10
surface threshold. The fix also has an asymmetry the brief didn't
account for — the suggested `#595959` only works for light mode; in
dark mode it would drop to ~2.89:1.

Plan to ship cleanly:
1. Edit `app/globals.css`:
   - `:root` `--color-fg3: #595959` (light: ~6.67:1 on `#FAFAFA`).
   - `.dark` `--color-fg3: #9C9C9C` (dark: ~5.3:1 on `#0A0A0A`).
2. Visual audit in both modes for the surfaces with the highest
   semantic risk (text on accent-soft, text on bg-deep, text on the
   reader-only theme tokens, footer link tertiary copy, admin table
   cell secondary text, dashboard library card metadata, session
   playlist time/progress text). Spot-check 10–15 callsites; the
   rest follow from the same token.
3. Confirm `--color-ink-muted` and `--color-muted-foreground` (both
   alias `--color-fg3`) propagate the new values — those aliases
   feed shadcn primitives.
4. Confirm `::-webkit-scrollbar-thumb:hover` and `.section-eyebrow`
   in `globals.css` (both consume `--color-fg3` directly) still read
   correctly with the new asymmetric values.
5. Run a lighthouse / axe pass on a logged-out homepage, the library
   tab, and the session viewer to verify AA across the board.

Estimated effort: 1–2 hours including audit. Not a code-change
constraint — a verification constraint.
