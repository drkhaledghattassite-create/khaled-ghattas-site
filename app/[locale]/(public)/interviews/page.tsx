import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { InterviewsGallery } from '@/components/sections/InterviewsGallery'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { getInterviews } from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'interviews.meta' })
  return pageMetadata({
    locale,
    path: '/interviews',
    title: t('title'),
    description: t('description'),
  })
}

export default async function InterviewsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('interviews')) {
    return <ComingSoon pageKey="interviews" />
  }

  const t = await getTranslations('interviews.page')
  const tCommon = await getTranslations('common')
  const interviews = await getInterviews()

  // Phase F2 — resolve thumbnail storage keys server-side before passing into
  // the client InterviewsGallery. `thumbnailImage` is schema-NOT-NULL so we
  // fall back to the original value on resolution failure.
  const resolvedInterviews = await Promise.all(
    interviews.map(async (interview) => ({
      ...interview,
      thumbnailImage:
        (await resolvePublicUrl(interview.thumbnailImage)) ?? interview.thumbnailImage,
    })),
  )

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
        image={{ src: '/DSC06608.JPG', alt: tCommon('alt.portrait_dr_khaled') }}
      />
      <InterviewsGallery interviews={resolvedInterviews} />
    </>
  )
}
