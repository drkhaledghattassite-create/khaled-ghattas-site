// Set a Better-Auth-created user's role.
//
// Usage:
//   node --env-file=.env.local scripts/promote-admin.mjs <email> [ROLE]
//
// ROLE defaults to ADMIN. Valid values: USER, ADMIN, CLIENT.
//   - USER:   default for new signups
//   - ADMIN:  full admin panel access
//   - CLIENT: read-only financial view (intended for Dr. Khaled)

import { neon } from '@neondatabase/serverless'

const VALID_ROLES = ['USER', 'ADMIN', 'CLIENT']

const email = process.argv[2]
const role = (process.argv[3] ?? 'ADMIN').toUpperCase()

if (!email || !email.includes('@')) {
  console.error('Usage: node --env-file=.env.local scripts/promote-admin.mjs <email> [USER|ADMIN|CLIENT]')
  process.exit(1)
}

if (!VALID_ROLES.includes(role)) {
  console.error(`[promote-admin] Invalid role "${role}". Must be one of: ${VALID_ROLES.join(', ')}`)
  process.exit(1)
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('[promote-admin] DATABASE_URL not set.')
  process.exit(1)
}

const sql = neon(url)

const rows = await sql`
  UPDATE "user"
  SET role = ${role}, updated_at = now()
  WHERE email = ${email}
  RETURNING id, email, role
`

if (rows.length === 0) {
  console.error(`[promote-admin] No user with email ${email}. Sign up at /register first.`)
  process.exit(1)
}

console.log('[promote-admin] Updated:', rows[0])
