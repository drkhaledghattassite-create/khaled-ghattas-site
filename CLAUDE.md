# CLAUDE.md — drkhaledghattass.com

Project conventions index. Read fully before any work. Code is the source
of truth for everything else; when this file and code disagree, trust the
code and update this file.

For per-surface deep dives, see `docs/architecture/`:
- [pdf-reader.md](docs/architecture/pdf-reader.md) — `/dashboard/library/read/[bookId]`
- [session-viewer.md](docs/architecture/session-viewer.md) — `/dashboard/library/session/[sessionId]`
- [booking-domain.md](docs/architecture/booking-domain.md) — `/booking`, `/dashboard/bookings`, `/admin/booking/*`
- [ask-dr-khaled.md](docs/architecture/ask-dr-khaled.md) — `/dashboard/ask`, `/admin/questions`

For volatile state: `LAUNCH-CHECKLIST.md`, `TODO.md`, `CONTENT-NEEDED.md`.

## Working with Claude on this project

Every behavior-changing prompt must result in CLAUDE.md being updated to
reflect the new state. If a prompt adds files, tables, routes, components,
conventions, dependencies, or changes existing patterns, the implementer
updates CLAUDE.md (or the relevant `docs/architecture/*.md`) in the same
change. If CLAUDE.md drifts from reality, future sessions break.

CLAUDE.md is for conventions — patterns an AI needs every conversation.
Surface-specific architecture (how the PDF reader saves progress, how
booking holds work) goes in `docs/architecture/<surface>.md`.

## Project overview

`drkhaledghattass.com` is the bilingual editorial site for Dr. Khaled
Ghattass — Lebanese cell biologist, author, lecturer, and founder of
«الورشة» (Al-Warsheh / Workshop) initiative (founded 2020-07-11 in Burja,
Lebanon; Khaled Ghattass Library opened 2023). The site showcases his
books, articles, interviews, and events to a primarily Arab-speaking,
primarily mobile audience.

Tour 2025-2026 theme: «بين الغريب والسائد.. لقاء عن الحب والحياة».

This is a paid freelance project. Lead developer: Kamal Chhimi.

Primary locale: Arabic (RTL) at `/`. Secondary locale: English (LTR) at
`/en/`.

What's stubbed:
- Stripe checkout creates real sessions when `STRIPE_SECRET_KEY` is set;
  otherwise returns 503 "coming soon". Webhook validates signatures.
- Image upload pipeline (Uploadthing not wired; admin forms accept URLs).
- Markdown article body parser (paragraphs split by `\n` for now).
- Site-wide search.
- PDF per-page download + annotations (Phase 3 — bookmarks shipped in Phase 2).

## Stack

### Core
- Next.js **15** (App Router; Server Components default; async `params`/`searchParams`).
- TypeScript strict — `any` is forbidden.
- React 19.
- Tailwind v4 with `@theme inline { ... }` tokens in `app/globals.css`.

### Data
- Drizzle ORM (`drizzle-orm@^0.45`) + Neon Postgres (serverless).
- Schema: `lib/db/schema.ts` — **35 tables**, **16 enums**.
  - Tables: `users`, `sessions`, `accounts`, `verifications`, `articles`,
    `books`, `interviews`, `gallery`, `events`, `orders`, `orderItems`,
    `subscribers`, `contactMessages`, `siteSettings`, `contentBlocks`,
    `readingProgress`, `pdfBookmarks`, `mediaProgress`, `sessionItems`,
    `corporatePrograms`, `corporateClients`, `corporateRequests`, `tours`,
    `tourSuggestions`, `bookings`, `bookingInterest`, `bookingsPendingHolds`,
    `bookingOrders`, `userQuestions`, `tests`, `testQuestions`,
    `testOptions`, `testAttempts`, `testAttemptAnswers`, `gifts`.
  - Enums: `userRole`, `contentStatus`, `orderStatus`, `messageStatus`,
    `subscriberStatus`, `eventStatus`, `articleCategory`, `productType`,
    `sessionItemType`, `corporateRequestStatus`, `bookingProductType`,
    `bookingState`, `questionStatus`, `giftStatus`, `giftItemType`,
    `giftSource`.
  - Cross-table notes: `sessionItems.sessionId` references `books.id`
    (sessions live in `books` with `productType='SESSION'`); the
    productType invariant is enforced in app code, not by FK.
    `corporateRequests.programId` is `ON DELETE SET NULL`.
    `bookingOrders.userId` is `ON DELETE SET NULL`; `bookingOrders.bookingId`
    is `ON DELETE RESTRICT` so admin can't delete a booking with orders.
    `bookingOrders.status` reuses the canonical `orderStatus` enum.
    Tests-domain (Phase C1) is plain text-validated for `tests.category`
    (no enum); `tests.priceUsd` + `tests.isPaid` exist as forward-compat
    paywall hooks but v1 always writes null/false. "Exactly one correct
    option per question" is enforced at the app layer, not by DB trigger
    — the submit action returns `validation` if the seed data violates it.
    `testAttempts` cascade-delete on user/test removal; `testAttemptAnswers`
    cascade-delete on attempt/question/option removal.
- Migrations: `lib/db/migrations/0000…0011`. Apply with `npm run db:migrate`.
- **Unified data layer**: `lib/db/queries.ts` is the single import point.
  Drizzle when `DATABASE_URL` is a real Neon URL; falls back to
  `lib/placeholder-data.ts` when the URL is empty or contains `dummy`.
  Auto-detected via the `HAS_DB` constant inside `queries.ts`.
  **There is no `HAS_DB` env flag** — don't introduce one.

