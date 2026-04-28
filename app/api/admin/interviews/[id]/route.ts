import { NextResponse } from 'next/server'
import { interviewSchema } from '@/lib/validators/book'
import { deleteInterview, updateInterview } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, interviewSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateInterview(id, body.data)
    return NextResponse.json({ ok: true, interview: row })
  } catch (err) {
    console.error('[api/admin/interviews PATCH]', err)
    return errInternal('Could not update interview.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteInterview(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/interviews DELETE]', err)
    return errInternal('Could not delete interview.')
  }
}
