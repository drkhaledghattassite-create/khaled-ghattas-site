import { NextResponse } from 'next/server'
import { newsletterSchema } from '@/lib/validators/newsletter'
import { createSubscriber } from '@/lib/db/queries'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { apiError, errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const body = await parseJsonBody(req, newsletterSchema)
  if (!body.ok) return body.response

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'anon'
  const rl = await tryRateLimit(`newsletter:${ip}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  try {
    const row = await createSubscriber(
      body.data.email,
      body.data.name,
      body.data.source ?? 'site',
    )
    return NextResponse.json({ ok: true, id: row?.id ?? null }, { status: 200 })
  } catch (err) {
    console.error('[api/newsletter] insert failed', err)
    const msg = err instanceof Error ? err.message : ''
    if (/duplicate|unique/i.test(msg)) {
      return NextResponse.json({ ok: true, alreadySubscribed: true }, { status: 200 })
    }
    return errInternal('Could not subscribe.')
  }
}
