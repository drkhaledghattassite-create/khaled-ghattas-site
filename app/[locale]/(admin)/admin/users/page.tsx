import { setRequestLocale } from 'next-intl/server'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { getServerSession } from '@/lib/auth/server'
import { getAllUsers } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Layout already gates on ADMIN ∪ CLIENT; the session lookup here is just
  // to thread the viewer role into the panel so role-edit UI hides for CLIENT.
  // The API guard (requireAdminStrict) is the real authority — this is UX.
  const [session, users] = await Promise.all([
    getServerSession(),
    getAllUsers(),
  ])
  const viewerRole = session?.user.role ?? 'USER'
  return <UsersPanel users={users} viewerRole={viewerRole} />
}
