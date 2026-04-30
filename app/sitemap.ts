import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import {
  getArticles,
  getBooks,
  getInterviews,
} from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import type { ComingSoonPage } from '@/lib/site-settings/types'

const STATIC_PATHS = [
  '/',
  '/about',
  '/articles',
  '/books',
  '/interviews',
  '/events',
  '/contact',
] as const

const LOCALES = ['ar', 'en'] as const

function localizedUrl(locale: string, path: string): string {
  if (locale === 'ar') return `${SITE_URL}${path === '/' ? '' : path}` || SITE_URL
  return `${SITE_URL}/en${path === '/' ? '' : path}`
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
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, articles, books, interviews] = await Promise.all([
    getCachedSiteSettings(),
    getArticles({ limit: 500 }),
    getBooks({ limit: 200 }),
    getInterviews({ limit: 200 }),
  ])

  const hidden = new Set<ComingSoonPage>(settings.coming_soon_pages)
  const isHidden = (path: string): boolean => {
    const key = PATH_TO_COMING_SOON_KEY[path]
    return key !== undefined && hidden.has(key)
  }

  const entries: MetadataRoute.Sitemap = []

  for (const path of STATIC_PATHS) {
    if (isHidden(path)) continue
    entries.push({
      url: localizedUrl('ar', path),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      alternates: {
        languages: {
          ar: localizedUrl('ar', path),
          en: localizedUrl('en', path),
        },
      },
    })
  }

  if (!hidden.has('articles')) {
    for (const a of articles) {
      const path = `/articles/${a.slug}`
      entries.push({
        url: localizedUrl('ar', path),
        lastModified: a.updatedAt ?? a.publishedAt ?? new Date(),
        changeFrequency: 'monthly',
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, localizedUrl(l, path)]),
          ),
        },
      })
    }
  }

  if (!hidden.has('books')) {
    for (const b of books) {
      const path = `/books/${b.slug}`
      entries.push({
        url: localizedUrl('ar', path),
        lastModified: b.updatedAt ?? new Date(),
        changeFrequency: 'monthly',
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, localizedUrl(l, path)]),
          ),
        },
      })
    }
  }

  if (!hidden.has('interviews')) {
    for (const i of interviews) {
      const path = `/interviews/${i.slug}`
      entries.push({
        url: localizedUrl('ar', path),
        lastModified: i.updatedAt ?? new Date(),
        changeFrequency: 'monthly',
        alternates: {
          languages: Object.fromEntries(
            LOCALES.map((l) => [l, localizedUrl(l, path)]),
          ),
        },
      })
    }
  }

  return entries
}
