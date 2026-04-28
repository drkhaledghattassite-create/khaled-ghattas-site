import { NextResponse } from 'next/server'
import { z } from 'zod'
import { deleteContentBlock, getContentBlock, setContentBlock } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, errNotFound, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ key: string }> }

export async function GET(_req: Request, { params }: Ctx) {
  const guard = await requireAdmin()
  if (!guard.ok) return guard.response

  const { key } = await params
  try {
    const block = await getContentBlock(key)
    if (!block) return errNotFound('Content block not found.')
    return NextResponse.json({ ok: true, block })
  } catch (err) {
    console.error('[api/admin/content-blocks GET]', err)
    return errInternal('Could not load content block.')
  }
}

const blockPatchSchema = z.object({
  valueAr: z.string().max(8000).optional(),
  valueEn: z.string().max(8000).optional(),
  description: z.string().max(500).nullable().optional(),
})

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { key } = await params
  const body = await parseJsonBody(req, blockPatchSchema)
  if (!body.ok) return body.response

  try {
    const existing = await getContentBlock(key)
    await setContentBlock(
      key,
      body.data.valueAr ?? existing?.valueAr ?? '',
      body.data.valueEn ?? existing?.valueEn ?? '',
      body.data.description ?? existing?.description ?? null,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/content-blocks PATCH]', err)
    return errInternal('Could not update content block.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { key } = await params
  try {
    const ok = await deleteContentBlock(key)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/content-blocks DELETE]', err)
    return errInternal('Could not delete content block.')
  }
}
