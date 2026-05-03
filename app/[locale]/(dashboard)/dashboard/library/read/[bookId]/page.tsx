import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { Hourglass } from 'lucide-react'
import { Link, redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import {
  getBookById,
  getBookmarks,
  getReadingProgress,
  userOwnsProduct,
} from '@/lib/db/queries'
import { storage } from '@/lib/storage'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
// PdfReader is loaded via a client-only dynamic-import wrapper because
// pdfjs-dist crashes when evaluated in Next's server bundle. See the
// architecture note at the top of components/library/PdfReaderClient.tsx.
import { PdfReaderClient } from '@/components/library/PdfReaderClient'

// Auth-gated route — render per-request so getServerSession sees real cookies.
// Without this, the catch in lib/auth/server.ts swallows the dynamic-API error
// and Next prerenders static HTML with session=null baked in.
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; bookId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, bookId } = await params
  const book = await getBookById(bookId)
  const isAr = locale === 'ar'
  // Falls back to a generic title if the book lookup misses (404 path).
  const title = book ? (isAr ? book.titleAr : book.titleEn) : 'Reader'
  return {
    title,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function LibraryReadPage({ params }: Props) {
  const { locale, bookId } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }
  const userId = session!.user.id

  const book = await getBookById(bookId)
  if (!book) notFound()

  // Ownership gate — same helper used by /api/content/access. Don't
  // expose 404 vs 403 for unowned-but-existing books; redirect back to
  // library to avoid leaking catalog membership.
  const owns = await userOwnsProduct(userId, book.id)
  if (!owns) {
    redirect({ href: '/dashboard/library', locale })
  }

  const t = await getTranslations({ locale, namespace: 'reader' })

  // Locale type narrowing for the client component prop.
  const readerLocale: 'ar' | 'en' = locale === 'ar' ? 'ar' : 'en'

  // No digital file attached yet — show a Qalem-styled "not yet
  // available" state inside the dashboard chrome. The user owns the
  // product; the file just hasn't been uploaded. Don't 404.
  if (!book.digitalFile || book.digitalFile.trim() === '') {
    return (
      <DashboardLayout activeTab="library" user={session!.user}>
        <UnavailableNotice
          locale={readerLocale}
          title={t('unavailable.title')}
          body={t('unavailable.body')}
          cta={t('unavailable.cta')}
        />
      </DashboardLayout>
    )
  }

  // Mint a signed URL via the storage abstraction. 1h TTL is the same
  // as /api/content/access — long enough to read for a session, short
  // enough that a leaked link expires reasonably.
  const signed = await storage.getSignedUrl({
    productType: 'BOOK',
    productId: book.id,
    storageKey: book.digitalFile,
    userId,
    expiresInSeconds: 3600,
  })

  // Fetch progress + bookmarks in parallel — independent reads. The
  // bookmark query gracefully falls back to [] when migration 0004 is
  // not applied or the user has no bookmarks yet.
  const [progress, bookmarks] = await Promise.all([
    getReadingProgress(userId, book.id),
    getBookmarks(userId, book.id),
  ])
  const initialPage = progress?.lastPage ?? 1

  const title = readerLocale === 'ar' ? book.titleAr : book.titleEn

  // Full-bleed immersive reader. We deliberately do NOT wrap in
  // DashboardLayout for the read path — the cramped, multi-stack chrome
  // (site header + dashboard tabs + card border) was the user-reported
  // "really don't like the experience" feeling. The reader takes over
  // the viewport via `fixed inset-0` and z-stacks above the SiteHeader
  // (z-50) that the (dashboard) group layout still renders. AppLoader
  // (z-9999) and Sonner toasts (effective z-max) intentionally sit
  // above this overlay so route transitions and resume toasts remain
  // visible.
  //
  // Auth and ownership are already enforced by getServerSession +
  // userOwnsProduct above; DashboardLayout was purely visual chrome
  // and contributed no security gating.
  return (
    <div className="fixed inset-0 z-[100]">
      <PdfReaderClient
        bookId={book.id}
        pdfUrl={signed.url}
        initialPage={initialPage}
        initialBookmarks={bookmarks}
        locale={readerLocale}
        title={title}
      />
    </div>
  )
}

// Server-rendered "no PDF attached" state. The original version was a small
// dashed-border card floating in a sea of empty space — it read as
// "placeholder we forgot to design" rather than a polite empty state.
// New version: vertically centred in the dashboard content area, soft
// accent-tinted icon badge, generous spacing, no card chrome — the dashed
// border was the main thing making it feel unfinished.
function UnavailableNotice({
  locale,
  title,
  body,
  cta,
}: {
  locale: 'ar' | 'en'
  title: string
  body: string
  cta: string
}) {
  const isRtl = locale === 'ar'
  const fontHeading = isRtl ? 'font-arabic-display' : 'font-arabic-display'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'
  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      // min-h fills the viewport minus rough room for the SiteHeader (~64px)
      // and the dashboard tab strip (~96px) so the empty state doesn't sit
      // pinned to the top above a vast dead zone. flex-center handles vertical
      // and horizontal centering inside that area.
      className="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center px-4 py-[clamp(48px,10vw,96px)] text-center min-h-[calc(100vh-260px)]"
    >
      <div
        className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
        aria-hidden="true"
      >
        <Hourglass className="h-7 w-7" strokeWidth={1.6} />
      </div>
      <h1
        className={`m-0 mb-3 text-[clamp(24px,3.5vw,34px)] leading-[1.15] font-bold tracking-[-0.015em] text-[var(--color-fg1)] ${fontHeading}`}
      >
        {title}
      </h1>
      <p
        className={`m-0 mb-8 max-w-[440px] text-[16px] leading-[1.7] text-[var(--color-fg2)] ${fontBody}`}
      >
        {body}
      </p>
      <Link
        href="/dashboard/library"
        className={`btn-pill btn-pill-primary inline-flex !text-[14px] !py-2.5 !px-5 ${fontBody}`}
      >
        {cta}
      </Link>
    </section>
  )
}
