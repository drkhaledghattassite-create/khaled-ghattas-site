import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { InterviewsTable } from '@/components/admin/InterviewsTable'
import { getInterviews } from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminInterviewsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.interviews')
  const interviews = await getInterviews()

  // Phase F2 — resolve thumbnail storage keys server-side. Fallback is the
  // universal placeholder, NOT the raw value — a raw R2 key (`interview-
  // thumbnail/uuid/file.jpg`) would crash next/image in InterviewsTable.
  const resolvedInterviews = await Promise.all(
    interviews.map(async (interview) => ({
      ...interview,
      thumbnailImage:
        (await resolvePublicUrl(interview.thumbnailImage)) ?? '/dr khaled photo.jpeg',
    })),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        {/* btn-pill-primary handles hover/focus/disabled state via globals.css. */}
        <Link href="/admin/interviews/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <InterviewsTable interviews={resolvedInterviews} />
    </div>
  )
}
