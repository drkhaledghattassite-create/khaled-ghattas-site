import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateUserRole } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

const userPatchSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'CLIENT']),
})

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, userPatchSchema)
  if (!body.ok) return body.response

  try {
    await updateUserRole(id, body.data.role)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/users PATCH]', err)
    return errInternal('Could not update user role.')
  }
}
