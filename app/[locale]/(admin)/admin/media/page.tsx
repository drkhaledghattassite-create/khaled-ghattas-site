import { setRequestLocale } from 'next-intl/server'
import { MediaLibrary } from '@/components/admin/MediaLibrary'
import { getGalleryItems } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminMediaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const gallery = await getGalleryItems()
  return <MediaLibrary gallery={gallery} />
}
