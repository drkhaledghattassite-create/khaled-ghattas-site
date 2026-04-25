# drkhaledghattass.com — CLAUDE.md

## Project
Production website for Dr. Khaled Ghattass.
Paid freelance project. Developer: Kamal.

## Design reference
Visual spec folder: ../dayanjayatillekaWEBSITE/docs/research/
Assets folder: ../dayanjayatillekaWEBSITE/public/images/
Clone repo (DO NOT EDIT): ../dayanjayatillekaWEBSITE/

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
Phase 1: Foundation scaffold
