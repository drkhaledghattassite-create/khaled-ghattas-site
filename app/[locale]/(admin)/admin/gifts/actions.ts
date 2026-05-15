'use server'

/**
 * Admin server actions for the Phase D gift queue.
 *
 *   - createAdminGiftAction — Dr. Khaled's team grants a free gift (no Stripe)
 *   - revokeGiftAction      — admin revokes a gift (with reason); cascades
 *     entitlement removal for CLAIMED gifts
 *   - resendAdminGiftEmailAction — admin re-sends the gift email; same
 *     rate-limit shape as the user surface (1/day per gift)
 *
 * Auth: server actions don't have a `requireAdmin(req)` analog (that helper
 * checks origin via Request, which isn't available here). We inline the role
 * check after `getServerSession()`. If a non-admin user manages to reach
 * these actions (they can't through the UI — admin layout already gates),
 * the action returns 'forbidden'.
 */

import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import {
  createAdminGrantBookingOrder,
  createBookingHold,
  createGift,
  createGiftClaimOrder,
  deleteHoldById,
  getAdminGiftsForCsv,
  getGiftById,
  getUserByEmail,
  markGiftEmailSent,
  recipientEmailHasBooking,
  recipientEmailOwnsBookOrSession,
  resolveGiftItemPrice,
  revokeGift,
  type GiftItemSummary,
} from '@/lib/db/queries'
import type { GiftItemType, GiftSource, GiftStatus } from '@/lib/db/schema'
import {
  createAdminGiftSchema,
  resendGiftEmailSchema,
  revokeGiftSchema,
  type CreateAdminGiftInput,
  type GiftableItemType,
  type ResendGiftEmailInput,
  type RevokeGiftInput,
} from '@/lib/validators/gift'
import { sendEmail } from '@/lib/email/send'
import {
  buildAdminGiftGrantedHtml,
  buildAdminGiftGrantedSubject,
  buildAdminGiftGrantedText,
} from '@/lib/email/templates/admin-gift-granted'
import {
  buildGiftRevokedHtml,
  buildGiftRevokedSubject,
  buildGiftRevokedText,
} from '@/lib/email/templates/gift-revoked'
import { sendGiftReceivedEmail } from '@/app/[locale]/(public)/gifts/actions'
import { SITE_URL } from '@/lib/constants'
import { resolvePublicUrl } from '@/lib/storage/public-url'
import type { GiftDisplayItem, GiftEmailLocale } from '@/lib/email/templates/gift-shared'
import type { Gift } from '@/lib/db/schema'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'Team@drkhaledghattass.com'

function pickHttpUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  let parsed: URL
  try {
    parsed = trimmed.startsWith('/') ? new URL(trimmed, SITE_URL) : new URL(trimmed)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
    return null
  }
  return parsed.toString()
}

// Phase F2 — resolve cover storage keys before the host-allowlist guard.
// `pickHttpUrl` rejects bare keys (it calls `new URL(trimmed)` and bare keys
// throw), so without this resolve step admin-grant + revoke emails would
// render coverless once admin uploads start landing as R2 keys.
async function buildItemForEmail(summary: GiftItemSummary): Promise<GiftDisplayItem> {
  const resolvedCover = await resolvePublicUrl(summary.coverImage)
  return {
    itemType: summary.itemType,
    titleAr: summary.titleAr,
    titleEn: summary.titleEn,
    coverImageUrl: pickHttpUrl(resolvedCover),
  }
}

function normaliseLocale(raw: unknown): GiftEmailLocale {
  return raw === 'en' ? 'en' : 'ar'
}

async function requireAdminSession() {
  const session = await getServerSession()
  if (!session) return { ok: false as const, error: 'unauthorized' as const }
  // ADMIN (developer) AND CLIENT (site owner — Dr. Khaled) are both trusted
  // operators; both can grant / revoke / refund gifts. The two roles exist
  // for audit trail clarity, not for privilege separation.
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false as const, error: 'forbidden' as const }
  }
  return { ok: true as const, session }
}

/* ── Create admin gift ─────────────────────────────────────────────────── */

