import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllSettings, setSettingsBulk } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function GET() {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  try {
    const rows = await getAllSettings()
    const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]))
    return NextResponse.json({ ok: true, settings })
  } catch (err) {
    console.error('[api/admin/settings GET]', err)
    return errInternal('Could not load settings.')
  }
}

const settingsPatchSchema = z.record(z.string().min(1).max(120), z.string().max(8000))

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, settingsPatchSchema)
  if (!body.ok) return body.response

  try {
    await setSettingsBulk(body.data)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/settings PATCH]', err)
    return errInternal('Could not save settings.')
  }
}
