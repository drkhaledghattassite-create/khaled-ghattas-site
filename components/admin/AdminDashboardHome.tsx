import { getTranslations } from 'next-intl/server'
import { AttentionRow } from '@/components/admin/dashboard/AttentionRow'
import { AudienceSnapshot } from '@/components/admin/dashboard/AudienceSnapshot'
import { GreetingBand } from '@/components/admin/dashboard/GreetingBand'
import { PerformanceBand } from '@/components/admin/dashboard/PerformanceBand'
import { RecentActivityStrip } from '@/components/admin/dashboard/RecentActivityStrip'
import { ResearchHighlights } from '@/components/admin/dashboard/ResearchHighlights'
import { SectionHeader } from '@/components/admin/dashboard/SectionHeader'
import type {
  AdminQuestion,
  AudienceSnapshotCounts,
  BookingOrderWithMeta,
  DailyComparison,
  DailyCountComparison,
  TestResearchHighlight,
} from '@/lib/db/queries'
import type { Order } from '@/lib/db/schema'

// Composes the six sections of /admin home. Pure orchestrator — every
// section is its own component (in components/admin/dashboard/), every
// query happens on the server in the page route. This component is async
// and runs server-side too so the eyebrow / heading translations resolve
// without forcing a client boundary.

export async function AdminDashboardHome({
  locale,
  userName,
  viewerRole,
  attentionCounts,
  greetingCounts,
  audience,
  revenue,
  subscribers,
  orders,
  bookingOrders,
  questions,
  researchHighlights,
}: {
  locale: string
  userName: string | null
  /**
   * Role of the operator viewing /admin. Threaded through to GreetingBand
   * so it can decide whether to prepend "Dr." / "د." (CLIENT yes, ADMIN
   * no — Kamal shouldn't be addressed as "Dr.").
   */
  viewerRole: 'USER' | 'ADMIN' | 'CLIENT' | null
  attentionCounts: {
    pendingQuestions: number
    newCorporateRequests: number
    expiringGifts: number
    pendingInterest: number
    emailQueueAttention: number
  }
  greetingCounts: {
    pendingQuestions: number
    newCorporateRequests: number
    expiringGifts: number
    revenueDeltaPercent: number | null
    pendingBookingInterest: number
  }
  audience: AudienceSnapshotCounts
  revenue: DailyComparison
  subscribers: DailyCountComparison
  orders: Order[]
  bookingOrders: BookingOrderWithMeta[]
  questions: AdminQuestion[]
  researchHighlights: TestResearchHighlight[]
}) {
  const t = await getTranslations({ locale, namespace: 'admin.dashboard' })

  return (
    <div className="mx-auto w-full max-w-[var(--container-max,1280px)] pb-16">
      <GreetingBand
        locale={locale}
        userName={userName}
        viewerRole={viewerRole}
        counts={greetingCounts}
      />

      <section className="mt-10">
        <SectionHeader
          eyebrow={t('attention.eyebrow')}
          heading={t('attention.heading')}
          seeAllHref="/admin/orders"
          seeAllLabel={t('attention.see_all')}
        />
        <AttentionRow {...attentionCounts} viewerRole={viewerRole} />
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow={t('performance.eyebrow')}
          heading={t('performance.heading')}
        />
        <PerformanceBand
          locale={locale}
          revenue={revenue}
          subscribers={subscribers}
        />
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow={t('audience.eyebrow')}
          heading={t('audience.heading')}
        />
        <AudienceSnapshot locale={locale} counts={audience} />
      </section>

      <section className="mt-10">
        <SectionHeader
          eyebrow={t('activity.eyebrow')}
          heading={t('activity.heading')}
        />
        <RecentActivityStrip
          locale={locale}
          orders={orders}
          bookingOrders={bookingOrders}
          questions={questions}
        />
      </section>

      <section className="mt-10">
        <ResearchHighlights locale={locale} highlights={researchHighlights} />
      </section>
    </div>
  )
}
