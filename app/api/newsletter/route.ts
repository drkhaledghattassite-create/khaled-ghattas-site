import { NextResponse } from 'next/server'
import { newsletterSchema } from '@/lib/validators/newsletter'
import { createSubscriber } from '@/lib/db/queries'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import { apiError, errInternal, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'
import { getClientIp } from '@/lib/api/client-ip'

export async function POST(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const body = await parseJsonBody(req, newsletterSchema)
  if (!body.ok) return body.response

  // QA P1 — spoof-resistant IP. Naive `x-forwarded-for[0]` reads the
  // attacker-supplied leftmost hop and lets anyone bypass rate limits by
  // rotating fake header values.
  const ip = getClientIp(req)
  const rl = await tryRateLimit(`newsletter:${ip}`)
  if (!rl.ok) {
    const res = apiError('RATE_LIMITED', 'Too many requests.')
    for (const [k, v] of Object.entries(rl.headers)) res.headers.set(k, v)
    return res
  }

  try {
    // createSubscriber now upserts on email conflict — re-subscribing after
    // an unsubscribe restores status to ACTIVE rather than silently no-op'ing.
    const row = await createSubscriber(
      body.data.email,
      body.data.name,
      body.data.source ?? 'site',
    )
    return NextResponse.json({ ok: true, id: row?.id ?? null }, { status: 200 })
  } catch (err) {
    console.error('[api/newsletter] insert failed', err)
    return errInternal('Could not subscribe.')
  }
}
