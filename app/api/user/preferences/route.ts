import { NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getServerSession } from '@/lib/auth/server'
import { isDbConnected, isValidUuid } from '@/lib/db/queries'
import { errInternal, errUnauthorized, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'

const prefSchema = z.object({
  newsletter: z.boolean().optional(),
  purchases: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  locale: z.enum(['ar', 'en']).optional(),
})

export async function PATCH(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized()

  const body = await parseJsonBody(req, prefSchema)
  if (!body.ok) return body.response

  if (!isDbConnected || !isValidUuid(session.user.id)) {
    return NextResponse.json({ ok: true, mocked: true, preferences: body.data })
  }

  try {
    const [existing] = await db
      .select({ preferences: users.preferences })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
    const current = (() => {
      try {
        return existing?.preferences ? JSON.parse(existing.preferences) : {}
      } catch {
        return {}
      }
    })()
    const merged = { ...current, ...body.data }
    const [row] = await db
      .update(users)
      .set({ preferences: JSON.stringify(merged), updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning()
    return NextResponse.json({ ok: true, user: row ?? null, preferences: merged })
  } catch (err) {
    console.error('[api/user/preferences] update failed', err)
    return errInternal('Could not update preferences.')
  }
}
