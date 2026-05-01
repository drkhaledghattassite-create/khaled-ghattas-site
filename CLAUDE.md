# CLAUDE.md — drkhaledghattass.com

Welcome. Read this fully before any work in this repo. It is the single source
of truth for project conventions. Code is the source of truth for everything
else; when this file and code disagree, trust the code and update this file.

## Project overview

`drkhaledghattass.com` is the bilingual editorial site for Dr. Khaled Ghattass
— Lebanese cell biologist, author, lecturer, and founder of «الورشة»
(Al-Warsheh / Workshop) initiative (founded 2020-07-11 in Burja, Lebanon;
Khaled Ghattass Library opened 2023). The site showcases his books, articles,
interviews, and events to a primarily Arab-speaking, primarily mobile audience.

Tour 2025-2026 theme: «بين الغريب والسائد.. لقاء عن الحب والحياة».

This is a paid freelance project. Lead developer: Kamal Chhimi.

Primary locale: Arabic (RTL) at `/`.
Secondary locale: English (LTR) at `/en/`.

## Current status

No release tags exist yet. Recent commits (most recent first):

- `2586036` — unified loader on every transition, admin auth-toggle visibility,
  mobile top-nav (bottom nav removed), purchase-blocked-without-login flow
- `7c060ca` — side-nav polish, navigation transitions on mobile
- `3e75c2d` — agents created, scroll animation polish
- `4551122` — design fixes, login/signup flow, removed old-URL checkout redirect
- `30408bf` — Qalem v2 implementation: editorial hero, folio articles, store
  carousel, dashboard, auth
- `fdb5712` — Qalem design system handoff from Claude Design
- `6ede3e7` — Tailwind v4 migration + dark mode + section restructure
- `21a319e` — Step 2.5 UX (locale switcher, auth menu, Store rename)
- `bcb3108` — Phase 5: full admin panel with mock auth
- `8e27f90` — Phase 4A: Drizzle schema, migrations, unified query layer

What works in dev:
- All public + auth + dashboard + admin routes render under both locales
  (Arabic at `/`, English at `/en`).
- Mock auth lets you impersonate `ADMIN`, `CLIENT`, or `USER` without a DB.
  Toggled OFF in `.env.local` once real Better Auth is configured.
- Without `DATABASE_URL`, all data reads fall back to `lib/placeholder-data.ts`.
- Admin CRUD UIs are live for articles, books, interviews, events, gallery,
  orders, users, settings, content-blocks. The structured site-settings
  toggle panel lives at `/admin/settings/site`.
- Purchase flow is gated client-side (via `useSession`) AND server-side
  (`/api/checkout` returns 401 without a session). Unauthenticated buy
  attempts open `AuthRequiredDialog`, which sends users to
  `/login?redirect=<original-path>` and bounces them back after sign-in.

What's stubbed:
- Stripe checkout: route requires session and creates real Stripe sessions
  when `STRIPE_SECRET_KEY` is set; otherwise returns 503 "coming soon".
  Webhook validates signatures but does not yet write `orders` rows.
- Image upload pipeline (Uploadthing not wired; admin forms accept URL strings).
- Markdown article body parser (paragraphs split by `\n` for now).
- Site-wide search.

See `LAUNCH-CHECKLIST.md` and `TODO.md` for the full pending list.

## Stack

### Core
- Next.js **15** (App Router; Server Components default; async `params`/`searchParams`).
- TypeScript strict — `any` is forbidden.
- React 19.
- Tailwind v4 with `@theme inline { ... }` tokens in `app/globals.css`.

### Data
- Drizzle ORM (`drizzle-orm@^0.45`).
- Neon Postgres (serverless).
- Schema in `lib/db/schema.ts`. **15 tables**: `users`, `sessions`, `accounts`,
  `verifications`, `articles`, `books`, `interviews`, `gallery`, `events`,
  `orders`, `orderItems`, `subscribers`, `contactMessages`, `siteSettings`,
  `contentBlocks`. **8 enums**: `userRole` (USER/ADMIN/CLIENT), `contentStatus`
  (DRAFT/PUBLISHED/ARCHIVED), `orderStatus` (PENDING/PAID/FULFILLED/REFUNDED/
  FAILED), `messageStatus` (UNREAD/READ/ARCHIVED), `subscriberStatus` (ACTIVE/
  UNSUBSCRIBED/BOUNCED), `eventStatus` (UPCOMING/PAST/CANCELLED),
  `articleCategory` (PHILOSOPHY/PSYCHOLOGY/SOCIETY/POLITICS/CULTURE/OTHER),
  `productType` (BOOK/SESSION).
