import {
  AlertTriangle,
  Briefcase,
  Calendar,
  ChevronRight,
  Gift,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'

// Pending-count cards. The editorial card treatment from the Qalem v2
// design replaces the prior compact "AdminHomeKpiCards" rendering, but
// the data contract is identical — the page passes the five counts in
// as props, the component renders. Email card hides when count = 0.
//
// Threshold for accent-soft "active" styling: > 10 (flat, per E1b).
// The design's per-card thresholds (Q>3, Corp>1) read as nicer signals
// but the user pre-resolved this conflict in favor of the existing flat
// rule. Never red/danger — these are polite reminders, not alarms.

const WARNING_THRESHOLD = 10

type CardKey = 'questions' | 'corporate' | 'gifts' | 'booking' | 'email_queue'

type CardSpec = {
  key: CardKey
  count: number
  href: string
  icon: LucideIcon
}

export function AttentionRow({
  pendingQuestions,
  newCorporateRequests,
  expiringGifts,
  pendingInterest,
  emailQueueAttention,
  viewerRole,
}: {
  pendingQuestions: number
  newCorporateRequests: number
  expiringGifts: number
  pendingInterest: number
  emailQueueAttention: number
  /**
   * The email-queue card links to `/admin/email-queue` — developer-only.
   * CLIENT viewers must not see the card or they'd 404 on click. Falls
   * closed on null/USER (no email card rendered) — only ADMIN gets it.
   */
  viewerRole: 'USER' | 'ADMIN' | 'CLIENT' | null
}) {
  const t = useTranslations('admin.dashboard.attention')

  const cards: CardSpec[] = [
    {
      key: 'questions',
      count: pendingQuestions,
      href: '/admin/questions?status=PENDING',
      icon: MessageSquare,
    },
    {
      key: 'corporate',
      count: newCorporateRequests,
      href: '/admin/corporate/requests?status=NEW',
      icon: Briefcase,
    },
    {
      key: 'gifts',
      count: expiringGifts,
      href: '/admin/gifts?status=PENDING',
      icon: Gift,
    },
    {
      key: 'booking',
      count: pendingInterest,
      href: '/admin/booking/interest',
      icon: Calendar,
    },
    {
      key: 'email_queue',
      count: emailQueueAttention,
      href: '/admin/email-queue?status=FAILED',
      icon: AlertTriangle,
    },
  ]

  // Drop the email-queue card entirely for non-ADMIN viewers (the route is
  // developer-only). For ADMIN, keep the existing zero-count hide rule so
  // a clean queue doesn't shout an empty card.
  const visible = cards.filter((c) => {
    if (c.key === 'email_queue') {
      if (viewerRole !== 'ADMIN') return false
      if (c.count === 0) return false
    }
    return true
  })

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {visible.map((c) => {
        const Icon = c.icon
        const active = c.count > WARNING_THRESHOLD
        const zero = c.count === 0
        return (
          <Link
            key={c.key}
            href={c.href}
            aria-label={t(`label_${c.key}`)}
            className={`group flex min-h-[156px] flex-col gap-1.5 rounded-md border p-5 transition-[border-color,box-shadow] ${
              active
                ? 'border-accent/30 bg-accent-soft'
                : 'border-border bg-bg-elevated hover:border-fg2'
            }`}
          >
            <div
              className={`flex items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.06em] rtl:text-[13px] rtl:font-semibold rtl:tracking-normal rtl:normal-case ${
                active ? 'text-accent' : 'text-fg3'
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              <span>{t(`eyebrow_${c.key}`)}</span>
            </div>
            <div
              className={`mt-3.5 font-display text-[52px] font-bold leading-none tracking-[-0.03em] tabular-nums num-latn ${
                zero ? 'font-medium text-fg3' : 'text-fg1'
              }`}
            >
              {c.count}
            </div>
            <p
              className={`mt-1.5 text-[13px] leading-[1.35] text-fg2 rtl:text-[14px] rtl:leading-[1.55]`}
            >
              {t(`label_${c.key}`)}
            </p>
            <span
              className={`mt-auto inline-flex items-center gap-1.5 pt-3.5 text-[12.5px] ${
                active ? 'text-accent' : 'text-fg2'
              }`}
            >
              <span>{t(`more_${c.key}`)}</span>
              <ChevronRight className="h-3 w-3 rtl:-scale-x-100" aria-hidden />
            </span>
          </Link>
        )
      })}
    </div>
  )
}