export type CreateAdminGiftActionResult =
  | ActionOk<{ giftId: string; autoClaimed: boolean }>
  | ActionErr<
      | 'unauthorized'
      | 'forbidden'
      | 'validation'
      | 'self_gift'
      | 'item_unavailable'
      | 'recipient_already_owns'
      | 'recipient_already_booked'
      | 'no_capacity'
      | 'rate_limited'
      | 'db_failed'
    >

export async function createAdminGiftAction(
  raw: CreateAdminGiftInput,
): Promise<CreateAdminGiftActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return { ok: false, error: guard.error }
  const { session } = guard

  const rl = await tryRateLimit(`gift-admin-create:${session.user.id}`, {
    limit: 30,
    window: '60 s',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const parsed = createAdminGiftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }
  const data = parsed.data

  const senderEmailLc = (session.user.email ?? '').trim().toLowerCase()
  const recipientLc = data.recipientEmail.toLowerCase()
  if (senderEmailLc === recipientLc) return { ok: false, error: 'self_gift' }
  const recipientUser = await getUserByEmail(recipientLc)
  if (recipientUser && recipientUser.id === session.user.id) {
    return { ok: false, error: 'self_gift' }
  }

  const itemSummary = await resolveGiftItemPrice(
    data.itemType as GiftableItemType,
    data.itemId,
  )
  if (!itemSummary) return { ok: false, error: 'item_unavailable' }

  // Per-itemType pre-grant checks (already-owns / already-booked + capacity).
  // For BOOKING, we hold capacity via createBookingHold here so it's still
  // available when createAdminGrantBookingOrder runs below. The hold is
  // released inside that helper's transaction as the final step.
  let bookingHoldId: string | null = null
  if (data.itemType === 'BOOK' || data.itemType === 'SESSION') {
    const owns = await recipientEmailOwnsBookOrSession(recipientLc, data.itemId)
    if (owns) return { ok: false, error: 'recipient_already_owns' }
  } else if (data.itemType === 'BOOKING') {
    const has = await recipientEmailHasBooking(recipientLc, data.itemId)
    if (has) return { ok: false, error: 'recipient_already_booked' }
    const holdResult = await createBookingHold({
      userId: session.user.id,
      bookingId: data.itemId,
    })
    if (!holdResult.ok) {
      if (holdResult.error === 'no_capacity') {
        return { ok: false, error: 'no_capacity' }
      }
      return { ok: false, error: 'db_failed' }
    }
    bookingHoldId = holdResult.holdId
  }

  const result = await createGift({
    source: 'ADMIN_GRANT',
    itemType: data.itemType,
    itemId: data.itemId,
    recipientEmail: recipientLc,
    senderMessage: data.senderMessage ?? null,
    locale: data.locale,
    adminGrantedByUserId: session.user.id,
  })
  if (!result) {
    // createGift failed — release the hold we took so capacity returns to
    // the pool. The action couldn't get past gift insert; nothing else to
    // unwind.
    if (bookingHoldId) await deleteHoldById(bookingHoldId)
    return { ok: false, error: 'db_failed' }
  }

  // Side-effects per itemType:
  //   - BOOK/SESSION + auto-claimed → insert orders row so recipient's
  //     library access reflects the gift immediately.
  //   - BOOKING (any claim state) → insert booking_orders row PAID +
  //     bump bookedCount + SOLD_OUT flip + release the hold. For
  //     auto-claimed grants userId = recipientUserId; for PENDING
  //     grants userId = null and `transferBookingOrderToRecipient`
  //     populates it on claim.
  if (
    result.autoClaimed &&
    result.recipientUserId &&
    (data.itemType === 'BOOK' || data.itemType === 'SESSION')
  ) {
    await createGiftClaimOrder({
      recipientUserId: result.recipientUserId,
      recipientEmail: recipientLc,
      giftId: result.gift.id,
      bookId: data.itemId,
      priceCents: itemSummary.priceCents,
      currency: itemSummary.currency,
    })
  } else if (data.itemType === 'BOOKING' && bookingHoldId) {
    const bo = await createAdminGrantBookingOrder({
      giftId: result.gift.id,
      bookingId: data.itemId,
      recipientUserId: result.autoClaimed ? result.recipientUserId : null,
      currency: itemSummary.currency,
      holdId: bookingHoldId,
    })
    if (!bo) {
      // Booking-order insert + capacity bump failed AFTER the gift row was
      // created. Best-effort cleanup: release the hold so the seat returns
      // to the pool; leave the gift row in place (admin can revoke via the
      // queue if recovery is needed).
      await deleteHoldById(bookingHoldId)
      return { ok: false, error: 'db_failed' }
    }
  }

  // Send the admin-grant notification email.
  try {
    const locale = normaliseLocale(data.locale)
    const itemForEmail = await buildItemForEmail(itemSummary)
    const claimUrl = result.autoClaimed
      ? `${SITE_URL}/${locale}/dashboard/library`
      : `${SITE_URL}/${locale}/gifts/claim?token=${encodeURIComponent(result.gift.token)}`
    const html = buildAdminGiftGrantedHtml({
      locale,
      recipientEmail: recipientLc,
      item: itemForEmail,
      claimUrl,
      alreadyClaimed: result.autoClaimed,
      senderMessage: data.senderMessage ?? null,
      expiresAt: result.gift.expiresAt,
      supportEmail: SUPPORT_EMAIL,
    })
    const text = buildAdminGiftGrantedText({
      locale,
      recipientEmail: recipientLc,
      item: itemForEmail,
      claimUrl,
      alreadyClaimed: result.autoClaimed,
      senderMessage: data.senderMessage ?? null,
      expiresAt: result.gift.expiresAt,
      supportEmail: SUPPORT_EMAIL,
    })
    const send = await sendEmail({
      to: recipientLc,
      subject: buildAdminGiftGrantedSubject(locale),
      html,
      text,
      previewLabel: 'admin-gift-granted',
      emailType: 'admin_gift_granted',
      relatedEntityType: 'gift',
      relatedEntityId: result.gift.id,
    })
    await markGiftEmailSent(
      result.gift.id,
      send.ok || (!send.ok && send.reason === 'preview-only'),
      send.ok ? null : send.reason,
    )
  } catch (err) {
    console.error('[admin/gifts] email failed', err)
    await markGiftEmailSent(result.gift.id, false, 'unknown_error')
  }

  revalidatePath('/admin/gifts')
  return { ok: true, giftId: result.gift.id, autoClaimed: result.autoClaimed }
}

