import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { getSiteSettings } from '@/lib/db/queries'
import { SITE_SETTINGS_CACHE_TAG, type SiteSettings } from './types'

/**
 * Cached server-side site settings getter.
 *
 * - `unstable_cache` provides cross-request memoization keyed on
 *   `[site-settings]` and revalidates either every 5 minutes or whenever
 *   `revalidateTag('site-settings')` fires (admin save).
 * - `React.cache` provides request-scope dedupe so calling this from header,
 *   footer, page, and section in the same render is one DB read.
 * - Defaults are returned when the DB is unreachable or the row is missing
 *   (see `getSiteSettings` in queries.ts), so public pages never crash.
 */
const cachedFetch = unstable_cache(
  async (): Promise<SiteSettings> => getSiteSettings(),
  ['site-settings'],
  { tags: [SITE_SETTINGS_CACHE_TAG], revalidate: 300 },
)

export const getCachedSiteSettings = cache(async (): Promise<SiteSettings> => {
  return cachedFetch()
})
