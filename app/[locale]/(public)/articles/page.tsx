import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { getArticles } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'articles.meta' })
  return pageMetadata({
    locale,
    path: '/articles',
    title: t('title'),
    description: t('description'),
  })
}

export default async function ArticlesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('articles')) {
    return <ComingSoon pageKey="articles" />
  }

  const t = await getTranslations('articles.page')
  const articles = await getArticles()

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
        image={{ src: '/drphoto.JPG', alt: '' }}
      />

      <ArticlesList articles={articles} showHeader={false} />
    </>
  )
}
