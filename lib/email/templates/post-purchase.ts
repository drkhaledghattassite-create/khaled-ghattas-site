/**
 * Post-purchase email — locale-switched (Arabic OR English, not bilingual).
 *
 * Structure (per spec):
 *   1. Header   — Sienna accent bar + brand + "Purchase receipt" subtitle
 *   2. Greeting — "أهلاً {name}" / "Hello {name}", thank-you sentence
 *   3. Order summary table — order#, line items with type badge + price, total
 *   4. Books delivery section (only if order contains books) — cover, title,
 *      Sienna "Download PDF" CTA per book; 7-day signed URL
 *   5. Sessions section (only if order contains sessions) — cover, title,
 *      "Go to my library" CTA; sessions stream from the site
 *   6. Footer — accent rule, support line, copyright, "sent to" address
 *
 * Why hex literals here when Qalem v2 normally forbids them: email clients
 * (Outlook desktop, Gmail mobile, Apple Mail) don't support CSS custom
 * properties. The hex values mirror the Qalem light palette
 * (--color-accent #B85440, --color-bg-deep #F4F4F4, …). This is the
 * exception to the no-hardcoded-hex rule, documented in CLAUDE.md.
 *
 * Why not @react-email components: not installed in this project, and adding
 * them just for one template adds RSC compilation surface for no payoff.
 * Raw HTML strings + inline styles match the existing pattern in this file
 * and in corporate-request.ts.
 *
 * Why string-map (Option 3) over next-intl: emails render outside the
 * normal request-locale context. Threading a translator into a string
 * template is awkward; a small inline LL[locale][key] map is what the
 * existing template already uses (literals embedded inline) and is the
 * lowest-friction approach for the strings-internal-to-templates that
 * shouldn't pollute messages/{ar,en}.json.
 */

export type PostPurchaseLocale = 'ar' | 'en'

export type PostPurchaseBookEntry = {
  titleAr: string
  titleEn: string
  /** Public absolute HTTPS URL to the cover image, or null. The webhook
   * pre-resolves relative paths against SITE_URL and skips localhost so
   * email clients don't render broken thumbnails. */
  coverImageUrl: string | null
  currency: string
  /** Decimal string as recorded in order_items.price_at_purchase. */
  priceAtPurchase: string
  /** A signed URL valid for `signedUrlExpiresInDays`. Null when the book
   * has no digital file (external store fulfillment) or when signing
   * failed — the template falls back to the library link in that case. */
  downloadUrl: string | null
}

export type PostPurchaseSessionEntry = {
  titleAr: string
  titleEn: string
  coverImageUrl: string | null
  currency: string
  priceAtPurchase: string
}

export type PostPurchaseEmailInput = {
  locale: PostPurchaseLocale
  customerName: string | null
  customerEmail: string
  orderId: string
  /** orders.total_amount as decimal string. */
  totalAmount: string
  currency: string
  books: PostPurchaseBookEntry[]
  sessions: PostPurchaseSessionEntry[]
  /** Absolute URL to /dashboard/library. Fallback for sessions and for
   * books delivered via external storefronts. */
  libraryUrl: string
  /** Just for the "(valid for N days)" line — keeps the human-readable
   * copy in sync with the signed-URL TTL passed to the storage adapter. */
  signedUrlExpiresInDays: number
  /** Public support inbox shown in the footer. */
  supportEmail: string
}

/* ──────────────────────────────────────────────────────────────────────────
 * Palette — visually matches Qalem v2 light tokens. Email clients don't
 * support CSS custom properties so we resolve to hex literals here.
 * ──────────────────────────────────────────────────────────────────────── */

const ACCENT = '#B85440'
const ACCENT_BG = '#F4E5DF' // matches --color-accent-soft
const FG1 = '#0A0A0A'
const FG2 = '#404040'
const FG3 = '#737373'
const BG = '#FFFFFF'
const BG_PAGE = '#F4F4F4' // matches --color-bg-deep
const BG_TINT = '#FAFAFA' // matches --color-bg
const BORDER = '#E5E5E5'

