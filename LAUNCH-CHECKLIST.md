# Launch checklist

Run through these in order before flipping `drkhaledghattass.com` live.

## 1. Infrastructure

- [ ] Provision Neon PostgreSQL project; copy connection string into Netlify env as `DATABASE_URL`.
- [ ] Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`. Add to Netlify env.
- [ ] Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production origin (e.g. `https://drkhaledghattass.com`).
- [ ] Generate `REVALIDATE_TOKEN`: `openssl rand -hex 32`. Add to Netlify env.

## 2. Database

- [ ] `npm run db:generate` — current migrations: `0000_blue_adam_warlock.sql` (initial), `0001_remarkable_toad_men.sql` (`bio`, `preferences`, `product_type`), `0002_flippant_luke_cage.sql` (Better Auth columns). Regenerate only if the schema drifts further.
- [ ] `npm run db:migrate` — apply all three migrations to Neon.
- [ ] `npm run db:seed` — populate placeholder content. Skip in production once real content is loaded via /admin.

## 3. Auth

- [ ] (Optional) Create Google OAuth credentials at https://console.cloud.google.com — populate `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [ ] Set `MOCK_AUTH=false` and `NEXT_PUBLIC_MOCK_AUTH=false` in Netlify env to disable mock auth.
- [ ] Set `NEXT_PUBLIC_AUTH_ENABLED=true` so the public site shows Sign In / Sign Up.
- [ ] Promote yourself to ADMIN: `node --env-file=.env.local scripts/promote-admin.mjs you@example.com ADMIN`.
- [ ] Promote Dr. Khaled to CLIENT: same script with `CLIENT` as the second arg.

## 4. Email

- [ ] Configure Resend domain (verify DNS records).
- [ ] Add `RESEND_API_KEY` to Netlify env.
- [ ] Send test email to confirm deliverability.

## 5. Stripe (Phase 6 — defer until checkout is wired)

- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` to Netlify env.
- [ ] In Stripe dashboard, add a webhook endpoint pointing to `https://drkhaledghattass.com/api/stripe/webhook` with events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`.
- [ ] Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Netlify env.
- [ ] Wire `checkout.session.completed` to write order rows (see `app/api/stripe/webhook/route.ts` TODOs).

## 6. Rate limiting (optional)

- [ ] Create Upstash Redis database; copy REST URL + token into Netlify env. Without these, `/api/contact` and `/api/newsletter` skip rate limiting.

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
- [ ] Tighten `next.config.ts` `images.remotePatterns` to specific CDN hosts once an image pipeline is chosen (Uploadthing / ImageKit). The current `**` wildcard is convenient but invites abuse.

## 9. DNS + go-live

- [ ] Point apex + `www` to Netlify
- [ ] Verify SSL certificate
- [ ] Enable HTTPS-only redirect
- [ ] Submit sitemap to Google Search Console
- [ ] Verify on PageSpeed Insights and BrowserStack (mobile Safari, Chrome, Firefox, Edge)
