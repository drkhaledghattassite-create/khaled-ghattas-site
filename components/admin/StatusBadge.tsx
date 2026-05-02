'use client'

import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

// Tone classes lean on the semantic-tone tokens we added in app/globals.css
// (success/warning/info/danger). They're scoped to admin status feedback —
// distinct from --color-accent (Sienna Ink) which is the editorial accent.
const NEUTRAL = 'bg-bg-deep text-fg2'
const ACCENT = 'bg-accent-soft text-accent'
const POSITIVE = 'bg-success-soft text-success'
const WARNING = 'bg-warning-soft text-warning'
const NEGATIVE = 'bg-danger-soft text-danger'

const TONES: Record<string, string> = {
  DRAFT: NEUTRAL,
  PUBLISHED: POSITIVE,
  ARCHIVED: NEUTRAL,
  PENDING: WARNING,
  PAID: POSITIVE,
  FULFILLED: POSITIVE,
  REFUNDED: NEUTRAL,
  FAILED: NEGATIVE,
  UNREAD: ACCENT,
  READ: NEUTRAL,
  ACTIVE: POSITIVE,
  UNSUBSCRIBED: NEUTRAL,
  BOUNCED: NEGATIVE,
  UPCOMING: ACCENT,
  PAST: NEUTRAL,
  CANCELLED: NEGATIVE,
  ADMIN: ACCENT,
  CLIENT: POSITIVE,
  USER: NEUTRAL,
}

// Map enum value → translation key under the `status` namespace.
// Keep this exhaustive — any unmapped value falls back to the raw enum string.
const STATUS_KEYS: Record<string, string> = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
  PENDING: 'pending',
  PAID: 'paid',
  FULFILLED: 'fulfilled',
  REFUNDED: 'refunded',
  FAILED: 'failed',
  UNREAD: 'unread',
  READ: 'read',
  ACTIVE: 'active',
  UNSUBSCRIBED: 'unsubscribed',
  BOUNCED: 'bounced',
  UPCOMING: 'upcoming',
  PAST: 'past',
  CANCELLED: 'cancelled',
  ADMIN: 'admin',
  CLIENT: 'client',
  USER: 'user',
}

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('status')
  const tone = TONES[status] ?? NEUTRAL
  const key = STATUS_KEYS[status]
  // Fall back to the raw enum string for any unknown status — we'd rather
  // surface a stray code in the UI than throw on a missing key.
  const label = key ? t(key) : status
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-display font-semibold',
        tone,
      )}
    >
      {label}
    </span>
  )
}
