import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { AdminTestsListPage } from '@/components/admin/tests/AdminTestsListPage'
import { getAllTestsForAdmin } from '@/lib/db/queries'
import { TEST_CATEGORIES, type TestCategory } from '@/lib/validators/test'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// The (admin) layout already calls requireServerRole('ADMIN'); this route is
// reached only by authenticated admins.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    search?: string
    status?: string
    category?: string
  }>
}

function readStatus(raw: string | undefined): 'all' | 'published' | 'draft' {
  if (raw === 'published' || raw === 'draft') return raw
  return 'all'
}

function readCategory(raw: string | undefined): TestCategory | 'all' {
  if (!raw) return 'all'
  if ((TEST_CATEGORIES as readonly string[]).includes(raw))
    return raw as TestCategory
  return 'all'
}

export default async function AdminTestsRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.tests.list')
  const sp = await searchParams

  const search = (sp.search ?? '').trim()
  const status = readStatus(sp.status)
  const category = readCategory(sp.category)

  const rows = await getAllTestsForAdmin({
    search: search || undefined,
    status,
    category,
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        <Link href="/admin/tests/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('cta_new')}
        </Link>
      </div>
      <AdminTestsListPage
        rows={rows.map((r) => ({
          id: r.id,
          slug: r.slug,
          titleAr: r.titleAr,
          titleEn: r.titleEn,
          category: r.category,
          isPublished: r.isPublished,
          questionCount: r.questionCount,
          attemptCount: r.attemptCount,
          averageScore: r.averageScore,
          createdAt: r.createdAt.toISOString(),
        }))}
        locale={locale === 'ar' ? 'ar' : 'en'}
        initialSearch={search}
        initialStatus={status}
        initialCategory={category}
      />
    </div>
  )
}
