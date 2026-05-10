import { z } from 'zod'

/**
 * Validators for the Phase D gift domain.
 *
 * Public-facing schemas:
 *   - createUserGiftSchema    — sender initiates a paid gift (Stripe Checkout)
 *   - claimGiftSchema         — recipient redeems via /gifts/claim?token=…
 *
 * Admin-facing schemas:
 *   - createAdminGiftSchema   — Dr. Khaled's team grants a free gift
 *   - revokeGiftSchema        — admin revokes a gift (with reason)
 *   - resendGiftEmailSchema   — admin OR sender resends the gift email
 *
 * GIFTABLE_ITEM_TYPES intentionally EXCLUDES 'TEST'. The schema enum on the
 * gifts table accepts TEST as a forward-compat value, but the action + UI
 * layer reject it: tests are free in v1, gifting them makes no semantic
 * sense.
 *
 * SECURITY: senderUserId is sourced from the server session, NEVER from these
 * schemas. recipientEmail is lowercased + trimmed before reaching the DB so
 * case-insensitive lookups (already-owns checks, recipient-account match)
 * work consistently.
 */

export const GIFTABLE_ITEM_TYPES = ['BOOK', 'SESSION', 'BOOKING'] as const
export type GiftableItemType = (typeof GIFTABLE_ITEM_TYPES)[number]

const lowercasedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254)

const senderMessage = z.string().trim().max(500).optional().or(z.literal(''))
const localeField = z.enum(['ar', 'en']).optional().default('ar')

export const createAdminGiftSchema = z.object({
  itemType: z.enum(GIFTABLE_ITEM_TYPES),
  itemId: z.string().uuid(),
  recipientEmail: lowercasedEmail,
  senderMessage,
  locale: localeField,
})

export type CreateAdminGiftInput = z.infer<typeof createAdminGiftSchema>

export const createUserGiftSchema = z.object({
  itemType: z.enum(GIFTABLE_ITEM_TYPES),
  itemId: z.string().uuid(),
  recipientEmail: lowercasedEmail,
  senderMessage,
  locale: localeField,
})

export type CreateUserGiftInput = z.infer<typeof createUserGiftSchema>

// Defensive bounds — token is ~43 chars (32 random bytes → base64url). The
// schema accepts 32-64 to leave headroom and to surface obviously-malformed
// tokens early. Per-character allow-list is base64url (URL-safe alphabet).
export const claimGiftSchema = z.object({
  token: z
    .string()
    .trim()
    .min(32)
    .max(64)
    .regex(/^[A-Za-z0-9_-]+$/, { message: 'invalid_token_format' }),
})

export type ClaimGiftInput = z.infer<typeof claimGiftSchema>

export const revokeGiftSchema = z.object({
  giftId: z.string().uuid(),
  reason: z.string().trim().min(5).max(200),
})

export type RevokeGiftInput = z.infer<typeof revokeGiftSchema>

export const resendGiftEmailSchema = z.object({
  giftId: z.string().uuid(),
})

export type ResendGiftEmailInput = z.infer<typeof resendGiftEmailSchema>

export const cancelGiftSchema = z.object({
  giftId: z.string().uuid(),
})

export type CancelGiftInput = z.infer<typeof cancelGiftSchema>

/**
 * Stripe metadata cap for the senderMessage field.
 *
 * Stripe enforces 500 chars per metadata value. We cap at 450 to leave
 * headroom for accidental whitespace and to keep the metadata payload
 * comfortably under the limit. The full message is stored in the gifts
 * row at webhook time so the eventual email rendering uses the truncated
 * value (since metadata is the only carrier across the Stripe roundtrip).
 *
 * If Dr. Khaled later asks for longer messages, the right path is a
 * `stripe_pending_messages` table keyed by stripeSessionId — out of v1.
 */
export const STRIPE_METADATA_MESSAGE_CAP = 450

export function clampSenderMessageForStripe(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  if (trimmed.length <= STRIPE_METADATA_MESSAGE_CAP) return trimmed
  return trimmed.slice(0, STRIPE_METADATA_MESSAGE_CAP)
}
