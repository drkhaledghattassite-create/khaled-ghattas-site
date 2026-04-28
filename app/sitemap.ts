import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import {
  getArticles,
  getBooks,
  getInterviews,
} from '@/lib/db/queries'

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, books, interviews] = await Promise.all([
    getArticles({ limit: 500 }),
    getBooks({ limit: 200 }),
    getInterviews({ limit: 200 }),
  ])

  const entries: MetadataRoute.Sitemap = []

  for (const path of STATIC_PATHS) {
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

  return entries
}
