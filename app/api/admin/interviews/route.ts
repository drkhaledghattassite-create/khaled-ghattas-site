import { NextResponse } from 'next/server'
import { interviewSchema } from '@/lib/validators/book'
import { createInterview } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, interviewSchema)
  if (!body.ok) return body.response

  try {
    const row = await createInterview({
      ...body.data,
      descriptionAr: body.data.descriptionAr ?? null,
      descriptionEn: body.data.descriptionEn ?? null,
      source: body.data.source ?? null,
      sourceAr: body.data.sourceAr ?? null,
      year: body.data.year ?? null,
    })
    return NextResponse.json({ ok: true, interview: row })
  } catch (err) {
    console.error('[api/admin/interviews POST]', err)
    return errInternal('Could not create interview.')
  }
}
