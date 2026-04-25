# drkhaledghattass.com — CLAUDE.md

## Project
Production website for Dr. Khaled Ghattass.
Paid freelance project. Developer: Kamal.

## Design reference
Visual spec folder: ../dayanjayatillekaWEBSITE/docs/research/
Assets folder: ../dayanjayatillekaWEBSITE/public/images/
Clone repo (DO NOT EDIT): ../dayanjayatillekaWEBSITE/

## Real content sources
- Live reference site: https://drkhaledghattass.com/
- Extracted content folder: docs/content-extracted/
- Real assets: public/dr khaled photo.jpeg (hero portrait), public/drphoto.JPG, public/DSC06608.JPG, public/Paid books/, public/Paid sessions/, public/logo-black.png
- Identity: عالم بيولوجيا الخلايا وخبير في السلوك البشري — كاتب ومحاضر — مؤسس مبادرة «الورشة»
- Al-Warsheh founded 2020-07-11 in Burja, Lebanon; Khaled Ghattass Library opened 2023
- Tour 2025-2026 theme: "بين الغريب والسائد.. لقاء عن الحب والحياة"
- Real contact: Team@drkhaledghattass.com / 009613579666 / مكتبة خالد غطاس — برجا، لبنان

## Stack
Next.js 15 App Router, TypeScript strict, Tailwind v4,
Drizzle ORM + Neon PostgreSQL, Better Auth, next-intl,
Motion, Upstash Redis, Resend, Stripe, Netlify.

## CRITICAL RULES
- Arabic RTL is PRIMARY (default locale, no URL prefix)
- English LTR is SECONDARY (/en/ prefix)
- NEVER use margin-left/right — use margin-inline-start/end
- NEVER use padding-left/right — use padding-inline-start/end
- NEVER use text-left/right — use text-start/end
- NEVER hardcode colors — use CSS variables
- NEVER use `any` type — strict mode enforced
- ALWAYS use next/image for images
- ALWAYS use Link from @/lib/i18n/navigation for internal links
- ALWAYS run tsc --noEmit and npm run build before reporting done
- Git commits are MANUAL — never commit automatically
- Secrets never appear in chat — use .env.local only

## Design tokens
Background cream: #EDE7DF
Ink black: #252321
Accent amber: #BC884A
Secondary cream: #F6F4F1
Warm cream: #DED9D0
Muted ink: #66615A

## Fonts
Arabic: Noto Naskh Arabic (next/font/google) — primary
Latin serif: Instrument Serif (next/font/google)
Latin sans: Oswald (next/font/google)

## Architecture
- app/[locale]/ — all pages under locale routing
- Content in DB via Drizzle — no external CMS
- Admin panel at /admin — ADMIN role only
- CLIENT role: read-only financial view (Dr. Ghattass)
- Three roles: USER, ADMIN, CLIENT

## Current phase
Phase 5 complete — admin panel UI with mocked auth.
Step 1 (real content + assets) wired into placeholder-data.ts and components.
Next: Phase 4B (real Better Auth wiring) or Phase 6 (media upload pipeline).