### Auth
- Better Auth (`better-auth@^1.6`).
- Catch-all route: `app/api/auth/[...all]/route.ts`.
- Session timing: `expiresIn` 30 days; `updateAge` 24 hours (sliding refresh).
- `lib/auth/server.ts` — `getServerSession()` (mock-aware in dev only).
- `lib/auth/client.ts` — `authClient`, `signIn`, `signUp`, `signOut`, `useSession`.
- `lib/auth/admin-guard.ts` — `requireAdmin(req)` runs origin check + role check.
- `lib/auth/redirect.ts` — `safeRedirect(raw)`, `withRedirect(href, target)`.
  Rejects `//host`, `/\evil`, embedded schemes (`/javascript:…`).
- `components/auth/AuthRequiredDialog.tsx` — purchase-gated login prompt.
  Sends users to `/login?redirect=<encoded path>`; auth forms read this
  param and bounce after sign-in. Chain preserved across login ↔ register,
  login ↔ forgot, reset → login, and Google OAuth via `callbackURL`.
- `lib/auth/index.ts` throws at module load when `BETTER_AUTH_SECRET` is
  unset in production. In dev with no secret, an ephemeral `randomBytes(32)`
  secret is used per-process — sessions don't persist across restarts.
  `trustedOrigins` locked to `NEXT_PUBLIC_APP_URL` + `BETTER_AUTH_URL` in
  production; dev also includes `localhost:3000`/`:3001`.

Three roles: `USER` (buyer / reader, has `/dashboard`), `ADMIN` (full
content + settings access at `/admin`), `CLIENT` (Dr. Khaled's read-only
financial / analytics view, planned).

### i18n
- `next-intl@^4.9`.
- Routing in `lib/i18n/routing.ts`: `locales: ['ar', 'en']`,
  `defaultLocale: 'ar'`, `localePrefix: 'as-needed'`,
  `localeDetection: false`. Arabic at `/`; English at `/en/`.
- `messages/ar.json` and `messages/en.json` MUST have **identical
  structure** — same key paths, same nesting. Enforced by the
  `translation-syncer` agent. Don't track leaf counts in this file —
  they drift on every change.

### Motion
- `motion/react@^12.38`. **Never** `framer-motion` — different package.
- Reusable variants: `lib/motion/variants.ts`.
  - Easings: `EASE_EDITORIAL` `(0.16, 1, 0.3, 1)`, `EASE_REVEAL`
    `(0.22, 1, 0.36, 1)`, `EASE_DRAMATIC` `(0.65, 0, 0.35, 1)`,
    `EASE_STAGGER` `(0.4, 0, 0.2, 1)`.
  - Variants: `fadeUp`, `fadeUpBidirectional`, `blurReveal`,
    `blurRevealBidirectional`, `fadeIn`, `staggerContainer`, `staggerItem`,
    `slideInStart`, `slideInEnd`, `scaleIn`, `maskRevealUp`, `maskRevealDown`.
  - Helpers: `fadeUpDelayed(delay)`, `staggerContainerWith(stagger, delay)`,
    `VIEWPORT_DEFAULT`, `VIEWPORT_BIDIRECTIONAL`.
- Hooks: `lib/motion/hooks.ts` — `useReducedMotion`, `useIsMobile`,
  `useIsTouchDevice`, `useScrollReveal`, `useScrollVelocity`,
  `useScrollProgress`.
- Components: `components/motion/` — `AnimatedText`, `CountUp`,
  `FocusModeToggle`, `PageTransition`, `ProximityPrefetch`, `PullQuote`,
  `ReadingProgress`, `ScrollReveal`, `ScrollRevealLine`,
  `SectionBackgroundCrossfade`, `Tilt3D`, `ViewTransitionsRouter`.
- `ViewTransitionsRouter` is a global capture-phase anchor-click interceptor
  that wraps internal nav in `document.startViewTransition`. It
  `preventDefault`s and pushes via the App-Router. **It does NOT
  `stopPropagation`** — React's bubble-phase delegation must still fire so
  user-attached `onClick` handlers (e.g. closing a mobile drawer when a
  link is tapped) work. Don't add `stopPropagation` here.
- `AppLoader` (in `components/layout/`) is the unified app-wide loader.
  Sequenced splash on first load (sessionStorage-gated); brief logo
  overlay on subsequent navigations. Listens for both anchor clicks
  (capture phase) and a custom `kg:loader:show` event so non-link
  navigations (e.g. post-login `router.push`) can also trigger it.

### Other deps
- `lenis@^1.3` — smooth scroll (`components/providers/LenisProvider.tsx`).
- `@upstash/ratelimit` + `@upstash/redis` — rate limiting (`lib/redis/`).
- `resend@^6.12` — transactional email (`lib/email/`).
- `stripe@^22` + `@stripe/stripe-js` — checkout (Phase 6).
- `next-themes@^0.4` — dark mode toggle.
- `@base-ui/react` + `@radix-ui/*` + `shadcn` — primitives (`components/ui/*`).
- `react-hook-form` + `@hookform/resolvers` + `zod@^4.3` — forms.
- `@tanstack/react-table@^8` — admin tables.
- `recharts@^3` — admin dashboard charts.
- `lucide-react`, `date-fns@^4`, `react-day-picker@^9`, `sonner@^2`.
- `react-pdf@^9` — Phase 2 in-browser PDF reader. **See "PDF.js — pinned
  to legacy build" below before changing anything in this dependency
  chain.**
