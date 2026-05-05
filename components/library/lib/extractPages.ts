'use client'

import { PDFDocument } from 'pdf-lib'

/**
 * Fetches `pdfUrl`, extracts the given 1-indexed page numbers, and returns a
 * Blob ready for download. Pages outside [1, totalPages] are silently skipped.
 * We fetch with credentials:'include' so signed-URL cookies pass through.
 */
export async function extractPages(
  pdfUrl: string,
  pageNumbers: number[],
): Promise<Blob> {
  const res = await fetch(pdfUrl, { credentials: 'include' })
  if (!res.ok) throw new Error(`PDF fetch failed: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()

  const srcDoc = await PDFDocument.load(arrayBuffer)
  const dstDoc = await PDFDocument.create()

  const total = srcDoc.getPageCount()
  const indices = pageNumbers
    .map((p) => p - 1)
    .filter((i) => i >= 0 && i < total)

  if (indices.length === 0) throw new Error('No valid pages to extract')

  const copied = await dstDoc.copyPages(srcDoc, indices)
  copied.forEach((page: import('pdf-lib').PDFPage) => dstDoc.addPage(page))

  const bytes = await dstDoc.save()
  return new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' })
}

/**
 * Triggers a browser file download for `blob`.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parses a page-range string like "1,3,5-8,10" into a sorted, deduped array
 * of 1-indexed page numbers. Returns error:'invalid'|'empty' on bad input.
 *
 * Examples:
 *   "3"        → [3]
 *   "1-5"      → [1,2,3,4,5]
 *   "1,3,5-8"  → [1,3,5,6,7,8]
 */
export function parsePageInput(
  input: string,
  totalPages: number,
): { pages: number[]; error: string | null } {
  const parts = input
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  if (parts.length === 0) return { pages: [], error: 'empty' }

  const pages = new Set<number>()
  for (const part of parts) {
    const range = part.split('-')
    if (range.length === 1) {
      const n = parseInt(part, 10)
      if (!Number.isFinite(n) || n < 1) return { pages: [], error: 'invalid' }
      pages.add(Math.min(n, totalPages))
    } else if (range.length === 2) {
      const start = parseInt(range[0]!, 10)
      const end = parseInt(range[1]!, 10)
      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        start < 1 ||
        end < start
      )
        return { pages: [], error: 'invalid' }
      for (let i = start; i <= Math.min(end, totalPages); i++) pages.add(i)
    } else {
      return { pages: [], error: 'invalid' }
    }
  }
  return { pages: Array.from(pages).sort((a, b) => a - b), error: null }
}

/**
 * Builds a human-readable download filename from a book slug and page list.
 *
 * "my-book", [5]      → "my-book-p5.pdf"
 * "my-book", [1,2,3]  → "my-book-p1-3.pdf"   (contiguous range)
 * "my-book", [1,3,5]  → "my-book-p1,3,5.pdf" (non-contiguous)
 */
export function buildFilename(slug: string, pages: number[]): string {
  if (pages.length === 0) return `${slug}.pdf`
  if (pages.length === 1) return `${slug}-p${pages[0]}.pdf`

  let contiguous = true
  for (let i = 1; i < pages.length; i++) {
    if (pages[i]! - pages[i - 1]! !== 1) {
      contiguous = false
      break
    }
  }

  if (contiguous)
    return `${slug}-p${pages[0]}-${pages[pages.length - 1]}.pdf`
  return `${slug}-p${pages.join(',')}.pdf`
}
