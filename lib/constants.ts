export const SITE_NAME = 'Dr. Khaled Ghattass'
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const LOCALES = ['ar', 'en'] as const
export const DEFAULT_LOCALE = 'ar' as const

export type Locale = (typeof LOCALES)[number]