- `playwright@^1.56` — devDep only (`scripts/visual-check.mjs`).

Deploy target: **Vercel**.

## PDF.js — pinned to legacy build (do not "modernize")

The PDF reader uses pdfjs-dist's LEGACY build, NOT the modern one.

Why:
- pdfjs-dist@5's modern build crashes at module-eval with
  "Object.defineProperty called on non-object" when bundled by
  Webpack/Next.js.
- Workaround: Webpack alias in `next.config.ts` points
  `pdfjs-dist$` → `pdfjs-dist/legacy/build/pdf.mjs`.
- `react-pdf` is pinned to v9 (which uses pdfjs-dist v4) to match.
- `scripts/copy-pdf-assets.mjs` (postinstall) copies the LEGACY worker.

DO NOT bump `react-pdf` to v10+, simplify the Webpack alias, switch the
postinstall script to the modern worker, or mix legacy + modern imports.

To upgrade: test `pdfjs-dist@latest` modern build with the current Next
version. If still broken, leave the pinning. If fixed, update three
places in lockstep — Webpack alias, `react-pdf` version, worker source
path. Full procedure in `docs/architecture/pdf-reader.md`.

## Design system: Qalem v2

### Palette (defined in `app/globals.css`)

**Light** (default; `:root` and `@theme`):
- `--color-bg` `#FAFAFA` (pure neutral, zero warmth)
- `--color-bg-elevated` `#FFFFFF`
- `--color-bg-deep` `#F4F4F4`
- `--color-fg1` `#0A0A0A` · `--color-fg2` `#404040` · `--color-fg3` `#737373`
- `--color-border` `#E5E5E5` · `--color-border-strong` `#D4D4D4`
- `--color-accent` `#B85440` (**Sienna Ink** — the single warm accent)
- `--color-accent-hover` `#9A4534` · `--color-accent-soft` `#F4E5DF`
  · `--color-accent-fg` `#FFFFFF`
- `--color-destructive` `#DC2626`

**Dark** (`.dark` scope):
- `--color-bg` `#0A0A0A` · `--color-bg-elevated` `#171717` · `--color-bg-deep` `#1F1F1F`
- `--color-fg1` `#FAFAFA` · `--color-fg2` `#A3A3A3` · `--color-fg3` `#737373`
- `--color-border` `#262626` · `--color-border-strong` `#404040`
- `--color-accent` `#D97560` · `--color-accent-hover` `#E89281`

Legacy aliases (`--color-paper-*`, `--color-cream-*`, `--color-amber`,
`--color-brass`, etc.) are mapped to the current tokens for backwards
compatibility. Don't introduce new code that uses them.

### Typography

Three Google fonts loaded via `next/font/google` in `app/[locale]/layout.tsx`:
- `Readex Pro` (300–700, bilingual) → `--font-display`, `--font-arabic-display`
- `IBM Plex Sans Arabic` (300–700) → `--font-arabic`
- `Inter` (400–700) → `--font-display` (Latin)

Type scale, line heights, and tracking tokens live in the `@theme` block
in `app/globals.css`. Don't redefine them in components.

### Spacing
- Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
- `--section-pad-y` `clamp(80px, 10vw, 128px)`
- `--section-pad-x` `clamp(20px, 4vw, 48px)`
- `--container-max` `1280px` (use the `container` utility from globals).

### Radii
`--radius-sm` 4px · `--radius-md`/`--radius` 8px · `--radius-lg`/`--radius-xl` 12px · `--radius-pill` 9999px.

### Shared UI patterns (in `globals.css`)
- `.section-eyebrow` / `.eyebrow-accent` / `.eyebrow-invitation`
- `.section-title` — canonical h2 style
- `.btn-pill` + `.btn-pill-primary|secondary|accent`
- `.link-underline`, `.link-reveal`, `.hover-shift`
- `.dropcap` — article body first-letter
- `.italic-feel` — italic-feeling Arabic emphasis
- `.skip-link` — a11y skip link, mounted in the locale layout
- `.num-latn` — Latin tabular numerals on Arabic pages
- `:focus-visible` — accent outline + offset

### Forbidden patterns

- **Hardcoded hex** anywhere outside `app/globals.css`.
- **Physical CSS properties**: `margin-left|right`, `padding-left|right`,
  `text-left|right`, `border-l|r`, `left-*|right-*`. Use logical
  properties: `ms-*` `me-*` `ps-*` `pe-*` `text-start` `text-end`
  `border-s` `border-e` `start-*` `end-*` `inset-inline-*`.
- **`framer-motion` imports** — the package is `motion`, the import is
  `motion/react`.
- **`<a href="/...">` for internal navigation**. Use `Link` from
  `@/lib/i18n/navigation`.
- **`<img>` tags**. Use `next/image`.
- **`: any` annotations or `as any` assertions**. TypeScript is strict.
- **`isRtl ? '<arabic>' : '<english>'` for content**. Use
  `t('namespace.key')`. Typographic conditionals (Arabic-Indic vs Western
  numerals) are fine; metadata-internal `isAr ? a : b` switches in
  `generateMetadata` are fine.
