import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { InterviewsGallery } from '@/components/sections/InterviewsGallery'
import { getInterviews } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'interviews.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function InterviewsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('interviews.page')
  const interviews = await getInterviews()

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
        image={{ src: '/placeholder/hero/portrait-color.jpg', alt: '' }}
      />
      <InterviewsGallery interviews={interviews} />
    </>
  )
}
