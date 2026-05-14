'use server'

/**
 * Admin server actions for the /admin/orders surface.
 *
 *   - exportAdminOrdersCsvAction — CSV export of the currently-filtered set
 *   - resendOrderReceiptAction   — re-send the post-purchase email (uses the
 *                                  same composer the Stripe webhook fires
 *                                  on first delivery; signed-URL freshness
 *                                  is the main reason admins re-trigger).
 */

import { revalidatePath } from 'next/cache'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { getServerSession } from '@/lib/auth/server'
import {
  getAdminOrdersForCsv,
  getOrderById,
  getOrderItemsWithBooks,
} from '@/lib/db/queries'
import { sendPostPurchaseEmail } from '@/lib/email/send-post-purchase'
import type { OrderStatus } from '@/lib/db/schema'
import type { PostPurchaseLocale } from '@/lib/email/templates/post-purchase'

type Ok = { ok: true; csv: string; filename: string }
type Err<E extends string> = { ok: false; error: E }

const STATUS_VALUES: OrderStatus[] = [
  'PENDING',
  'PAID',
  'FULFILLED',
  'REFUNDED',
  'FAILED',
]

function readStatus(raw: string | undefined): OrderStatus | 'all' {
  if (raw && (STATUS_VALUES as string[]).includes(raw)) {
    return raw as OrderStatus
  }
  return 'all'
}

function readDate(raw: string | undefined): Date | null {
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function exportAdminOrdersCsvAction(input: {
  status?: string
  search?: string
  start?: string
  end?: string
}): Promise<Ok | Err<'unauthorized' | 'forbidden' | 'failed'>> {
  // Inline guard — server actions can't take a Request for assertSameOrigin.
  // ADMIN + CLIENT both can export (consistent with the rest of the admin
  // surface; refund and content-edit actions follow the same policy).
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false, error: 'forbidden' }
  }

  try {
    const startDate = readDate(input.start)
    const endDateRaw = readDate(input.end)
    const endDate = endDateRaw
      ? new Date(endDateRaw.getTime() + 24 * 60 * 60 * 1000 - 1)
      : null
    const orders = await getAdminOrdersForCsv({
      status: readStatus(input.status),
      search: input.search?.trim() || undefined,
      startDate,
      endDate,
    })

    // Items are fetched per-order in batch (parallel). Cap parallelism to
    // avoid pool exhaustion on the Neon serverless connection.
    const BATCH = 20
    const itemsByOrder = new Map<string, { titles: string }>()
    for (let i = 0; i < orders.length; i += BATCH) {
      const slice = orders.slice(i, i + BATCH)
      const batched = await Promise.all(
        slice.map(async (o) => {
          const items = await getOrderItemsWithBooks(o.id)
          const titles = items
            .map((it) => it.book?.titleEn ?? it.book?.titleAr ?? it.item.bookId ?? '')
            .filter(Boolean)
            .join('; ')
          return [o.id, { titles }] as const
        }),
      )
      for (const [id, val] of batched) itemsByOrder.set(id, val)
    }

    const header = [
      'order_id',
      'created_at',
      'customer_name',
      'customer_email',
      'items',
      'total_amount',
      'currency',
      'status',
      'stripe_session_id',
      'stripe_payment_intent_id',
    ].join(',')
    const body = orders
      .map((o) =>
        [
          o.id,
          o.createdAt.toISOString(),
          o.customerName ?? '',
          o.customerEmail,
          itemsByOrder.get(o.id)?.titles ?? '',
          o.totalAmount,
          o.currency,
          o.status,
          o.stripeSessionId ?? '',
          o.stripePaymentIntentId ?? '',
        ]
          .map(csvEscape)
          .join(','),
      )
      .join('\n')

    return {
      ok: true,
      csv: `${header}\n${body}\n`,
      filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
    }
  } catch (err) {
    console.error('[exportAdminOrdersCsvAction]', err)
    return { ok: false, error: 'failed' }
  }
}

/* ── Resend receipt ───────────────────────────────────────────────────── */

export type ResendOrderReceiptActionResult =
  | { ok: true; emailOutcome: 'sent' | 'preview_only' | 'send_failed' }
  | {
      ok: false
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'rate_limited'
        | 'not_found'
        | 'no_email'
        | 'wrong_status'
    }

/**
 * Re-send the post-purchase receipt to the customer email on file. Same
 * composer the webhook uses on first delivery — that's the point. Useful
 * when:
 *   - Resend was down / unconfigured at first delivery
 *   - Customer email landed in spam and they ask for it again
 *   - Signed-URL window has expired (re-send mints a fresh 7-day URL)
 *
 * Restricted to PAID / FULFILLED orders. REFUNDED / FAILED orders can't be
 * re-sent — there's nothing to deliver. Rate-limited per-admin so a stuck
 * "Resend" button can't spam a customer's inbox.
 */
export async function resendOrderReceiptAction(input: {
  orderId: string
}): Promise<ResendOrderReceiptActionResult> {
  const session = await getServerSession()
  if (!session) return { ok: false, error: 'unauthorized' }
  if (session.user.role !== 'ADMIN' && session.user.role !== 'CLIENT') {
    return { ok: false, error: 'forbidden' }
  }

  // 5 re-sends per minute per admin is generous for routine support work
  // and tight enough to make a stuck button visible. Fails open without
  // Upstash, matching the rest of the admin surface.
  const rl = await tryRateLimit(
    `admin-order-resend:${session.user.id}`,
    { limit: 5, window: '1 m' },
  )
  if (!rl.ok) return { ok: false, error: 'rate_limited' }

  const order = await getOrderById(input.orderId)
  if (!order) return { ok: false, error: 'not_found' }
  if (!order.customerEmail) return { ok: false, error: 'no_email' }
  if (order.status !== 'PAID' && order.status !== 'FULFILLED') {
    return { ok: false, error: 'wrong_status' }
  }

  // Locale of the receipt: there's no per-order locale column, so we default
  // to AR (the site's primary locale). Matches the webhook's fallback when
  // checkout metadata doesn't carry a locale.
  const locale: PostPurchaseLocale = 'ar'

  const result = await sendPostPurchaseEmail({
    orderId: order.id,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    userId: order.userId,
    totalAmount: order.totalAmount,
    currency: order.currency,
    locale,
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${order.id}`)

  if (result.ok) return { ok: true, emailOutcome: 'sent' }
  if (result.reason === 'preview-only') {
    return { ok: true, emailOutcome: 'preview_only' }
  }
  console.warn('[resendOrderReceiptAction] email send failed', {
    orderId: order.id,
    reason: result.reason,
  })
  return { ok: true, emailOutcome: 'send_failed' }
}
