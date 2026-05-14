# Booking domain (Phase A)

"Services for individuals" / «خدمات للأفراد» — three sections, each on
its own SEO-distinct route under `/booking/*`:

| Route | Section | Behaviour |
|---|---|---|
| `/booking/tours` | **Tours** | Externally-booked in-person events; "suggest a city" form when no tour matches |
| `/booking/reconsider` | **Reconsider** | Flagship paid 8-week course with internal Stripe checkout when OPEN, waitlist signup when CLOSED/SOLD_OUT |
| `/booking/sessions` | **8 Online Sessions** | Standalone paid recordings with the same OPEN/CLOSED/SOLD_OUT pattern |

`/booking` itself 308-redirects to `/booking/tours` (the default
landing). The sitemap lists the three sub-routes; the redirect target
is excluded so crawlers don't chase it.

Shared chrome lives in `app/[locale]/(public)/booking/(chrome)/layout.tsx`
— fetches the lightweight metrics (counts + reconsider state) and
renders the `BookingPageHeader` status strip + `BookingSubNav` chips.
The coming-soon gate (`coming_soon_pages.includes('booking')`) is in
the layout so every chrome-segment sub-route inherits it; the sitemap
maps all three paths to the same `'booking'` key.

The `(chrome)` parens denote a route group — invisible in URLs but a
layout boundary. `/booking/success` lives OUTSIDE the group so the
post-checkout confirmation page doesn't re-render the marketing
hero + sub-nav above the order confirmation. `/booking/page.tsx` (the
308 redirect) is also outside, so the redirect doesn't waste a render
on the chrome.

Each sub-route has its own client wrapper that owns its modal stack —
`ToursPageClient` (suggest-city), `ReconsiderPageClient` (reserve +
interest), `SessionsPageClient` (reserve + interest). The auth-required
dialog redirect path matches the page route, so a logged-out user
clicking Reserve on `/booking/sessions` lands back there after sign-in.

Public surface notes:
- Sub-nav chips are route-based (`<Link>` + `usePathname`), not
  scroll-spy
- Mobile sticky-bottom Reserve CTA on the Reconsider route is always
  visible — no scroll-spy hide/show because the surrounding chrome
  already pins the user to Reconsider
- Already-booked guard (Phase A3.1) swaps Reserve for "view in dashboard"
- Pages refresh on window-focus return (throttled 30s) so a user
  coming back from Stripe sees fresh hold/capacity numbers
- `/booking/reconsider` 404s when no active reconsider cohort exists —
  the sub-nav chip still surfaces (without the open-dot) so users
  return when a cohort is added

`/booking/success` — Stripe success landing. Resolves
`?session_id=cs_xxx` to a `booking_orders` row; renders confirmation
with order ref + dashboard CTA when PAID, or a polling state
(`PendingPoller`) when still PENDING (~10s ceiling, then falls back).
The poller hits `GET /api/booking/order-status?session_id=…` (auth-
gated; defends user-id ownership; returns `NOT_FOUND` rather than 403
for cross-user lookups to avoid leaking session_id existence).

## Capacity-race solution

Lives in the `bookings_pending_holds` table. A 15-min TTL hold is
created inside a `db.transaction` that:
1. Locks the booking row via `SELECT … FOR UPDATE`
2. Counts active holds via `WHERE expires_at > NOW()`
3. Computes `effectiveRemaining = maxCapacity - bookedCount - activeHoldsCount`

…BEFORE the Stripe Checkout Session is opened.

Re-clicks delete the user's prior hold and create a fresh one. Orphan
Stripe sessions clean themselves up via `checkout.session.expired`.

## Already-booked guard (Phase A3.1)

