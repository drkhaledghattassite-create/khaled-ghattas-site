import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * True iff the input parses as an absolute http(s) URL. Used by the
 * "Ask Dr. Khaled" surfaces to decide whether an answer reference is a
 * link (renders as a watch-link / triggers the notification email) or a
 * free-text note. The exact-match on `protocol` rejects `javascript:`,
 * `data:`, `vbscript:` and friends — anything XSS-relevant.
 *
 * Pass-through trim and explicit-string guard so callers don't need to
 * pre-normalise: `isHttpUrl(undefined)` and `isHttpUrl('')` are false.
 */
export function isHttpUrl(s: string | null | undefined): boolean {
  if (typeof s !== 'string' || s.trim() === '') return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