- Migrations in `lib/db/migrations/`. **Four** migrations exist:
  `0000_blue_adam_warlock.sql`, `0001_remarkable_toad_men.sql`,
  `0002_flippant_luke_cage.sql`, `0003_cold_scream.sql` (the last adds the
  `value_json` jsonb column on `site_settings` for the structured-settings
  blob). Apply with `npm run db:migrate`.
- **Unified data layer**: `lib/db/queries.ts` is the single import point. It
  uses Drizzle when `DATABASE_URL` is set to a real Neon URL, and falls back
  to `lib/placeholder-data.ts` when the URL is empty or contains `dummy`.
  This is auto-detected — there is **no `HAS_DB` env flag**, only the
  `HAS_DB` constant inside `queries.ts`.

### Site settings (structured)

Stored as a single JSON blob in `site_settings.value_json` under the
`site_config` key. Read/write through:
- `lib/site-settings/types.ts` — `SiteSettings` shape + `COMING_SOON_PAGES`.
- `lib/site-settings/defaults.ts` — `DEFAULT_SETTINGS`, `mergeSettings`,
  `coerceSettings`.
- `lib/site-settings/zod.ts` — `siteSettingsPatchSchema` for the admin PATCH.
- `lib/site-settings/get.ts` — `getCachedSiteSettings()`: `unstable_cache`
  + `React.cache` wrapper. Tagged `'site-settings'`. Pages should use this.
- `lib/db/queries.ts` — `getSiteSettings()` (uncached) and
  `updateSiteSettings(patch)` (admin-only path; revalidates the cache tag).
- API: `app/api/admin/site-settings/route.ts` — `GET` + `PATCH`, gated by
  `requireAdmin(req)` and per-admin rate-limited.
- Admin UI: `/admin/settings/site` (`SiteSettingsForm`).

Toggle groups: `homepage`, `navigation`, `footer`, `hero_ctas`, `featured`,
`features` (auth_enabled, newsletter_form_enabled, maintenance_mode),
`maintenance` (message + until date), `coming_soon_pages`.

**Coming Soon ≠ Hide.** Two independent concerns:
- A page in `coming_soon_pages` renders the `ComingSoon` placeholder instead
  of its content and is excluded from the sitemap. The link **stays** in
  navigation.
- A page hidden via `navigation.show_nav_*` toggles is removed from the nav
  + footer. Whether it's also coming-soon is a separate decision.

### Auth
- Better Auth (`better-auth@^1.6`).
- Auth route catch-all: `app/api/auth/[...all]/route.ts`.
- `lib/auth/index.ts` configures Better Auth. Session timing:
  - `expiresIn: 30 days` (absolute lifetime)
  - `updateAge: 24 hours` (sliding refresh — active users effectively stay
    logged in indefinitely)
- `lib/auth/server.ts` exposes `getServerSession()` (mock-aware).
- `lib/auth/client.ts` exposes `authClient`, `signIn`, `signUp`, `signOut`,
  `useSession` for client components.
- `lib/auth/admin-guard.ts` exposes `requireAdmin(req)` — runs origin check
  via `assertSameOrigin` + role check.
- `lib/auth/redirect.ts` — `safeRedirect(raw)` and `withRedirect(href, target)`
  for the post-login redirect-back flow. Rejects `//host`, `/\evil`, and
  embedded schemes (`/javascript:…`).
- `components/auth/AuthRequiredDialog.tsx` — reusable login-required prompt
  used by purchase-gated actions. Sends users to
  `/login?redirect=<encoded path>`; the auth forms read this param and
  bounce the user back after a successful sign-in. The chain is preserved
  across login ↔ register, login ↔ forgot, reset → login, and Google OAuth
  via `callbackURL`.
- **Mock auth** lives in `lib/auth/mock.ts`. Toggled by env:
  `MOCK_AUTH=false` AND `NEXT_PUBLIC_MOCK_AUTH=false` — both must be the
  literal string `"false"` to disable mock mode. Default in dev is ON.
