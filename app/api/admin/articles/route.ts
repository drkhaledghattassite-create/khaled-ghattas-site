import { NextResponse } from 'next/server'
import { articleSchema } from '@/lib/validators/article'
import { createArticle } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, articleSchema)
  if (!body.ok) return body.response

  try {
    const row = await createArticle({
      ...body.data,
      coverImage: body.data.coverImage ?? null,
    })
    return NextResponse.json({ ok: true, article: row })
  } catch (err) {
    console.error('[api/admin/articles POST]', err)
    return errInternal('Could not create article.')
  }
}