const FONT_AR = `'IBM Plex Sans Arabic', 'Tahoma', 'Geneva', sans-serif`
const FONT_LATIN = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

const MAX_TITLE_LEN = 80

/* ──────────────────────────────────────────────────────────────────────────
 * Strings — small per-locale map. Keys are template-internal so they live
 * here rather than in messages/{ar,en}.json. Adding new strings: extend
 * both arrays in lockstep, same key.
 * ──────────────────────────────────────────────────────────────────────── */

type Strings = {
  brandFull: string
  receiptEyebrow: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  thanks: string
  orderNumber: string
  summaryTitle: string
  typeBook: string
  typeSession: string
  total: string
  booksHeading: string
  booksBody: (days: number) => string
  downloadCta: string
  bookUnavailable: string
  sessionsHeading: string
  sessionsBody: string
  libraryCta: string
  apologyHeading: string
  apologyBody: string
  supportLine: (email: string) => string
  copyright: (year: number) => string
  sentTo: (email: string) => string
  subject: string
}

const L: Record<PostPurchaseLocale, Strings> = {
  ar: {
    brandFull: 'د. خالد غطاس',
    receiptEyebrow: 'إيصال شراء',
    greetingNamed: (n: string) => `أهلاً ${n}،`,
    greetingFallback: 'أهلاً،',
    thanks: 'شكراً لك على شرائك. ستجد تفاصيل طلبك أدناه.',
    orderNumber: 'رقم الطلب',
    summaryTitle: 'ملخّص الطلب',
    typeBook: 'كتاب',
    typeSession: 'جلسة',
    total: 'الإجمالي',
    booksHeading: 'كتبك جاهزة للتحميل',
    booksBody: (days: number) =>
      `روابط التحميل أدناه صالحة لمدة ${toArabicNumerals(days)} أيام. يمكنك أيضاً قراءتها في أي وقت من مكتبتك.`,
    downloadCta: 'تحميل PDF',
    bookUnavailable: 'هذا الكتاب سيكون متاحاً قريباً في مكتبتك.',
    sessionsHeading: 'جلساتك متاحة الآن',
    sessionsBody: 'يمكنك مشاهدة جلساتك من مكتبتك في أي وقت.',
    libraryCta: 'اذهب إلى مكتبتي',
    apologyHeading: 'ملاحظة',
    apologyBody:
      'حدثت مشكلة في تحضير عناصر طلبك. يرجى التواصل معنا وسنحلّ الأمر فوراً.',
    supportLine: (email: string) =>
      `إذا واجهت أي مشكلة، تواصل معنا على ${email}`,
    copyright: (year: number) => `© ${toArabicNumerals(year)} د. خالد غطاس`,
    sentTo: (email: string) => `تم إرسال هذا البريد الإلكتروني إلى ${email}`,
    subject: 'تأكيد الشراء — كتب وجلسات د. خالد غطاس',
  },
  en: {
    brandFull: 'Dr. Khaled Ghattass',
    receiptEyebrow: 'Purchase receipt',
    greetingNamed: (n: string) => `Hello ${n},`,
    greetingFallback: 'Hello,',
    thanks: 'Thank you for your purchase. Your order details are below.',
    orderNumber: 'Order #',
    summaryTitle: 'Order summary',
    typeBook: 'Book',
    typeSession: 'Session',
    total: 'Total',
    booksHeading: 'Your books are ready to download',
    booksBody: (days: number) =>
      `Download links below are valid for ${days} days. You can also read them anytime from your library.`,
    downloadCta: 'Download PDF',
    bookUnavailable: 'This book will be available in your library shortly.',
    sessionsHeading: 'Your sessions are available now',
    sessionsBody: 'Watch your sessions from your library anytime.',
    libraryCta: 'Go to my library',
    apologyHeading: 'A note',
    apologyBody:
      'There was an issue preparing your order items. Please contact us and we will sort it right away.',
    supportLine: (email: string) =>
      `If you have any issue, contact us at ${email}`,
    copyright: (year: number) => `© ${year} Dr. Khaled Ghattass`,
    sentTo: (email: string) => `This email was sent to ${email}`,
    subject: 'Purchase Confirmation — Dr. Khaled Ghattass',
  },
}

