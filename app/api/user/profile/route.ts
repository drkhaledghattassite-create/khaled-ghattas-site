import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { auth } from '@/lib/auth'
import { getServerSession } from '@/lib/auth/server'
import { isDbConnected, isValidUuid } from '@/lib/db/queries'
import { errInternal, errUnauthorized, parseJsonBody } from '@/lib/api/errors'
import { assertSameOrigin } from '@/lib/api/origin'

const profileSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.string().email().max(254).optional(),
  bio: z.string().max(2000).optional(),
})

export async function PATCH(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized()

  const body = await parseJsonBody(req, profileSchema)
  if (!body.ok) return body.response

  if (!isDbConnected || !isValidUuid(session.user.id)) {
    return NextResponse.json({ ok: true, mocked: true, ...body.data })
  }

  try {
    const [row] = await db
      .update(users)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning()
    return NextResponse.json({ ok: true, user: row ?? null })
  } catch (err) {
    console.error('[api/user/profile] update failed', err)
    return errInternal('Could not update profile.')
  }
}

export async function DELETE(req: Request) {
  const originErr = assertSameOrigin(req)
  if (originErr) return originErr

  const session = await getServerSession()
  if (!session) return errUnauthorized()

  if (!isDbConnected || !isValidUuid(session.user.id)) {
    return NextResponse.json({ ok: true, mocked: true })
  }

  const reqHeaders = await headers()

  try {
    // sessions + accounts cascade via FK; orders.user_id is set null (preserves order history).
    await db.delete(users).where(eq(users.id, session.user.id))
  } catch (err) {
    console.error('[api/user/profile] delete failed', err)
    return errInternal('Could not delete account.')
  }

  // Capture Better Auth's cookie-clearing response so the client cookie is invalidated too.
  // The session row is already gone via cascade, so signOut may throw — that's fine.
  const res = NextResponse.json({ ok: true })
  try {
    const signOutRes = await auth.api.signOut({ headers: reqHeaders, asResponse: true })
    signOutRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') res.headers.append('set-cookie', value)
    })
  } catch {
    // Session row deleted by cascade — fall through with the bare 200.
  }
  return res
}
