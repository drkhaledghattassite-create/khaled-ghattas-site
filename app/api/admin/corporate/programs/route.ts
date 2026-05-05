import { NextResponse } from 'next/server'
import { corporateProgramSchema } from '@/lib/validators/corporate'
import { createCorporateProgram } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, corporateProgramSchema)
  if (!body.ok) return body.response

  try {
    const row = await createCorporateProgram({
      ...body.data,
      durationAr: body.data.durationAr ?? null,
      durationEn: body.data.durationEn ?? null,
      audienceAr: body.data.audienceAr ?? null,
      audienceEn: body.data.audienceEn ?? null,
      coverImage: body.data.coverImage ?? null,
    })
    return NextResponse.json({ ok: true, program: row })
  } catch (err) {
    console.error('[api/admin/corporate/programs POST]', err)
    return errInternal('Could not create program.')
  }
}
