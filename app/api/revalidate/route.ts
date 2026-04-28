import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { apiError, errUnauthorized, parseJsonBody } from '@/lib/api/errors'

const revalidateSchema = z
  .object({
    path: z.string().optional(),
    tag: z.string().optional(),
  })
  .refine((v) => v.path || v.tag, { message: 'Provide `path` or `tag`.' })

export async function POST(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const expected = process.env.REVALIDATE_TOKEN

  if (!expected) {
    return apiError('INTERNAL', 'Revalidate disabled — no token configured.', { status: 503 })
  }
  if (!token || token !== expected) {
    return errUnauthorized('Invalid or missing token.')
  }

  const body = await parseJsonBody(req, revalidateSchema)
  if (!body.ok) return body.response

  if (body.data.path) revalidatePath(body.data.path)
  if (body.data.tag) revalidateTag(body.data.tag)

  return NextResponse.json({
    revalidated: true,
    path: body.data.path ?? null,
    tag: body.data.tag ?? null,
    now: Date.now(),
  })
}
