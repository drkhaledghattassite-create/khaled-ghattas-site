import { setRequestLocale } from 'next-intl/server'
import { ContentBlocksEditor } from '@/components/admin/ContentBlocksEditor'
import { getAllContentBlocks } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminContentPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const blocks = await getAllContentBlocks()
  return <ContentBlocksEditor blocks={blocks} />
}
