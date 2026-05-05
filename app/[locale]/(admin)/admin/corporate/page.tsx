import { ArrowRight, MessageSquare, ShieldCheck, Star } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import {
  getCorporateClients,
  getCorporatePrograms,
  getCorporateRequests,
} from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ locale: string }> }

export default async function AdminCorporateOverviewPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('admin.corporate')
  const isRtl = locale === 'ar'

  const [programs, clients, allRequests] = await Promise.all([
    getCorporatePrograms({ publishedOnly: false }),
    getCorporateClients({ publishedOnly: false }),
    getCorporateRequests(),
  ])

  const newRequestsCount = allRequests.filter((r) => r.status === 'NEW').length

  const cards = [
    {
      icon: Star,
      label: t('stats_programs'),
      value: programs.length,
      href: '/admin/corporate/programs',
      cta: t('go_programs'),
    },
    {
      icon: ShieldCheck,
      label: t('stats_clients'),
      value: clients.length,
      href: '/admin/corporate/clients',
      cta: t('go_clients'),
    },
    {
      icon: MessageSquare,
      label: t('stats_requests_new'),
      value: newRequestsCount,
      href: '/admin/corporate/requests',
      cta: t('go_requests'),
    },
  ] as const

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="m-0 text-[clamp(20px,2.4vw,26px)] font-bold tracking-[-0.005em] text-fg1 font-display">
          {t('overview_title')}
        </h1>
        <p
          className={`m-0 max-w-[60ch] text-[13px] text-fg3 ${
            isRtl ? 'font-arabic-body' : 'font-display'
          }`}
        >
          {t('overview_subtitle')}
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group flex flex-col gap-3 rounded-md border border-border bg-bg-elevated p-5 transition-[border-color,box-shadow] hover:border-fg2 hover:[box-shadow:var(--shadow-card)]"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-[28px] font-semibold tabular-nums text-fg1 num-latn font-display">
                  {c.value}
                </span>
              </div>
              <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.1em] text-fg3 font-display">
                {c.label}
              </p>
              <span className="mt-auto inline-flex items-center gap-1 text-[12px] font-semibold text-fg1 font-display">
                {c.cta}
                <ArrowRight
                  aria-hidden
                  className={`h-3 w-3 transition-transform group-hover:translate-x-0.5 ${
                    isRtl ? 'rotate-180 group-hover:!-translate-x-0.5' : ''
                  }`}
                />
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