- **Auto-commits**. Commits are MANUAL — Claude never runs `git commit`
  or `git push` unprompted.
- **Secrets in source**. Only `.env.local` (gitignored) and
  `.env.local.example` (empty values).

## Routing

Routes live under `app/[locale]/` for the locale-aware surfaces and
`app/api/` for handlers. Public, auth, dashboard, admin are split into
route groups.

### Public (`app/[locale]/(public)/`)
`/` · `/about` · `/articles` · `/articles/[slug]` · `/books` ·
`/books/[slug]` · `/interviews` · `/interviews/[slug]` · `/events` ·
`/corporate` · `/booking` · `/booking/success` · `/contact` ·
`/checkout/success` · `/tests` · `/tests/[slug]` ·
`/tests/[slug]/result/[attemptId]` · `/gifts/send` · `/gifts/claim`

Notes:
- No `/shop` route. The product surface is `/books` (with `productType`
  BOOK or SESSION). External-store fulfillment uses the `externalUrl`
  field on a book.
- `/events` is listing only — no detail page.
- `/corporate` has an in-page anchor `#request` wired to per-card
  CTAs via the `kg:corporate:select-program` CustomEvent.
- `/booking` — see `docs/architecture/booking-domain.md`.
- `/tests` (Phase C1) — public catalog of free reflection tests. Detail
  page renders three CTA states (logged out / logged in / has attempt).
  Result page is auth-gated and 404s on cross-user attempt access.
- `/gifts/send` (Phase D) — public landing for sender-initiated paid
  gifts. Browse-able logged-out; auth required at submit. Stripe Checkout
  on submit. Gated by `gifts.allow_user_to_user` site setting.
- `/gifts/claim?token=…` (Phase D) — recipient redemption. Renders five
  states (INVALID / LOGGED_OUT / EMAIL_MISMATCH / EMAIL_VERIFICATION_PENDING
  / READY). Token is opaque (~43 chars, base64url, gen via `randomBytes(32)`).

### Focus (`app/[locale]/(focus)/`)
`/tests/[slug]/take`

A separate route group with a minimal layout (no SiteHeader/Footer) so
the take page renders its own focus-mode chrome. Auth-gated; redirects
to `/login` with the take URL preserved as `?redirect=`.

### Auth (`app/[locale]/(auth)/`)
`/login` · `/register` · `/forgot-password` · `/reset-password`

### Dashboard (`app/[locale]/(dashboard)/`)
`/dashboard` · `/dashboard/ask` · `/dashboard/library` ·
`/dashboard/library/read/[bookId]` · `/dashboard/library/session/[sessionId]` ·
`/dashboard/bookings` · `/dashboard/tests` · `/dashboard/gifts` ·
`/dashboard/settings`

Surface-specific architecture:
- `/dashboard/library/read/[bookId]` → `docs/architecture/pdf-reader.md`
- `/dashboard/library/session/[sessionId]` → `docs/architecture/session-viewer.md`
- `/dashboard/ask` → `docs/architecture/ask-dr-khaled.md`
- `/dashboard/bookings` → `docs/architecture/booking-domain.md`

### Admin (`app/[locale]/(admin)/`)
- `/admin` — overview (Recharts)
- `/admin/articles[/new][/[id]/edit]`
- `/admin/books[/new][/[id]/edit][/[id]/content]` — `/[id]/content`
  manages `session_items` for SESSION rows; gated on
  `productType === 'SESSION'`.
- `/admin/interviews[/new][/[id]/edit]`
- `/admin/events[/new][/[id]/edit]`
- `/admin/gallery[/new]` — gallery edits inline; no edit route
- `/admin/orders[/[id]]`
- `/admin/products` — combined book+session listing
- `/admin/subscribers` · `/admin/messages` · `/admin/users`
- `/admin/settings` (legacy key/value) · `/admin/settings/site` (structured toggles)
- `/admin/content` (content-blocks editor) · `/admin/media` (media library)
- `/admin/questions` — Q&A admin queue (Phase B2; see
  `docs/architecture/ask-dr-khaled.md`)
- `/admin/tests[/new][/[id]/edit][/[id]/analytics]` — Tests & Quizzes
  admin (Phase C2). List with search + status/category filters; builder
  for metadata + questions + options + correctness + explanations;
  per-test analytics with score distribution, per-question selection
  bars, and recent attempts. Sidebar gated on `admin.show_admin_tests`.
- `/admin/gifts[/new][/[id]]` — Gifts admin queue (Phase D). List with
  status/source/itemType filters + recipient-email search; admin grant
  form (no Stripe); detail view with overview/timeline/email-delivery +
  revoke modal. Sidebar entry sits in the commerce group, gated on
  `admin.show_admin_gifts`.
- `/admin/corporate` · `/admin/corporate/{programs,clients,requests}/...`
- `/admin/booking` · `/admin/booking/{tours,bookings,interest,tour-suggestions,orders}/...`
  (sidebar gated on `admin.show_admin_booking`)

### Special / framework files
- `app/[locale]/{layout,template,loading,not-found,error}.tsx`
- `app/{sitemap,robots,manifest}.ts`
- `app/opengraph-image.tsx` — dynamic OG; static `public/og.png` will
  win once added.
- `app/{icon,apple-icon}.png` — favicons (replaced legacy `.tsx`
  generators; see `scripts/gen-icons.mjs`).

