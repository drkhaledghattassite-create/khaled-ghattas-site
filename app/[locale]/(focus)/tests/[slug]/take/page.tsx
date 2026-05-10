import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import { getTestBySlug } from '@/lib/db/queries'
import { TestTakePage } from '@/components/tests/TestTakePage'

type Props = {
  params: Promise<{ locale: string; slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'tests.take.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function TestTakeRoute({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({
      href: `/login?redirect=${encodeURIComponent(`/tests/${slug}/take`)}`,
      locale,
    })
  }

  const test = await getTestBySlug(slug)
  if (!test) notFound()

  const viewerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  return (
    <TestTakePage
      locale={viewerLocale}
      test={{
        slug: test.slug,
        titleAr: test.titleAr,
        titleEn: test.titleEn,
        questions: test.questions.map((q) => ({
          id: q.id,
          promptAr: q.promptAr,
          promptEn: q.promptEn,
          options: q.options.map((o) => ({
            id: o.id,
            labelAr: o.labelAr,
            labelEn: o.labelEn,
          })),
        })),
      }}
    />
  )
}
