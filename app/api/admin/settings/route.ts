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

// SECURITY [M-2]: This legacy key/value endpoint used to accept ANY key with
// up to 8 KB of value content. A compromised admin (or an attacker exploiting
// a future XSS in the admin panel) could plant arbitrary keys; if any
// downstream consumer ever rendered those values without escaping, that is
// XSS-via-DB-write. The keys are now locked to the set actually consumed by
// `components/admin/SettingsTabs.tsx` — the only writer of this endpoint.
// When SettingsTabs adds a new field, add the key here. Do not loosen the
// schema back to `z.record(z.string(), z.string())`.
const ALLOWED_SETTING_KEYS = [
  // General
  'site_title_ar',
  'site_title_en',
  'site_description_ar',
  'site_description_en',
  // Social
  'twitter_url',
  'facebook_url',
  'youtube_url',
  'instagram_url',
  'linkedin_url',
  // SEO
  'default_meta_image',
  'google_analytics_id',
  'robots_index',
  // Email
  'from_name',
  'from_email',
  'reply_to_email',
  'contact_email',
  // Payments
  'currency',
  'tax_rate',
  // Maintenance
  'maintenance_mode',
] as const

const settingsPatchSchema = z.record(
  z.enum(ALLOWED_SETTING_KEYS),
  z.string().max(2000),
)

export async function PATCH(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, settingsPatchSchema)
  if (!body.ok) return body.response

  // z.record(z.enum(...), ...) yields Partial<Record<...>> with optional
  // values; strip undefined keys to satisfy setSettingsBulk's signature.
  const entries: Record<string, string> = {}
  for (const [k, v] of Object.entries(body.data)) {
    if (typeof v === 'string') entries[k] = v
  }

  try {
    await setSettingsBulk(entries)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/settings PATCH]', err)
    return errInternal('Could not save settings.')
  }
}