export function buildPostPurchaseSubject(
  locale: PostPurchaseLocale,
): string {
  return L[locale].subject
}

export function buildPostPurchaseHtml(input: PostPurchaseEmailInput): string {
  const { locale } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = locale
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]

  const greeting = input.customerName
    ? t.greetingNamed(escapeHtml(truncate(input.customerName, 60)))
    : t.greetingFallback

  const hasItems = input.books.length > 0 || input.sessions.length > 0

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(t.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG_PAGE};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_PAGE};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${BG};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">

            ${headerHtml({ font, t })}
            ${greetingHtml({ font, dir, greeting, thanks: t.thanks })}
            ${hasItems
              ? orderSummaryHtml({ font, dir, locale, input, t })
              : apologyHtml({ font, dir, t })}
            ${input.books.length > 0
              ? booksDeliveryHtml({ font, dir, locale, input, t })
              : ''}
            ${input.sessions.length > 0
              ? sessionsHtml({ font, dir, locale, input, t })
              : ''}
            ${footerHtml({ font, dir, t, supportEmail: input.supportEmail, customerEmail: input.customerEmail })}

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

/* ──────────────────────────────────────────────────────────────────────────
 * Sections
 * ──────────────────────────────────────────────────────────────────────── */

function headerHtml(args: { font: string; t: Strings }): string {
  const { font, t } = args
  return `
            <tr>
              <td style="height:6px;line-height:6px;font-size:0;background:${ACCENT};">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 20px;">
                <div style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT};">
                  ${escapeHtml(t.receiptEyebrow)}
                </div>
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:22px;font-weight:700;color:${FG1};line-height:1.25;">
                  ${escapeHtml(t.brandFull)}
                </div>
              </td>
            </tr>`
}

function greetingHtml(args: {
  font: string
  dir: string
  greeting: string
  thanks: string
}): string {
  const { font, dir, greeting, thanks } = args
  return `
            <tr>
              <td dir="${dir}" style="padding:8px 32px 16px;">
                <div style="font-family:${font};font-size:16px;font-weight:600;color:${FG1};line-height:1.6;">
                  ${greeting}
                </div>
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                  ${escapeHtml(thanks)}
                </div>
              </td>
            </tr>`
}

function orderSummaryHtml(args: {
  font: string
  dir: string
  locale: PostPurchaseLocale
  input: PostPurchaseEmailInput
  t: Strings
}): string {
  const { font, dir, locale, input, t } = args
  const orderShort = input.orderId.slice(-8).toUpperCase()
  const lineRows: string[] = []

  for (const b of input.books) {
    lineRows.push(
      lineItemRowHtml({
        font,
        locale,
        title: locale === 'ar' ? b.titleAr || b.titleEn : b.titleEn || b.titleAr,
        typeLabel: t.typeBook,
        priceLabel: formatCurrency(b.priceAtPurchase, b.currency, locale),
      }),
    )
  }
  for (const s of input.sessions) {
    lineRows.push(
      lineItemRowHtml({
        font,
        locale,
        title: locale === 'ar' ? s.titleAr || s.titleEn : s.titleEn || s.titleAr,
        typeLabel: t.typeSession,
        priceLabel: formatCurrency(s.priceAtPurchase, s.currency, locale),
      }),
    )
  }

  // The total row uses a slightly heavier weight + accent dot to feel
  // distinct from the line items above.
  const totalLabel = formatCurrency(input.totalAmount, input.currency, locale)

  return `
            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <div style="border:1px solid ${BORDER};border-radius:10px;background:${BG_TINT};overflow:hidden;">
                  <div style="padding:14px 18px;border-bottom:1px solid ${BORDER};display:block;">
                    <span style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${FG3};">
                      ${escapeHtml(t.orderNumber)}
                    </span>
                    <span style="font-family:${FONT_LATIN};font-size:13px;font-weight:600;color:${FG1};${dir === 'rtl' ? 'margin-right:10px;' : 'margin-left:10px;'}letter-spacing:0.04em;">
                      ${escapeHtml(orderShort)}
                    </span>
                  </div>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    ${lineRows.join('')}
                    <tr>
                      <td colspan="2" style="padding:14px 18px;border-top:1px solid ${BORDER};background:${BG};">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td dir="${dir}" style="font-family:${font};font-size:14px;font-weight:700;color:${FG1};">
                              ${escapeHtml(t.total)}
                            </td>
                            <td dir="ltr" align="${dir === 'rtl' ? 'left' : 'right'}" style="font-family:${FONT_LATIN};font-size:15px;font-weight:700;color:${ACCENT};">
                              ${escapeHtml(totalLabel)}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>`
}

