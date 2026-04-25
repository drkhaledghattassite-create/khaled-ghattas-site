import { setRequestLocale } from 'next-intl/server'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { placeholderUsers } from '@/lib/placeholder-data'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // TODO: replace with paginated getUsers() in Phase 4B
  return <UsersPanel users={placeholderUsers} />
}
