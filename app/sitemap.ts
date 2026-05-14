import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import {
  getArticles,
  getBooks,
  getInterviews,
  getPublishedTests,
} from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import type { ComingSoonPage } from '@/lib/site-settings/types'

const STATIC_PATHS = [
  '/',
  '/about',
  '/articles',
  '/books',
  '/interviews',
  '/tests',
  '/events',
  '/corporate',
  '/contact',
  // Booking surface is split into three SEO-distinct sub-routes. The
  // /booking root 308-redirects to /booking/tours and is omitted here —
  // keeping it would have crawlers chase the redirect needlessly.
  '/booking/tours',
  '/booking/reconsider',
  '/booking/sessions',
  '/gifts/send',
] as const

const LOCALES = ['ar', 'en'] as const

function localizedUrl(locale: string, path: string): string {
  if (locale === 'ar') return `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL
  return `${SITE_URL}/en${path === '/' ? '' : path}`
}

// Build the hreflang alternates block once per path. Includes x-default so
// users without a matching content-language fall back to the primary locale.
function alternatesFor(path: string) {
  return {
    languages: {
      ar: localizedUrl('ar', path),
      en: localizedUrl('en', path),
      'x-default': localizedUrl('ar', path),
    },
  }
}

/**
 * Map a static path to its coming-soon page key (if any). Pages whose key is
 * in the admin's `coming_soon_pages` list are excluded from the sitemap so
 * search engines don't index a placeholder.
 */
const PATH_TO_COMING_SOON_KEY: Record<string, ComingSoonPage> = {
  '/about': 'about',
  '/articles': 'articles',
  '/books': 'books',
  '/interviews': 'interviews',
  '/events': 'events',
  '/contact': 'contact',
  '/corporate': 'corporate',
  // All three booking sub-routes are gated by the same 'booking' coming-
  // soon key — the layout short-circuits to <ComingSoon> for every child.
  '/booking/tours': 'booking',
  '/booking/reconsider': 'booking',
  '/booking/sessions': 'booking',
  // '/gifts/send' has no coming-soon key in v1; it stays in the sitemap
  // even when gifts.allow_user_to_user=false (the page itself renders the
  // disabled-state copy). No SEO downside to keeping the URL discoverable.
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, articles, books, interviews, testsList] = await Promise.all([
    getCachedSiteSettings(),
    getArticles({ limit: 500 }),
    getBooks({ limit: 200 }),
    getInterviews({ limit: 200 }),
    getPublishedTests({ limit: 200 }),
  ])

  const hidden = new Set<ComingSoonPage>(settings.coming_soon_pages)
  const isHidden = (path: string): boolean => {
    const key = PATH_TO_COMING_SOON_KEY[path]
    return key !== undefined && hidden.has(key)
  }

  const entries: MetadataRoute.Sitemap = []

  // Each path gets one <loc> entry per locale with mutual hreflang. This
  // ensures both Arabic and English URLs are first-class entries crawlers
  // can discover directly, rather than nesting English inside Arabic's
  // alternates block.
  for (const path of STATIC_PATHS) {
    if (isHidden(path)) continue
    const lastModified = new Date()
    for (const loc of LOCALES) {
      entries.push({
        url: localizedUrl(loc, path),
        lastModified,
        changeFrequency: 'weekly',
        alternates: alternatesFor(path),
      })
    }
  }

  if (!hidden.has('articles')) {
    for (const a of articles) {
      const path = `/articles/${a.slug}`
      const lastModified = a.updatedAt ?? a.publishedAt ?? new Date()
      for (const loc of LOCALES) {
        entries.push({
          url: localizedUrl(loc, path),
          lastModified,
          changeFrequency: 'monthly',
          alternates: alternatesFor(path),
        })
      }
    }
  }

  if (!hidden.has('books')) {
    for (const b of books) {
      const path = `/books/${b.slug}`
      const lastModified = b.updatedAt ?? new Date()
      for (const loc of LOCALES) {
        entries.push({
          url: localizedUrl(loc, path),
          lastModified,
          changeFrequency: 'monthly',
          alternates: alternatesFor(path),
        })
      }
    }
  }

  if (!hidden.has('interviews')) {
    for (const i of interviews) {
      const path = `/interviews/${i.slug}`
      const lastModified = i.updatedAt ?? new Date()
      for (const loc of LOCALES) {
        entries.push({
          url: localizedUrl(loc, path),
          lastModified,
          changeFrequency: 'monthly',
          alternates: alternatesFor(path),
        })
      }
    }
  }

  // Tests have no coming-soon key in v1; the catalog and per-test detail
  // pages are always indexable when there are published rows.
  for (const t of testsList) {
    const path = `/tests/${t.slug}`
    const lastModified = t.updatedAt ?? t.createdAt ?? new Date()
    for (const loc of LOCALES) {
      entries.push({
        url: localizedUrl(loc, path),
        lastModified,
        changeFrequency: 'monthly',
        alternates: alternatesFor(path),
      })
    }
  }

  return entries
}