function lineItemRowHtml(args: {
  font: string
  locale: PostPurchaseLocale
  title: string
  typeLabel: string
  priceLabel: string
}): string {
  const { font, locale, title, typeLabel, priceLabel } = args
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const safeTitle = escapeHtml(truncate(title, MAX_TITLE_LEN))
  const safeType = escapeHtml(typeLabel)
  const safePrice = escapeHtml(priceLabel)
  return `
                    <tr>
                      <td style="padding:12px 18px;border-bottom:1px solid ${BORDER};">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                          <tr>
                            <td dir="${dir}" style="font-family:${font};font-size:14px;color:${FG1};line-height:1.5;">
                              <div>${safeTitle}</div>
                              <div style="margin-top:6px;">
                                <span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${ACCENT_BG};color:${ACCENT};font-family:${font};font-size:11px;font-weight:600;letter-spacing:0.04em;">
                                  ${safeType}
                                </span>
                              </div>
                            </td>
                            <td dir="ltr" align="${dir === 'rtl' ? 'left' : 'right'}" valign="top" style="font-family:${FONT_LATIN};font-size:14px;font-weight:600;color:${FG1};white-space:nowrap;${dir === 'rtl' ? 'padding-left:12px;' : 'padding-right:12px;'}">
                              ${safePrice}
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>`
}

function booksDeliveryHtml(args: {
  font: string
  dir: string
  locale: PostPurchaseLocale
  input: PostPurchaseEmailInput
  t: Strings
}): string {
  const { font, dir, locale, input, t } = args
  const blocks = input.books
    .map((b) => deliveryBlockHtml({
      font,
      dir,
      locale,
      title: locale === 'ar' ? b.titleAr || b.titleEn : b.titleEn || b.titleAr,
      coverImageUrl: b.coverImageUrl,
      ctaHref: b.downloadUrl ?? input.libraryUrl,
      ctaLabel: b.downloadUrl ? t.downloadCta : t.libraryCta,
      noteBelow: b.downloadUrl ? null : t.bookUnavailable,
    }))
    .join('')
  return `
            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <div style="font-family:${font};font-size:16px;font-weight:700;color:${FG1};line-height:1.4;">
                  ${escapeHtml(t.booksHeading)}
                </div>
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                  ${escapeHtml(t.booksBody(input.signedUrlExpiresInDays))}
                </div>
                <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
                ${blocks}
              </td>
            </tr>`
}

function sessionsHtml(args: {
  font: string
  dir: string
  locale: PostPurchaseLocale
  input: PostPurchaseEmailInput
  t: Strings
}): string {
  const { font, dir, locale, input, t } = args
  const blocks = input.sessions
    .map((s) => deliveryBlockHtml({
      font,
      dir,
      locale,
      title: locale === 'ar' ? s.titleAr || s.titleEn : s.titleEn || s.titleAr,
      coverImageUrl: s.coverImageUrl,
      ctaHref: input.libraryUrl,
      ctaLabel: t.libraryCta,
      noteBelow: null,
    }))
    .join('')
  return `
            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <div style="font-family:${font};font-size:16px;font-weight:700;color:${FG1};line-height:1.4;">
                  ${escapeHtml(t.sessionsHeading)}
                </div>
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                  ${escapeHtml(t.sessionsBody)}
                </div>
                <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
                ${blocks}
              </td>
            </tr>`
}

