import { setRequestLocale } from 'next-intl/server'
import { MediaLibrary } from '@/components/admin/MediaLibrary'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getGalleryItems } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminMediaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Developer-only — CLIENT viewers see the 404 page.
  await requireDeveloperPage()
  const gallery = await getGalleryItems()
  return <MediaLibrary gallery={gallery} />
}