- Mock users: `id 1` admin@drkhaledghattass.com (Kamal, ADMIN),
  `id 2` khaled@drkhaledghattass.com (Dr. Khaled, CLIENT),
  `id 3` user@example.com (test user). Active mock user is
  `MOCK_ACTIVE_USER_ID = '1'`.
- Public auth-UI gate: two-layered. `settings.features.auth_enabled` (DB,
  per-deployment) is the runtime gate read by `AuthMenu`; the env flag
  `NEXT_PUBLIC_AUTH_ENABLED === 'true'` is the build-time fallback for
  callers that don't pass the runtime setting.
- Three roles, three meanings:
  - `USER` — buyer / reader, has `/dashboard`.
  - `ADMIN` — full content + settings access at `/admin`.
  - `CLIENT` — Dr. Khaled's read-only financial / analytics view (planned).

### i18n
- `next-intl@^4.9`.
- Routing in `lib/i18n/routing.ts`: `locales: ['ar', 'en']`,
  `defaultLocale: 'ar'`, `localePrefix: 'as-needed'`,
  `localeDetection: false`. Arabic at `/`; English at `/en/`.
- `messages/ar.json` and `messages/en.json` MUST have identical structure —
  same key paths, same nesting. Enforced by the `translation-syncer` agent.

### Motion
- `motion/react@^12.38`. **Never** `framer-motion` — it's a different package.
- Reusable variants live in `lib/motion/variants.ts`:
  - Easings: `EASE_EDITORIAL` `(0.16, 1, 0.3, 1)`, `EASE_REVEAL` `(0.22, 1, 0.36, 1)`,
    `EASE_DRAMATIC` `(0.65, 0, 0.35, 1)`, `EASE_STAGGER` `(0.4, 0, 0.2, 1)`.
  - Variants: `fadeUp`, `fadeUpBidirectional`, `blurReveal`,
    `blurRevealBidirectional`, `fadeIn`, `staggerContainer`, `staggerItem`,
    `slideInStart`, `slideInEnd`, `scaleIn`, `maskRevealUp`, `maskRevealDown`.
  - Helpers: `fadeUpDelayed(delay)`, `staggerContainerWith(stagger, delay)`,
    `VIEWPORT_DEFAULT`, `VIEWPORT_BIDIRECTIONAL`.
- Hooks in `lib/motion/hooks.ts`: `useReducedMotion`, `useIsMobile`,
  `useIsTouchDevice`, `useScrollReveal`, `useScrollVelocity`,
  `useScrollProgress`.
- Motion components in `components/motion/`: `AnimatedText`, `CountUp`,
  `CustomCursor`, `FocusModeToggle`, `PageTransition`, `ProximityPrefetch`,
  `PullQuote`, `ReadingProgress`, `ScrollReveal`, `ScrollRevealLine`,
  `SectionBackgroundCrossfade`, `Tilt3D`, `ViewTransitionsRouter`.
- `ViewTransitionsRouter` is a global capture-phase anchor-click interceptor
  that wraps internal navigation in `document.startViewTransition`. It
  `preventDefault`s the link click and pushes via the App-Router. **It does
  NOT `stopPropagation`** — React's bubble-phase delegation must still fire
  so user-attached `onClick` handlers (e.g. closing a mobile drawer when one
  of its links is tapped) work. Don't add `stopPropagation` here.
- `AppLoader` (in `components/layout/`) is the unified app-wide loader. It
  shows a sequenced splash on first load (sessionStorage-gated) and a brief
  logo overlay on subsequent navigations. It listens for both anchor clicks
  (capture phase) and a custom `kg:loader:show` event so non-link
  navigations (e.g. post-login `router.push`) can also trigger it.

### Other deps
- `lenis@^1.3` — smooth scroll (`components/providers/LenisProvider.tsx`).
- `@upstash/ratelimit` + `@upstash/redis` — rate limiting (`lib/redis/`).
- `resend@^6.12` — transactional email (`lib/email/index.ts`).
- `stripe@^22` + `@stripe/stripe-js` — checkout (Phase 6).
- `next-themes@^0.4` — dark mode toggle.
- `@base-ui/react` + `@radix-ui/*` + `shadcn` — primitives (`components/ui/*`).
- `react-hook-form` + `@hookform/resolvers` + `zod@^4.3` — forms.
- `@tanstack/react-table@^8` — admin tables.
- `recharts@^3` — admin dashboard charts.
- `lucide-react` — icons.
- `date-fns@^4` — dates.
- `react-day-picker@^9` — date pickers.
- `sonner@^2` — toasts.
- `playwright@^1.56` — devDep only (used by `scripts/visual-check.mjs`).
- Deploy target: **Netlify**.

