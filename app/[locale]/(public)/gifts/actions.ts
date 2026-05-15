'use server'

/**
 * Server actions for the public /gifts surface (Phase D — user-to-user gifts).
 *
 * Three actions:
 *   - createUserGiftAction — sender starts a paid gift (Stripe Checkout)
 *   - claimGiftAction      — recipient redeems via /gifts/claim?token=…
 *   - resendGiftEmailAction — sender re-triggers the gift email (rate-limited)
 *   - cancelGiftAction     — sender attempts cancellation (USER_PURCHASE
 *     surfaces "contact admin" copy; admin handles the actual refund)
 *
 * SECURITY:
 *   - senderUserId is sourced from the server session, NEVER from input.
 *   - Self-gift prevention: case-insensitive email comparison + (when
 *     applicable) userId match against the resolved recipient user.
 *   - Rate limits per sender (gift-create), per IP+user (gift-claim),
 *     per gift (gift-resend, 1/day).
 *   - Mock-mode: USER_PURCHASE returns 'stripe_unconfigured' before any
 *     mutation — same posture as createBookingCheckoutAction.
 */

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServerSession } from '@/lib/auth/server'
import { getStripe } from '@/lib/stripe'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { SITE_URL } from '@/lib/constants'
import {
  claimGift as claimGiftDb,
  createBookingHold,
  createGift,
  createGiftBookingOrder,
  createGiftClaimOrder,
  deleteHoldById,
  getGiftById,
  getGiftByToken,
  getUserByEmail,
  markGiftEmailSent,
  markGiftRefunded,
  recipientEmailHasBooking,
  recipientEmailOwnsBookOrSession,
  resolveGiftItemPrice,
  setHoldStripeSessionId,
  transferBookingOrderToRecipient,
  type GiftItemSummary,
} from '@/lib/db/queries'
import {
  cancelGiftSchema,
  claimGiftSchema,
  clampSenderMessageForStripe,
  createUserGiftSchema,
  resendGiftEmailSchema,
  type CancelGiftInput,
  type ClaimGiftInput,
  type CreateUserGiftInput,
  type GiftableItemType,
  type ResendGiftEmailInput,
} from '@/lib/validators/gift'
import { sendEmail } from '@/lib/email/send'
import {
  buildGiftReceivedHtml,
  buildGiftReceivedSubject,
  buildGiftReceivedText,
} from '@/lib/email/templates/gift-received'
import {
  buildGiftClaimedRecipientHtml,
  buildGiftClaimedRecipientSubject,
  buildGiftClaimedRecipientText,
} from '@/lib/email/templates/gift-claimed-recipient'
import {
  buildGiftClaimedSenderHtml,
  buildGiftClaimedSenderSubject,
  buildGiftClaimedSenderText,
} from '@/lib/email/templates/gift-claimed-sender'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'
import type { GiftDisplayItem, GiftEmailLocale } from '@/lib/email/templates/gift-shared'
import type { Gift } from '@/lib/db/schema'

type ActionOk<T> = { ok: true } & T
type ActionErr<E extends string> = { ok: false; error: E }

const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL ?? 'Team@drkhaledghattass.com'

function normaliseLocale(raw: unknown): GiftEmailLocale {
  return raw === 'en' ? 'en' : 'ar'
}

async function resolveOrigin(): Promise<string> {
  if (process.env.NODE_ENV === 'production') return SITE_URL
  const reqHeaders = await headers()
  const host = reqHeaders.get('host') ?? ''
  const proto = reqHeaders.get('x-forwarded-proto') ?? 'http'
  const isDevHost =
    /^localhost(:\d+)?$/i.test(host) ||
    /^127\.0\.0\.1(:\d+)?$/.test(host) ||
    /\.local(:\d+)?$/i.test(host)
  return host && isDevHost ? `${proto}://${host}` : SITE_URL
}

// Phase F2 — gift item summaries carry whatever the DB stores in
// `coverImage` (URL, /public path, or bare R2 storage key). The downstream
// `pickHttpUrl` host-allowlist gate REJECTS bare keys via `new URL(trimmed)`,
// so the gift emails would silently render coverless once admin starts
// uploading R2-backed covers. Resolve the key to a signed URL first, then
// run the host-allowlist guard.
async function buildItemForEmail(summary: GiftItemSummary): Promise<GiftDisplayItem> {
  const resolvedCover = await resolvePublicUrl(summary.coverImage)
  return {
    itemType: summary.itemType,
    titleAr: summary.titleAr,
    titleEn: summary.titleEn,
    coverImageUrl: pickHttpUrl(resolvedCover),
  }
}

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

