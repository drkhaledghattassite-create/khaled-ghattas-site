/**
 * Post-purchase email — bilingual (Arabic-first), inline-styled HTML.
 *
 * The email always includes both languages in a single message. We don't
 * branch on a customer locale because:
 *   1. Stripe Checkout doesn't reliably pass through the buyer's site locale.
 *   2. Many readers will toggle between languages.
 *   3. A single bilingual email is simpler than maintaining two templates.
 *
 * All styling is inline (Outlook + Apple Mail strip <style> blocks). Colors
 * mirror the Qalem v2 light palette — `--color-accent #B85440` (Sienna Ink),
 * `--color-fg1 #0A0A0A`, etc. Fonts fall back to system stacks because
 * almost no email client supports webfonts.
 */

export type PostPurchaseBookEntry = {
  titleAr: string
  titleEn: string
  /** A signed URL valid for `signedUrlExpiresInDays`. May be null when the
   * book has no digital file (external store fulfillment). */
  downloadUrl: string | null
}

export type PostPurchaseSessionEntry = {
  titleAr: string
  titleEn: string
}

export type PostPurchaseEmailInput = {
  customerName: string | null
  books: PostPurchaseBookEntry[]
  sessions: PostPurchaseSessionEntry[]
  /** Absolute URL to /dashboard/library. Used for sessions and as a fallback
   * for books delivered via external storefront. */
  libraryUrl: string
  /** Just for the line "(valid for 7 days)" — keeps the human-readable copy
   * in sync with the signed-URL TTL passed to the storage adapter. */
  signedUrlExpiresInDays: number
}

const ACCENT = '#B85440'
const FG1 = '#0A0A0A'
const FG2 = '#404040'
const FG3 = '#737373'
const BG = '#FFFFFF'
const BG_DEEP = '#F4F4F4'
const BORDER = '#E5E5E5'

const FONT_AR = `'IBM Plex Sans Arabic', 'Tahoma', 'Geneva', sans-serif`
const FONT_LATIN = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

export function buildPostPurchaseSubject(): string {
  return 'شكراً لشرائك / Thank you for your purchase'
}

