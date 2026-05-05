import { NextResponse } from 'next/server'
import { corporateRequestSchema } from '@/lib/validators/corporate'
import {
  createCorporateRequest,
  getCorporateProgram,
} from '@/lib/db/queries'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { apiError, errInternal, parseJsonBody } from '@/lib/api/errors'
import { sendCorporateRequestEmail } from '@/lib/email/templates/corporate-request'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, corporateRequestSchema)
  if (!body.ok) return body.response

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon'

  const rl = await tryRateLimit(`corporate-request:${ip}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  // Empty-string fields from the form become null in the DB; keep the storage
  // shape clean so admin queries don't have to coerce.
  const programId =
    body.data.programId && body.data.programId.length > 0
      ? body.data.programId
      : null

  try {
    const row = await createCorporateRequest({
      name: body.data.name,
      email: body.data.email,
      phone: body.data.phone || null,
      organization: body.data.organization,
      position: body.data.position || null,
      programId,
      preferredDate: body.data.preferredDate || null,
      attendeeCount: body.data.attendeeCount ?? null,
      message: body.data.message || null,
    })

    // Best-effort notification — never fail the user request because email is
    // unconfigured or Resend is down. The row is already saved.
    if (row) {
      try {
        const program = programId ? await getCorporateProgram(programId) : null
        await sendCorporateRequestEmail({
          name: row.name,
          email: row.email,
          organization: row.organization,
          position: row.position,
          phone: row.phone,
          program,
          preferredDate: row.preferredDate,
          attendeeCount: row.attendeeCount,
          message: row.message,
        })
      } catch (mailErr) {
        console.error('[api/corporate/request] notification failed', mailErr)
      }
    }

    return NextResponse.json(
      { ok: true, id: row?.id ?? null },
      { status: 200, headers: rl.headers },
    )
  } catch (err) {
    console.error('[api/corporate/request] insert failed', err)
    return errInternal('Could not save the request.')
  }
}
