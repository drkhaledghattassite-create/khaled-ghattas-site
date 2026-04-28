export const SITE_NAME = 'Dr. Khaled Ghattass'
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