function deliveryBlockHtml(args: {
  font: string
  dir: string
  locale: PostPurchaseLocale
  title: string
  coverImageUrl: string | null
  ctaHref: string
  ctaLabel: string
  noteBelow: string | null
}): string {
  const { font, dir, locale, title, coverImageUrl, ctaHref, ctaLabel, noteBelow } = args
  const safeTitle = escapeHtml(truncate(title, MAX_TITLE_LEN))
  // Cover thumbnail uses fixed 64×96 dimensions (book aspect 2:3) and is
  // rendered via <img>. Email clients vary in how they handle width/height
  // attributes vs CSS — set both for safety. If the URL is null we drop the
  // entire image cell so the block is just text + CTA, no broken icon.
  const coverCell = coverImageUrl
    ? `
                  <td valign="top" style="${dir === 'rtl' ? 'padding-left:14px;' : 'padding-right:14px;'}width:64px;">
                    <img src="${encodeAttr(coverImageUrl)}" alt="" width="64" height="96" style="display:block;width:64px;height:96px;border-radius:6px;border:1px solid ${BORDER};object-fit:cover;" />
                  </td>`
    : ''
  const noteHtml = noteBelow
    ? `
                      <div style="margin-top:8px;font-family:${font};font-size:13px;color:${FG3};line-height:1.6;">
                        ${escapeHtml(noteBelow)}
                      </div>`
    : ''
  // Locale-aware font for the CTA label so Arabic CTAs use IBM Plex Sans
  // Arabic and Latin CTAs use Inter.
  const ctaFont = locale === 'ar' ? FONT_AR : FONT_LATIN
  return `
                <div style="background:${BG_TINT};border:1px solid ${BORDER};border-radius:10px;padding:16px;margin-bottom:12px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                    <tr>
                      ${coverCell}
                      <td valign="top">
                        <div style="font-family:${font};font-size:15px;font-weight:600;color:${FG1};line-height:1.4;">
                          ${safeTitle}
                        </div>
                        <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                        <a href="${encodeAttr(ctaHref)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${ctaFont};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                          ${escapeHtml(ctaLabel)}
                        </a>
                        ${noteHtml}
                      </td>
                    </tr>
                  </table>
                </div>`
}

function apologyHtml(args: {
  font: string
  dir: string
  t: Strings
}): string {
  const { font, dir, t } = args
  return `
            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <div style="border:1px solid ${BORDER};border-radius:10px;background:${BG_TINT};padding:18px;">
                  <div style="font-family:${font};font-size:14px;font-weight:700;color:${FG1};line-height:1.4;">
                    ${escapeHtml(t.apologyHeading)}
                  </div>
                  <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                  <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                    ${escapeHtml(t.apologyBody)}
                  </div>
                </div>
              </td>
            </tr>`
}

