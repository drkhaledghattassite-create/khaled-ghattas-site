import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { getArticles } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = { params: Promise<{ locale: string }> }

// High-traffic ISR — see /books/page.tsx for rationale. 30 min revalidate.
export const revalidate = 1800

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
  const tCommon = await getTranslations('common')
  const articles = await getArticles()

  // Phase F2 — resolve cover storage keys to signed/passthrough URLs server-side.
  const resolvedArticles = await Promise.all(
    articles.map(async (article) => ({
      ...article,
      coverImage: (await resolvePublicUrl(article.coverImage)) ?? null,
    })),
  )

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
        image={{ src: '/drphoto.JPG', alt: tCommon('alt.portrait_dr_khaled') }}
      />

      <ArticlesList articles={resolvedArticles} showHeader={false} />
    </>
  )
}
