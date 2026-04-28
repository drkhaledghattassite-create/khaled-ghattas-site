import { setRequestLocale } from 'next-intl/server'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { getAllUsers } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const users = await getAllUsers()
  return <UsersPanel users={users} />
}
