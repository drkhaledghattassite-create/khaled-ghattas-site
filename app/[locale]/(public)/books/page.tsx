import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { BooksGrid } from '@/components/sections/BooksGrid'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { getBooks } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

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

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
      />
      <BooksGrid books={books} />
    </>
  )
}
