import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { GiftClaimPage } from '@/components/gifts/GiftClaimPage'
import { getGiftByToken, resolveGiftItemPrice, getUserById } from '@/lib/db/queries'
import type { GiftableItemType } from '@/lib/validators/gift'
import { getServerSession } from '@/lib/auth/server'
import { pageMetadata } from '@/lib/seo/page-metadata'

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gifts.meta' })
  return pageMetadata({
    locale,
    path: '/gifts/claim',
    title: t('claim_title'),
    description: t('claim_description'),
  })
}

export default async function GiftsClaimRoute({ params, searchParams }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const tokenRaw = typeof sp.token === 'string' ? sp.token : ''
  const token = tokenRaw.trim()

  const [gift, session] = await Promise.all([
    token ? getGiftByToken(token).catch(() => null) : Promise.resolve(null),
    getServerSession().catch(() => null),
  ])

  // Resolve item display info if the gift is valid + still pending. We fetch
  // the sender too if the email match works out — needed so the
  // "From {senderDisplayName}" line on the claim card can show a name. For
  // EMAIL_MISMATCH we deliberately do NOT resolve item details (don't leak
  // gift contents to wrong-account viewers).
  let itemDisplay: {
    titleAr: string
    titleEn: string
    coverImage: string | null
    itemType: GiftableItemType
  } | null = null
  let senderDisplayName: string | null = null

  const sessionEmailLc = session?.user.email?.trim().toLowerCase() ?? null
  const giftEmailLc = gift?.recipientEmail?.toLowerCase() ?? null
  const emailMatches = sessionEmailLc != null && giftEmailLc != null && sessionEmailLc === giftEmailLc

  if (gift && (gift.status === 'PENDING') && (!session || emailMatches)) {
    const summary = await resolveGiftItemPrice(
      gift.itemType === 'TEST' ? 'BOOK' : (gift.itemType as GiftableItemType),
      gift.itemId,
    ).catch(() => null)
    if (summary) {
      itemDisplay = {
        titleAr: summary.titleAr,
        titleEn: summary.titleEn,
        coverImage: summary.coverImage,
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
      sessionUser={
        session
          ? {
              id: session.user.id,
              email: session.user.email ?? '',
            }
          : null
      }
    />
  )
}
