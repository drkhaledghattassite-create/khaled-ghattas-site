import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { BooksGrid } from '@/components/sections/BooksGrid'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { getBooks } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = { params: Promise<{ locale: string }> }

/**
 * High-traffic ISR. Listing content is user-agnostic and changes
 * hours-to-days. Serving from the Next cache for 30 min cuts SSR compute,
 * DB queries, and signed-URL mints to ~48 renders/day per locale — a
 * ~50,000× reduction vs default-dynamic at 100k DAU.
 *
 * Admin can force fresh content immediately via the bearer-token
 * `/api/admin/revalidate` route after publishing. 30 min < 7-day cover
 * signed-URL TTL so the baked HTML never carries an expired URL.
 */
export const revalidate = 1800

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'books.meta' })
  return pageMetadata({
    locale,
    path: '/books',
    title: t('title'),
    description: t('description'),
  })
}

export default async function BooksPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('books')) {
    return <ComingSoon pageKey="books" />
  }

  const t = await getTranslations('books.page')
  const books = await getBooks()

  // Phase F2 — resolve cover storage keys to signed/passthrough URLs before
  // shipping the array to the client component. External URLs and local
  // /public assets pass through unchanged.
  const resolvedBooks = await Promise.all(
    books.map(async (book) => ({
      ...book,
      coverImage:
        (await resolvePublicUrl(book.coverImage)) ?? '/dr khaled photo.jpeg',
    })),
  )

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
      />
      <BooksGrid books={resolvedBooks} />
    </>
  )
}