/* ── Create gift (sender pays via Stripe) ──────────────────────────────── */

export type CreateUserGiftActionResult =
  | ActionOk<{ checkoutUrl: string }>
  | ActionErr<
      | 'unauthorized'
      | 'validation'
      | 'feature_disabled'
      | 'self_gift'
      | 'item_unavailable'
      | 'recipient_already_owns'
      | 'recipient_already_booked'
      | 'no_capacity'
      | 'rate_limited'
      | 'stripe_unconfigured'
      | 'stripe_failed'
      | 'db_failed'
    >

export async function createUserGiftAction(
  raw: CreateUserGiftInput,
): Promise<CreateUserGiftActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const settings = await getCachedSiteSettings()
  if (!settings.gifts?.allow_user_to_user) {
    return { ok: false, error: 'feature_disabled' }
  }

  const rl = await tryRateLimit(`gift-create:${session.user.id}`, {
    limit: 5,
    window: '3600 s',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const parsed = createUserGiftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'validation' }
  const data = parsed.data

  // Self-gift prevention: case-insensitive email comparison and userId match.
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

  // Already-owns guard
  if (data.itemType === 'BOOK' || data.itemType === 'SESSION') {
    const owns = await recipientEmailOwnsBookOrSession(recipientLc, data.itemId)
    if (owns) return { ok: false, error: 'recipient_already_owns' }
  } else if (data.itemType === 'BOOKING') {
    const has = await recipientEmailHasBooking(recipientLc, data.itemId)
    if (has) return { ok: false, error: 'recipient_already_booked' }
  }

  const stripe = getStripe()
  if (!stripe) return { ok: false, error: 'stripe_unconfigured' }

  // BOOKING-specific: create the hold inside the same race-safe transaction
  // we use for the regular booking flow. We DO NOT want to block here on
  // capacity that the recipient could later release; capacity is the
  // canonical gate.
  let bookingHoldId: string | null = null
  if (data.itemType === 'BOOKING') {
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

  // Stripe metadata cap. The gift's senderMessage is stored on the gifts row
  // by the webhook handler. Since metadata is the only carrier across the
  // Stripe round-trip, we truncate to STRIPE_METADATA_MESSAGE_CAP (450
  // chars) so the value fits Stripe's 500-char-per-value limit.
  const senderMessageMeta = clampSenderMessageForStripe(
    data.senderMessage ?? '',
  )

  const origin = await resolveOrigin()
  const locale = normaliseLocale(data.locale)

  try {
    const stripeSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: session.user.email ?? undefined,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      line_items: [
        {
          price_data: {
            currency: itemSummary.currency,
            product_data: {
              name: itemSummary.titleEn || itemSummary.titleAr,
            },
            unit_amount: itemSummary.priceCents,
          },
          quantity: 1,
        },
      ],
      // Stripe interpolates {CHECKOUT_SESSION_ID} at redirect time so the
      // success page can poll /api/gifts/status until the webhook fires.
      // The cancel path lands back on the form with a banner.
      success_url: `${origin}/${locale}/gifts/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/${locale}/gifts/send?cancelled=1`,
      metadata: {
        productType: 'GIFT',
        giftItemType: data.itemType,
        giftItemId: data.itemId,
        senderUserId: session.user.id,
        recipientEmail: recipientLc,
        senderMessage: senderMessageMeta,
        locale,
        ...(bookingHoldId ? { holdId: bookingHoldId } : {}),
      },
    })

    if (!stripeSession.url || !stripeSession.id) {
      if (bookingHoldId) await deleteHoldById(bookingHoldId)
      return { ok: false, error: 'stripe_failed' }
    }
    if (bookingHoldId) {
      await setHoldStripeSessionId(bookingHoldId, stripeSession.id)
    }
    return { ok: true, checkoutUrl: stripeSession.url }
  } catch (err) {
    console.error('[gifts.createUserGiftAction] stripe error', err)
    if (bookingHoldId) await deleteHoldById(bookingHoldId)
    return { ok: false, error: 'stripe_failed' }
  }
}

