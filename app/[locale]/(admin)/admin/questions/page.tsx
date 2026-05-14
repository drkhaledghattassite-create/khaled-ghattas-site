import { getTranslations, setRequestLocale } from 'next-intl/server'
import {
  getAdminQuestions,
  getDistinctQuestionCategories,
} from '@/lib/db/queries'
import { adminQuestionListSchema } from '@/lib/validators/user-question'
import {
  AdminQuestionsPage,
  type AdminQuestionsRow,
} from '@/components/admin/questions/AdminQuestionsPage'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// requireServerRole is invoked at the layout level (app/[locale]/(admin)/
// layout.tsx); reaching this page implies an authenticated ADMIN.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ status?: string; category?: string; page?: string }>
}

export default async function AdminQuestionsRoute({
  params,
  searchParams,
}: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.questions')
  const sp = await searchParams

  // Validate URL params via the same schema the action layer uses. Invalid
  // status (?status=foo) silently falls back to 'all'; out-of-range page
  // clamps to 1. Avoids 500ing on hand-typed URLs and keeps deep-links
  // resilient to admin URL-bar typos.
  const parsed = adminQuestionListSchema.safeParse({
    status: sp.status ?? 'all',
    page: sp.page ?? 1,
  })
  const input = parsed.success
    ? parsed.data
    : { status: 'all' as const, page: 1, pageSize: 50 }

  const categoryOptions = await getDistinctQuestionCategories(10)
  // Read category from search params; ignore unknown values to keep the
  // dropdown self-consistent with the surfaced options. The query helper
  // accepts an unknown string fine, but the dropdown would show empty if
  // the active value isn't in the option list.
  const categoryParam = (sp.category ?? '').trim()
  const categoryFilter =
    categoryParam && categoryOptions.includes(categoryParam)
      ? categoryParam
      : ('all' as const)

  const queue = await getAdminQuestions({
    status: input.status,
    category: categoryFilter,
    page: input.page,
    pageSize: 50,
  })

  // Project Dates → ISO strings for the client component. RSC payload
  // round-trips Dates as strings anyway; doing it explicitly prevents
  // surprise on the receiving end.
  const rows: AdminQuestionsRow[] = queue.rows.map((q) => ({
    id: q.id,
    subject: q.subject,
    body: q.body,
    category: q.category,
    isAnonymous: q.isAnonymous,
    status: q.status,
    answerReference: q.answerReference,
    answeredAt: q.answeredAt?.toISOString() ?? null,
    archivedAt: q.archivedAt?.toISOString() ?? null,
    createdAt: q.createdAt.toISOString(),
    user: q.user,
  }))

  return (
    <div className="space-y-5">
      <p className="text-[13px] text-fg3">{t('description')}</p>
      <AdminQuestionsPage
        rows={rows}
        total={queue.total}
        page={queue.page}
        pageSize={queue.pageSize}
        statusFilter={input.status}
        categoryFilter={categoryFilter}
        categoryOptions={categoryOptions}
        locale={locale === 'ar' ? 'ar' : 'en'}
      />
    </div>
  )
}
