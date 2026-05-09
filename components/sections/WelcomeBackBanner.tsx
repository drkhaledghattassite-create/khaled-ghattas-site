import { getLocale } from 'next-intl/server'
import { getServerSession } from '@/lib/auth/server'
import { getMostRecentActivity } from '@/lib/db/queries'
import { WelcomeBackCard, type WelcomeActivity } from './WelcomeBackCard'

/**
 * Phase 5.2 — server-side detector for the homepage Welcome back surface.
 *
 * Renders nothing for logged-out visitors so the public homepage stays
 * exactly as it is today (no greeting, no extra paint). When a session
 * exists we additionally fetch the user's most-recent unfinished
 * activity and forward both into the client card.
 *
 * The cost in the logged-in path: one session resolve (already paid by
 * AuthMenu in the public layout — `headers()` is called once per request
 * regardless) plus one `getMostRecentActivity` query (two parallel
 * single-row reads against indexed columns). Acceptable for a returning-
 * member affordance. The logged-out path skips both queries entirely.
 *
 * Activity fetch failures degrade to "logged in but no activity" — we
 * still want to show the greeting; we just hide the resume card. Logging
 * lives inside `getMostRecentActivity`.
 */
export async function WelcomeBackBanner() {
  const session = await getServerSession()
  if (!session) return null

  const locale = ((await getLocale()) === 'ar' ? 'ar' : 'en') as 'ar' | 'en'

  // First name — split on whitespace, fall back to the email local-part
  // when name is unset or single-character. Better Auth populates `name`
  // from the OAuth provider or the signup form; mock users always have
  // a name. The fallback exists for parity with future guest flows.
  const rawName = session.user.name?.trim() ?? ''
  const firstName =
    rawName.split(/\s+/)[0] ||
    session.user.email.split('@')[0] ||
    'there'

  let welcomeActivity: WelcomeActivity | null = null
  try {
    const activity = await getMostRecentActivity(session.user.id)
    if (activity) {
      welcomeActivity =
        activity.type === 'BOOK'
          ? {
              type: 'BOOK',
              title:
                locale === 'ar'
                  ? activity.book.titleAr
                  : activity.book.titleEn,
              href: `/dashboard/library/read/${activity.bookId}`,
            }
          : {
              type: 'SESSION',
              title:
                locale === 'ar'
                  ? activity.session.titleAr
                  : activity.session.titleEn,
              itemTitle: activity.item.title,
              href: `/dashboard/library/session/${activity.sessionId}`,
            }
    }
  } catch (err) {
    console.error('[WelcomeBackBanner] activity fetch failed', err)
  }

  return (
    <WelcomeBackCard
      firstName={firstName}
      locale={locale}
      activity={welcomeActivity}
    />
  )
}
