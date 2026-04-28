import { cn } from '@/lib/utils'

const NEUTRAL = 'bg-bg-deep text-fg2'
const ACCENT = 'bg-accent-soft text-accent'
const POSITIVE = 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'

const TONES: Record<string, string> = {
  DRAFT: NEUTRAL,
  PUBLISHED: POSITIVE,
  ARCHIVED: NEUTRAL,
  PENDING: ACCENT,
  PAID: POSITIVE,
  FULFILLED: POSITIVE,
  REFUNDED: NEUTRAL,
  FAILED: ACCENT,
  UNREAD: ACCENT,
  READ: NEUTRAL,
  ACTIVE: POSITIVE,
  UNSUBSCRIBED: NEUTRAL,
  BOUNCED: ACCENT,
  UPCOMING: ACCENT,
  PAST: NEUTRAL,
  CANCELLED: ACCENT,
  ADMIN: ACCENT,
  CLIENT: POSITIVE,
  USER: NEUTRAL,
}

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? NEUTRAL
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] font-display font-semibold',
        tone,
      )}
    >
      {status}
    </span>
  )
}
