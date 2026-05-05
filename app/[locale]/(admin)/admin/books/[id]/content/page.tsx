import { notFound, redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { SessionContentEditor } from '@/components/admin/SessionContentEditor'
import { getBookById, getSessionItemsBySessionId } from '@/lib/db/queries'

// Auth-gated under (admin)/layout.tsx; force-dynamic so cookies are read.
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function AdminSessionContentPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const book = await getBookById(id)
  if (!book) notFound()

  // Productype guard at the page boundary — non-SESSION rows shouldn't have
  // a content surface. Redirect rather than 404 because an admin clicking
  // the wrong link benefits from a sensible bounce-back.
  if (book.productType !== 'SESSION') {
    redirect(`/admin/books/${book.id}/edit`)
  }

  const t = await getTranslations('admin.session_content')
  const items = await getSessionItemsBySessionId(book.id)
  const sessionTitle = locale === 'ar' ? book.titleAr : book.titleEn

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/books"
          className="link-underline text-[12px] text-fg3 hover:text-fg1"
        >
          {t('back_to_books')}
        </Link>
        <h1 className="text-[20px] font-semibold text-fg1">
          {t('page_title', { title: sessionTitle })}
        </h1>
        <p className="text-[13px] text-fg3">{t('page_description')}</p>
      </div>
      <SessionContentEditor sessionId={book.id} initialItems={items} />
    </div>
  )
}
