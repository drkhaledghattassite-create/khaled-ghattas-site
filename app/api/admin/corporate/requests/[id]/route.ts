import { NextResponse } from 'next/server'
import { corporateRequestUpdateSchema } from '@/lib/validators/corporate'
import {
  deleteCorporateRequest,
  updateCorporateRequest,
} from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, corporateRequestUpdateSchema)
  if (!body.ok) return body.response

  try {
    const row = await updateCorporateRequest(id, {
      ...(body.data.status !== undefined ? { status: body.data.status } : {}),
      ...(body.data.adminNotes !== undefined
        ? { adminNotes: body.data.adminNotes }
        : {}),
    })
    return NextResponse.json({ ok: true, request: row })
  } catch (err) {
    console.error('[api/admin/corporate/requests PATCH]', err)
    return errInternal('Could not update request.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteCorporateRequest(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/corporate/requests DELETE]', err)
    return errInternal('Could not delete request.')
  }
}