## Design system: Qalem v2

### Palette (defined in `app/globals.css`)

**Light** (default; `:root` and `@theme`):
- `--color-bg` `#FAFAFA` (pure neutral, zero warmth)
- `--color-bg-elevated` `#FFFFFF`
- `--color-bg-deep` `#F4F4F4`
- `--color-fg1` `#0A0A0A`
- `--color-fg2` `#404040`
- `--color-fg3` `#737373`
- `--color-border` `#E5E5E5`
- `--color-border-strong` `#D4D4D4`
- `--color-accent` `#B85440` (**Sienna Ink** — the single warm accent)
- `--color-accent-hover` `#9A4534`
- `--color-accent-soft` `#F4E5DF`
- `--color-accent-fg` `#FFFFFF`
- `--color-destructive` `#DC2626`

**Dark** (`.dark` scope):
- `--color-bg` `#0A0A0A`
- `--color-bg-elevated` `#171717`
- `--color-bg-deep` `#1F1F1F`
- `--color-fg1` `#FAFAFA`
- `--color-fg2` `#A3A3A3`
- `--color-fg3` `#737373`
- `--color-border` `#262626`
- `--color-border-strong` `#404040`
- `--color-accent` `#D97560`
- `--color-accent-hover` `#E89281`

A pile of legacy aliases (`--color-paper-*`, `--color-cream-*`,
`--color-amber`, `--color-brass`, etc.) are mapped to the current tokens for
backwards compatibility. Don't introduce new code that uses them — use the
canonical names above.

### Typography

Three Google fonts loaded via `next/font/google` in `app/[locale]/layout.tsx`:
- `Readex Pro` (300–700, bilingual) → `--font-display` and `--font-arabic-display`. Display / hero / stats.
- `IBM Plex Sans Arabic` (300–700) → `--font-arabic`. Arabic body / UI.
- `Inter` (400–700) → `--font-display` (also). Latin body / UI.

> Note: the legacy CLAUDE.md mentioned Noto Naskh Arabic / Instrument Serif /
> Oswald — those are NOT used. Trust the code.

### Type scale (`@theme`)
- `--text-monumental` `clamp(72px, 16vw, 220px)`
- `--text-hero` `clamp(40px, 7vw, 72px)`
- `--text-display` `clamp(40px, 7vw, 72px)`
- `--text-h1` `clamp(32px, 5vw, 56px)`
- `--text-h2` `clamp(28px, 4vw, 44px)`
- `--text-h3` `clamp(20px, 2.5vw, 28px)`
- `--text-stat` `clamp(64px, 9vw, 88px)`
- `--text-lead` `18px`
- `--text-body` `16px` (Latin)
- `--text-body-ar` `17px` (Arabic — slightly larger to match optical size)
- `--text-small` `14px`
- `--text-eyebrow` `13px`
- `--text-label` `11.5px`

Line heights: `--leading-display` `1.1`, `--leading-heading` `1.15`,
`--leading-body` `1.6`, `--leading-arabic-body` `1.85`.
Tracking: `--tracking-display` `-0.02em`, `--tracking-label` `0.12em`.

### Spacing
- Scale: `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128`.
- `--section-pad-y` `clamp(80px, 10vw, 128px)`
- `--section-pad-x` `clamp(20px, 4vw, 48px)`
- `--container-max` `1280px` (use the `container` utility from globals).

### Radii
`--radius-sm` `4px` · `--radius-md`/`--radius` `8px` · `--radius-lg`/`--radius-xl` `12px` · `--radius-pill` `9999px`.

### Motion tokens
- `--ease-editorial` `cubic-bezier(0.16, 1, 0.3, 1)`
- `--ease-reveal` `cubic-bezier(0.22, 1, 0.36, 1)`
- `--ease-dramatic` `cubic-bezier(0.65, 0, 0.35, 1)`
- `--ease-stagger` `cubic-bezier(0.4, 0, 0.2, 1)`
- Durations: `--motion-fast` 200ms · `--motion-base` 400ms · `--motion-medium` 600ms · `--motion-slow` 800ms · `--motion-cinematic` 1200ms.
- Legacy compat: `--dur-fast` 180ms · `--dur-base` 240ms · `--dur-slow` 400ms.

