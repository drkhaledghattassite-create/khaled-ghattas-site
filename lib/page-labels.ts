/**
 * Per-route PAGE - XX label resolution for SiteHeader.
 * Matches the clone's FULL_AUDIT.md §9a behavior.
 */

type PageLabelEntry = {
  /** 1-based page index shown in the pill (empty string → "INDEX") */
  label: string
  /** Which progress-bar dot should be active (0-5) */
  activeDot: number
}

const EXACT: Record<string, PageLabelEntry> = {
  '/': { label: 'index', activeDot: 0 },
  '/about': { label: '01', activeDot: 1 },
  '/articles': { label: '02', activeDot: 2 },
  '/books': { label: '03', activeDot: 3 },
  '/interviews': { label: '04', activeDot: 4 },
  '/gallery': { label: '05', activeDot: 5 },
  '/contact': { label: '06', activeDot: 5 },
  '/events': { label: '07', activeDot: 5 },
}

const PREFIX: { prefix: string; entry: PageLabelEntry }[] = [
  { prefix: '/articles/', entry: { label: '02', activeDot: 2 } },
  { prefix: '/books/', entry: { label: '03', activeDot: 3 } },
  { prefix: '/interviews/', entry: { label: '04', activeDot: 4 } },
]

/**
 * Resolve the label + active dot for a given locale-stripped pathname.
 * E.g. "/en/articles/foo" → strip /en → "/articles/foo" before calling.
 */
export function resolvePageLabel(pathname: string): PageLabelEntry {
  if (EXACT[pathname]) return EXACT[pathname]
  for (const { prefix, entry } of PREFIX) {
    if (pathname.startsWith(prefix)) return entry
  }
  return EXACT['/']
}

/** Strip a leading /<locale> segment if present. */
export function stripLocale(pathname: string, locales: readonly string[]): string {
  for (const locale of locales) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) return pathname.slice(locale.length + 1)
  }
  return pathname
}
