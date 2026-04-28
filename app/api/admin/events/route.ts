import { NextResponse } from 'next/server'
import { eventSchema } from '@/lib/validators/book'
import { createEvent } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, eventSchema)
  if (!body.ok) return body.response

  try {
    const row = await createEvent({
      ...body.data,
      coverImage: body.data.coverImage ?? null,
      locationAr: body.data.locationAr ?? null,
      locationEn: body.data.locationEn ?? null,
      registrationUrl: body.data.registrationUrl ?? null,
      endDate: body.data.endDate ?? null,
    })
    return NextResponse.json({ ok: true, event: row })
  } catch (err) {
    console.error('[api/admin/events POST]', err)
    return errInternal('Could not create event.')
  }
}
