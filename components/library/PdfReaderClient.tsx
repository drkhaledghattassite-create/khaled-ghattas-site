'use client'

/**
 * Client-only wrapper around PdfReader.
 *
 * Why this file exists:
 *   pdfjs-dist's `pdf.mjs` runs `Object.defineProperty(globalThis, ...)` at
 *   module-evaluation time. That crashes ("Object.defineProperty called on
 *   non-object") when Next bundles/evaluates the module in its server-side
 *   pass — even though `PdfReader.tsx` itself is `'use client'`. The
 *   `'use client'` directive controls where the component *renders*; it does
 *   not stop the module from being parsed during the server build.
 *
 *   The standard Next 15 App Router fix is `next/dynamic` with `ssr: false`,
 *   which defers the import to the client runtime entirely. `ssr: false`
 *   may only be passed from inside a client component, hence this wrapper.
 *
 * Keep this file thin: it should only do the dynamic import and forward
 * props. Real reader logic stays in PdfReader.tsx.
 */

import dynamic from 'next/dynamic'
import type { PdfBookmark } from '@/lib/db/queries'

type PdfReaderClientProps = {
  bookId: string
  pdfUrl: string
  initialPage?: number
  initialBookmarks?: PdfBookmark[]
  locale: 'ar' | 'en'
  title: string
}

const PdfReader = dynamic(
  () => import('./PdfReader').then((m) => m.PdfReader),
  { ssr: false },
)

export function PdfReaderClient(props: PdfReaderClientProps) {
  return <PdfReader {...props} />
}
