import { Plus } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { BooksTable } from '@/components/admin/BooksTable'
import { getBooks } from '@/lib/db/queries'
import { resolvePublicUrl } from '@/lib/storage/public-url'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminBooksPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.books')
  const books = await getBooks()

  // Phase F2 — resolve cover storage keys server-side so the client
  // BooksTable can pass them straight to <Image>. `coverImage` is
  // schema-NOT-NULL; preserve the original on resolution failure.
  // resolvePublicUrl is React.cache'd so duplicate keys are free.
  const resolvedBooks = await Promise.all(
    books.map(async (book) => ({
      ...book,
      coverImage: (await resolvePublicUrl(book.coverImage)) ?? book.coverImage,
    })),
  )

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-fg3">{t('description')}</p>
        {/* btn-pill-primary handles hover/focus/disabled state via globals.css. */}
        <Link href="/admin/books/new" className="btn-pill btn-pill-primary">
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {t('add')}
        </Link>
      </div>
      <BooksTable books={resolvedBooks} />
    </div>
  )
}
