import { setRequestLocale } from 'next-intl/server'
import { UsersPanel } from '@/components/admin/UsersPanel'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getAllUsers } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminUsersPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Developer-only — CLIENT viewers see the 404 page. User CRUD (incl. role
  // editing) is a privilege-management surface, ADMIN-only. The matching API
  // route uses `requireAdminStrict` for the same reason.
  const viewer = await requireDeveloperPage()
  const users = await getAllUsers()
  return <UsersPanel users={users} viewerRole={viewer.role} />
}
