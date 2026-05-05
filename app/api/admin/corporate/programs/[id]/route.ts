import { NextResponse } from 'next/server'
import { corporateProgramSchema } from '@/lib/validators/corporate'
import {
  deleteCorporateProgram,
  updateCorporateProgram,
} from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, corporateProgramSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateCorporateProgram(id, body.data)
    return NextResponse.json({ ok: true, program: row })
  } catch (err) {
    console.error('[api/admin/corporate/programs PATCH]', err)
    return errInternal('Could not update program.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteCorporateProgram(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/corporate/programs DELETE]', err)
    return errInternal('Could not delete program.')
  }
}
