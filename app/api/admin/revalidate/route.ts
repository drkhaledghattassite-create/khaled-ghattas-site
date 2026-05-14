import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal } from '@/lib/api/errors'

export async function POST(req: Request) {
  // Shared (ADMIN ∪ CLIENT) on purpose. Cache revalidation is part of the
  // content-publishing UX — a CLIENT re-publishing an article needs to
  // push the new copy live without waiting for the next ISR window. The
  // operation is read-only against the DB and doesn't expose any
  // developer-only state, so the looser gate is the right one here.
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  try {
    revalidatePath('/', 'layout')
    return NextResponse.json({ ok: true, now: Date.now() })
  } catch (err) {
    console.error('[api/admin/revalidate]', err)
    return errInternal('Could not clear cache.')
  }
}
