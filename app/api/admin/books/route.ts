import { NextResponse } from 'next/server'
import { bookSchema } from '@/lib/validators/book'
import { createBook } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function POST(req: Request) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, bookSchema)
  if (!body.ok) return body.response

  try {
    const row = await createBook({
      ...body.data,
      price: body.data.price ?? '0',
      subtitleAr: body.data.subtitleAr ?? undefined,
      subtitleEn: body.data.subtitleEn ?? undefined,
      digitalFile: body.data.digitalFile ?? undefined,
      externalUrl: body.data.externalUrl ?? undefined,
      publisher: body.data.publisher ?? undefined,
      publicationYear: body.data.publicationYear ?? undefined,
    })
    return NextResponse.json({ ok: true, book: row })
  } catch (err) {
    console.error('[api/admin/books POST]', err)
    return errInternal('Could not create book.')
  }
}
