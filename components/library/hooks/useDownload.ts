'use client'

import { useCallback, useState } from 'react'
import {
  extractPages,
  triggerDownload,
  buildFilename,
} from '../lib/extractPages'

export type UseDownloadResult = {
  isDownloading: boolean
  downloadCurrentPage: (page: number) => Promise<void>
  downloadPages: (pages: number[]) => Promise<void>
}

export function useDownload(pdfUrl: string, slug: string): UseDownloadResult {
  const [isDownloading, setIsDownloading] = useState(false)

  const download = useCallback(
    async (pages: number[]) => {
      if (isDownloading) return
      setIsDownloading(true)
      try {
        const blob = await extractPages(pdfUrl, pages)
        triggerDownload(blob, buildFilename(slug, pages))
      } catch (err) {
        console.error('[useDownload] download failed:', err)
      } finally {
        setIsDownloading(false)
      }
    },
    [isDownloading, pdfUrl, slug],
  )

  const downloadCurrentPage = useCallback(
    (page: number) => download([page]),
    [download],
  )

  const downloadPages = useCallback(
    (pages: number[]) => download(pages),
    [download],
  )

  return { isDownloading, downloadCurrentPage, downloadPages }
}
