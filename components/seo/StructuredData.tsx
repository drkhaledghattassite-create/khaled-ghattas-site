import { SITE_NAME, SITE_URL } from '@/lib/constants'
import type { Article, Book, Event, Interview } from '@/lib/db/queries'

const SITE_NAME_AR = 'د. خالد غطاس'

type LocaleProps = { locale: string }

function jsonLdScript(data: Record<string, unknown>) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

export function WebsiteJsonLd({ locale }: LocaleProps) {
  const isAr = locale === 'ar'
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: isAr ? SITE_NAME_AR : SITE_NAME,
    url: isAr ? SITE_URL : `${SITE_URL}/en`,
    inLanguage: isAr ? 'ar' : 'en',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/articles?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  })
}

export function OrganizationJsonLd({ locale }: LocaleProps) {
  const isAr = locale === 'ar'
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: isAr ? SITE_NAME_AR : SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-black.png`,
    contactPoint: [
      {
        '@type': 'ContactPoint',
        email: 'kamallchhimi@gmail.com',
        telephone: '+9613579666',
        contactType: 'general',
        areaServed: 'LB',
        availableLanguage: ['ar', 'en'],
      },
    ],
  })
}

export function PersonJsonLd({ locale }: LocaleProps) {
  const isAr = locale === 'ar'
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: isAr ? SITE_NAME_AR : SITE_NAME,
    url: SITE_URL,
    jobTitle: isAr
      ? 'عالم بيولوجيا الخلايا وخبير في السلوك البشري'
      : 'Cell biologist and expert in human behavior',
    worksFor: {
      '@type': 'Organization',
      name: isAr ? 'مبادرة الورشة' : 'Al-Warsheh Initiative',
    },
    image: `${SITE_URL}/dr%20khaled%20photo.jpeg`,
    description: isAr
      ? 'كاتب ومحاضر، مؤسس مبادرة الورشة في لبنان (2020).'
      : 'Author, speaker, and founder of the Al-Warsheh initiative in Lebanon (2020).',
  })
}

export function ArticleJsonLd({
  article,
  locale,
}: {
  article: Article
  locale: string
}) {
  const isAr = locale === 'ar'
  const title = isAr ? article.titleAr : article.titleEn
  const description = isAr ? article.excerptAr : article.excerptEn
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/articles/${article.slug}`

  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt?.toISOString(),
    image: article.coverImage ? [article.coverImage] : undefined,
    author: {
      '@type': 'Person',
      name: isAr ? SITE_NAME_AR : SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: isAr ? SITE_NAME_AR : SITE_NAME,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo-black.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: isAr ? 'ar' : 'en',
  })
}

export function BookJsonLd({ book, locale }: { book: Book; locale: string }) {
  const isAr = locale === 'ar'
  const title = isAr ? book.titleAr : book.titleEn
  const description = isAr ? book.descriptionAr : book.descriptionEn
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/books/${book.slug}`

  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': book.productType === 'BOOK' ? 'Book' : 'Service',
    name: title,
    description,
    image: book.coverImage,
    url,
    inLanguage: isAr ? 'ar' : 'en',
    author: {
      '@type': 'Person',
      name: isAr ? SITE_NAME_AR : SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      price: book.price,
      priceCurrency: book.currency,
      availability: 'https://schema.org/InStock',
      url,
    },
  })
}

export function InterviewJsonLd({
  interview,
  locale,
}: {
  interview: Interview
  locale: string
}) {
  const isAr = locale === 'ar'
  const title = isAr ? interview.titleAr : interview.titleEn
  const description = isAr ? interview.descriptionAr : interview.descriptionEn

  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: description ?? title,
    thumbnailUrl: [interview.thumbnailImage],
    uploadDate: interview.createdAt?.toISOString(),
    contentUrl: interview.videoUrl || undefined,
    embedUrl: interview.videoUrl || undefined,
    inLanguage: isAr ? 'ar' : 'en',
  })
}

export function BreadcrumbJsonLd({
  crumbs,
  locale,
}: {
  crumbs: { label: string; href: string }[]
  locale: string
}) {
  const isAr = locale === 'ar'
  const base = isAr ? SITE_URL : `${SITE_URL}/en`
  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href.startsWith('http') ? c.href : `${base}${c.href}`,
    })),
  })
}

export function EventJsonLd({ event, locale }: { event: Event; locale: string }) {
  const isAr = locale === 'ar'
  const title = isAr ? event.titleAr : event.titleEn
  const description = isAr ? event.descriptionAr : event.descriptionEn
  const location = isAr ? event.locationAr : event.locationEn
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/events/${event.slug}`

  return jsonLdScript({
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: title,
    description,
    startDate: event.startDate?.toISOString(),
    endDate: event.endDate?.toISOString(),
    eventStatus:
      event.status === 'CANCELLED'
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: location
      ? { '@type': 'Place', name: location, address: location }
      : undefined,
    image: event.coverImage ? [event.coverImage] : undefined,
    url,
    organizer: {
      '@type': 'Organization',
      name: isAr ? SITE_NAME_AR : SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: isAr ? 'ar' : 'en',
  })
}
