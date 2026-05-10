import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getTestAttemptById } from '@/lib/db/queries'
import { TestResultPage } from '@/components/tests/TestResultPage'

type Props = {
  params: Promise<{ locale: string; slug: string; attemptId: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tests.result.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function TestResultRoute({ params }: Props) {
  const { locale, slug, attemptId } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({
      href: `/login?redirect=${encodeURIComponent(`/tests/${slug}/result/${attemptId}`)}`,
      locale,
    })
  }

  const attempt = await getTestAttemptById(attemptId, session!.user.id)
  // 404 also covers (a) attempt doesn't exist, (b) belongs to another user,
  // (c) test was deleted under it. Don't leak existence by returning 403 —
  // a cross-user enumeration attempt should look identical to a typo.
  if (!attempt) notFound()
  if (attempt.test.slug !== slug) notFound()

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <TestResultPage
      locale={viewerLocale}
      result={{
        attempt: {
          id: attempt.id,
          scorePercentage: attempt.scorePercentage,
          correctCount: attempt.correctCount,
          totalCount: attempt.totalCount,
          completedAt: attempt.completedAt.toISOString(),
        },
        test: {
          slug: attempt.test.slug,
          titleAr: attempt.test.titleAr,
          titleEn: attempt.test.titleEn,
        },
        answers: attempt.answers.map((ans) => ({
          id: ans.id,
          isCorrect: ans.isCorrect,
          question: {
            id: ans.question.id,
            promptAr: ans.question.promptAr,
            promptEn: ans.question.promptEn,
            explanationAr: ans.question.explanationAr,
            explanationEn: ans.question.explanationEn,
            options: ans.question.options.map((o) => ({
              id: o.id,
              displayOrder: o.displayOrder,
              labelAr: o.labelAr,
              labelEn: o.labelEn,
              isCorrect: o.isCorrect,
            })),
          },
          selectedOption: {
            id: ans.selectedOption.id,
            displayOrder: ans.selectedOption.displayOrder,
            labelAr: ans.selectedOption.labelAr,
            labelEn: ans.selectedOption.labelEn,
          },
        })),
      }}
    />
  )
}
