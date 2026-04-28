import { errForbidden } from './errors'

/**
 * CSRF defense: confirm the request comes from this site's origin.
 *
 * Better Auth handles its own /api/auth CSRF, but our admin and user mutation
 * routes need a guard. Same-origin enforcement via the Origin/Referer header is
 * sufficient when paired with same-site cookies (Better Auth's default).
 *
 * Returns null on success, or a 403 NextResponse to be returned by the caller.
 */
export function assertSameOrigin(req: Request) {
  // GET/HEAD/OPTIONS are safe by spec — no state change.
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return null

  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  const host = req.headers.get('host')

  // No host header should never happen on Next runtime, but be defensive.
  if (!host) return errForbidden('Missing host header.')

  const expectedHttps = `https://${host}`
  const expectedHttp = `http://${host}`

  if (origin) {
    if (origin === expectedHttps || origin === expectedHttp) return null
    return errForbidden('Cross-origin request rejected.')
  }

  // Some clients omit Origin; fall back to Referer.
  if (referer) {
    if (referer.startsWith(expectedHttps + '/') || referer.startsWith(expectedHttp + '/')) {
      return null
    }
    return errForbidden('Cross-origin request rejected.')
  }

  // Reject when neither header is present on a state-changing request.
  return errForbidden('Missing origin/referer header.')
}