/* ── Revoke gift ───────────────────────────────────────────────────────── */

export type RevokeGiftActionResult =
  | ActionOk<{ giftId: string }>
  | ActionErr<'unauthorized' | 'forbidden' | 'validation' | 'not_found' | 'wrong_state'>

export async function revokeGiftAction(
  raw: RevokeGiftInput,
): Promise<RevokeGiftActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = revokeGiftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }

  const before = await getGiftById(parsed.data.giftId)
  if (!before) return { ok: false, error: 'not_found' }
  if (before.status === 'REVOKED' || before.status === 'REFUNDED' || before.status === 'EXPIRED') {
    return { ok: false, error: 'wrong_state' }
  }

  const revoked = await revokeGift(parsed.data.giftId, parsed.data.reason)
  if (!revoked) return { ok: false, error: 'not_found' }

  // Notify recipient + (USER_PURCHASE only) sender.
  try {
    const itemSummary = await resolveGiftItemPrice(
      revoked.itemType === 'TEST' ? 'BOOK' : (revoked.itemType as GiftableItemType),
      revoked.itemId,
    )
    if (itemSummary) {
      const locale = normaliseLocale(revoked.locale)
      const itemForEmail = await buildItemForEmail(itemSummary)
      // Recipient
      await sendEmail({
        to: revoked.recipientEmail,
        subject: buildGiftRevokedSubject(locale, 'REVOKED'),
        html: buildGiftRevokedHtml({
          locale,
          toEmail: revoked.recipientEmail,
          audience: 'recipient',
          kind: 'REVOKED',
          item: itemForEmail,
          reason: revoked.revokedReason,
          supportEmail: SUPPORT_EMAIL,
        }),
        text: buildGiftRevokedText({
          locale,
          toEmail: revoked.recipientEmail,
          audience: 'recipient',
          kind: 'REVOKED',
          item: itemForEmail,
          reason: revoked.revokedReason,
          supportEmail: SUPPORT_EMAIL,
        }),
        previewLabel: 'gift-revoked-recipient',
        emailType: 'gift_revoked',
        relatedEntityType: 'gift',
        relatedEntityId: revoked.id,
      })
      // Sender (USER_PURCHASE only)
      if (revoked.source === 'USER_PURCHASE' && revoked.senderUserId) {
        const { getUserById } = await import('@/lib/db/queries')
        const sender = await getUserById(revoked.senderUserId)
        if (sender) {
          await sendEmail({
            to: sender.email,
            subject: buildGiftRevokedSubject(locale, 'REVOKED'),
            html: buildGiftRevokedHtml({
              locale,
              toEmail: sender.email,
              audience: 'sender',
              kind: 'REVOKED',
              item: itemForEmail,
              reason: revoked.revokedReason,
              supportEmail: SUPPORT_EMAIL,
            }),
            text: buildGiftRevokedText({
              locale,
              toEmail: sender.email,
              audience: 'sender',
              kind: 'REVOKED',
              item: itemForEmail,
              reason: revoked.revokedReason,
              supportEmail: SUPPORT_EMAIL,
            }),
            previewLabel: 'gift-revoked-sender',
            emailType: 'gift_revoked',
            relatedEntityType: 'gift',
            relatedEntityId: revoked.id,
          })
        }
      }
    }
  } catch (err) {
    console.error('[admin/gifts] revoke email failed', err)
  }

  revalidatePath('/admin/gifts')
  revalidatePath(`/admin/gifts/${revoked.id}`)
  return { ok: true, giftId: revoked.id }
}