### Shared UI patterns (in `globals.css`)
- `.section-eyebrow` / `.eyebrow-accent` / `.eyebrow-invitation` — the three
  eyebrow styles.
- `.section-title` — the canonical h2 style for sections.
- `.btn-pill` + `.btn-pill-primary|secondary|accent` — pill buttons.
- `.link-underline`, `.link-reveal`, `.hover-shift` — link / row affordances.
- `.dropcap` — article body first-letter style.
- `.italic-feel` — italic-feeling Arabic emphasis (Arabic has no italics).
- `.skip-link` — accessibility skip link, mounted in the locale layout.
- `.num-latn` — Latin tabular numerals on Arabic pages.
- `:focus-visible` — accent outline + offset.

### Forbidden patterns

- Hardcoded hex anywhere outside `app/globals.css`.
- `margin-left|right`, `padding-left|right`, `text-left|right`,
  `border-l|r`, `left-*|right-*`. Use logical properties:
  `ms-*` `me-*` `ps-*` `pe-*` `text-start` `text-end` `border-s` `border-e`
  `start-*` `end-*` `inset-inline-*`.
- `framer-motion` imports (the package is `motion`, the import is `motion/react`).
- `<a href="/...">` for internal navigation. Use `Link` from
  `@/lib/i18n/navigation`.
- `<img>` tags. Use `next/image`.
- `: any` annotations or `as any` assertions. TypeScript is strict.
- `isRtl ? '<arabic-string>' : '<english-string>'` for content. Use
  `t('namespace.key')`. (Typographic conditionals like Arabic-Indic vs
  Western numerals are fine; metadata-internal `isAr ? a : b` switches in
  `generateMetadata` are fine.)
- Auto-commits. Commits are MANUAL — Claude never runs `git commit` or
  `git push` unprompted.
- Secrets in source. Only `.env.local` (gitignored) and `.env.local.example`
  (empty values).

## Routing

### Public routes (`app/[locale]/(public)/`)
- `/` — homepage (Hero, AboutTeaser, StoreShowcase, ArticlesList, InterviewRotator, Newsletter)
- `/about`
- `/articles` — listing
- `/articles/[slug]` — detail
- `/books` — listing
- `/books/[slug]` — detail
- `/interviews` — listing
- `/interviews/[slug]` — detail
- `/events` — listing only (no detail page yet)
- `/contact`
- `/checkout/success`

> No `/shop` route. The product surface is `/books` (with `productType: BOOK`
> or `SESSION`). External-store fulfillment uses the `externalUrl` field on
> a book.

### Auth (`app/[locale]/(auth)/`)
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

### Dashboard (`app/[locale]/(dashboard)/`)
- `/dashboard` — account view
- `/dashboard/library` — purchased content
- `/dashboard/settings`

### Admin (`app/[locale]/(admin)/`)
- `/admin` — overview with charts (Recharts)
- `/admin/articles` · `/admin/articles/new` · `/admin/articles/[id]/edit`
- `/admin/books` · `/admin/books/new` · `/admin/books/[id]/edit`
- `/admin/interviews` · `/admin/interviews/new` · `/admin/interviews/[id]/edit`
- `/admin/events` · `/admin/events/new` · `/admin/events/[id]/edit`
- `/admin/gallery` · `/admin/gallery/new` (no edit page yet — gallery edits inline)
- `/admin/orders` · `/admin/orders/[id]`
- `/admin/products` (combined book+session listing)
- `/admin/subscribers`
- `/admin/messages`
- `/admin/users`
- `/admin/settings` (legacy key/value page)
- `/admin/settings/site` (structured toggles — homepage, navigation, footer,
  hero CTAs, featured items, features, maintenance, coming-soon pages)
- `/admin/content` (content-blocks editor)
- `/admin/media` (media library)

### Special / framework files
- `app/[locale]/layout.tsx` — locale root, fonts, providers, Toaster, JSON-LD,
  metadata defaults.
