/**
 * Shared visual primitives for the Phase D gift emails.
 *
 * The 6 gift templates (received, sent, admin-grant, claimed-recipient,
 * claimed-sender, revoked) all share the same Qalem-mirroring palette + font
 * stack + container chrome. Centralising avoids drift between siblings.
 *
 * The hex literals here mirror the Qalem light palette and are an exception
 * to the no-hardcoded-hex rule (email clients don't support CSS custom
 * properties). Same exception as documented in post-purchase.ts.
 */

export type GiftEmailLocale = 'ar' | 'en'

export type GiftEmailItemType = 'BOOK' | 'SESSION' | 'BOOKING'

export const FONT_AR =
  "'IBM Plex Sans Arabic', 'Readex Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
export const FONT_LATIN =
  "'Inter', 'Readex Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

export const PALETTE = {
  bg: '#FAFAFA',
  bgElevated: '#FFFFFF',
  bgDeep: '#F4F4F4',
  fg1: '#0A0A0A',
  fg2: '#404040',
  fg3: '#737373',
  border: '#E5E5E5',
  accent: '#B85440',
  accentFg: '#FFFFFF',
  accentSoft: '#F4E5DF',
}

export type GiftDisplayItem = {
  itemType: GiftEmailItemType
  titleAr: string
  titleEn: string
  coverImageUrl: string | null
}

export function fmtAmount(
  cents: number | null | undefined,
  currency: string,
  locale: GiftEmailLocale,
): string {
  if (cents == null) return '—'
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
}

export function fmtDate(d: Date, locale: GiftEmailLocale): string {
  try {
    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-LB' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d)
  } catch {
    return d.toISOString().slice(0, 10)
  }
}

export function itemTypeLabel(
  type: GiftEmailItemType,
  locale: GiftEmailLocale,
): string {
  if (locale === 'ar') {
    return type === 'BOOK'
      ? 'كتاب'
      : type === 'SESSION'
        ? 'جلسة'
        : 'حجز'
  }
  return type === 'BOOK' ? 'Book' : type === 'SESSION' ? 'Session' : 'Booking'
}

export function itemTitle(item: GiftDisplayItem, locale: GiftEmailLocale): string {
  return locale === 'ar' ? item.titleAr : item.titleEn
}

/**
 * Truncate a sender message before rendering — defends against pasted long
 * inputs that Stripe metadata already truncates server-side. We render at
 * most 500 chars even though Stripe holds 450; the clamp here is the email
 * surface, not the source-of-truth gate.
 */
export function clampMessage(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed
}
