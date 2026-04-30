/**
 * Safe internal-redirect parsing for auth flows.
 *
 * Auth forms accept a `?redirect=...` query param so users land back on the
 * page they were trying to reach (a book detail page, an article, etc.) after
 * signing in instead of always going to /dashboard.
 *
 * The path must be:
 *  - non-empty
 *  - start with `/`
 *  - NOT start with `//` or `/\` (prevents `/\evil.com` open-redirect tricks)
 *  - NOT contain a scheme (`:` before `/`) — blocks `javascript:` and similar
 *
 * Locale prefixes are accepted as-is — `next-intl`'s `Link`/`useRouter` will
 * normalize them on navigation.
 */
const DEFAULT_REDIRECT = '/dashboard'

export function safeRedirect(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_REDIRECT
  if (typeof raw !== 'string') return DEFAULT_REDIRECT
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT
  // Block protocol-relative URLs and backslash variants.
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_REDIRECT
  // Block any scheme that snuck through (e.g. "/javascript:alert(1)").
  if (/^\/[A-Za-z][A-Za-z0-9+.-]*:/.test(raw)) return DEFAULT_REDIRECT
  return raw
}

/** Build a `?redirect=…` query string for an auth-form URL. */
export function withRedirect(href: string, redirect: string): string {
  const safe = safeRedirect(redirect)
  if (safe === DEFAULT_REDIRECT) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}redirect=${encodeURIComponent(safe)}`
}
