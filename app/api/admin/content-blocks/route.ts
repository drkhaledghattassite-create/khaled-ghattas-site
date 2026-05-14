import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAllContentBlocks, setContentBlock } from '@/lib/db/queries'
import { requireAdminStrict } from '@/lib/auth/admin-guard'
import { errInternal, parseJsonBody } from '@/lib/api/errors'

export async function GET() {
  // Developer-only — see role policy in lib/auth/admin-guard.ts.
  const guard = await requireAdminStrict()
  if (!guard.ok) return guard.response

  try {
    const blocks = await getAllContentBlocks()
    return NextResponse.json({ ok: true, blocks })
  } catch (err) {
    console.error('[api/admin/content-blocks GET]', err)
    return errInternal('Could not load content blocks.')
  }
}

const contentBlockSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9_.\-]+$/i, 'Use letters, numbers, dot, dash, underscore.'),
  valueAr: z.string().max(8000).default(''),
  valueEn: z.string().max(8000).default(''),
  description: z.string().max(500).nullable().optional(),
})

export async function POST(req: Request) {
  // Developer-only — see role policy in lib/auth/admin-guard.ts.
  const guard = await requireAdminStrict(req)
  if (!guard.ok) return guard.response

  const body = await parseJsonBody(req, contentBlockSchema)
  if (!body.ok) return body.response

  try {
    await setContentBlock(
      body.data.key,
      body.data.valueAr,
      body.data.valueEn,
      body.data.description ?? null,
    )
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[api/admin/content-blocks POST]', err)
    return errInternal('Could not save content block.')
  }
}