/* ── Claim gift (recipient redeems) ────────────────────────────────────── */

export type ClaimGiftActionResult =
  | ActionOk<{
      giftId: string
      itemType: 'BOOK' | 'SESSION' | 'BOOKING'
      redirectPath: string
    }>
  | ActionErr<
      | 'invalid_or_expired'
      | 'login_required'
      | 'email_mismatch'
      | 'rate_limited'
      | 'item_unavailable'
      | 'db_failed'
    >

/**
 * QA P2 — IP resolution prefers Vercel's signed header.
 *
 * Header preference order:
 *   1. `x-vercel-forwarded-for` — set by Vercel's edge proxy directly from
 *      the TCP connection and NOT echoable by the client. This is the
 *      ground-truth IP on Vercel deployments.
 *   2. `x-forwarded-for` — last hop. We take the RIGHTMOST IP, not the
 *      first, because the first hop is whatever the client wrote
 *      (spoofable). The rightmost is what our trusted edge added.
 *   3. `x-real-ip` — last-resort fallback for reverse proxies that
 *      provide it (some self-hosted setups).
 *
 * Returns 'unknown' if nothing resolves. The downstream rate-limit key
 * is `gift-claim:<ip>` so collisions on 'unknown' all hit the same bucket
 * — strictest case for the spoofing-defeated path.
 */
async function getRequestIp(): Promise<string> {
  try {
    const reqHeaders = await headers()
    const vercelIp = reqHeaders.get('x-vercel-forwarded-for')?.trim()
    if (vercelIp) return vercelIp
    const forwarded = reqHeaders.get('x-forwarded-for') ?? ''
    if (forwarded) {
      const parts = forwarded
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const rightmost = parts[parts.length - 1]
      if (rightmost) return rightmost
    }
    const real = reqHeaders.get('x-real-ip')?.trim()
    if (real) return real
  } catch {
    /* ignore — fall through */
  }
  return 'unknown'
}