- `app/[locale]/template.tsx` — page-transition shell (motion).
- `app/[locale]/loading.tsx` — `LoadingSequence` route loading state.
- `app/[locale]/not-found.tsx` and `app/[locale]/error.tsx`.
- `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`.
- `app/opengraph-image.tsx` — dynamic OG; static `public/og.png` will win once added.
- `app/icon.png` and `app/apple-icon.png` — favicons (the legacy `.tsx`
  generators were replaced with real PNGs; see `scripts/gen-icons.mjs`).

### API (`app/api/`)
- `auth/[...all]` — Better Auth catch-all.
- `contact` — POST, zod-validated, IP rate-limited.
- `newsletter` — POST, zod-validated, IP rate-limited.
- `revalidate` — bearer-token-protected (`REVALIDATE_TOKEN`).
- `checkout` — POST. Requires session (returns 401 otherwise). Creates a
  Stripe Checkout session when `STRIPE_SECRET_KEY` is set; returns 503
  ("coming soon") otherwise. Origin-checked.
- `stripe/webhook` — signature verification implemented; event handling pending.
- `user/profile` — PATCH, DELETE (account self-edit / self-delete).
- `user/preferences` — PATCH.
- `admin/articles[/id]`, `admin/books[/id]`, `admin/interviews[/id]`,
  `admin/events[/id]`, `admin/gallery[/id]`, `admin/orders/[id]`,
  `admin/users/[id]`, `admin/settings`, `admin/site-settings` (structured),
  `admin/content-blocks[/key]`, `admin/revalidate` — all gated by
  `requireAdmin(req)` (origin + role).

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
throws at runtime, the request is allowed through. We log the error rather
than 500ing the user when the rate-limit infrastructure itself is broken.

Helpers in `lib/api/errors.ts`: `apiError(code, message, extras?)`,
`errInvalidJson()`, `errValidation(fieldErrors)`, `errUnauthorized()`,
`errForbidden()`, `errNotFound()`, `errConflict()`, `errRateLimited()`,
`errInternal()`, `parseJsonBody(req, schema)`.

Origin / CSRF helper: `assertSameOrigin(req)` from `lib/api/origin.ts` — wired
inside `requireAdmin(req)`. If you write a non-admin state-changing handler,
call it explicitly.

## Translations

Every user-visible string is in `messages/ar.json` and `messages/en.json`.
Both files have identical structure. Conventions:

- `useTranslations(namespace)` in client components.
- `getTranslations({ locale, namespace })` in server components and route
  handlers.
- Add new keys at the end of their namespace; don't reorder existing keys —
  diffs become unreadable.
- When adding a key, update BOTH files in the same edit.
- Stub missing translations with `«TODO» <source>` so they're greppable.
- The `translation-syncer` agent enforces parity.

Bilingual fields in DB schemas use `*Ar` / `*En` columns (`titleAr`, `titleEn`,
`excerptAr`, `excerptEn`, etc.). Pick by `locale === 'ar'` server-side; don't
push the choice to the client.

## Workflow rules

### Git
- **Manual commits only.** Claude must never run `git commit` or `git push`
  unprompted. Stage if asked.
- Branch strategy: work on feature branches off `main`; `claude/*` branches for
  Claude Code worktree sessions.
- Commit-message conventions in this repo: short imperative subject, often with
  `feat:` / `fix:` / `chore:` / `refactor:` prefixes (see `git log`).

### Verification before reporting done
Always:
```
npx tsc --noEmit
npm run lint
```
Run `npm run build` only when the change crosses route boundaries, touches
`next.config.ts`, `middleware`, `app/sitemap.ts`, `app/robots.ts`, or
`app/manifest.ts`. Build is slow.

**Never** ship UI claims based on screenshots, headed Playwright runs, or
visual-MCP tools. Type checking, lint, and build are the gates. If you can't
verify a UI behavior without running the dev server in front of a human, say
so explicitly rather than implying success.

### Code conventions
- Server Components by default. `'use client'` only when the file uses hooks,
  event handlers, refs, or browser APIs.
- TypeScript strict — no `any`, no `as any`, no `@ts-ignore` without a comment
  explaining why.
- Compose small components; don't prop-drill.
- Suspense boundaries for async data; `loading.tsx` for route loading.
- Reuse `requireAdmin`, `getServerSession`, `apiError`, `tryRateLimit`,
  `parseJsonBody` — don't reinvent.
- Reuse motion variants from `lib/motion/variants.ts` — don't define new
  cubic-beziers or duration constants in components.
