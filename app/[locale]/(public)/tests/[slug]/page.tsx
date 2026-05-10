import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getLatestAttemptForUserAndTest,
  getTestBySlug,
} from '@/lib/db/queries'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { TestDetailPage } from '@/components/tests/TestDetailPage'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const test = await getTestBySlug(slug).catch(() => null)
  if (!test) {
    const t = await getTranslations({ locale, namespace: 'tests.meta' })
    return pageMetadata({
      locale,
      path: '/tests',
      title: t('title'),
      description: t('description'),
    })
  }
  const isAr = locale === 'ar'
  const title = isAr ? test.titleAr : test.titleEn
  const description = isAr ? test.descriptionAr : test.descriptionEn
  return pageMetadata({
    locale,
    path: `/tests/${slug}`,
    title,
    description,
  })
}

export default async function TestDetailRoute({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const test = await getTestBySlug(slug)
  if (!test) notFound()

  const session = await getServerSession().catch(() => null)
  const latestAttempt = session
    ? await getLatestAttemptForUserAndTest(session.user.id, test.id).catch(
        () => null,
      )
    : null

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <TestDetailPage
      locale={viewerLocale}
      test={{
        id: test.id,
        slug: test.slug,
        titleAr: test.titleAr,
        titleEn: test.titleEn,
        introAr: test.introAr,
        introEn: test.introEn,
        category: test.category,
        estimatedMinutes: test.estimatedMinutes,
        questionCount: test.questions.length,
      }}
      hasSession={!!session}
      latestAttempt={
        latestAttempt
          ? {
              id: latestAttempt.id,
              scorePercentage: latestAttempt.scorePercentage,
              completedAt: latestAttempt.completedAt.toISOString(),
            }
          : null
      }
    />
  )
}