`getPaidBookingIdsForUser` in `lib/db/queries.ts` returns bookingIds
with PAID/FULFILLED orders for the current user. The `/booking` page
hides the Reserve UI for those (replaced with "Already booked → view
in dashboard"); the `createBookingCheckoutAction` server action also
defends with `error: 'already_booked'` for stale-tab bypass attempts.

## Rate limiting (Phase A3.3)

- `createBookingCheckoutAction`: 10 / min / user (default `tryRateLimit` shape)
- `createBookingInterestAction`: 20 / min / user via the new optional
  `{ limit, window }` config on `tryRateLimit`. Custom configs use
  `rl:<limit>:<window>` Redis prefixes; the default `'rl'` prefix is
  preserved so existing limit-counters don't reset.

Helper fails open without Upstash creds.

## Webhook integration

`app/api/stripe/webhook/route.ts` has BOOKING-flavoured branches in:
- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.payment_failed`
- `charge.refunded`

The `checkout.session.completed` branch is an **early-return BEFORE**
the existing books/sessions logic — the existing path reads
`metadata.bookId`, which BOOKING sessions don't have.

The `charge.refunded` branch decrements `bookings.bookedCount` with a
`GREATEST(...-1, 0)` floor and deliberately leaves `bookingState`
alone — admin manually reverts SOLD_OUT → OPEN if needed.

## Customer-facing dashboard

`/dashboard/bookings` lists the user's `booking_orders` with status
pills (Confirmed / Pending / Refunded / Failed) and a "Manage booking"
CTA that opens `mailto:Team@drkhaledghattass.com` for v1 (admin
handles changes manually until self-service flows ship).

## Admin tooling (Phase A2)

Five surfaces under `/admin/booking/*`:
- Tours
- Bookings
- Tour Suggestions
- Booking Interest
- Booking Orders

### Capacity-reduction guard

Runs server-side inside `updateBookingAdmin`. Rejects when
`newMaxCapacity < bookedCount + activeHolds` with an explicit
`capacity_below_commitment` error code carrying the live numbers.

### Stripe refund flow

Admin clicks → action calls `stripe.refunds.create({ payment_intent })`
→ action returns success → webhook fires `charge.refunded` → DB state
syncs. Admin doesn't mutate `booking_orders` directly.

### Stale-PENDING purge

Button on the orders surface deletes `booking_orders` rows with
`status='PENDING' AND createdAt < now() - interval '24 hours'`.

### Sidebar visibility

The booking group always shows in the admin sidebar — the previous
`admin.show_admin_booking` site-setting was removed (hiding admin
sections from the admin made no sense). Deep links to booking routes
have always worked regardless of the sidebar entry.

## Schema

| Table | Purpose |
|---|---|
| `tours` | Externally-booked in-person events |
| `tour_suggestions` | "Suggest a city" submissions |
| `bookings` | Reconsider course + 8 online sessions catalog |
| `booking_interest` | Waitlist for CLOSED/SOLD_OUT bookings |
| `bookings_pending_holds` | 15-min capacity holds (race solution) |
| `booking_orders` | Paid Stripe orders (uses canonical `orderStatus` enum; `bookingId` ON DELETE RESTRICT, `userId` ON DELETE SET NULL — matches the `orders` precedent) |

Enums introduced: `bookingProductType` (RECONSIDER_COURSE / ONLINE_SESSION),
`bookingState` (OPEN / CLOSED / SOLD_OUT). Migrations: `0007_booking_tables.sql`,
`0008_admin_booking_additions.sql`.

## Files

- `app/[locale]/(public)/booking/{page.tsx,success/page.tsx}`
- `app/[locale]/(dashboard)/dashboard/bookings/page.tsx`
- `app/[locale]/(admin)/admin/booking/{page,tours,bookings,interest,tour-suggestions,orders}/...`
- `app/api/booking/order-status/route.ts`
- `components/booking/{BookingPage,BookingPageHeader,BookingSubNav,ToursSection,ReconsiderSection,SessionsSection,ReserveModal,SuggestCityModal,InterestModal}.tsx`
- `components/admin/{ToursAdminTable,TourForm,BookingsAdminTable,BookingForm,BookingCapacityCard,TourSuggestionsTable,BookingInterestTable,BookingOrdersTable,BookingOrdersPurgeButton,BookingOrderRefundButton}.tsx`
- `lib/db/schema.ts` — booking tables/enums
- `lib/db/queries.ts` — booking helpers (incl. `getPaidBookingIdsForUser`, `getBookingOrderByStripeSessionId`, `updateBookingAdmin`)
