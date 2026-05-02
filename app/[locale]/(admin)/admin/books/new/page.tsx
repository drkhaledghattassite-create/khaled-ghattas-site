import { setRequestLocale } from 'next-intl/server'
import { BookForm } from '@/components/admin/BookForm'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewBookPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <BookForm mode="create" />
}
