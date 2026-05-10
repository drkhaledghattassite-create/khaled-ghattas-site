import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { TestAnalyticsPage } from '@/components/admin/tests/TestAnalyticsPage'
import { getTestAnalytics } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real
// cookies. Without this, the catch around the auth call lets Next prerender
// static HTML and bake in a /login redirect.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminTestAnalyticsRoute({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const analytics = await getTestAnalytics(id)
  if (!analytics) notFound()

  return (
    <TestAnalyticsPage
      locale={locale === 'ar' ? 'ar' : 'en'}
      analytics={{
        test: {
          id: analytics.test.id,
          slug: analytics.test.slug,
          titleAr: analytics.test.titleAr,
          titleEn: analytics.test.titleEn,
          category: analytics.test.category,
          isPublished: analytics.test.isPublished,
        },
        totalAttempts: analytics.totalAttempts,
        uniqueUsers: analytics.uniqueUsers,
        averageScore: analytics.averageScore,
        scoreDistribution: analytics.scoreDistribution,
        questions: analytics.questions.map((q) => ({
          question: {
            id: q.question.id,
            displayOrder: q.question.displayOrder,
            promptAr: q.question.promptAr,
            promptEn: q.question.promptEn,
            explanationAr: q.question.explanationAr,
            explanationEn: q.question.explanationEn,
          },
          options: q.options.map((o) => ({
            option: {
              id: o.option.id,
              labelAr: o.option.labelAr,
              labelEn: o.option.labelEn,
            },
            selectionCount: o.selectionCount,
            selectionPercentage: o.selectionPercentage,
            isCorrect: o.isCorrect,
          })),
          correctCount: q.correctCount,
          correctPercentage: q.correctPercentage,
        })),
        recentAttempts: analytics.recentAttempts.map((a) => ({
          id: a.id,
          scorePercentage: a.scorePercentage,
          completedAt: a.completedAt.toISOString(),
          user: a.user,
        })),
      }}
    />
  )
}
