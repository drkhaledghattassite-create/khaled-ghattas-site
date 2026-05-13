import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/dashboard/',
          '/api/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/checkout/',
          // Per-recipient redemption URLs — these carry tokens in ?token=
          // and have no public discovery value. The page itself is also
          // robots: noindex (see app/[locale]/(public)/gifts/claim/page.tsx)
          // for belt-and-suspenders.
          '/gifts/claim',
          '/gifts/success',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
