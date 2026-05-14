import { ChevronRight } from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'

// Eyebrow + heading + optional "see all" link. The pattern that opens
// every section of the editorial admin dashboard. RTL flips the chevron
// via CSS scaleX so we don't ship two icon variants.

export function SectionHeader({
  eyebrow,
  heading,
  seeAllHref,
  seeAllLabel,
}: {
  eyebrow: string
  heading: string
  seeAllHref?: string
  seeAllLabel?: string
}) {
  return (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <div className="min-w-0">
        <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-accent rtl:text-[13px] rtl:font-bold rtl:tracking-normal rtl:normal-case rtl:font-arabic">
          {eyebrow}
        </span>
        <h2 className="font-display text-[22px] font-bold leading-[1.25] tracking-[-0.01em] text-fg1 rtl:font-arabic-display rtl:text-[24px] rtl:tracking-normal">
          {heading}
        </h2>
      </div>
      {seeAllHref && seeAllLabel ? (
        <Link
          href={seeAllHref}
          className="inline-flex flex-none items-center gap-1 whitespace-nowrap text-[13px] text-fg2 transition-colors hover:text-accent"
        >
          <span>{seeAllLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
        </Link>
      ) : null}
    </div>
  )
}
