import { getTranslations, setRequestLocale } from 'next-intl/server'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminProductsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.products')

  return (
    <div className="rounded-md border border-dashed border-border bg-bg-elevated p-12 text-center">
      <h2 className="text-fg1 font-display font-semibold text-[22px] uppercase">
        {t('coming_soon_title')}
      </h2>
      <p className="mt-2 max-w-md mx-auto text-[13px] text-fg3">{t('coming_soon_text')}</p>
    </div>
  )
}
