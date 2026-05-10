# Launch checklist

Run through these in order before flipping `drkhaledghattass.com` live.

## 1. Infrastructure

- [ ] Provision Neon PostgreSQL project; copy connection string into Netlify env as `DATABASE_URL`.
- [ ] Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`. Add to Netlify env.
- [ ] Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production origin (e.g. `https://drkhaledghattass.com`).
- [ ] Generate `REVALIDATE_TOKEN`: `openssl rand -hex 32`. Add to Netlify env.

## 2. Database

- [ ] `npm run db:migrate` — apply all migrations to Neon. Current set
      (10 migrations): `0000_blue_adam_warlock` (initial schema),
      `0001_remarkable_toad_men` (bio + preferences + product_type),
      `0002_flippant_luke_cage` (Better Auth columns), `0003_cold_scream`
      (`value_json` jsonb on `site_settings`), `0004_overjoyed_red_wolf`
      (Phase 1 content-delivery tables), `0005_dizzy_luckman` (Phase 2 —
      `total_pages` on `reading_progress`), `0006_corporate_programs`
      (Phase 3 corporate suite), `0007_booking_tables` (Phase A1 booking
      domain — tours, bookings, interest, holds, orders),
      `0008_admin_booking_additions` (Phase A2 — `tour_suggestions.reviewed_at`),
      `0009_user_questions` (Phase B1 — Ask Dr. Khaled queue).
      Verify on the live DB with `node --env-file=.env.local scripts/verify-db.mjs`.
- [ ] `npm run db:seed` — populates placeholder content INCLUDING tours
      + bookings (Reconsider course + 8 online sessions). Skip in
      production once real content is loaded via /admin/booking.

## 3. Auth

- [ ] (Optional) Create Google OAuth credentials at https://console.cloud.google.com — populate `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [ ] Confirm `MOCK_AUTH` is unset (or absent) in Netlify environment variables. `NODE_ENV=production` hard-disables mock auth regardless, but explicit absence is cleaner.
- [ ] Set `NEXT_PUBLIC_AUTH_ENABLED=true` so the public site shows Sign In / Sign Up.
- [ ] Promote yourself to ADMIN: `node --env-file=.env.local scripts/promote-admin.mjs you@example.com ADMIN`.
- [ ] Promote Dr. Khaled to CLIENT: same script with `CLIENT` as the second arg.

## 4. Email

> **DNS propagation can take 24–48 hours.** Start this section at least
> 2 days before intended launch.

- [ ] Add the sender domain (e.g. `drkhaledghattass.com`) to the Resend
      dashboard.
- [ ] Resend will provide SPF, DKIM, and DMARC records — add **all three**
      to the domain's DNS zone.
- [ ] Wait for Resend to mark the domain as **Verified** (can take 24–48
      hours).
- [ ] Add `RESEND_API_KEY` to Netlify env.
- [ ] Set `EMAIL_FROM` on Netlify to a verified address, e.g.
      `Dr. Khaled Ghattass <noreply@drkhaledghattass.com>`. Without it the
      app falls back to the same default — but only after the domain is
      verified.
- [ ] Set `SUPPORT_EMAIL` on Netlify to the public support inbox shown in
      transactional-email footers. Falls back to `Team@drkhaledghattass.com`
      if unset, but **production should set explicitly** (the fallback is
      a safety net, not a configuration).
- [ ] Set `CORPORATE_INBOX_EMAIL` on Netlify to the inbox that should
      receive `/api/corporate/request` form submissions. Same fallback +
      explicit-set guidance as `SUPPORT_EMAIL`.
- [ ] Trigger a test email by completing a Stripe test-mode purchase
      against the staging deploy.
- [ ] Verify the email lands in the **inbox** (not spam) on at least
      Gmail web + Gmail mobile + iOS Mail + Outlook web. If any of these
      route to spam, recheck DNS propagation and SPF alignment before
      flipping live.

## 4b. Storage adapter readiness (digital-delivery products)

`lib/storage/index.ts` currently exports `mockAdapter`, which returns
`/placeholder-content/<key>` URLs that **do not exist in production**
(the directory is gitignored and never deployed). Until the production
storage adapter ships, every BOOK with `digitalFile` set will email the
buyer a link that 404s.

**v1 launch constraint:** every book in the database must have
`externalUrl` set and `digital_file` NULL. Books fulfill via the
existing storefront (WP shop, Gumroad, etc.) until the production
adapter lands.

- [ ] Run this SQL against the production Neon DB before launch:

      ```sql
      SELECT id, title_en, external_url, digital_file
      FROM books
      WHERE digital_file IS NOT NULL;
      ```

      Expected result: **zero rows.** Any row returned is a launch blocker
      for that book — either set `digital_file = NULL` and supply
      `external_url`, or hold the product until the storage adapter
      ships.

- [ ] Same constraint applies to `session_items.storage_key` — sessions
      cannot launch until the production adapter ships. If sessions are
      in scope for v1, this is a hard blocker; if v1 is books-only,
      confirm there are no SESSION-typed rows in the catalog or that
      they're hidden by `coming_soon_pages` / `is_active=false`.

## 5. Stripe

- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` to Netlify env.
- [ ] In Stripe dashboard, add a webhook endpoint pointing to
      `https://drkhaledghattass.com/api/stripe/webhook` with events:
      `checkout.session.completed`, `checkout.session.expired`,
      `payment_intent.succeeded`, `payment_intent.payment_failed`,
      `charge.refunded`. (`checkout.session.expired` is REQUIRED for the
      booking-domain hold cleanup — without it, expired Stripe sessions
      leave orphan holds until they TTL out.)
