import { NextResponse } from 'next/server'
import { requireAdminStrict } from '@/lib/auth/admin-guard'
import { errInternal, errRateLimited, parseJsonBody } from '@/lib/api/errors'
import { tryRateLimit } from '@/lib/redis/ratelimit'
import {
  getSiteSettings,
  updateSiteSettings,
} from '@/lib/db/queries'
import { siteSettingsPatchSchema } from '@/lib/site-settings/zod'

export async function GET() {
  // Developer-only — see role policy in lib/auth/admin-guard.ts.
  const guard = await requireAdminStrict()
  if (!guard.ok) return guard.response

  try {
    const data = await getSiteSettings()
    return NextResponse.json({ ok: true, data })
  } catch (err) {
    console.error('[api/admin/site-settings GET]', err)
    return errInternal('Could not load site settings.')
  }
}

export async function PATCH(req: Request) {
  // Developer-only — see role policy in lib/auth/admin-guard.ts.
  const guard = await requireAdminStrict(req)
  if (!guard.ok) return guard.response

  // Per-admin rate limit. Falls open when Upstash isn't configured.
  const rl = await tryRateLimit(`admin-site-settings:${guard.user.id}`)
  if (!rl.ok) {
    return errRateLimited('Too many save attempts — please wait a moment.')
  }

  const body = await parseJsonBody(req, siteSettingsPatchSchema)
  if (!body.ok) return body.response

  try {
    const data = await updateSiteSettings(body.data)
    return NextResponse.json({ ok: true, data }, { headers: rl.headers })
  } catch (err) {
    console.error('[api/admin/site-settings PATCH]', err)
    return errInternal('Could not save site settings.')
  }
}