export async function claimGiftAction(
  raw: ClaimGiftInput,
): Promise<ClaimGiftActionResult> {
  const parsed = claimGiftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'invalid_or_expired' }

  const ip = await getRequestIp()
  const ipRl = await tryRateLimit(`gift-claim:${ip}`, { limit: 10, window: '3600 s' })
  if (!ipRl.ok) return { ok: false, error: 'rate_limited' }

  const session = await getServerSession()
  if (session) {
    const userRl = await tryRateLimit(`gift-claim-user:${session.user.id}`, {
      limit: 20,
      window: '3600 s',
    })
    if (!userRl.ok) return { ok: false, error: 'rate_limited' }
  }

  // getGiftByToken throws on DB-level errors (Neon timeout etc.) — convert
  // to 'db_failed' so the client surfaces a retryable toast rather than the
  // generic 'invalid_or_expired' a swallowed catch would produce.
  let gift: Awaited<ReturnType<typeof getGiftByToken>>
  try {
    gift = await getGiftByToken(parsed.data.token)
  } catch (err) {
    console.error('[gifts.claimGiftAction] getGiftByToken failed', err)
    return { ok: false, error: 'db_failed' }
  }
  if (!gift || gift.status !== 'PENDING') {
    return { ok: false, error: 'invalid_or_expired' }
  }
  if (gift.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: 'invalid_or_expired' }
  }

  if (!session) return { ok: false, error: 'login_required' }

  const userEmailLc = (session.user.email ?? '').trim().toLowerCase()
  if (userEmailLc !== gift.recipientEmail.trim().toLowerCase()) {
    // Don't leak that the gift exists — surface a generic "not for this account"
    // copy. The action returns the discrete code for UI branching.
    //
    // Better Auth's email uniqueness is the proof-of-control here; we don't
    // gate on emailVerified because the Better Auth instance has no
    // verification flow configured (password signups would otherwise be
    // permanently locked out).
    return { ok: false, error: 'email_mismatch' }
  }

  // Atomic claim — race-safe in DB; mock-mode replicates the same
  // "all-or-nothing" semantics in-memory. The third arg adds a DB-level
  // recipient_email match gate (defense-in-depth) so a future caller that
  // skips the userEmailLc check above still cannot succeed cross-account.
  const claimed = await claimGiftDb(parsed.data.token, session.user.id, userEmailLc)
  if (!claimed) return { ok: false, error: 'invalid_or_expired' }

  const itemSummary = await resolveGiftItemPrice(
    claimed.itemType === 'TEST' ? 'BOOK' : (claimed.itemType as GiftableItemType),
    claimed.itemId,
  )
  if (!itemSummary) {
    // Item disappeared between gift creation and claim. The gift is already
    // CLAIMED (the UPDATE in claimGiftDb committed); surface a generic error
    // so the recipient sees the gift in their history but is steered to
    // contact support. (Manual revoke is the recovery path on the admin side.)
    return { ok: false, error: 'item_unavailable' }
  }

  // QA P1 — grant the entitlement BEFORE sending emails, and bail out
  // cleanly if the grant fails. Previously the order/booking-transfer was
  // best-effort: a transient failure left the gift in CLAIMED state with
  // no entitlement in /dashboard/library or /dashboard/bookings, and both
  // claim emails still fired ("you got X" / "they received your X") even
  // though the recipient saw nothing. Now the action returns 'db_failed'
  // on grant failure and skips the email block; admin recovery is the
  // documented path for stuck claims (manual revoke + re-grant).
  let redirectPath = '/dashboard/library'
  if (claimed.itemType === 'BOOK' || claimed.itemType === 'SESSION') {
    const orderId = await createGiftClaimOrder({
      recipientUserId: session.user.id,
      recipientEmail: userEmailLc,
      giftId: claimed.id,
      bookId: claimed.itemId,
      priceCents: itemSummary.priceCents,
      currency: itemSummary.currency,
    })
    if (orderId == null) {
      console.error('[gifts.claim] entitlement grant failed (BOOK/SESSION)', {
        giftId: claimed.id,
        itemType: claimed.itemType,
        itemId: claimed.itemId,
      })
      return { ok: false, error: 'db_failed' }
    }
    redirectPath = '/dashboard/library'
  } else if (claimed.itemType === 'BOOKING') {
    const transferred = await transferBookingOrderToRecipient({
      giftId: claimed.id,
      recipientUserId: session.user.id,
    })
    if (transferred == null) {
      console.error('[gifts.claim] entitlement grant failed (BOOKING)', {
        giftId: claimed.id,
        itemId: claimed.itemId,
      })
      return { ok: false, error: 'db_failed' }
    }
    redirectPath = '/dashboard/bookings'
  }

  // Send claim emails — fail-open (the entitlement is already granted).
  const locale = normaliseLocale(claimed.locale)
  const itemForEmail = await buildItemForEmail(itemSummary)
  const origin = await resolveOrigin()
  const itemUrl = `${origin}/${locale}${redirectPath}`
  try {
    const html = buildGiftClaimedRecipientHtml({
      locale,
      recipientEmail: userEmailLc,
      item: itemForEmail,
      itemUrl,
      supportEmail: SUPPORT_EMAIL,
    })
    const text = buildGiftClaimedRecipientText({
      locale,
      recipientEmail: userEmailLc,
      item: itemForEmail,
      itemUrl,
      supportEmail: SUPPORT_EMAIL,
    })
    await sendEmail({
      to: userEmailLc,
      subject: buildGiftClaimedRecipientSubject(locale),
      html,
      text,
      previewLabel: 'gift-claimed-recipient',
      emailType: 'gift_claimed_recipient',
      relatedEntityType: 'gift',
      relatedEntityId: claimed.id,
    })
  } catch (err) {
    console.error('[gifts.claim] recipient email failed', err)
  }

  // Sender notification — only for USER_PURCHASE.
  if (claimed.source === 'USER_PURCHASE' && claimed.senderUserId) {
    try {
      const sender = await import('@/lib/db/queries').then((m) =>
        m.getUserById(claimed.senderUserId!),
      )
      if (sender) {
        const dashboardUrl = `${origin}/${locale}/dashboard/gifts`
        const html = buildGiftClaimedSenderHtml({
          locale,
          senderEmail: sender.email,
          senderName: sender.name,
          recipientEmail: claimed.recipientEmail,
          item: itemForEmail,
          dashboardUrl,
          supportEmail: SUPPORT_EMAIL,
        })
        const text = buildGiftClaimedSenderText({
          locale,
          senderEmail: sender.email,
          senderName: sender.name,
          recipientEmail: claimed.recipientEmail,
          item: itemForEmail,
          dashboardUrl,
          supportEmail: SUPPORT_EMAIL,
        })
        await sendEmail({
          to: sender.email,
          subject: buildGiftClaimedSenderSubject(locale, claimed.recipientEmail),
          html,
          text,
          previewLabel: 'gift-claimed-sender',
          emailType: 'gift_claimed_sender',
          relatedEntityType: 'gift',
          relatedEntityId: claimed.id,
        })
      }
    } catch (err) {
      console.error('[gifts.claim] sender email failed', err)
    }
  }

  revalidatePath('/dashboard/gifts')
  revalidatePath('/dashboard/library')
  revalidatePath('/dashboard/bookings')

  return {
    ok: true,
    giftId: claimed.id,
    itemType: claimed.itemType === 'TEST' ? 'BOOK' : claimed.itemType,
    redirectPath,
  }
}

