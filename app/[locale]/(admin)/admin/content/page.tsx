import { setRequestLocale } from 'next-intl/server'
import { ContentBlocksEditor } from '@/components/admin/ContentBlocksEditor'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getAllContentBlocks } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminContentPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Developer-only — CLIENT viewers see the 404 page.
  await requireDeveloperPage()
  const blocks = await getAllContentBlocks()
  return <ContentBlocksEditor blocks={blocks} />
}
