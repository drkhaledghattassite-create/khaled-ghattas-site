import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal } from '@/lib/api/errors'

export async function POST(req: Request) {
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
