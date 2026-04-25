import { Link } from '@/lib/i18n/navigation'
import { getLocale, getTranslations } from 'next-intl/server'

type Crumb = { href: string; label: string }

type Props = { crumbs: Crumb[] }

/**
 * Server-rendered breadcrumbs. Uses the locale dir for separator direction:
 * chevron points toward inline-end (→ in LTR, ← in RTL).
 */
export async function Breadcrumbs({ crumbs }: Props) {
  const locale = await getLocale()
  const t = await getTranslations('common')
  const isRtl = locale === 'ar'
  const sep = isRtl ? '‹' : '›'

  return (
    <nav aria-label={t('breadcrumb')} className="font-label text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5 text-[12px]">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.href} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link href={crumb.href} className="transition-colors hover:text-ink">
                  {crumb.label}
                </Link>
              )}
              {!isLast && <span aria-hidden>{sep}</span>}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
