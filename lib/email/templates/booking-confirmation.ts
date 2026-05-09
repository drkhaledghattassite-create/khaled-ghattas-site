/**
 * Booking confirmation email — locale-switched (AR or EN, not bilingual).
 *
 * Sent on `checkout.session.completed` for bookings (Reconsider course or
 * one of the 8 Online Sessions). Mirrors the post-purchase.ts visual
 * language but the content shape diverges:
 *   - No download links (bookings deliver via cohort logistics, not files)
 *   - No item list (a booking is one product per order)
 *   - Cohort-context block (date, format, duration) takes the place
 *     of post-purchase's Books / Sessions delivery sections
 *
 * The hex literals here mirror the Qalem light palette and are an exception
 * to the no-hardcoded-hex rule (email clients don't support CSS custom
 * properties). Same exception as documented in post-purchase.ts.
 */

export type BookingConfirmationLocale = 'ar' | 'en'

export type BookingConfirmationProductType =
  | 'RECONSIDER_COURSE'
  | 'ONLINE_SESSION'

export type BookingConfirmationBooking = {
  titleAr: string
  titleEn: string
  productType: BookingConfirmationProductType
  cohortLabelAr: string | null
  cohortLabelEn: string | null
  nextCohortDate: Date | null
  durationMinutes: number | null
  formatAr: string | null
  formatEn: string | null
}

export type BookingConfirmationEmailInput = {
  locale: BookingConfirmationLocale
  customerName: string | null
  customerEmail: string
  orderId: string
  booking: BookingConfirmationBooking
  /** Cents. */
  amountPaid: number
  currency: string
  /**
   * Deep-link to the recipient's bookings list (/dashboard/bookings).
   * The CTA in "what's next" routes here so the user lands on the
   * surface that lists what they just paid for, not the books library.
   */
  bookingsUrl: string
  supportEmail: string
}

const FONT_AR =
  "'IBM Plex Sans Arabic', 'Readex Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
const FONT_LATIN =
  "'Inter', 'Readex Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

const PALETTE = {
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

type Strings = {
  brand: string
  subjectPrefix: string
  receiptLabel: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  intro: string
  detailsHeading: string
  cohortLabel: string
  durationLabel: string
  formatLabel: string
  productTypeLabel: string
  reconsiderType: string
  onlineSessionType: string
  amountLabel: string
  orderRefLabel: string
  whatsNextHeading: string
  whatsNextBody: string
  bookingsCta: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
}

const L: Record<BookingConfirmationLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subjectPrefix: 'تأكيد الحجز —',
    receiptLabel: 'تأكيد الحجز',
    greetingNamed: (name) => `أهلاً ${name}`,
    greetingFallback: 'أهلاً',
    intro:
      'تمّ تأكيد حجزك. سنتواصل معك قريباً بتفاصيل الدفعة وروابط الحضور.',
    detailsHeading: 'تفاصيل الحجز',
    cohortLabel: 'الدفعة',
    durationLabel: 'المدة',
    formatLabel: 'التقديم',
    productTypeLabel: 'النوع',
    reconsiderType: 'دورة Reconsider',
    onlineSessionType: 'جلسة أونلاين',
    amountLabel: 'المبلغ المدفوع',
    orderRefLabel: 'رقم الحجز',
    whatsNextHeading: 'الخطوات القادمة',
    whatsNextBody:
      'سنُرسل إليك رابط الحضور وتفاصيل الجلسة عبر البريد قبل بدء الدفعة بعدة أيام. يمكنك الاطلاع على حجوزاتك في لوحة التحكم في أي وقت.',
    bookingsCta: 'عرض حجوزاتي',
    supportLine: (email) =>
      `إذا كان لديك سؤال، اكتب إلى <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subjectPrefix: 'Booking confirmation —',
    receiptLabel: 'Booking confirmation',
    greetingNamed: (name) => `Hi ${name}`,
    greetingFallback: 'Hello',
    intro:
      'Your booking is confirmed. We\'ll be in touch shortly with cohort details and the link to attend.',
    detailsHeading: 'Booking details',
    cohortLabel: 'Cohort',
    durationLabel: 'Duration',
    formatLabel: 'Delivery',
    productTypeLabel: 'Type',
    reconsiderType: 'Reconsider course',
    onlineSessionType: 'Online session',
    amountLabel: 'Amount paid',
    orderRefLabel: 'Order reference',
    whatsNextHeading: 'What happens next',
    whatsNextBody:
      'We\'ll email you the join link and session details a few days before the cohort starts. You can also check your bookings on your dashboard at any time.',
    bookingsCta: 'View my bookings',
    supportLine: (email) =>
      `If you have any questions, just reply or write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
  },
}

function fmtAmount(cents: number, currency: string, locale: BookingConfirmationLocale): string {
  const major = (cents / 100).toFixed(2)
  const cur = currency.toUpperCase()
  return locale === 'ar' ? `${major} ${cur}` : `${cur} ${major}`
}

function fmtDuration(minutes: number | null, locale: BookingConfirmationLocale): string {
  if (!minutes) return locale === 'ar' ? '—' : '—'
  return locale === 'ar' ? `${minutes} دقيقة` : `${minutes} minutes`
}

export function buildBookingConfirmationSubject(
  locale: BookingConfirmationLocale,
): string {
  return locale === 'ar'
    ? 'تأكيد الحجز — د. خالد غطاس'
    : 'Booking confirmation — Dr. Khaled Ghattass'
}

