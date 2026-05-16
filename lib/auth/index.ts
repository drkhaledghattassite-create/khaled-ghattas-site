import { randomBytes } from 'node:crypto'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/send'
import { buildEmailVerificationEmail } from '@/lib/email/templates/email-verification'
import { SITE_URL } from '@/lib/constants'

// SECURITY [C-1]: Better Auth signs session cookies with this secret. If we
// fall back to a hardcoded string, anyone who reads the public repo can mint
// signed admin cookies — that's a full auth bypass. So:
//   - Production with no secret => throw at module load. Vercel build/runtime
//     will fail loudly, which is what we want — better than a silent compromise.
//   - Dev with no secret        => use a random per-process secret, so sessions
//     break across restarts (forcing a developer to notice and set the env var)
//     but the server still boots.
// Do NOT replace this with a stable placeholder again.
const envSecret = process.env.BETTER_AUTH_SECRET
if (!envSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[lib/auth/index.ts] BETTER_AUTH_SECRET is required in production. ' +
        'Generate one with: openssl rand -base64 32',
    )
  }
  console.warn(
    '[lib/auth/index.ts] WARNING: Using ephemeral dev secret. ' +
      'Sessions will not persist across restarts. ' +
      'Set BETTER_AUTH_SECRET in .env.local for stable dev sessions.',
  )
}
const finalSecret = envSecret ?? randomBytes(32).toString('base64')

// SECURITY [H-1]: trustedOrigins constrains OAuth callback URLs and CSRF
// origin checks performed by Better Auth. In production this is locked to
// the canonical app URL; in dev we also allow localhost (port-flexible).
const trustedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.NEXT_PUBLIC_APP_URL, process.env.BETTER_AUTH_URL].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      )
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.NEXT_PUBLIC_APP_URL,
        process.env.BETTER_AUTH_URL,
      ].filter((v): v is string => typeof v === 'string' && v.length > 0)

// SECURITY [H-B1]: Email-verification dispatch.
//
// `sendOnSignUp: true` makes Better Auth queue a verification email for
// every new password signup. `autoSignIn: false` blocks the implicit
// post-signup session — the user must click the link before their cookie
// is minted; this is what prevents the gift-claim-squatting class of bug
// (audit B-1).
//
// Email body is rendered by `buildEmailVerificationEmail` and dispatched
// through the existing `sendEmail` wrapper, which means:
//   - dev/preview environments write the HTML to .next/cache/email-previews
//   - production enqueues into `email_queue` (durable retries via the
//     /api/cron/process-email-queue cron)
//   - `EMAIL_FORCE_SYNC=true` bypasses the queue for dev debugging
// Synchronous Resend calls happen NOWHERE in this callback — Better Auth
// runs inside the signup request and a slow/failing Resend call would
// either hang the signup or leak a partial user row. Queueing is the
// only safe semantics.
//
// Social signups (Google) are exempt: Better Auth treats OAuth identity
// as already-verified, so this callback only fires for password signups.
const DEFAULT_SUPPORT_EMAIL = 'Team@drkhaledghattass.com'
const VERIFY_TOKEN_TTL_MIN = 60

export const auth = betterAuth({
  secret: finalSecret,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    // Force-verify before sign-in. Without this, an unverified signup
    // still gets an active session cookie and can claim gifts before
    // the verification email is even opened.
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignIn: false,
    expiresIn: VERIFY_TOKEN_TTL_MIN * 60,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; name?: string | null; id?: string | null }
      url: string
    }) => {
      // Better Auth hands us an absolute callback URL with the token
      // baked in. We pass it through untouched.
      const locale = pickLocaleFromUrl(url)
      const built = buildEmailVerificationEmail({
        locale,
        recipientName: user.name ?? null,
        recipientEmail: user.email,
        verificationUrl: url,
        supportEmail: process.env.SUPPORT_EMAIL ?? DEFAULT_SUPPORT_EMAIL,
        expiresInMinutes: VERIFY_TOKEN_TTL_MIN,
      })
      const result = await sendEmail({
        to: user.email,
        subject: built.subject,
        html: built.html,
        text: built.text,
        previewLabel: 'email-verification',
        emailType: 'email_verification',
        relatedEntityType: 'user',
        relatedEntityId: user.id ?? null,
      })
      // sendEmail returns structured failure — log loudly but never throw.
      // Throwing would either roll back the signup transaction (different
      // failure mode entirely) or surface a 500 to the user; either way
      // the queue row is what we'd reconcile from in admin.
      if (!result.ok) {
        const level = result.reason === 'preview-only' ? 'info' : 'error'
        console[level]('[auth/emailVerification] dispatch result', {
          email: user.email,
          reason: result.reason,
        })
      }
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
        input: false,
      },
    },
  },
  advanced: {
    database: {
      // Our PG schema generates UUIDs via defaultRandom() on every id column
      // (user, session, account, verification). Disable BA's nanoid generator
      // so the DB defaults run instead, matching the uuid column type.
      generateId: false,
    },
  },
})

/**
 * Pick the email locale from a Better Auth callback URL.
 *
 * Better Auth interpolates `{callbackURL}` from its own config; we can't
 * thread next-intl request locale through the callback signature. So we
 * read the locale segment out of the URL's path: `/en/...` → 'en',
 * everything else → 'ar' (the site primary).
 *
 * Defensive: malformed URLs fall back to 'ar' rather than throwing.
 * SITE_URL is used as the parse base so relative paths (shouldn't
 * happen with Better Auth's callback shaping, but defensive) still
 * resolve.
 */
function pickLocaleFromUrl(url: string): 'ar' | 'en' {
  try {
    const parsed = new URL(url, SITE_URL)
    const first = parsed.pathname.split('/').filter(Boolean)[0] ?? ''
    return first === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar'
  }
}

export type Auth = typeof auth