function footerHtml(args: {
  font: string
  dir: string
  t: Strings
  supportEmail: string
  customerEmail: string
}): string {
  const { font, dir, t, supportEmail, customerEmail } = args
  const year = new Date().getUTCFullYear()
  // Replace the email placeholder in the support line with a real mailto
  // link — easier than threading separate left/right pieces through the
  // string map, and keeps t.supportLine readable in one shape.
  const supportText = t.supportLine(supportEmail)
  const supportHtml = supportText.replace(
    supportEmail,
    `<a href="mailto:${encodeAttr(supportEmail)}" style="color:${ACCENT};text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
  )
  return `
            <tr>
              <td style="height:1px;line-height:1px;font-size:0;background:${ACCENT};">&nbsp;</td>
            </tr>
            <tr>
              <td dir="${dir}" style="padding:20px 32px 24px;background:${BG_TINT};">
                <div style="font-family:${font};font-size:13px;color:${FG2};line-height:1.7;">
                  ${supportHtml}
                </div>
                <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:12px;color:${FG3};line-height:1.6;">
                  ${escapeHtml(t.copyright(year))}
                </div>
                <div style="height:4px;line-height:4px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:12px;color:${FG3};line-height:1.6;">
                  ${escapeHtml(t.sentTo(customerEmail))}
                </div>
              </td>
            </tr>`
}

/* ──────────────────────────────────────────────────────────────────────────
 * Plain-text fallback. Rendered by some clients in preview lists and used
 * by accessibility tooling. Functional, not pretty.
 * ──────────────────────────────────────────────────────────────────────── */

export function buildPostPurchaseText(input: PostPurchaseEmailInput): string {
  const { locale } = input
  const t = L[locale]
  const lines: string[] = []

  lines.push(t.brandFull)
  lines.push(t.receiptEyebrow)
  lines.push('')

  lines.push(
    input.customerName
      ? t.greetingNamed(input.customerName)
      : t.greetingFallback,
  )
  lines.push(t.thanks)
  lines.push('')

  if (input.books.length === 0 && input.sessions.length === 0) {
    lines.push(t.apologyHeading + ': ' + t.apologyBody)
    lines.push('')
  } else {
    lines.push(`${t.orderNumber} ${input.orderId.slice(-8).toUpperCase()}`)
    for (const b of input.books) {
      const title = locale === 'ar' ? b.titleAr || b.titleEn : b.titleEn || b.titleAr
      lines.push(`- [${t.typeBook}] ${title} — ${formatCurrency(b.priceAtPurchase, b.currency, locale)}`)
    }
    for (const s of input.sessions) {
      const title = locale === 'ar' ? s.titleAr || s.titleEn : s.titleEn || s.titleAr
      lines.push(`- [${t.typeSession}] ${title} — ${formatCurrency(s.priceAtPurchase, s.currency, locale)}`)
    }
    lines.push(`${t.total}: ${formatCurrency(input.totalAmount, input.currency, locale)}`)
    lines.push('')
  }

  if (input.books.length > 0) {
    lines.push(t.booksHeading)
    lines.push(t.booksBody(input.signedUrlExpiresInDays))
    for (const b of input.books) {
      const title = locale === 'ar' ? b.titleAr || b.titleEn : b.titleEn || b.titleAr
      if (b.downloadUrl) {
        lines.push(`  ${title}: ${b.downloadUrl}`)
      } else {
        lines.push(`  ${title}: ${input.libraryUrl}  (${t.bookUnavailable})`)
      }
    }
    lines.push('')
  }

  if (input.sessions.length > 0) {
    lines.push(t.sessionsHeading)
    lines.push(t.sessionsBody)
    lines.push(`  ${input.libraryUrl}`)
    lines.push('')
  }

  lines.push(t.supportLine(input.supportEmail))
  lines.push(t.copyright(new Date().getUTCFullYear()))
  lines.push(t.sentTo(input.customerEmail))

  return lines.join('\n')
}

/* ──────────────────────────────────────────────────────────────────────────
 * Local helpers — no DOM, kept inline so the template module is self-contained.
 * ──────────────────────────────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Used inside attribute values; same escape rules suffice.
function encodeAttr(s: string): string {
  return escapeHtml(s)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
}

function formatCurrency(
  amount: string,
  currency: string,
  locale: PostPurchaseLocale,
): string {
  const num = Number(amount)
  if (!Number.isFinite(num)) return `${amount} ${currency.toUpperCase()}`
  // Arabic locale auto-renders Arabic-Indic digits and the currency
  // symbol in its preferred position. Latin uses 'en' for consistent
  // ASCII output across email clients.
  const tag = locale === 'ar' ? 'ar' : 'en'
  try {
    return new Intl.NumberFormat(tag, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(num)
  } catch {
    // Defensive: invalid currency code falls back to "N CODE".
    return `${num.toFixed(2)} ${currency.toUpperCase()}`
  }
}

const ARABIC_INDIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

function toArabicNumerals(n: number): string {
  return String(n)
    .split('')
    .map((ch) => {
      const idx = '0123456789'.indexOf(ch)
      return idx >= 0 ? ARABIC_INDIC_DIGITS[idx]! : ch
    })
    .join('')
}
