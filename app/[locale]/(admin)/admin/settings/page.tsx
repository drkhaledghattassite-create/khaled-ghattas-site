import { setRequestLocale } from 'next-intl/server'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { getAllSettings } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const settings = await getAllSettings()
  return <SettingsTabs settings={settings} />
}