### API (`app/api/`)
- `auth/[...all]` — Better Auth catch-all
- `contact` — POST, zod-validated, IP rate-limited
- `corporate/request` — POST, zod-validated, IP rate-limited; persists
  to `corporate_requests` and best-effort sends a notification email
  via `lib/email/templates/corporate-request.ts` (target inbox: env
  `CORPORATE_INBOX_EMAIL` → fallback `Team@drkhaledghattass.com`)
- `newsletter` — POST, zod-validated, IP rate-limited
- `revalidate` — bearer-token-protected (`REVALIDATE_TOKEN`)
- `checkout` — POST. Requires session (returns 401 otherwise). Real
  Stripe sessions when `STRIPE_SECRET_KEY` is set; else 503. Origin-checked.
- `stripe/webhook` — signature verification +
  `checkout.session.completed`, `checkout.session.expired`,
  `charge.refunded`, `payment_intent.payment_failed`,
  `payment_intent.succeeded`. Sends post-purchase email best-effort
  (no-op when `RESEND_API_KEY` missing). Booking-flavoured branches
  documented in `docs/architecture/booking-domain.md`. Phase D adds a
  GIFT branch to each event: idempotent gift-row creation + booking_order
  link + gift_received/gift_sent emails on completion; hold release on
  expired; markGiftRefunded on refund (with revoke emails); voidGiftForPaymentFailure
  on payment_failed.
- `content/access` — POST. Authenticated, origin-checked, ownership-gated.
  Returns `{ url, expiresAt }` from the storage adapter for an owned
  BOOK or SESSION_ITEM. Rate-limited per-user
  (`content-access:<userId>`, 10/min). `force-dynamic`.
- `reader/progress` — POST. Keepalive twin for the PDF reader's
  unmount/tab-close flush. Idempotent (`onConflictDoUpdate`).
  Rate-limited per-user (`reader-progress:<userId>`).
- `session/progress` — POST. Keepalive twin for the session viewer's
  unmount/tab-close flush. Cross-session-item-guarded. Idempotent
  (`onConflictDoUpdate` on `media_progress_user_item_idx`).
  Sticky-completion: `completed=false` never clears a previously-set
  `completedAt`. Rate-limited per-user (`session-progress:<userId>`).
- `booking/order-status` — GET. Auth-gated read used by the booking
  success page's poller while the Stripe webhook flips PENDING → PAID.
  Returns `{ status: 'PAID' | 'PENDING' | 'NOT_FOUND', orderId? }`.
  Defends user-id ownership; cross-user lookups return `NOT_FOUND`
  rather than 403 to avoid leaking session_id existence.
- `user/{profile,preferences}` — PATCH (and DELETE on profile)
- `admin/*` — all gated by `requireAdmin(req)` (origin + role):
  `articles[/id]`, `books[/id]`, `interviews[/id]`, `events[/id]`,
  `gallery[/id]`, `orders/[id]`, `users/[id]`, `settings`,
  `site-settings`, `content-blocks[/key]`, `revalidate`,
  `corporate/{programs,clients,requests}[/id]`

## API conventions

Every route handler that mutates state follows this shape:

```ts
import { requireAdmin } from '@/lib/auth/admin-guard'
import { parseJsonBody, errInternal } from '@/lib/api/errors'

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)        // origin + role
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, schema) // zod validation
  if (!body.ok) return body.response

  try {
    const row = await updateThing(id, body.data)
    return NextResponse.json({ ok: true, row })
  } catch (err) {
    console.error('[api/admin/things PATCH]', err)
    return errInternal('Could not update.')
  }
}
```

Public POSTs additionally call `tryRateLimit('<key>:<ip>')` from
`@/lib/redis/ratelimit`. The helper **fails open** — without Upstash
credentials, when the URL/token contain `dummy`, OR when the Redis call
throws at runtime, the request is allowed through. We log the error
rather than 500ing the user when the rate-limit infrastructure itself
is broken.

`tryRateLimit` accepts an optional `{ limit, window }` config; custom
configs use `rl:<limit>:<window>` Redis prefixes so existing default-prefix
limit-counters aren't reset.

Helpers in `lib/api/errors.ts`: `apiError(code, message, extras?)`,
`errInvalidJson()`, `errValidation(fieldErrors)`, `errUnauthorized()`,
`errForbidden()`, `errNotFound()`, `errConflict()`, `errRateLimited()`,
`errInternal()`, `parseJsonBody(req, schema)`.

Origin / CSRF helper: `assertSameOrigin(req)` from `lib/api/origin.ts` —
wired inside `requireAdmin(req)`. If you write a non-admin
state-changing handler, call it explicitly.

## Translations

Every user-visible string is in `messages/ar.json` and `messages/en.json`,
both with identical structure.

- `useTranslations(namespace)` in client components.
- `getTranslations({ locale, namespace })` in server components and
  route handlers.
- Add new keys at the end of their namespace; don't reorder existing
  keys (diffs become unreadable).
- When adding a key, update BOTH files in the same edit.
- Stub missing translations with `«TODO» <source>` so they're greppable.
- The `translation-syncer` agent enforces parity.

Bilingual fields in DB schemas use `*Ar` / `*En` columns (`titleAr`,
`titleEn`, `excerptAr`, `excerptEn`, etc.). Pick by `locale === 'ar'`
server-side; don't push the choice to the client.

## Site settings (structured)

