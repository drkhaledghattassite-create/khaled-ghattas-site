import { setRequestLocale } from 'next-intl/server'
import { ArticleForm } from '@/components/admin/ArticleForm'

type Props = { params: Promise<{ locale: string }> }

export default async function NewArticlePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <ArticleForm mode="create" />
}
