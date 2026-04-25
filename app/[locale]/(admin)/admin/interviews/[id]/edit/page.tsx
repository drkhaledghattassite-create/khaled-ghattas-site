import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { InterviewForm } from '@/components/admin/InterviewForm'
import { getInterviews } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditInterviewPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const interviews = await getInterviews()
  const interview = interviews.find((i) => i.id === id)
  if (!interview) notFound()

  return (
    <InterviewForm
      mode="edit"
      interviewId={interview.id}
      initialValues={{
        slug: interview.slug,
        titleAr: interview.titleAr,
        titleEn: interview.titleEn,
        descriptionAr: interview.descriptionAr ?? '',
        descriptionEn: interview.descriptionEn ?? '',
        thumbnailImage: interview.thumbnailImage,
        videoUrl: interview.videoUrl,
        source: interview.source ?? '',
        sourceAr: interview.sourceAr ?? '',
        year: interview.year,
        status: interview.status,
        featured: interview.featured,
        orderIndex: interview.orderIndex,
      }}
    />
  )
}