Stored as a single JSON blob in `site_settings.value_json` under the
`site_config` key.
- Types + defaults: `lib/site-settings/types.ts`,
  `lib/site-settings/defaults.ts`.
- Validator: `lib/site-settings/zod.ts` — `siteSettingsPatchSchema`.
- Cached read: `lib/site-settings/get.ts` — `getCachedSiteSettings()`
  (`unstable_cache` + `React.cache`, tagged `'site-settings'`).
- Uncached read + admin write: `lib/db/queries.ts` — `getSiteSettings()`
  and `updateSiteSettings(patch)` (revalidates the cache tag).
- API: `app/api/admin/site-settings/route.ts` (GET + PATCH; gated by
  `requireAdmin(req)` and per-admin rate-limited).
- Admin UI: `/admin/settings/site` (`SiteSettingsForm`).

Toggle groups: `homepage`, `navigation` (incl. `show_nav_corporate`,
`show_nav_tests`), `footer`, `hero_ctas`, `featured`, `features`
(`auth_enabled`, `newsletter_form_enabled`, `maintenance_mode`),
`maintenance` (message + until date), `admin` (`show_admin_booking`,
`show_admin_questions`, `show_admin_tests`), `dashboard`
(`show_ask_tab`, `show_tests_tab`),
`coming_soon_pages` (incl. `'corporate'`).

**Coming Soon ≠ Hide.** Two independent concerns:
- A page in `coming_soon_pages` renders the `ComingSoon` placeholder
  instead of its content and is excluded from the sitemap. The link
  **stays** in navigation.
- A page hidden via `navigation.show_nav_*` toggles is removed from the
  nav + footer. Whether it's also coming-soon is a separate decision.

## Workflow rules

### Git
- **Manual commits only.** Claude must never run `git commit` or
  `git push` unprompted. Stage if asked.
- Branch strategy: feature branches off `main`; `claude/*` branches for
  Claude Code worktree sessions.
- Commit-message conventions: short imperative subject, often with
  `feat:` / `fix:` / `chore:` / `refactor:` prefixes (see `git log`).

### Verification before reporting done

```
npx tsc --noEmit
npm run lint
```

Run `npm run build` only when the change crosses route boundaries,
touches `next.config.ts`, `middleware`, `app/sitemap.ts`,
`app/robots.ts`, or `app/manifest.ts`. Build is slow.

**Never** ship UI claims based on screenshots, headed Playwright runs,
or visual-MCP tools. Type checking, lint, and build are the gates. If
you can't verify a UI behavior without running the dev server in front
of a human, say so explicitly rather than implying success.

### Code conventions
- Server Components by default. `'use client'` only when the file uses
  hooks, event handlers, refs, or browser APIs.
- TypeScript strict — no `any`, no `as any`, no `@ts-ignore` without a
  comment explaining why.
- Compose small components; don't prop-drill.
- Suspense boundaries for async data; `loading.tsx` for route loading.
- Reuse `requireAdmin`, `getServerSession`, `apiError`, `tryRateLimit`,
  `parseJsonBody` — don't reinvent.
- Reuse motion variants from `lib/motion/variants.ts` — don't define
  new cubic-beziers or duration constants in components.
- Use the unified data layer (`lib/db/queries.ts`) — never import
  `lib/placeholder-data.ts` directly outside that file.

### File organization

- `app/` — routes (Next.js App Router).
- `components/admin/` — admin-only components (incl. `SiteSettingsForm`,
  the corporate suite, `SessionContentEditor`, the booking suite). The
  shared `StatusBadge` accepts optional `tone` and `label` overrides
  for non-status enums (e.g. session-item types).
- `components/auth/` — login/signup/forgot/reset forms,
  `AuthRequiredDialog`, `AuthAside`.
- `components/booking/` — public `/booking` page (Phase A1).
- `components/corporate/` — public `/corporate` sections.
- `components/dashboard/` — dashboard-only components, including the
  Phase-1 `ContentPlaceholder` (legacy empty-state primitive — Phase 2
  replaced the read placeholder, Phase 4 replaced the session
  placeholder; the file is kept as a small empty-state primitive for
  future "owned but not ready" shells).
- `components/dashboard/ask/` — Q&A user-facing surface (Phase B1).
- `components/admin/questions/` — Q&A admin queue (Phase B2).
- `components/admin/tests/` — Tests & Quizzes admin (Phase C2). Test
  builder + analytics view; reuses the C1 query helpers and extends them
  with admin-side CRUD + aggregate query plans. Mock-store layered on
  top of `placeholderTests` so admin CRUD is end-to-end testable in
  mock-auth dev mode.
- `components/layout/` — site chrome: `SiteHeader` (with mobile
  hamburger), `SiteFooter`, `MobileMenu`, `LocaleSwitcher`, `ThemeToggle`,
  `AuthMenu`, `UserMenuDropdown`, `AppLoader`, `LoadingSequence`,
  `MaintenanceBanner`. `BottomNav.tsx` exists but is no longer imported
  — the hamburger in `SiteHeader` opens `MobileMenu` directly on mobile.
- `components/library/` — Phase-2 PDF reader (see
  `docs/architecture/pdf-reader.md`).
- `components/library/session/` — Phase-4 session viewer (see
  `docs/architecture/session-viewer.md`).
- `components/motion/` — motion-specific reusable components.
- `components/sections/` — homepage and listing-page sections, plus
  `BookBuyButton` (purchase trigger; gated on session via `useSession`).
