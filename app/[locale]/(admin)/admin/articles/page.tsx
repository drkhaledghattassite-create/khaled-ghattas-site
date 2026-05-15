import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { ArticlesTable } from '@/components/admin/ArticlesTable'
import { getArticles } from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminArticlesPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.articles')
  const articles = await getArticles()

  // Phase F2 — resolve cover storage keys server-side. `Article.coverImage`
  // is nullable, so we hand null through unchanged when resolution returns
  // null (the table already renders an empty placeholder cell for null).
  const resolvedArticles = await Promise.all(
    articles.map(async (article) => ({
      ...article,
      coverImage: await resolvePublicUrl(article.coverImage),
    })),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-fg3">{t('description')}</p>
        </div>
        {/* btn-pill-primary owns hover/focus/disabled state — no need to hand-roll. */}
        <Link href="/admin/articles/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>

      <ArticlesTable articles={resolvedArticles} />
    </div>
  )
}
