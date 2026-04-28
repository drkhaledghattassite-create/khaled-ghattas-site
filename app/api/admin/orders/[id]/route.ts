import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateOrderStatus } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

const ordersStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'FULFILLED', 'REFUNDED', 'FAILED']),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, ordersStatusSchema)
  if (!body.ok) return body.response

  try {
    const row = await updateOrderStatus(id, body.data.status)
    return NextResponse.json({ ok: true, order: row })
  } catch (err) {
    console.error('[api/admin/orders PATCH]', err)
    return errInternal('Could not update order.')
  }
}
