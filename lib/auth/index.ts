import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'

// Fallback secret used only when BETTER_AUTH_SECRET is unset (preview / no-env
// deployments). Better Auth refuses to init in production with the package
// default, which throws a top-level rejection and crashes the Netlify
// function. Real auth is gated separately by MOCK_AUTH / auth_enabled, so
// providing a stable non-default placeholder here is safe — it just lets the
// module load so placeholder pages render.
const PLACEHOLDER_SECRET =
  'preview-mode-placeholder-set-BETTER_AUTH_SECRET-for-real-auth'

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || PLACEHOLDER_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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
