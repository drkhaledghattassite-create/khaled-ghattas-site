import { cn } from '@/lib/utils'

const TONES: Record<string, string> = {
  DRAFT: 'bg-ink/10 text-ink',
  PUBLISHED: 'bg-success/15 text-success',
  ARCHIVED: 'bg-ink/15 text-ink-muted',
  PENDING: 'bg-amber/15 text-amber',
  PAID: 'bg-success/15 text-success',
  FULFILLED: 'bg-success/20 text-success',
  REFUNDED: 'bg-ink/15 text-ink-muted',
  FAILED: 'bg-amber/20 text-amber',
  UNREAD: 'bg-amber/15 text-amber',
  READ: 'bg-ink/10 text-ink-muted',
  ACTIVE: 'bg-success/15 text-success',
  UNSUBSCRIBED: 'bg-ink/10 text-ink-muted',
  BOUNCED: 'bg-amber/20 text-amber',
  UPCOMING: 'bg-amber/15 text-amber',
  PAST: 'bg-ink/10 text-ink-muted',
  CANCELLED: 'bg-amber/20 text-amber',
  ADMIN: 'bg-amber/15 text-amber',
  CLIENT: 'bg-success/15 text-success',
  USER: 'bg-ink/10 text-ink-muted',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = TONES[status] ?? 'bg-ink/10 text-ink-muted'
  return (
    <span
      className={cn(
        'font-label inline-flex items-center rounded-full px-2 py-0.5 text-[10px] uppercase',
        tone,
      )}
      style={{ letterSpacing: '0.06em' }}
    >
      {status}
    </span>
  )
}
