import { NextResponse } from 'next/server'
import { contactSchema } from '@/lib/validators/contact'
import { createContactMessage } from '@/lib/db/queries'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { apiError, errInternal, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'

export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const body = await parseJsonBody(req, contactSchema)
  if (!body.ok) return body.response

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon'

  const rl = await tryRateLimit(`contact:${ip}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  try {
    const row = await createContactMessage(body.data)
    return NextResponse.json({ ok: true, id: row?.id ?? null }, { status: 200 })
  } catch (err) {
    console.error('[api/contact] insert failed', err)
    return errInternal('Could not save the message.')
  }
}
