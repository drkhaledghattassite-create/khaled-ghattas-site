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
