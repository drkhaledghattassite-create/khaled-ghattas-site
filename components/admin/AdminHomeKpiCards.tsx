import { AlertTriangle, Briefcase, Gift, HelpCircle, Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/lib/i18n/navigation'

// Pending-counts dashboard cards. Surfaces what needs attention from each
// admin queue at the top of /admin without forcing a sidebar drill-down.
// Threshold for warning-soft styling: > 10 pending. Set conservatively —
// "needs attention" should mean an actual queue depth, not a single new
// item; if the threshold trips on every reload it stops being a signal.
//
// Each card is a real link to a filtered admin route so a click triggers
// the work, not an extra view.

const WARNING_THRESHOLD = 10

type CardSpec = {
  key: 'questions' | 'interest' | 'gifts' | 'corporate' | 'email_queue'
  count: number
  href: string
  icon: LucideIcon
}

export function AdminHomeKpiCards({
  pendingQuestions,
  pendingInterest,
  expiringGifts,
  newCorporateRequests,
  emailQueueAttention,
}: {
  pendingQuestions: number
  pendingInterest: number
  expiringGifts: number
  newCorporateRequests: number
  emailQueueAttention: number
}) {
  const t = useTranslations('admin.kpi')

  const cards: CardSpec[] = [
    {
      key: 'questions',
      count: pendingQuestions,
      href: '/admin/questions?status=PENDING',
      icon: HelpCircle,
    },
    {
      key: 'interest',
      count: pendingInterest,
      href: '/admin/booking/interest',
      icon: Inbox,
    },
    {
      key: 'gifts',
      count: expiringGifts,
      href: '/admin/gifts?status=PENDING',
      icon: Gift,
    },
    {
      key: 'corporate',
      count: newCorporateRequests,
      href: '/admin/corporate/requests?status=NEW',
      icon: Briefcase,
    },
    {
      key: 'email_queue',
      count: emailQueueAttention,
      href: '/admin/email-queue?status=FAILED',
      icon: AlertTriangle,
    },
  ]

  return (
    <section
      aria-label={t('aria_label')}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {cards.map((c) => {
        const Icon = c.icon
        const warn = c.count > WARNING_THRESHOLD
        return (
          <Link
            key={c.key}
            href={c.href}
            className={`group flex flex-col gap-2 rounded-md border p-4 transition-[border-color,box-shadow] ${
              warn
                ? 'border-accent/40 bg-accent-soft/30 hover:border-accent'
                : 'border-border bg-bg-elevated hover:border-fg2'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${
                  warn ? 'bg-accent text-accent-fg' : 'bg-bg-deep text-fg2'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span
                className={`font-display text-[24px] font-semibold leading-none tabular-nums num-latn ${
                  warn ? 'text-accent' : 'text-fg2'
                }`}
              >
                {c.count}
              </span>
            </div>
            <p className="m-0 text-[11px] font-display font-semibold uppercase tracking-[0.08em] text-fg3">
              {t(`label_${c.key}` as never)}
            </p>
          </Link>
        )
      })}
    </section>
  )
}
