import { NextResponse } from 'next/server'
import { gallerySchema } from '@/lib/validators/gallery'
import { deleteGalleryItem, updateGalleryItem } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, gallerySchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateGalleryItem(id, body.data)
    return NextResponse.json({ ok: true, item: row })
  } catch (err) {
    console.error('[api/admin/gallery PATCH]', err)
    return errInternal('Could not update item.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteGalleryItem(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/gallery DELETE]', err)
    return errInternal('Could not delete item.')
  }
}
