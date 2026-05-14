'use server'

/**
 * CSV export for /admin/orders. Streams the currently-filtered result set
 * (respecting status, search, and date range) up to ADMIN_CSV_MAX_ROWS so
 * a runaway click can't OOM the function. Caller receives the CSV string +
 * a generated filename; the client triggers the file download.
 */

import { getServerSession } from '@/lib/auth/server'
import {
  getAdminOrdersForCsv,
  getOrderItemsWithBooks,
} from '@/lib/db/queries'
import type { OrderStatus } from '@/lib/db/schema'

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
