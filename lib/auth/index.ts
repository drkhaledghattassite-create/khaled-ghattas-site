import { randomBytes } from 'node:crypto'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'

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
  emailAndPassword: { enabled: true },
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

export type Auth = typeof auth
