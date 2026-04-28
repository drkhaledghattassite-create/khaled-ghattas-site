import { NextResponse } from 'next/server'
import { bookSchema } from '@/lib/validators/book'
import { deleteBook, updateBook } from '@/lib/db/queries'
import { requireAdmin } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  const body = await parseJsonBody(req, bookSchema.partial())
  if (!body.ok) return body.response

  try {
    const row = await updateBook(id, body.data)
    return NextResponse.json({ ok: true, book: row })
  } catch (err) {
    console.error('[api/admin/books PATCH]', err)
    return errInternal('Could not update book.')
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const guard = await requireAdmin(req)
  if (!guard.ok) return guard.response

  const { id } = await params
  try {
    const ok = await deleteBook(id)
    return NextResponse.json({ ok })
  } catch (err) {
    console.error('[api/admin/books DELETE]', err)
    return errInternal('Could not delete book.')
  }
}
