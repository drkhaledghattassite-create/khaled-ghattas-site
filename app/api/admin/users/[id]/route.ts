import { NextResponse } from 'next/server'
import { z } from 'zod'
import { updateUserRole } from '@/lib/db/queries'
import { requireAdminStrict } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

const userPatchSchema = z.object({
  role: z.enum(['USER', 'ADMIN', 'CLIENT']),
})

type Ctx = { params: Promise<{ id: string }> }

// requireAdminStrict (ADMIN only) — not requireAdmin (ADMIN ∪ CLIENT). User
// role management is the one /admin surface where the two roles diverge: a
// CLIENT mustn't be able to downgrade the developer ADMIN, nor promote
// arbitrary users.
export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdminStrict(req)
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