- Use the unified data layer (`lib/db/queries.ts`) — never import
  `lib/placeholder-data.ts` directly outside that file.

### File organization
- `app/` — routes (Next.js App Router).
- `components/admin/` — admin-only components (incl. `SiteSettingsForm`).
- `components/dashboard/` — dashboard-only components.
- `components/auth/` — `LoginForm`, `SignupForm`, `ForgotPasswordForm`,
  `ResetPasswordForm`, `AuthAside`, `AuthRequiredDialog`.
- `components/layout/` — site chrome: `SiteHeader` (with mobile hamburger),
  `SiteFooter`, `MobileMenu`, `LocaleSwitcher`, `ThemeToggle`, `AuthMenu`,
  `UserMenuDropdown`, `AppLoader`, `LoadingSequence`, `MaintenanceBanner`.
  `BottomNav.tsx` still exists but is no longer imported anywhere — the
  hamburger in `SiteHeader` opens `MobileMenu` directly on mobile.
- `components/sections/` — homepage and listing-page sections, plus
  `BookBuyButton` (purchase trigger; gated on session via `useSession`).
- `components/motion/` — motion-specific reusable components.
- `components/seo/` — JSON-LD components.
- `components/ui/` — Base UI / shadcn primitives. `dialog.tsx` and
  `alert-dialog.tsx` are Qalem-skinned: real backdrop scrim, `border` +
  `shadow-lift` instead of a thin ring, `text-start` (logical), 18px bold
  title, `max-w-[560px]`, simple footer (no colored bg — `bg-bg-deep` was
  invisible against `bg-elevated` in light mode).
- `components/shared/`, `components/forms/`, `components/providers/` — small utilities.
- `lib/` — business logic (auth, db, motion, redis, email, validators, i18n,
  api, seo, stripe, site-settings, hooks).
- `messages/` — i18n JSON.
- `public/` — static assets.
- `scripts/` — dev tooling: `dev.mjs`, `build.mjs`, `seed.ts`, `gen-icons.mjs`,
  `promote-admin.mjs`, `reset-db.mjs`, `verify-db.mjs`, `fix-external-urls.mjs`,
  `visual-check.mjs`.

## Auth & mock mode

- `lib/auth/mock.ts` provides `getMockSession()` returning the active mock user
  when `MOCK_AUTH_ENABLED` is true (the default in dev). Toggle off by setting
  BOTH `MOCK_AUTH=false` and `NEXT_PUBLIC_MOCK_AUTH=false`.
- `lib/auth/server.ts` provides `getServerSession()` — the production path
  (mock-aware).
- `lib/auth/client.ts` exposes `useSession()` for client components (used by
  `BookBuyButton` to gate purchases).
- `lib/auth/admin-guard.ts` exports `requireAdmin(req)`.
- `lib/auth/index.ts` configures Better Auth (30-day sessions, 24h refresh).
- `lib/auth/redirect.ts` — safe-redirect helpers for the post-login bounce-back.
- Promotion script: `node --env-file=.env.local scripts/promote-admin.mjs <email> ADMIN|CLIENT`.

Two gates work together:
- `MOCK_AUTH_ENABLED` (computed in `mock.ts`) — gates fake sessions.
- **`features.auth_enabled`** (DB-backed via `site_settings.value_json`,
  read through `getCachedSiteSettings`) — runtime gate for the public-nav
  Sign In UI. The env flag `NEXT_PUBLIC_AUTH_ENABLED` is the build-time
  fallback for callers that don't pass the runtime setting.

Behavior matrix (using the runtime `auth_enabled`):
| `auth_enabled` | `MOCK_AUTH_ENABLED` | Result |
| --- | --- | --- |
| false | true  | Public nav hides auth links. Admin/dashboard protected by mock. (Default dev.) |
| true  | true  | Public nav shows auth. Mock session active. (Demo mode.) |
| true  | false | Public nav shows auth. Real Better Auth. (Production.) |
| false | false | Public nav hides auth. Routes return 401. (Maintenance.) |

> Mock-mode caveat: in dev with `MOCK_AUTH_ENABLED=true`, server-side
> `getServerSession()` returns the mock user, but client-side
> `authClient.useSession()` queries Better Auth's real endpoint and sees no
> session. If you're testing purchase gating, turn mock OFF.

## Real content status

