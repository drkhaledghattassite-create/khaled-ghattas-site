import { NextResponse } from 'next/server'
import { corporateClientSchema } from '@/lib/validators/corporate'
import { createCorporateClient } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, corporateClientSchema)
  if (!body.ok) return body.response

  try {
    const row = await createCorporateClient({
      ...body.data,
      nameAr: body.data.nameAr ?? null,
      websiteUrl: body.data.websiteUrl ?? null,
    })
    return NextResponse.json({ ok: true, client: row })
  } catch (err) {
    console.error('[api/admin/corporate/clients POST]', err)
    return errInternal('Could not create client.')
  }
}
