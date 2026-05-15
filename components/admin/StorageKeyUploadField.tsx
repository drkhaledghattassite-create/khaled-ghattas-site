'use client'

/**
 * Storage-key input + upload control — Phase F1.
 *
 * Renders a text input (for an external URL or an existing R2 key) with an
 * "Upload file" button below it. Picking a file kicks off the two-step
 * upload flow:
 *   1. POST `/api/admin/storage/upload` with file metadata → server validates
 *      and returns a presigned PUT URL + final R2 key.
 *   2. XHR PUT the file bytes directly to the presigned URL — browser-native
 *      progress events drive the visible progress bar.
 *   3. On success, the input's value is replaced with the returned key and
 *      the parent form is notified via `onChange`.
 *
 * The XHR (not fetch) buys us upload progress events; fetch's
 * `ReadableStream` body progress isn't broadly supported in 2025.
 *
 * Accessibility:
 *   - The progress bar uses `<progress>` so screen readers announce it
 *     natively. We also set `aria-live="polite"` on the status text.
 *   - The upload button stays a real `<button>`, focusable and keyboard-
 *     activatable. The hidden file input is wired via a ref.
 *   - `prefers-reduced-motion` is honored by the underlying CSS (no custom
 *     keyframes here — the progress bar is a native element).
 */

import { useRef, useState } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  ALLOWED_CONTENT_TYPES,
  MAX_BYTES,
  type UploadContext,
} from '@/lib/validators/storage'

type Props = {
  context: UploadContext
  value: string
  onChange: (next: string) => void
  placeholder?: string
  hint?: string
  /** Disable the upload button (the text input stays editable). */
  uploadDisabled?: boolean
  /** Optional label rendered above the input. The parent form usually
   * supplies its own `<FormLabel>`; pass `undefined` to skip ours. */
  label?: string
  inputId?: string
}

type UploadResponse = {
  ok: true
  key: string
  uploadUrl: string
  expiresAt: string
  method: 'PUT'
  headers: Record<string, string>
}

const MB = 1024 * 1024

function formatMaxSize(bytes: number): string {
  if (bytes >= 1024 * MB) return `${Math.round(bytes / (1024 * MB))} GB`
  return `${Math.round(bytes / MB)} MB`
}

export function StorageKeyUploadField({
  context,
  value,
  onChange,
  placeholder,
  hint,
  uploadDisabled = false,
  label,
  inputId,
}: Props) {
  const t = useTranslations('admin.upload')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const xhrRef = useRef<XMLHttpRequest | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const accept = ALLOWED_CONTENT_TYPES[context].join(',')
  const maxBytes = MAX_BYTES[context]

  function openPicker() {
    fileInputRef.current?.click()
  }

  function reset() {
    setProgress(null)
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    xhrRef.current = null
  }

  async function handleFile(file: File) {
    // Client-side bouncer — the server is the source of truth, this is for
    // an instant toast before we make any network call.
    if (file.size > maxBytes) {
      toast.error(t('error_size', { limit: formatMaxSize(maxBytes) }))
      reset()
      return
    }
    if (!ALLOWED_CONTENT_TYPES[context].includes(file.type)) {
      toast.error(t('error_type', { types: ALLOWED_CONTENT_TYPES[context].join(', ') }))
      reset()
      return
    }

    setBusy(true)
    setProgress(0)

    let presigned: UploadResponse
    try {
      const res = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          contextType: context,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null
        toast.error(data?.error?.message ?? t('error_generic'))
        reset()
        return
      }
      presigned = (await res.json()) as UploadResponse
    } catch (err) {
      console.error('[StorageKeyUploadField] sign request failed', err)
      toast.error(t('error_generic'))
      reset()
      return
    }

    // XHR PUT direct to R2. Fetch would be more idiomatic but the upload
    // progress event isn't reliable on fetch in 2025.
    await new Promise<void>((resolve) => {
      const xhr = new XMLHttpRequest()
      xhrRef.current = xhr
      xhr.open('PUT', presigned.uploadUrl)
      for (const [k, v] of Object.entries(presigned.headers ?? {})) {
        xhr.setRequestHeader(k, v)
      }
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(Math.round((e.loaded / e.total) * 100))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onChange(presigned.key)
          toast.success(t('success'))
        } else {
          toast.error(t('error_put', { status: xhr.status }))
        }
        resolve()
      }
      xhr.onerror = () => {
        toast.error(t('error_network'))
        resolve()
      }
      xhr.onabort = () => {
        toast.message(t('aborted'))
        resolve()
      }
      xhr.send(file)
    })
    reset()
  }

  function cancelUpload() {
    xhrRef.current?.abort()
  }

  return (
    <div className="space-y-2">
      {label ? (
        <label className="text-sm font-medium text-fg1" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <Input
        id={inputId}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={busy}
      />
      {hint ? <p className="text-[11px] text-fg3">{hint}</p> : null}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openPicker}
          disabled={busy || uploadDisabled}
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Upload className="h-3.5 w-3.5" aria-hidden />
          )}
          <span className="ms-1.5">
            {busy ? t('uploading_label') : t('upload_button')}
          </span>
        </Button>
        {busy ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={cancelUpload}
          >
            {t('cancel')}
          </Button>
        ) : (
          <p className="text-[11px] text-fg3">
            {t('size_limit', { limit: formatMaxSize(maxBytes) })}
          </p>
        )}
      </div>

      {progress !== null ? (
        <div className="space-y-1">
          <progress
            value={progress}
            max={100}
            className="block h-1 w-full overflow-hidden rounded-pill"
            aria-label={t('progress_aria')}
          />
          <p
            className="text-[11px] text-fg3"
            aria-live="polite"
            role="status"
          >
            {t('progress_label', { percent: progress })}
          </p>
        </div>
      ) : null}
    </div>
  )
}
