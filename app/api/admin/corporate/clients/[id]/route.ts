import { NextResponse } from 'next/server'
import { corporateClientSchema } from '@/lib/validators/corporate'
import {
  deleteCorporateClient,
  updateCorporateClient,
} from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, corporateClientSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateCorporateClient(id, body.data)
    return NextResponse.json({ ok: true, client: row })
  } catch (err) {
    console.error('[api/admin/corporate/clients PATCH]', err)
    return errInternal('Could not update client.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteCorporateClient(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/corporate/clients DELETE]', err)
    return errInternal('Could not delete client.')
  }
}
