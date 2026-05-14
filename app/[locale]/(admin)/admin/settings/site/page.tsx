import { setRequestLocale } from 'next-intl/server'
import { SiteSettingsForm } from '@/components/admin/SiteSettingsForm'
import { requireDeveloperPage } from '@/lib/auth/server'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { getArticles, getBooks, getInterviews } from '@/lib/db/queries'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminSiteSettingsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  // Developer-only — CLIENT viewers see the 404 page.
  await requireDeveloperPage()

  const [settings, books, articles, interviews] = await Promise.all([
    getCachedSiteSettings(),
    getBooks({ limit: 200 }),
    getArticles({ limit: 200 }),
    getInterviews({ limit: 200 }),
  ])

  // Pass only the lean fields the form needs — keep the client bundle small.
  const bookOptions = books.map((b) => ({
    id: b.id,
    titleAr: b.titleAr,
    titleEn: b.titleEn,
  }))
  const articleOptions = articles.map((a) => ({
    slug: a.slug,
    titleAr: a.titleAr,
    titleEn: a.titleEn,
  }))
  const interviewOptions = interviews.map((i) => ({
    id: i.id,
    titleAr: i.titleAr,
    titleEn: i.titleEn,
  }))

  return (
    <SiteSettingsForm
      locale={locale}
      initialSettings={settings}
      bookOptions={bookOptions}
      articleOptions={articleOptions}
      interviewOptions={interviewOptions}
    />
  )
}