- `components/seo/` — JSON-LD components.
- `components/ui/` — Base UI / shadcn primitives. `dialog.tsx` and
  `alert-dialog.tsx` are Qalem-skinned: real backdrop scrim, `border` +
  `shadow-lift` instead of a thin ring, `text-start` (logical), 18px
  bold title, `max-w-[560px]`, simple footer.
- `components/{shared,forms,providers}/` — small utilities.
- `lib/` — business logic (auth, db, motion, redis, email, validators,
  i18n, api, seo, stripe, site-settings, storage, video, hooks).
- `lib/storage/` — Phase-1 storage abstraction. `index.ts` exports a
  single `storage: StorageAdapter` that every signed-URL caller uses.
  `mock-adapter.ts` is the dev placeholder; the real adapter (Vercel
  Blob / R2 / Cloudflare Stream — pending Dr. Khaled's storage
  decision) drops in by editing the single import in
  `lib/storage/index.ts`. Nothing else moves.
- `lib/video/` — Phase-4 video provider abstraction (mirrors storage).
  `youtube-adapter.ts` is today's default; production swaps by adding
  a sibling adapter + sibling player component (see
  `docs/architecture/session-viewer.md`).
- `lib/email/` — Resend wrapper. `index.ts` exports `getResend()`
  (returns `null` and warns once when `RESEND_API_KEY` is missing —
  never throws at module load). `send.ts` is the canonical send wrapper;
  templates live in `lib/email/templates/`.
- `lib/db/queries.ts` — unified data layer. All `MOCK_AUTH_ENABLED`-
  first → `HAS_DB`-second helpers branch the same way: try mock-store,
  fall back to in-memory Map, then Drizzle. Drizzle paths are wrapped
  in try/catch so a not-yet-applied migration silently degrades.
- `lib/db/mock-store.ts` — JSON-backed dev persistence for reading
  progress, bookmarks, sessionItems, and media progress. File:
  `.next/cache/reader-mock-store.json`. Mock user ids ('1', '2', '3')
  aren't UUIDs and can't be inserted into the real progress / bookmarks
  tables — this file is the dev substitute.
- `messages/` — i18n JSON. Top-level namespaces include `library.*`
  (Phase 1), `reader.*` (Phase 2), `corporate.*` (Phase 3),
  `session.*` (Phase 4), and the Phase B1/B2 `dashboard.ask.*` +
  `admin.questions.*`.
- `public/` — static assets. `public/placeholder-content/` is the
  Phase-1 mock storage sandbox (gitignored content; tracked README).
  Phase 2 added `public/pdf.worker.min.mjs`, `public/cmaps/`,
  `public/standard_fonts/` — version-pinned to bundled `pdfjs-dist`.
- `scripts/` — dev tooling: `dev.mjs`, `build.mjs`, `seed.ts`,
  `gen-icons.mjs`, `promote-admin.mjs`, `reset-db.mjs`, `verify-db.mjs`,
  `fix-external-urls.mjs`, `visual-check.mjs`, `copy-pdf-assets.mjs`.

## Auth & mock mode

- `lib/auth/mock.ts` — `getMockSession()` returns the active mock user
  when `MOCK_AUTH_ENABLED` is true. Mock auth is **opt-in** in dev: set
  `MOCK_AUTH=true` (or `NEXT_PUBLIC_MOCK_AUTH=true`) in `.env.local` to
  enable. Default OFF. `NODE_ENV === 'production'` **hard-disables** it;
  `getMockSession()` throws if invoked in production at all (defense-
  in-depth against env-misconfiguration privilege escalation —
  SECURITY [C-2]).
