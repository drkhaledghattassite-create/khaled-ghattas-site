export type Tab = 'book' | 'session' | 'booking'

export type SelectedItem =
  | {
      type: 'book'
      id: string
      titleAr: string
      titleEn: string
      coverImage: string
      priceCents: number
      currency: string
    }
  | {
      type: 'session'
      id: string
      titleAr: string
      titleEn: string
      coverImage: string
      priceCents: number
      currency: string
    }
  | {
      type: 'booking'
      id: string
      titleAr: string
      titleEn: string
      coverImage: string | null
      priceCents: number
      currency: string
    }

export function fmtAmount(cents: number, currency: string, locale: string): string {
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
}
