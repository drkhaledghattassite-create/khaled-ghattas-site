import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'

const SITE_NAME_AR = 'د. خالد غطاس'

/**
 * Build canonical/OG/Twitter metadata for a section landing page.
 * Detail pages have their own bespoke generators (article, book, interview).
 */
export function pageMetadata(opts: {
  locale: string
  /** Path WITHOUT locale prefix, e.g. "/articles" or "/about". */
  path: string
  title: string
  description: string
  image?: string
}): Metadata {
  const isAr = opts.locale === 'ar'
  const localePath = isAr ? '' : '/en'
  const url = `${SITE_URL}${localePath}${opts.path}`
  const image = opts.image ?? '/opengraph-image'
  const siteName = isAr ? SITE_NAME_AR : SITE_NAME

  return {
    title: opts.title,
    description: opts.description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}${opts.path}`,
        en: `${SITE_URL}/en${opts.path}`,
        'x-default': `${SITE_URL}${opts.path}`,
      },
    },
    openGraph: {
      type: 'website',
      title: opts.title,
      description: opts.description,
      url,
      siteName,
      images: [{ url: image, width: 1200, height: 630, alt: opts.title }],
      locale: isAr ? 'ar_LB' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  }
}