- **Bio (about)**: real.
- **Books**: 6 real books + 2 real recorded paid lectures (productType
  `SESSION`; UI labels these «محاضرة مدفوعة» — paid lectures, not live
  consultations).
- **Events**: real (World Tour 2025-2026, Al-Warsheh, GOC, Ihya, Reading Prize).
- **Articles**: 2 real + 6 thematic placeholders.
- **Interviews**: all 8 are placeholders. `videoUrl` is empty; detail pages
  show a "Video coming soon" overlay until real URLs arrive.
- **Gallery**: deleted from the public site; admin CRUD remains.

Real assets in `public/`:
- `dr khaled photo.jpeg` — hero portrait
- `drphoto.JPG`, `DSC06608.JPG` — additional photography
- `Paid books/` — book covers and PDFs
- `Paid sessions/` — recorded paid lectures
- `logo-black.png`
- `icon-192.png`, `icon-512.png`, `icon-maskable.png` — PWA icons

Real contact:
- `Team@drkhaledghattass.com`
- `+961 3 579 666` (009613579666)
- مكتبة خالد غطاس — برجا، لبنان

Pending real content (track in `CONTENT-NEEDED.md`):
- 8 real interview YouTube/Vimeo URLs + thumbnails
- 6 real article cover images and bilingual bodies
- Designed OG share image at `public/og.png` (1200×630)
- Real `public/favicon.ico` (multi-resolution)
- Book PDFs (or `externalUrl` for store-fulfilled titles)
- Confirmation: native Stripe checkout vs external WP shop integration

## Environment variables

Full reference in `.env.local.example`. Required for production:

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
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
| `UPLOADTHING_TOKEN` | Image upload pipeline (Phase 5D) |
| `GOOGLE_SITE_VERIFICATION` | Search Console |

Runtime flags (string-equality `'true'` / `'false'`):
| Var | Effect |
| --- | --- |
| `NEXT_PUBLIC_AUTH_ENABLED` | Build-time fallback for the auth UI gate. The runtime gate is `features.auth_enabled` in the structured site settings. |
| `MOCK_AUTH` + `NEXT_PUBLIC_MOCK_AUTH` | Both `'false'` to disable mock auth. |

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

Verify they're discovered: `claude agents`.

Auditor agents are intentionally read-only — they report; the implementer
fixes. Full docs in `.claude/agents/README.md`. Invoke by @-mention or by
describing the task in a way that triggers auto-delegation.

## Path to launch

1. Provision Neon, generate `BETTER_AUTH_SECRET` + `REVALIDATE_TOKEN`, populate
   `.env.local` (production values go on Netlify).
2. Apply migrations to Neon (`npm run db:migrate`); seed if desired.
3. Disable mock auth (`MOCK_AUTH=false`, `NEXT_PUBLIC_MOCK_AUTH=false`); enable
   real auth (`NEXT_PUBLIC_AUTH_ENABLED=true`).
4. Promote admin and CLIENT users via `scripts/promote-admin.mjs`.
5. Get pending content from Dr. Khaled (interviews, articles, OG, favicon).
6. Run the agent team: `security-auditor`, `seo-checker`,
   `accessibility-checker`, `code-reviewer`. Resolve all critical/high.
7. Deploy to Netlify staging. Send URL to Dr. Khaled. Iterate.
8. Production deploy + DNS.

Estimated 1–2 weeks calendar time, mostly waiting on content + credentials.
Full readiness checklist: `LAUNCH-CHECKLIST.md`.

## Reference

- Design tokens: `app/globals.css` (`@theme inline { ... }` block).
- Schema: `lib/db/schema.ts`. Migrations: `lib/db/migrations/0000–0003`.
- Unified queries: `lib/db/queries.ts`.
- Site settings: `lib/site-settings/{types,defaults,zod,get}.ts`.
- Auth: `lib/auth/{index,server,client,admin-guard,mock,redirect}.ts`.
- Motion: `lib/motion/variants.ts` and `lib/motion/hooks.ts`.
- Validators: `lib/validators/*`.
- Agents: `.claude/agents/` (eight project-scoped agents — see Agent team).
- Pending content: `CONTENT-NEEDED.md`.
- Launch checklist: `LAUNCH-CHECKLIST.md`.
- Outstanding follow-ups: `TODO.md`.
- Next.js 15 caveat: `AGENTS.md` (project root) — read it before relying on
  pre-15 conventions.
