import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { TestBuilderPage } from '@/components/admin/tests/TestBuilderPage'
import { getTestForAdmin } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditAdminTestRoute({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const test = await getTestForAdmin(id)
  if (!test) notFound()

  // Project everything to the client-friendly shape (Dates → ISO,
  // explicit nulls). The TestBuilderPage owns no DB types.
  return (
    <TestBuilderPage
      mode="edit"
      locale={locale === 'ar' ? 'ar' : 'en'}
      initial={{
        id: test.id,
        slug: test.slug,
        titleAr: test.titleAr,
        titleEn: test.titleEn,
        descriptionAr: test.descriptionAr,
        descriptionEn: test.descriptionEn,
        introAr: test.introAr,
        introEn: test.introEn,
        category: test.category,
        estimatedMinutes: test.estimatedMinutes,
        coverImageUrl: test.coverImageUrl,
        isPublished: test.isPublished,
        displayOrder: test.displayOrder,
        questions: test.questions.map((q) => ({
          id: q.id,
          promptAr: q.promptAr,
          promptEn: q.promptEn,
          explanationAr: q.explanationAr,
          explanationEn: q.explanationEn,
          options: q.options.map((o) => ({
            id: o.id,
            labelAr: o.labelAr,
            labelEn: o.labelEn,
            isCorrect: o.isCorrect,
          })),
        })),
      }}
    />
  )
}
