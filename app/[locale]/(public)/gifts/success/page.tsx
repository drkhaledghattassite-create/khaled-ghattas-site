import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GiftSuccessIsland } from './GiftSuccessIsland'
import { SITE_URL } from '@/lib/constants'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gifts.meta' })
  return {
    title: t('success_title'),
    description: t('success_description'),
    robots: { index: false, follow: false },
  }
}

export default async function GiftSuccessRoute({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const sessionId =
    typeof sp.session_id === 'string' && sp.session_id.length <= 200
      ? sp.session_id
      : null

  return (
    <section className="border-b border-[var(--color-border)]">
      <GiftSuccessIsland
        sessionId={sessionId}
        locale={locale === 'ar' ? 'ar' : 'en'}
        origin={SITE_URL}
      />
    </section>
  )
}
