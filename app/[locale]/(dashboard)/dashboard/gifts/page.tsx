import type { Metadata } from 'next'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/lib/i18n/navigation'
import { getServerSession } from '@/lib/auth/server'
import {
  getUserSentGifts,
  getUserReceivedGifts,
  getUserById,
} from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { DashboardGiftsTab } from '@/components/dashboard/gifts/DashboardGiftsTab'
import type { Gift } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'dashboard.gifts.meta' })
  return {
    title: t('title'),
    description: t('description'),
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  }
}

export default async function DashboardGiftsPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const session = await getServerSession()
  if (!session) {
    redirect({ href: '/login', locale })
  }

  const [sentGifts, receivedGifts, settings] = await Promise.all([
    getUserSentGifts(session!.user.id),
    getUserReceivedGifts(session!.user.id, session!.user.email ?? ''),
    getCachedSiteSettings(),
  ])

  // Look up sender display info for received USER_PURCHASE gifts so the row
  // can show the sender's email instead of a literal "From" word.
  const senderIds = Array.from(
    new Set(
      receivedGifts
        .filter((g) => g.source === 'USER_PURCHASE' && g.senderUserId)
        .map((g) => g.senderUserId as string),
    ),
  )
  const senderUsers = await Promise.all(senderIds.map((id) => getUserById(id)))
  const senderMap = new Map<string, { email: string; name: string | null }>()
  for (const u of senderUsers) {
    if (u) senderMap.set(u.id, { email: u.email, name: u.name })
  }

  // Serialize Date instances for the RSC payload.
  const sentSerialized = sentGifts.map((g) => serializeGift(g, null))
  const receivedSerialized = receivedGifts.map((g) =>
    serializeGift(g, g.senderUserId ? senderMap.get(g.senderUserId) ?? null : null),
  )

  return (
    <DashboardLayout
      activeTab="gifts"
      user={session!.user}
      dashboardSettings={settings.dashboard}
    >
      <DashboardGiftsTab
        sent={sentSerialized}
        received={receivedSerialized}
        canSendGift={settings.gifts.allow_user_to_user}
      />
    </DashboardLayout>
  )
}

export type ClientGift = ReturnType<typeof serializeGift>

function serializeGift(
  g: Gift,
  sender: { email: string; name: string | null } | null,
) {
  return {
    id: g.id,
    token: g.token,
    source: g.source,
    status: g.status,
    itemType: g.itemType,
    itemId: g.itemId,
    senderUserId: g.senderUserId,
    senderEmail: sender?.email ?? null,
    senderName: sender?.name ?? null,
    recipientEmail: g.recipientEmail,
    recipientUserId: g.recipientUserId,
    senderMessage: g.senderMessage,
    amountCents: g.amountCents,
    currency: g.currency,
    locale: g.locale,
    expiresAt: g.expiresAt.toISOString(),
    claimedAt: g.claimedAt ? g.claimedAt.toISOString() : null,
    createdAt: g.createdAt.toISOString(),
  }
}