- Mock users: `id 1` admin@drkhaledghattass.com (Kamal, ADMIN),
  `id 2` khaled@drkhaledghattass.com (Dr. Khaled, CLIENT),
  `id 3` user@example.com (test USER). Active mock user is
  `MOCK_ACTIVE_USER_ID = '1'` (ADMIN — that's why mock-in-prod is fatal).
- Promotion script:
  `node --env-file=.env.local scripts/promote-admin.mjs <email> ADMIN|CLIENT`.

Two gates work together:
- `MOCK_AUTH_ENABLED` (computed in `mock.ts`) — gates fake sessions.
- **`features.auth_enabled`** (DB-backed via `site_settings.value_json`,
  read through `getCachedSiteSettings`) — runtime gate for the
  public-nav Sign In UI. The env flag `NEXT_PUBLIC_AUTH_ENABLED` is
  the build-time fallback for callers that don't pass the runtime
  setting.

Behavior matrix (using the runtime `auth_enabled`; `MOCK_AUTH_ENABLED`
is dev-only):

| `auth_enabled` | `MOCK_AUTH_ENABLED` | Result |
| --- | --- | --- |
| false | true  | Public nav hides auth links. Admin/dashboard protected by mock. (Dev with `MOCK_AUTH=true`.) |
| true  | true  | Public nav shows auth. Mock session active. (Dev demo mode.) |
| true  | false | Public nav shows auth. Real Better Auth. (Production — mock can't run here.) |
| false | false | Public nav hides auth. Routes return 401. (Maintenance / default dev with no opt-in.) |

> Mock-mode caveat: in dev with `MOCK_AUTH_ENABLED=true`, server-side
> `getServerSession()` returns the mock user, but client-side
> `authClient.useSession()` queries Better Auth's real endpoint and
> sees no session. If you're testing purchase gating, leave mock off
> (the default).

## Real content status

Maintained in `CONTENT-NEEDED.md` (single source of truth — track gaps
there, not here). Real assets live in `public/` (`dr khaled photo.jpeg`,
`Paid books/`, `Paid sessions/`, logos, PWA icons).

Real contact: `Team@drkhaledghattass.com` · `+961 3 579 666` · مكتبة
خالد غطاس — برجا، لبنان.

## Environment variables

Full reference in `.env.local.example`. Required for production:

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32`. **Required at build & runtime in production** — server throws at module load if missing (SECURITY [C-1]). |
| `BETTER_AUTH_URL` | Production origin |
| `NEXT_PUBLIC_APP_URL` | Production origin (for metadata, sitemap, OG) |
| `REVALIDATE_TOKEN` | `openssl rand -hex 32` |

Optional / feature-gated:

| Var | Purpose |
| --- | --- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Phase 6 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `RESEND_API_KEY` | Transactional email |
| `EMAIL_FROM` | Resend sender address. **Auto-selected** when unset: Vercel preview/dev → `onboarding@resend.dev` (Resend sandbox, zero DNS, delivers only to the Resend account owner). Vercel production → `noreply@drkhaledghattass.com` (requires domain verified in Resend with SPF/DKIM/DMARC). Set explicitly to override in any environment. Logic lives in `resolveFromAddress` in `lib/email/send.ts`. |
| `EMAIL_FORCE_SEND` | Dev-only `'true'` flag that forces real Resend sends outside production (overrides the dev-preview short-circuit in `lib/email/send.ts`). Do NOT set in production. |
| `CORPORATE_INBOX_EMAIL` | Inbox for `/api/corporate/request` notifications. Falls back to `Team@drkhaledghattass.com`. Production should set explicitly. |
| `SUPPORT_EMAIL` | Footer support address on transactional emails (post-purchase, question-answered). Falls back to `Team@drkhaledghattass.com`. Distinct from `CORPORATE_INBOX_EMAIL` — that's an inbound recipient; this is an outbound footer address. Production should set explicitly. |
| `UPLOADTHING_TOKEN` | Image upload pipeline (Phase 5D) |
| `GOOGLE_SITE_VERIFICATION` | Search Console (consumed in `app/[locale]/layout.tsx`) |
| `CRON_SECRET` | Phase D — Bearer token for `app/api/cron/expire-gifts/route.ts`. Vercel-scheduled invocations send `Authorization: Bearer $CRON_SECRET` automatically when this env var is set, and the same check rejects external probes. Generate with `openssl rand -hex 32`. **Production must set this** so the cron itself runs (without it, every request 401s). Cron schedule defined in `vercel.json`. |

Runtime flags (string-equality `'true'` / `'false'`):

| Var | Effect |
| --- | --- |
| `NEXT_PUBLIC_AUTH_ENABLED` | Build-time fallback for the auth UI gate. The runtime gate is `features.auth_enabled` in the structured site settings. |
| `MOCK_AUTH` + `NEXT_PUBLIC_MOCK_AUTH` | Either set to `'true'` to opt into mock auth (dev only — hard-disabled in production). Default OFF. |

`HAS_DB` is **not** an env var. It's auto-detected from `DATABASE_URL`
inside `lib/db/queries.ts`.

## Agent team

Eight project-scoped subagents live in `.claude/agents/`:

| Agent | Reads | Writes | When |
| --- | :-: | :-: | --- |
| `design-auditor` | ✓ |   | Pre-merge UI audit; Qalem v2 compliance |
| `code-reviewer` | ✓ |   | Pre-PR review |
| `qalem-implementer` | ✓ | ✓ | Build features in Qalem v2 |
| `translation-syncer` | ✓ | ✓ (json) | i18n parity |
| `security-auditor` | ✓ |   | Pre-launch / Phase 6 |
| `content-swapper` | ✓ | ✓ (data) | New real content arrives |
| `seo-checker` | ✓ |   | Pre-launch / new public route |
| `accessibility-checker` | ✓ |   | Pre-launch / new UI surface |

Verify they're discovered: `claude agents`. Auditor agents are
intentionally read-only — they report; the implementer fixes. Full docs
in `.claude/agents/README.md`.

## Path to launch

1. Provision Neon, generate `BETTER_AUTH_SECRET` + `REVALIDATE_TOKEN`,
   populate `.env.local` (production values go on Vercel).
2. Apply migrations to Neon (`npm run db:migrate`); seed if desired.
3. Confirm mock auth is OFF in production env (the default — leave
   `MOCK_AUTH` unset). Even with `MOCK_AUTH=true`,
   `NODE_ENV === 'production'` blocks it. Enable real auth UI
   (`NEXT_PUBLIC_AUTH_ENABLED=true`).
4. Promote admin and CLIENT users via `scripts/promote-admin.mjs`.
5. Get pending content from Dr. Khaled (interviews, articles, OG,
   favicon — see `CONTENT-NEEDED.md`).
6. Run the agent team: `security-auditor`, `seo-checker`,
   `accessibility-checker`, `code-reviewer`. Resolve all critical/high.
7. Deploy to Vercel preview. Send URL to Dr. Khaled. Iterate.
8. Production deploy + DNS.

Estimated 1–2 weeks calendar time, mostly waiting on content +
credentials. Full readiness checklist: `LAUNCH-CHECKLIST.md`.
