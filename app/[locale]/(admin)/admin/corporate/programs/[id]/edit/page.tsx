import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { CorporateProgramForm } from '@/components/admin/CorporateProgramForm'
import { getCorporateProgram } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditCorporateProgramPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const program = await getCorporateProgram(id)
  if (!program) notFound()

  return (
    <CorporateProgramForm
      mode="edit"
      programId={program.id}
      initialValues={{
        slug: program.slug,
        titleAr: program.titleAr,
        titleEn: program.titleEn,
        descriptionAr: program.descriptionAr,
        descriptionEn: program.descriptionEn,
        durationAr: program.durationAr ?? '',
        durationEn: program.durationEn ?? '',
        audienceAr: program.audienceAr ?? '',
        audienceEn: program.audienceEn ?? '',
        coverImage: program.coverImage ?? '',
        status: program.status,
        featured: program.featured,
        orderIndex: program.orderIndex,
      }}
    />
  )
}