/* ── Resend admin gift email ───────────────────────────────────────────── */

export type ResendAdminGiftEmailActionResult =
  | ActionOk<{ giftId: string }>
  | ActionErr<'unauthorized' | 'forbidden' | 'not_found' | 'wrong_state' | 'rate_limited' | 'send_failed'>

export async function resendAdminGiftEmailAction(
  raw: ResendGiftEmailInput,
): Promise<ResendAdminGiftEmailActionResult> {
  const guard = await requireAdminSession()
  if (!guard.ok) return { ok: false, error: guard.error }

  const parsed = resendGiftEmailSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'not_found' }

  const gift = await getGiftById(parsed.data.giftId)
  if (!gift) return { ok: false, error: 'not_found' }
  if (gift.status !== 'PENDING') return { ok: false, error: 'wrong_state' }

  const rl = await tryRateLimit(`gift-resend:${gift.id}`, {
    limit: 1,
    window: '86400 s',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  let result: { ok: true; id: string | null } | { ok: false; reason: string }
  if (gift.source === 'ADMIN_GRANT') {
    // Resend the admin-grant template, with alreadyClaimed=false (resends
    // are only for PENDING gifts).
    result = await resendAdminGrantEmail(gift)
  } else {
    result = await sendGiftReceivedEmail(gift)
  }
  await markGiftEmailSent(gift.id, result.ok, result.ok ? null : result.reason)
  if (!result.ok) return { ok: false, error: 'send_failed' }
  return { ok: true, giftId: gift.id }
}

/**
 * Compose + send the admin-grant email for a PENDING ADMIN_GRANT gift.
 * Mirrors createAdminGiftAction's email block; factored out for reuse from
 * the resend path.
 */
async function resendAdminGrantEmail(
  gift: Gift,
): Promise<{ ok: true; id: string | null } | { ok: false; reason: string }> {
  const itemSummary = await resolveGiftItemPrice(
    gift.itemType === 'TEST' ? 'BOOK' : (gift.itemType as GiftableItemType),
    gift.itemId,
  )
  if (!itemSummary) return { ok: false, reason: 'item_unavailable' }
  const locale = normaliseLocale(gift.locale)
  const claimUrl = `${SITE_URL}/${locale}/gifts/claim?token=${encodeURIComponent(gift.token)}`
  // Single resolve up-front; React.cache memoizes across siblings.
  const itemForEmail = await buildItemForEmail(itemSummary)
  const html = buildAdminGiftGrantedHtml({
    locale,
    recipientEmail: gift.recipientEmail,
    item: itemForEmail,
    claimUrl,
    alreadyClaimed: false,
    senderMessage: gift.senderMessage,
    expiresAt: gift.expiresAt,
    supportEmail: SUPPORT_EMAIL,
  })
  const text = buildAdminGiftGrantedText({
    locale,
    recipientEmail: gift.recipientEmail,
    item: itemForEmail,
    claimUrl,
    alreadyClaimed: false,
    senderMessage: gift.senderMessage,
    expiresAt: gift.expiresAt,
    supportEmail: SUPPORT_EMAIL,
  })
  const send = await sendEmail({
    to: gift.recipientEmail,
    subject: buildAdminGiftGrantedSubject(locale),
    html,
    text,
    previewLabel: 'admin-gift-granted',
    emailType: 'admin_gift_granted',
    relatedEntityType: 'gift',
    relatedEntityId: gift.id,
  })
  if (send.ok) return { ok: true, id: send.id }
  if (send.reason === 'preview-only') return { ok: true, id: null }
  return { ok: false, reason: send.reason }
}

/* ── CSV export — gifts ────────────────────────────────────────────────── */

const GIFT_STATUS_VALUES: GiftStatus[] = [
  'PENDING',
  'CLAIMED',
  'EXPIRED',
  'REVOKED',
  'REFUNDED',
]
const GIFT_SOURCE_VALUES: GiftSource[] = ['ADMIN_GRANT', 'USER_PURCHASE']
const GIFT_ITEM_TYPE_VALUES: GiftItemType[] = ['BOOK', 'SESSION', 'BOOKING', 'TEST']

function readGiftStatus(raw: string | undefined): GiftStatus | 'all' {
  if (raw && (GIFT_STATUS_VALUES as string[]).includes(raw)) {
    return raw as GiftStatus
  }
  return 'all'
}
function readGiftSource(raw: string | undefined): GiftSource | 'all' {
  if (raw && (GIFT_SOURCE_VALUES as string[]).includes(raw)) {
    return raw as GiftSource
  }
  return 'all'
}
function readGiftItemType(raw: string | undefined): GiftItemType | 'all' {
  if (raw && (GIFT_ITEM_TYPE_VALUES as string[]).includes(raw)) {
    return raw as GiftItemType
  }
  return 'all'
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export async function exportAdminGiftsCsvAction(input: {
  status?: string
  source?: string
  itemType?: string
  search?: string
}): Promise<
  | { ok: true; csv: string; filename: string }
  | ActionErr<'unauthorized' | 'forbidden' | 'failed'>
> {
  const guard = await requireAdminSession()
  if (!guard.ok) return { ok: false, error: guard.error }

  try {
    const rows = await getAdminGiftsForCsv({
      status: readGiftStatus(input.status),
      source: readGiftSource(input.source),
      itemType: readGiftItemType(input.itemType),
      search: input.search?.trim() || undefined,
    })

    const header = [
      'gift_id',
      'created_at',
      'source',
      'status',
      'item_type',
      'item_id',
      'recipient_email',
      'sender_user_id',
      'amount_cents',
      'currency',
      'expires_at',
      'claimed_at',
      'revoked_at',
      'refunded_at',
      'stripe_session_id',
    ].join(',')

    const body = rows
      .map((g) =>
        [
          g.id,
          g.createdAt.toISOString(),
          g.source,
          g.status,
          g.itemType,
          g.itemId,
          g.recipientEmail,
          g.senderUserId ?? '',
          g.amountCents ?? '',
          g.currency,
          g.expiresAt.toISOString(),
          g.claimedAt?.toISOString() ?? '',
          g.revokedAt?.toISOString() ?? '',
          g.refundedAt?.toISOString() ?? '',
          g.stripeSessionId ?? '',
        ]
          .map(csvEscape)
          .join(','),
      )
      .join('\n')

    return {
      ok: true,
      csv: `${header}\n${body}\n`,
      filename: `gifts-${new Date().toISOString().slice(0, 10)}.csv`,
    }
  } catch (err) {
    console.error('[exportAdminGiftsCsvAction]', err)
    return { ok: false, error: 'failed' }
  }
}