export function buildPostPurchaseHtml(input: PostPurchaseEmailInput): string {
  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>شكراً لشرائك / Thank you for your purchase</title>
  </head>
  <body style="margin:0;padding:0;background:${BG_DEEP};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_DEEP};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${BG};border:1px solid ${BORDER};border-radius:12px;">

            ${headerHtml()}
            ${arabicSectionHtml(input)}
            ${dividerHtml()}
            ${englishSectionHtml(input)}
            ${footerHtml(input.libraryUrl)}

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function headerHtml(): string {
  return `
      <tr>
        <td style="padding:32px 32px 0 32px;border-bottom:3px solid ${ACCENT};">
          <div style="font-family:${FONT_LATIN};font-size:13px;font-weight:600;letter-spacing:0.16em;color:${ACCENT};text-transform:uppercase;">
            Dr. Khaled Ghattass
          </div>
          <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
          <div style="font-family:${FONT_AR};font-size:22px;font-weight:700;color:${FG1};line-height:1.3;">
            شكراً لشرائك
          </div>
          <div style="font-family:${FONT_LATIN};font-size:18px;font-weight:600;color:${FG2};line-height:1.3;padding-bottom:24px;">
            Thank you for your purchase
          </div>
        </td>
      </tr>`
}

function dividerHtml(): string {
  return `
      <tr>
        <td style="padding:0 32px;">
          <div style="border-top:1px solid ${BORDER};margin:8px 0;"></div>
        </td>
      </tr>`
}

function arabicSectionHtml(input: PostPurchaseEmailInput): string {
  const { books, sessions, libraryUrl, signedUrlExpiresInDays } = input
  const greeting = input.customerName
    ? `أهلاً ${escapeHtml(input.customerName)}،`
    : 'أهلاً بك،'

  const booksBlock = books
    .map((book) => {
      const title = book.titleAr || book.titleEn
      if (book.downloadUrl) {
        return `
            <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
              <div style="font-family:${FONT_AR};font-size:16px;font-weight:600;color:${FG1};margin-bottom:8px;">
                كتابك «${escapeHtml(title)}» متاح للتحميل أدناه:
              </div>
              <div style="margin:12px 0;">
                <a href="${encodeAttr(book.downloadUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_AR};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                  تحميل الكتاب
                </a>
              </div>
              <div style="font-family:${FONT_AR};font-size:13px;color:${FG3};">
                (الرابط صالح لمدة ${toArabicNumerals(signedUrlExpiresInDays)} أيام)
              </div>
            </div>`
      }
      return `
          <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
            <div style="font-family:${FONT_AR};font-size:16px;font-weight:600;color:${FG1};margin-bottom:8px;">
              كتابك «${escapeHtml(title)}» متاح في مكتبتك:
            </div>
            <div style="margin:12px 0;">
              <a href="${encodeAttr(libraryUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_AR};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                فتح المكتبة
              </a>
            </div>
          </div>`
    })
    .join('')

  const sessionsBlock = sessions
    .map((s) => {
      const title = s.titleAr || s.titleEn
      return `
          <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
            <div style="font-family:${FONT_AR};font-size:16px;font-weight:600;color:${FG1};margin-bottom:8px;">
              جلستك «${escapeHtml(title)}» متاحة الآن في مكتبتك:
            </div>
            <div style="margin:12px 0;">
              <a href="${encodeAttr(libraryUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_AR};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                فتح المكتبة
              </a>
            </div>
          </div>`
    })
    .join('')

  return `
      <tr>
        <td dir="rtl" style="padding:32px 32px 16px 32px;">
          <div style="font-family:${FONT_AR};font-size:16px;color:${FG1};line-height:1.85;">
            ${greeting}
          </div>
          <div style="height:12px;font-size:0;line-height:12px;">&nbsp;</div>
          <div style="font-family:${FONT_AR};font-size:16px;color:${FG2};line-height:1.85;">
            شكراً لك على شرائك من د. خالد غطاس.
          </div>
          ${booksBlock}
          ${sessionsBlock}
          <div style="height:8px;font-size:0;line-height:8px;">&nbsp;</div>
          <div style="font-family:${FONT_AR};font-size:15px;color:${FG2};line-height:1.85;">
            نتمنى لك تجربة قراءة ممتعة.
          </div>
          <div style="font-family:${FONT_AR};font-size:14px;color:${FG3};margin-top:8px;">
            د. خالد غطاس
          </div>
        </td>
      </tr>`
}

function englishSectionHtml(input: PostPurchaseEmailInput): string {
  const { books, sessions, libraryUrl, signedUrlExpiresInDays } = input
  const greeting = input.customerName
    ? `Hello ${escapeHtml(input.customerName)},`
    : 'Hello,'

  const booksBlock = books
    .map((book) => {
      const title = book.titleEn || book.titleAr
      if (book.downloadUrl) {
        return `
            <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
              <div style="font-family:${FONT_LATIN};font-size:15px;font-weight:600;color:${FG1};margin-bottom:8px;">
                Your book "${escapeHtml(title)}" is ready to download:
              </div>
              <div style="margin:12px 0;">
                <a href="${encodeAttr(book.downloadUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_LATIN};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                  Download book
                </a>
              </div>
              <div style="font-family:${FONT_LATIN};font-size:13px;color:${FG3};">
                (Link valid for ${signedUrlExpiresInDays} days)
              </div>
            </div>`
      }
      return `
          <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
            <div style="font-family:${FONT_LATIN};font-size:15px;font-weight:600;color:${FG1};margin-bottom:8px;">
              Your book "${escapeHtml(title)}" is in your library:
            </div>
            <div style="margin:12px 0;">
              <a href="${encodeAttr(libraryUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_LATIN};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                Open library
              </a>
            </div>
          </div>`
    })
    .join('')

  const sessionsBlock = sessions
    .map((s) => {
      const title = s.titleEn || s.titleAr
      return `
          <div style="background:${BG_DEEP};border:1px solid ${BORDER};border-radius:8px;padding:16px;margin:12px 0;">
            <div style="font-family:${FONT_LATIN};font-size:15px;font-weight:600;color:${FG1};margin-bottom:8px;">
              Your session "${escapeHtml(title)}" is now available in your library:
            </div>
            <div style="margin:12px 0;">
              <a href="${encodeAttr(libraryUrl)}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${FONT_LATIN};font-size:14px;font-weight:600;text-decoration:none;padding:10px 20px;border-radius:9999px;">
                Open library
              </a>
            </div>
          </div>`
    })
    .join('')

  return `
      <tr>
        <td dir="ltr" style="padding:16px 32px 32px 32px;">
          <div style="font-family:${FONT_LATIN};font-size:15px;color:${FG1};line-height:1.6;">
            ${greeting}
          </div>
          <div style="height:12px;font-size:0;line-height:12px;">&nbsp;</div>
          <div style="font-family:${FONT_LATIN};font-size:15px;color:${FG2};line-height:1.6;">
            Thank you for your purchase from Dr. Khaled Ghattass.
          </div>
          ${booksBlock}
          ${sessionsBlock}
          <div style="height:8px;font-size:0;line-height:8px;">&nbsp;</div>
          <div style="font-family:${FONT_LATIN};font-size:14px;color:${FG2};line-height:1.6;">
            Happy reading.
          </div>
          <div style="font-family:${FONT_LATIN};font-size:14px;color:${FG3};margin-top:8px;">
            Dr. Khaled Ghattass
          </div>
        </td>
      </tr>`
}

function footerHtml(libraryUrl: string): string {
  return `
      <tr>
        <td style="padding:24px 32px;background:${BG_DEEP};border-top:1px solid ${BORDER};border-radius:0 0 12px 12px;text-align:center;">
          <a href="${encodeAttr(libraryUrl)}" style="font-family:${FONT_LATIN};font-size:13px;color:${FG3};text-decoration:underline;">
            drkhaledghattass.com
          </a>
        </td>
      </tr>`
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