- [ ] Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Netlify env.

### 5b. Booking-domain end-to-end smoke test

Run AFTER Stripe + Neon are live in production (or against a Stripe test
key + the live Neon DB). The full happy path exercises holds, the
webhook flip, the email, the dashboard listing, and the already-booked
guard.

- [ ] **Forward the webhook locally first** (smoke test against staging):
      `stripe listen --forward-to localhost:3000/api/stripe/webhook` in
      a second terminal. Copy the printed webhook signing secret into
      `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
- [ ] Open `/booking` logged in as a non-admin user with NO prior
      bookings. Click Reserve on the Reconsider panel. Use Stripe test
      card `4242 4242 4242 4242` with any future expiry + any CVC.
- [ ] **Confirm in the Stripe CLI output** the webhook fires with
      `checkout.session.completed` carrying `productType=BOOKING`.
- [ ] **Confirm in the DB** (`node --env-file=.env.local scripts/verify-db.mjs`
      or any psql client):
      - `booking_orders` row with `status='PAID'`, `confirmedAt` set,
        `stripePaymentIntentId` populated.
      - `bookings.bookedCount` for the Reconsider row incremented by 1.
      - `bookings_pending_holds` row deleted (holds are cleaned on
        completed).
- [ ] **Confirm the confirmation email** lands in
      `.next/cache/email-previews/booking-confirmation-*.html` (dev
      mode) or in the user's real inbox (production with `RESEND_API_KEY`).
- [ ] Visit `/dashboard/bookings`. The order should render with the
      Confirmed pill, cohort label, and the mailto: Manage button.
- [ ] Visit `/booking` again. The Reconsider panel should now show
      "Already booked → view in dashboard" instead of the Reserve CTA.
      The session-card grid should still allow Reserve on the 8
      online sessions (unaffected by Reconsider purchase).
- [ ] Test the **expiry path**: click Reserve, get to Stripe, close the
      tab without paying, wait 31 minutes (Stripe session TTL). The
      `checkout.session.expired` webhook should fire; the
      `bookings_pending_holds` row should be deleted; the
      `booking_orders` row should flip to `FAILED`.
- [ ] Test the **refund path** (admin side): from `/admin/booking/orders`,
      click Refund on the PAID order. Confirm in Stripe dashboard that
      a real refund was issued, then confirm webhook fired
      `charge.refunded` and the local `booking_orders.status='REFUNDED'`,
      `bookings.bookedCount` decremented. **`bookingState` is left
      unchanged on purpose** — admin must manually flip SOLD_OUT → OPEN
      via the booking-state modal if desired (Decision 11).
- [ ] Test the **capacity-reduction guard** (admin side): with the now-
      refunded order's booking having `bookedCount=0`, fill seats up to
      capacity-1 with test orders, then try to set `maxCapacity` BELOW
      the current commitment. The action should reject with
      `capacity_below_commitment` and a precise error message.

## 6. Rate limiting

- [ ] Create Upstash Redis database; copy REST URL + token into Netlify
      env as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
      Without these, ALL `tryRateLimit` calls fail open (logs
      `X-RateLimit-Bypass: no-redis`) — the site still works but loses
      protection on `/api/contact`, `/api/newsletter`, `/api/auth/*`,
      `/api/content/access`, `/api/reader/progress`,
      `/api/session/progress`, `/api/admin/site-settings`, AND the two
      booking server actions: `createBookingCheckoutAction` (10/min/user)
      and `createBookingInterestAction` (20/min/user). Strongly
      recommended for production at 10K+ user scale.

## 7. Real content

Replace placeholder content per `CONTENT-NEEDED.md`:

- [ ] 8 real interview YouTube/Vimeo URLs + thumbnails
- [ ] 6 real article cover images + bilingual bodies
- [ ] OG share image at `/public/og.png` (1200×630)
- [ ] Real favicon (`/public/favicon.ico`, `/public/icon.png`, `/public/apple-touch-icon.png`)
- [ ] Real book PDFs (or `externalUrl` for store-fulfilled titles)

## 8. Verification

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — clean, all routes generated
- [ ] Crawl `/sitemap.xml` and confirm article/book/interview/event slugs
- [ ] Verify `/robots.txt` disallows `/admin/`, `/dashboard/`, `/api/`
- [ ] Test `/api/contact` POST end-to-end with a real Neon DB
- [ ] Test `/api/newsletter` POST end-to-end
- [ ] Smoke-test sign-up → sign-in → dashboard → admin (with an ADMIN account)
- [ ] Smoke-test forgot-password → reset-password
- [ ] Smoke-test admin: create + edit + delete an article, book, interview, event, gallery item
- [ ] Smoke-test admin: edit a user role, save settings, edit a content block, clear cache
- [ ] Smoke-test account: edit profile, change preferences, delete account (cookie clears)
- [ ] Confirm Lighthouse score ≥ 90 on home / about / contact / a book detail page
- [ ] Verify security headers in production: `curl -I https://drkhaledghattass.com` should include HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy

## 9. DNS + go-live

- [ ] Point apex + `www` to Netlify
- [ ] Verify SSL certificate
- [ ] Enable HTTPS-only redirect
- [ ] Submit sitemap to Google Search Console
- [ ] Verify on PageSpeed Insights and BrowserStack (mobile Safari, Chrome, Firefox, Edge)
