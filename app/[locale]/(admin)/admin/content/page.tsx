import { setRequestLocale } from 'next-intl/server'
import { ContentBlocksEditor } from '@/components/admin/ContentBlocksEditor'
import { placeholderContentBlocks } from '@/lib/placeholder-data'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminContentPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ContentBlocksEditor blocks={placeholderContentBlocks} />
}
