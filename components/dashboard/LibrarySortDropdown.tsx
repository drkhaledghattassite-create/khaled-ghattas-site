'use client'

import { useLocale, useTranslations } from 'next-intl'
import { ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

export type LibrarySort = 'recent_read' | 'recent_purchase' | 'title_az'

const OPTIONS: LibrarySort[] = ['recent_read', 'recent_purchase', 'title_az']

/**
 * Sort dropdown for /dashboard/library, sitting on the same row as the
 * filter chips. Uses the shared `@base-ui/react` DropdownMenu primitive
 * (the same one used by admin tables — see CorporateRequestsTable). The
 * trigger is a small pill so it visually matches the filter chips.
 *
 * Active option is checkmarked; the trigger label shows the selected
 * option's translated name. Selection emits an onChange the parent uses
 * to update the URL param.
 */
export function LibrarySortDropdown({
  value,
  onChange,
}: {
  value: LibrarySort
  onChange: (next: LibrarySort) => void
}) {
  const t = useTranslations('library.sort')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const fontBody = isRtl ? 'font-arabic-body' : 'font-display'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-strong)] bg-transparent px-4 py-2 text-[13px] font-semibold text-[var(--color-fg2)] transition-colors hover:border-[var(--color-fg1)] hover:text-[var(--color-fg1)] focus:outline-none focus-visible:border-[var(--color-accent)] data-popup-open:border-[var(--color-fg1)] data-popup-open:text-[var(--color-fg1)] ${fontBody}`}
        aria-label={t('label')}
      >
        <span className="text-[var(--color-fg3)]">{t('label')}:</span>
        <span>{t(value)}</span>
        <ChevronDown className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="min-w-[220px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)]"
      >
        {OPTIONS.map((opt) => {
          const active = opt === value
          return (
            <DropdownMenuItem
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex items-center justify-between gap-2 px-3 py-2 text-[13px] ${fontBody} ${
                active
                  ? 'text-[var(--color-fg1)]'
                  : 'text-[var(--color-fg2)]'
              }`}
            >
              <span>{t(opt)}</span>
              {active && (
                <Check className="size-3.5 text-[var(--color-accent)]" aria-hidden />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
