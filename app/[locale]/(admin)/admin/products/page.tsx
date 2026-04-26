import { getTranslations, setRequestLocale } from 'next-intl/server'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.products')

  return (
    <div className="rounded-md border border-dashed border-ink/30 bg-cream-soft p-12 text-center">
      <h2
        className="text-ink font-display font-semibold text-[22px] uppercase"
      >
        {t('coming_soon_title')}
      </h2>
      <p className="mt-2 max-w-md mx-auto text-[13px] text-ink-muted">{t('coming_soon_text')}</p>
    </div>
  )
}
