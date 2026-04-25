import { setRequestLocale } from 'next-intl/server'
import { BookForm } from '@/components/admin/BookForm'

type Props = { params: Promise<{ locale: string }> }

export default async function NewBookPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <BookForm mode="create" />
}
