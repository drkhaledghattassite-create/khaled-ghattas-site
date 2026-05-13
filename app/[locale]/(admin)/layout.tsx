import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminTopbar } from '@/components/admin/AdminTopbar'
import { requireServerRole } from '@/lib/auth/server'
import {
  countQueueByStatus,
  getDraftTestCount,
  getPendingQuestionCount,
} from '@/lib/db/queries'

type Props = {
  children: ReactNode
  params: Promise<{ locale: string }>
}

// All admin routes are auth-gated via requireServerRole below. force-dynamic
// makes every admin page render per-request — without this, the catch around
// the auth call lets Next prerender the routes as static HTML with the
// /login redirect baked in, bouncing real admins to login.
export const dynamic = 'force-dynamic'

// Block search engines at the page level. The robots.txt disallow is the
// crawl gate; this is the index gate for URLs Googlebot may have discovered
// via inbound links.
export const metadata: Metadata = {
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
}

export default async function AdminLayout({ children, params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // requireServerRole('CLIENT') admits CLIENT OR ADMIN per server.ts:78 —
  // both roles are trusted operators (CLIENT = site owner Dr. Khaled,
  // ADMIN = developer Kamal). See lib/auth/admin-guard.ts for the policy.
  let user
  try {
    user = await requireServerRole('CLIENT')
  } catch {
    redirect(`/${locale === 'ar' ? '' : `${locale}/`}login`)
  }

  // Pending-count + draft-count are read in parallel — both are single
  // COUNT(*) on narrow indexed predicates, so the cost is negligible.
  // They power the sidebar badges (Questions + Tests).
  //
  // Admin sidebar visibility used to be gated by site-settings toggles
  // (`admin.show_admin_*`). Those were removed — the admin viewing this
  // panel IS the operator, so hiding their own sections from themselves
  // never made sense. Every section is now always visible inside /admin.
  const [pendingQuestionCount, draftTestCount, queueCounts] =
    await Promise.all([
      getPendingQuestionCount().catch(() => 0),
      getDraftTestCount().catch(() => 0),
      countQueueByStatus().catch(() => ({
        PENDING: 0,
        SENDING: 0,
        SENT: 0,
        FAILED: 0,
        EXHAUSTED: 0,
      })),
    ])
  // Attention bucket = automatic retries that gave up + admin-marked
  // dead-letter rows. EXHAUSTED is the strong signal (we tried 5 times
  // and still failed); FAILED is the manual signal (admin decided to
  // stop retrying).
  const emailQueueAttentionCount =
    queueCounts.EXHAUSTED + queueCounts.FAILED

  return (
    <div className="flex min-h-dvh bg-background">
      <AdminSidebar
        user={user}
        pendingQuestionCount={pendingQuestionCount}
        draftTestCount={draftTestCount}
        emailQueueAttentionCount={emailQueueAttentionCount}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar
          user={user}
          pendingQuestionCount={pendingQuestionCount}
          draftTestCount={draftTestCount}
          emailQueueAttentionCount={emailQueueAttentionCount}
        />
        <main id="main-content" tabIndex={-1} className="flex-1 overflow-x-hidden p-4 md:p-8 focus:outline-none">{children}</main>
      </div>
    </div>
  )
}
