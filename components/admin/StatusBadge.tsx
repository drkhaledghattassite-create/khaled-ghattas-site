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
const INFO = 'bg-info-soft text-info'

// Tone identifiers used by callers that need to override the default tone
// derived from `status` (e.g. session-content item types where VIDEO=info,
// AUDIO=warning, PDF=positive). Keeps the badge styling in one place rather
// than having ad-hoc `<span class="bg-info-soft …">` clones drift across the
// admin surface.
const TONE_CLASS = {
  neutral: NEUTRAL,
  accent: ACCENT,
  positive: POSITIVE,
  warning: WARNING,
  negative: NEGATIVE,
  info: INFO,
} as const

export type StatusBadgeTone = keyof typeof TONE_CLASS

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
  // Corporate request lifecycle. NEW reads as "needs attention" (warning),
  // CONTACTED is in-flight (accent), SCHEDULED is committed (accent stronger),
  // COMPLETED is closed-positive, CANCELLED reuses the negative tone above.
  NEW: WARNING,
  CONTACTED: ACCENT,
  SCHEDULED: ACCENT,
  COMPLETED: POSITIVE,
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
  NEW: 'new',
  CONTACTED: 'contacted',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
}

export function StatusBadge({
  status,
  tone,
  label,
}: {
  status: string
  // Override the default tone derivation from `status`. Used by callers
  // that mint badges from non-`status` enums (session-item types, …).
  tone?: StatusBadgeTone
  // Override the translated label. When provided, the `status` namespace
  // is bypassed entirely — useful for badges whose label comes from a
  // different translation namespace (e.g. `admin.session_content`).
  label?: string
}) {
  const t = useTranslations('status')
  const toneClass = tone ? TONE_CLASS[tone] : (TONES[status] ?? NEUTRAL)
  const key = STATUS_KEYS[status]
  // Fall back to the raw enum string for any unknown status — we'd rather
  // surface a stray code in the UI than throw on a missing key.
  const resolvedLabel = label ?? (key ? t(key) : status)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-display font-semibold',
        toneClass,
      )}
    >
      {resolvedLabel}
    </span>
  )
}
