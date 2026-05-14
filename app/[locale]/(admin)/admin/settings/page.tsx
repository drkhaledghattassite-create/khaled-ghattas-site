import { setRequestLocale } from 'next-intl/server'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getAllSettings } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Developer-only: CLIENT viewers see the 404 page. The (admin) layout
  // has already established ADMIN-or-CLIENT; this narrows to ADMIN.
  await requireDeveloperPage()
  const settings = await getAllSettings()
  return <SettingsTabs settings={settings} />
}
