import { setRequestLocale } from 'next-intl/server'
import { TestBuilderPage } from '@/components/admin/tests/TestBuilderPage'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function NewAdminTestRoute({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <TestBuilderPage
      mode="create"
      locale={locale === 'ar' ? 'ar' : 'en'}
      initial={null}
    />
  )
}
