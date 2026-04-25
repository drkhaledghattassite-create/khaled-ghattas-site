import { setRequestLocale } from 'next-intl/server'
import { SettingsTabs } from '@/components/admin/SettingsTabs'
import { placeholderSettings } from '@/lib/placeholder-data'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <SettingsTabs settings={placeholderSettings} />
}