export function buildBookingConfirmationHtml(
  input: BookingConfirmationEmailInput,
): string {
  const { locale, customerName, customerEmail, orderId, booking, amountPaid, currency, bookingsUrl, supportEmail } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'en'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]

  const title = isRtl ? booking.titleAr : booking.titleEn
  const cohort = isRtl ? booking.cohortLabelAr : booking.cohortLabelEn
  const format = isRtl ? booking.formatAr : booking.formatEn
  const productTypeLabel =
    booking.productType === 'RECONSIDER_COURSE'
      ? t.reconsiderType
      : t.onlineSessionType

  const greeting = customerName
    ? t.greetingNamed(customerName)
    : t.greetingFallback

  // Compact "order reference" — just the first 8 chars, uppercase. The full
  // UUID is overkill for human eyes; the recipient already has the email
  // they're reading from us if they need to follow up.
  const orderRef = orderId.slice(0, 8).toUpperCase()

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.subjectPrefix} ${title}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <!-- Accent bar -->
    <div style="height:4px;background:${PALETTE.accent};border-radius:2px;margin-bottom:24px;"></div>

    <!-- Header -->
    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:36px 32px;">
      <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.accent};margin-bottom:12px;">${t.receiptLabel}</div>
      <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.25;font-weight:700;color:${PALETTE.fg1};">${greeting}</h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:${PALETTE.fg2};">${t.intro}</p>

      <!-- Booking details -->
      <div style="background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11.5px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.fg3};margin-bottom:12px;">${t.detailsHeading}</div>
        <div style="font-size:18px;font-weight:700;color:${PALETTE.fg1};margin-bottom:16px;line-height:1.3;">${title}</div>

        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.productTypeLabel}</td>
            <td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${productTypeLabel}</td>
          </tr>
          ${cohort ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.cohortLabel}</td>
            <td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${cohort}</td>
          </tr>` : ''}
          ${booking.durationMinutes ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.durationLabel}</td>
            <td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${fmtDuration(booking.durationMinutes, locale)}</td>
          </tr>` : ''}
          ${format ? `<tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.formatLabel}</td>
            <td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${format}</td>
          </tr>` : ''}
          <tr><td colspan="2" style="border-top:1px solid ${PALETTE.border};height:1px;font-size:0;line-height:0;padding:8px 0 0 0;">&nbsp;</td></tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.amountLabel}</td>
            <td style="padding:6px 0;font-size:16px;font-weight:700;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${fmtAmount(amountPaid, currency, locale)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.orderRefLabel}</td>
            <td style="padding:6px 0;font-size:13px;font-family:'Inter',monospace;color:${PALETTE.fg2};text-align:${isRtl ? 'left' : 'right'};letter-spacing:0.04em;">${orderRef}</td>
          </tr>
        </table>
      </div>

      <!-- What's next -->
      <div style="margin-bottom:24px;">
        <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.accent};margin-bottom:8px;">${t.whatsNextHeading}</div>
        <p style="margin:0;font-size:15px;color:${PALETTE.fg2};line-height:1.65;">${t.whatsNextBody}</p>
      </div>

      <!-- Bookings CTA -->
      <div style="text-align:center;margin-bottom:8px;">
        <a href="${bookingsUrl}" style="display:inline-block;background:${PALETTE.fg1};color:${PALETTE.bg};padding:14px 28px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">${t.bookingsCta}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${PALETTE.fg2};">${t.supportLine(supportEmail)}</p>
      <p style="margin:0 0 4px 0;font-size:12px;color:${PALETTE.fg3};">${t.copyright}</p>
      <p style="margin:0;font-size:11px;color:${PALETTE.fg3};">${t.sentTo(customerEmail)}</p>
    </div>
  </div>
</body>
</html>`
}

export function buildBookingConfirmationText(
  input: BookingConfirmationEmailInput,
): string {
  const { locale, customerName, customerEmail, orderId, booking, amountPaid, currency, bookingsUrl, supportEmail } = input
  const isRtl = locale === 'ar'
  const t = L[locale]
  const title = isRtl ? booking.titleAr : booking.titleEn
  const cohort = isRtl ? booking.cohortLabelAr : booking.cohortLabelEn
  const format = isRtl ? booking.formatAr : booking.formatEn
  const productTypeLabel =
    booking.productType === 'RECONSIDER_COURSE'
      ? t.reconsiderType
      : t.onlineSessionType
  const greeting = customerName
    ? t.greetingNamed(customerName)
    : t.greetingFallback
  const orderRef = orderId.slice(0, 8).toUpperCase()

  const lines = [
    t.receiptLabel,
    '',
    greeting,
    '',
    t.intro,
    '',
    `${t.detailsHeading}:`,
    `  ${title}`,
    `  ${t.productTypeLabel}: ${productTypeLabel}`,
    cohort ? `  ${t.cohortLabel}: ${cohort}` : null,
    booking.durationMinutes
      ? `  ${t.durationLabel}: ${fmtDuration(booking.durationMinutes, locale)}`
      : null,
    format ? `  ${t.formatLabel}: ${format}` : null,
    `  ${t.amountLabel}: ${fmtAmount(amountPaid, currency, locale)}`,
    `  ${t.orderRefLabel}: ${orderRef}`,
    '',
    t.whatsNextHeading,
    t.whatsNextBody,
    '',
    `${t.bookingsCta}: ${bookingsUrl}`,
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(customerEmail),
  ]
  return lines.filter((l) => l != null).join('\n')
}
