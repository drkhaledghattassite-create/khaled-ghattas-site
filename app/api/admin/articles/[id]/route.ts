import { NextResponse } from 'next/server'
import { articleSchema } from '@/lib/validators/article'
import { deleteArticle, updateArticle } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, articleSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateArticle(id, body.data)
    return NextResponse.json({ ok: true, article: row })
  } catch (err) {
    console.error('[api/admin/articles PATCH]', err)
    return errInternal('Could not update article.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteArticle(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/articles DELETE]', err)
    return errInternal('Could not delete article.')
  }
}
