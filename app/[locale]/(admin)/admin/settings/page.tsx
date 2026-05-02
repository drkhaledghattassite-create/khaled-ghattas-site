import { setRequestLocale } from 'next-intl/server'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { getAllSettings } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const settings = await getAllSettings()
  return <SettingsTabs settings={settings} />
}
