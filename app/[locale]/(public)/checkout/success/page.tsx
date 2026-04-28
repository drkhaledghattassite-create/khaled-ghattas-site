import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'checkout.success' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false },
  }
}

export default async function CheckoutSuccessPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('checkout.success')
  const isRtl = locale === 'ar'

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-[60vh] [padding:clamp(80px,10vw,140px)_clamp(20px,5vw,56px)] flex items-center justify-center"
    >
      <div className="mx-auto max-w-[640px] text-center flex flex-col gap-6">
        <span className="section-eyebrow self-center">{t('eyebrow')}</span>
        <h1
          className={`m-0 text-[clamp(32px,4vw,52px)] leading-[1.1] font-bold tracking-[-0.02em] text-[var(--color-fg1)] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display'
          }`}
        >
          {t('heading')}
        </h1>
        <p
          className={`m-0 text-[16px] leading-[1.6] text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('description')}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-2">
          <Link href="/dashboard/library" className="btn-pill btn-pill-primary">
            {t('open_library')}
          </Link>
          <Link href="/books" className="btn-pill btn-pill-secondary">
            {t('browse_more')}
          </Link>
        </div>
      </div>
    </section>
  )
}
