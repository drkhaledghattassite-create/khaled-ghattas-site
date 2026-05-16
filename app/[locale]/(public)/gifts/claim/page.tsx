import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GiftClaimPage } from '@/components/gifts/GiftClaimPage'
import { getGiftByToken, resolveGiftItemPrice, getUserById } from '@/lib/db/queries'
import type { Gift } from '@/lib/db/schema'
import type { GiftableItemType } from '@/lib/validators/gift'
import { getServerSession, type ServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gifts.meta' })
  const base = pageMetadata({
    locale,
    path: '/gifts/claim',
    title: t('claim_title'),
    description: t('claim_description'),
  })
  // Per-token URLs are user-specific; without ?token=... the page renders a
  // meaningless invalid-state. Block indexing across both locales so search
  // engines never surface a redeem link or the bare error page. Crawlers
  // can still follow links from this page.
  return {
    ...base,
    robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
  }
}

// Sentinel re-throw for Next.js's dynamic-rendering opt-out signal. Catching
// it would silently break SSR; we must always rethrow.
function rethrowIfDynamic(err: unknown): void {
  if ((err as { digest?: string })?.digest === 'DYNAMIC_SERVER_USAGE') {
    throw err
  }
}

export default async function GiftsClaimRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const tokenRaw = typeof sp.token === 'string' ? sp.token : ''
  const token = tokenRaw.trim()

  // Distinguish "gift not found" (null) from "DB transient error" (loadError).
  // A swallowed catch makes a Neon timeout look like an invalid link to the
  // user — we want the temporary_error render state for the latter case.
  let giftLoadError = false
  let sessionLoadError = false

  const [gift, session] = await Promise.all([
    token
      ? getGiftByToken(token).catch((err): Gift | null => {
          rethrowIfDynamic(err)
          console.error('[gifts.claim.page] getGiftByToken failed', {
            tokenPrefix: token.slice(0, 8) + '...',
            err,
          })
          giftLoadError = true
          return null
        })
      : Promise.resolve<Gift | null>(null),
    getServerSession().catch((err): ServerSession => {
      rethrowIfDynamic(err)
      console.error('[gifts.claim.page] getServerSession failed', { err })
      sessionLoadError = true
      return null
    }),
  ])

  const loadError = giftLoadError || sessionLoadError

  // Resolve item display info when the viewer either (a) is the intended
  // recipient of a still-pending gift, or (b) has already claimed it and is
  // revisiting (refresh / back button / re-opens the email). For EMAIL_MISMATCH
  // we deliberately do NOT resolve item details (don't leak gift contents to
  // wrong-account viewers).
  let itemDisplay: {
    titleAr: string
    titleEn: string
    coverImage: string | null
    itemType: GiftableItemType
  } | null = null
  let senderDisplayName: string | null = null

  const sessionEmailLc = session?.user.email?.trim().toLowerCase() ?? null
  const giftEmailLc = gift?.recipientEmail?.toLowerCase() ?? null
  const emailMatches =
    sessionEmailLc != null && giftEmailLc != null && sessionEmailLc === giftEmailLc

  const isPendingForViewer =
    gift?.status === 'PENDING' && (!session || emailMatches)
  const alreadyClaimedByViewer =
    gift?.status === 'CLAIMED' &&
    session != null &&
    gift.recipientUserId === session.user.id

  if (gift && (isPendingForViewer || alreadyClaimedByViewer)) {
    const summary = await resolveGiftItemPrice(
      gift.itemType === 'TEST' ? 'BOOK' : (gift.itemType as GiftableItemType),
      gift.itemId,
    ).catch(() => null)
    if (summary) {
      // Phase F2 — resolve R2 storage key to signed URL server-side.
      const resolvedCover = await resolvePublicUrl(summary.coverImage)
      itemDisplay = {
        titleAr: summary.titleAr,
        titleEn: summary.titleEn,
        coverImage: resolvedCover ?? summary.coverImage,
        itemType: summary.itemType,
      }
    }
    if (gift.source === 'USER_PURCHASE' && gift.senderUserId) {
      const sender = await getUserById(gift.senderUserId).catch(() => null)
      senderDisplayName = sender?.name ?? null
    }
  }

  return (
    <GiftClaimPage
      locale={locale}
      token={token}
      gift={gift}
      itemDisplay={itemDisplay}
      senderDisplayName={senderDisplayName}
      alreadyClaimedByViewer={alreadyClaimedByViewer}
      loadError={loadError}
      sessionUser={
        session
          ? {
              id: session.user.id,
              email: session.user.email ?? '',
              emailVerified: session.user.emailVerified,
            }
          : null
      }
    />
  )
}
