import { NextResponse } from 'next/server'
import { gallerySchema } from '@/lib/validators/gallery'
import { createGalleryItem } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, gallerySchema)
  if (!body.ok) return body.response

  try {
    const row = await createGalleryItem({
      ...body.data,
      titleAr: body.data.titleAr ?? null,
      titleEn: body.data.titleEn ?? null,
      category: body.data.category ?? null,
    })
    return NextResponse.json({ ok: true, item: row })
  } catch (err) {
    console.error('[api/admin/gallery POST]', err)
    return errInternal('Could not create item.')
  }
}
