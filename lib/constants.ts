export const SITE_NAME = 'Dr. Khaled Ghattass'

// Fail loudly at build time in production when NEXT_PUBLIC_APP_URL is missing.
// A silent localhost fallback poisons every canonical, sitemap entry, robots
// host directive, JSON-LD url, and OG url with `http://localhost:3000` —
// breaking SEO and link previews across the deployed site.
if (
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PUBLIC_APP_URL
) {
  throw new Error(
    '[lib/constants] NEXT_PUBLIC_APP_URL is required in production. ' +
      'Set it to the canonical site origin (e.g. https://drkhaledghattass.com) ' +
      'in the deploy environment before building.',
  )
}

export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const LOCALES = ['ar', 'en'] as const
export const DEFAULT_LOCALE = 'ar' as const

export type Locale = (typeof LOCALES)[number]

/**
 * When false (default), auth UI (sign in / sign up / dashboard / admin) is
 * hidden from public navigation. Flip the public env var on to expose it
 * once the auth backend is configured.
 */
export const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

/**
 * Dr. Khaled's verified public social profiles. Static — these are
 * fixed brand URLs, so they live in source rather than env vars or
 * `site_settings`. If a handle changes, edit this file and ship.
 *
 * Used by:
 *   - components/layout/SiteFooter.tsx           (colophon icon row)
 *   - app/[locale]/(public)/contact/page.tsx     (contact-page social rail)
 *   - components/seo/StructuredData.tsx          (Person.sameAs JSON-LD)
 *
 * The `sameAs` array surfaces these to search engines so Google can
 * link the profiles to the same entity (knowledge-graph signal).
 */
export const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/dr.khaledghattass',
  facebook: 'https://www.facebook.com/dr.khaledghattass',
  youtube: 'https://www.youtube.com/@khaledghattass',
  tiktok: 'https://www.tiktok.com/@dr.khaledghattass',
  x: 'https://x.com/khaledghattass',
  linkedin: 'https://www.linkedin.com/in/dr-khaled-ghattass-62255279',
} as const

export const SOCIAL_LINKS_LIST = Object.values(SOCIAL_LINKS) as readonly string[]