/* ── Resend gift email ─────────────────────────────────────────────────── */

export type ResendGiftEmailActionResult =
  | ActionOk<{ giftId: string }>
  | ActionErr<'unauthorized' | 'forbidden' | 'not_found' | 'wrong_state' | 'rate_limited' | 'send_failed'>

export async function resendGiftEmailAction(
  raw: ResendGiftEmailInput,
): Promise<ResendGiftEmailActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const parsed = resendGiftEmailSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'not_found' }

  const gift = await getGiftById(parsed.data.giftId)
  if (!gift) return { ok: false, error: 'not_found' }
  if (gift.senderUserId !== session.user.id) {
    return { ok: false, error: 'forbidden' }
  }
  if (gift.status !== 'PENDING') {
    return { ok: false, error: 'wrong_state' }
  }

  // 1/day per gift — 86400 seconds (24h). Forgiving without spamming the
  // recipient.
  const rl = await tryRateLimit(`gift-resend:${gift.id}`, {
    limit: 1,
    window: '86400 s',
  })
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const result = await sendGiftReceivedEmail(gift)
  await markGiftEmailSent(gift.id, result.ok, result.ok ? null : result.reason)
  if (!result.ok) return { ok: false, error: 'send_failed' }
  return { ok: true, giftId: gift.id }
}

/* ── Cancel gift (sender) ──────────────────────────────────────────────── */

export type CancelGiftActionResult =
  | ActionOk<{ giftId: string }>
  | ActionErr<'unauthorized' | 'not_found' | 'forbidden' | 'contact_support'>

export async function cancelGiftAction(
  raw: CancelGiftInput,
): Promise<CancelGiftActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }

  const parsed = cancelGiftSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: 'not_found' }

  const gift = await getGiftById(parsed.data.giftId)
  if (!gift) return { ok: false, error: 'not_found' }
  if (gift.senderUserId !== session.user.id) {
    return { ok: false, error: 'forbidden' }
  }
  // USER_PURCHASE: refund flow goes through admin (refund involves Stripe).
  if (gift.source === 'USER_PURCHASE') {
    return { ok: false, error: 'contact_support' }
  }
  // ADMIN_GRANT: sender can't cancel (they weren't the source).
  return { ok: false, error: 'forbidden' }
}

/* ── Helpers shared with the Stripe webhook + admin actions ────────────── */

/**
 * Re-render and send the gift_received email for a PENDING gift. Returns
 * a SendEmailResult-shaped object so callers can update emailSentAt /
 * emailSendFailedReason consistently.
 */
