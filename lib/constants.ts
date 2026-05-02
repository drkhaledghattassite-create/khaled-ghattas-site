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
