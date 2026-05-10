import { setRequestLocale, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
import {
  getGiftById,
  getUserById,
  resolveGiftItemPrice,
} from '@/lib/db/queries'
import type { GiftableItemType } from '@/lib/validators/gift'
import { AdminGiftDetailPage } from '@/components/admin/gifts/AdminGiftDetailPage'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

export default async function AdminGiftDetailRoute({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.gifts.detail')

  const gift = await getGiftById(id)
  if (!gift) notFound()

  const [sender, recipient, admin, item] = await Promise.all([
    gift!.senderUserId ? getUserById(gift!.senderUserId).catch(() => null) : null,
    gift!.recipientUserId
      ? getUserById(gift!.recipientUserId).catch(() => null)
      : null,
    gift!.adminGrantedByUserId
      ? getUserById(gift!.adminGrantedByUserId).catch(() => null)
      : null,
    resolveGiftItemPrice(
      gift!.itemType === 'TEST' ? 'BOOK' : (gift!.itemType as GiftableItemType),
      gift!.itemId,
    ).catch(() => null),
  ])

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/gifts"
          className="text-[13px] text-[var(--color-fg3)] hover:text-[var(--color-fg2)]"
        >
          ← {t('back_cta')}
        </Link>
      </div>
      <AdminGiftDetailPage
        locale={locale === 'ar' ? 'ar' : 'en'}
        gift={{
          id: gift!.id,
          token: gift!.token,
          source: gift!.source,
          status: gift!.status,
          itemType: gift!.itemType,
          itemId: gift!.itemId,
          recipientEmail: gift!.recipientEmail,
          senderUserId: gift!.senderUserId,
          recipientUserId: gift!.recipientUserId,
          adminGrantedByUserId: gift!.adminGrantedByUserId,
          senderMessage: gift!.senderMessage,
          amountCents: gift!.amountCents,
          currency: gift!.currency,
          stripeSessionId: gift!.stripeSessionId,
          stripePaymentIntentId: gift!.stripePaymentIntentId,
          locale: gift!.locale,
          createdAt: gift!.createdAt.toISOString(),
          expiresAt: gift!.expiresAt.toISOString(),
          claimedAt: gift!.claimedAt ? gift!.claimedAt.toISOString() : null,
          revokedAt: gift!.revokedAt ? gift!.revokedAt.toISOString() : null,
          revokedReason: gift!.revokedReason,
          refundedAt: gift!.refundedAt ? gift!.refundedAt.toISOString() : null,
          emailSentAt: gift!.emailSentAt ? gift!.emailSentAt.toISOString() : null,
          emailSendFailedReason: gift!.emailSendFailedReason,
        }}
        senderName={sender?.name ?? null}
        senderEmail={sender?.email ?? null}
        recipientName={recipient?.name ?? null}
        adminName={admin?.name ?? null}
        adminEmail={admin?.email ?? null}
        itemTitleAr={item?.titleAr ?? null}
        itemTitleEn={item?.titleEn ?? null}
      />
    </div>
  )
}