export async function sendGiftReceivedEmail(
  gift: Gift,
): Promise<{ ok: true; id: string | null } | { ok: false; reason: string }> {
  const itemSummary = await resolveGiftItemPrice(
    gift.itemType === 'TEST' ? 'BOOK' : (gift.itemType as GiftableItemType),
    gift.itemId,
  )
  if (!itemSummary) return { ok: false, reason: 'item_unavailable' }

  const locale = normaliseLocale(gift.locale)
  const origin = await resolveOrigin()
  const claimUrl = `${origin}/${locale}/gifts/claim?token=${encodeURIComponent(gift.token)}`

  let senderDisplayName = locale === 'ar' ? 'فريق د. خالد غطاس' : 'Dr. Khaled Ghattass team'
  if (gift.source === 'USER_PURCHASE' && gift.senderUserId) {
    try {
      const sender = await getUserByEmail(gift.recipientEmail).then(() =>
        import('@/lib/db/queries').then((m) => m.getUserById(gift.senderUserId!)),
      )
      if (sender?.name) senderDisplayName = sender.name
    } catch {
      /* fall back to default */
    }
  }

  // Single resolve up-front (cache hit if called again with same summary).
  const itemForEmail = await buildItemForEmail(itemSummary)
  const html = buildGiftReceivedHtml({
    locale,
    recipientEmail: gift.recipientEmail,
    senderDisplayName,
    item: itemForEmail,
    senderMessage: gift.senderMessage,
    claimUrl,
    expiresAt: gift.expiresAt,
    supportEmail: SUPPORT_EMAIL,
  })
  const text = buildGiftReceivedText({
    locale,
    recipientEmail: gift.recipientEmail,
    senderDisplayName,
    item: itemForEmail,
    senderMessage: gift.senderMessage,
    claimUrl,
    expiresAt: gift.expiresAt,
    supportEmail: SUPPORT_EMAIL,
  })
  const result = await sendEmail({
    to: gift.recipientEmail,
    subject: buildGiftReceivedSubject(locale, senderDisplayName),
    html,
    text,
    previewLabel: 'gift-received',
    emailType: 'gift_received',
    relatedEntityType: 'gift',
    relatedEntityId: gift.id,
  })
  if (result.ok) return { ok: true, id: result.id }
  if (result.reason === 'preview-only') return { ok: true, id: null }
  return { ok: false, reason: result.reason }
}

/**
 * Helper exported for the Stripe webhook to create a USER_PURCHASE gift +
 * its booking_order shell in one place. Mirrors createBookingCheckoutAction's
 * step 4 (createBookingOrder) but with the gift link.
 */
export async function createUserPurchaseGiftFromWebhook(input: {
  itemType: GiftableItemType
  itemId: string
  senderUserId: string
  recipientEmail: string
  senderMessage: string | null
  locale: GiftEmailLocale
  amountCents: number
  currency: string
  stripeSessionId: string
  stripePaymentIntentId: string | null
  holdId: string | null
}): Promise<Gift | null> {
  const created = await createGift({
    source: 'USER_PURCHASE',
    itemType: input.itemType,
    itemId: input.itemId,
    senderUserId: input.senderUserId,
    recipientEmail: input.recipientEmail,
    senderMessage: input.senderMessage,
    amountCents: input.amountCents,
    currency: input.currency,
    stripeSessionId: input.stripeSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    locale: input.locale,
  })
  if (!created) return null
  // For BOOKING: link the gift to a booking_order PENDING row that the
  // webhook will then mark PAID via markGiftBookingOrderPaid.
  if (input.itemType === 'BOOKING') {
    const bookingOrder = await createGiftBookingOrder({
      senderUserId: input.senderUserId,
      bookingId: input.itemId,
      giftId: created.gift.id,
      amountPaid: input.amountCents,
      currency: input.currency,
      stripeSessionId: input.stripeSessionId,
    })
    // QA P1 — compensating revoke. Previously the gift + the booking_order
    // were two separate INSERTs and a failure on the second left an orphan
    // gift with no booking_order: markGiftBookingOrderPaid would silently
    // no-op, the recipient would click claim and find nothing, and admin
    // had no clean recovery path because the gift was already PENDING.
    //
    // Drizzle/Neon doesn't support multi-statement transactions across
    // helpers cleanly here (createGift + createGiftBookingOrder each open
    // their own connection). The safe alternative is to mark the gift as
    // REFUNDED immediately when the booking_order insert fails — the
    // Stripe webhook then sees a REFUNDED gift, skips entitlement work,
    // and the sender's `gift_send_failed` email surfaces a "contact us"
    // CTA (markGiftRefunded is idempotent + already cascades emails).
    if (!bookingOrder) {
      console.error(
        '[gifts.createUserPurchaseGiftFromWebhook] booking_order insert failed; refunding gift',
        { giftId: created.gift.id, bookingId: input.itemId },
      )
      try {
        await markGiftRefunded(created.gift.id)
      } catch (refundErr) {
        console.error(
          '[gifts.createUserPurchaseGiftFromWebhook] compensating refund failed',
          { giftId: created.gift.id, refundErr },
        )
      }
      return null
    }
  }
  return created.gift
}
