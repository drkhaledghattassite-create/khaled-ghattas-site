import { NextResponse } from 'next/server'
import { eventSchema } from '@/lib/validators/book'
import { deleteEvent, updateEvent } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, eventSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateEvent(id, body.data)
    return NextResponse.json({ ok: true, event: row })
  } catch (err) {
    console.error('[api/admin/events PATCH]', err)
    return errInternal('Could not update event.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteEvent(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/events DELETE]', err)
    return errInternal('Could not delete event.')
  }
}
