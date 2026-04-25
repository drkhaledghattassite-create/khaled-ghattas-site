import { setRequestLocale } from 'next-intl/server'
import { InterviewForm } from '@/components/admin/InterviewForm'

type Props = { params: Promise<{ locale: string }> }

export default async function NewInterviewPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <InterviewForm mode="create" />
}
