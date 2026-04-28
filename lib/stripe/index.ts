import Stripe from 'stripe'

export const HAS_STRIPE =
  !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET

let cached: Stripe | null = null

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (cached) return cached
  cached = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true })
  return cached
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''
