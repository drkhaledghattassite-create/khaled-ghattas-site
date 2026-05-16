/**
 * Phase H — "Verify your email" transactional notification.
 *
 * Sent on signup (Better Auth `emailVerification.sendOnSignUp = true`).
 * Once the user clicks the link, Better Auth flips `user.email_verified`
 * to true; downstream surfaces gate on that flag (gift claim, future
 * email-change flows).
 *
 * Locale-switched (Arabic OR English, not bilingual). Mirrors the
 * structure of question-answered.ts:
 *   1. Header   — Sienna accent bar + brand + eyebrow
 *   2. Greeting + reason line
 *   3. Verification CTA pill + plain-text fallback URL
 *   4. Expiry note + ignore-if-not-you note
 *   5. Footer   — accent rule, support, copyright
 *
 * Why hex literals here when Qalem v2 normally forbids them: email
 * clients (Outlook desktop, Gmail mobile, Apple Mail) don't support
 * CSS custom properties. Same exception documented across the other
 * email templates.
 */

export type EmailVerificationLocale = 'ar' | 'en'

export type EmailVerificationInput = {
  locale: EmailVerificationLocale
  /** New user's display name. Falls back to a generic greeting. */
  recipientName: string | null
  /** Recipient address — shown in the footer "sent to" line and used
   *  to compose the "ignore if not you" advisory. */
  recipientEmail: string
  /** Better Auth-supplied absolute URL with the verification token
   *  already encoded as a query param. */
  verificationUrl: string
  /** Public support inbox shown in the footer. */
  supportEmail: string
  /** Token lifetime in minutes, for the "expires in X minutes" line.
   *  Defaults to 60 to match Better Auth's default. */
  expiresInMinutes?: number
}

export type BuiltEmail = {
  subject: string
  html: string
  text: string
}

/* ──────────────────────────────────────────────────────────────────────────
 * Palette — visually matches Qalem v2 light tokens.
 * ──────────────────────────────────────────────────────────────────────── */

const ACCENT = '#B85440'
const FG1 = '#0A0A0A'
const FG2 = '#404040'
const FG3 = '#737373'
const BG = '#FFFFFF'
const BG_PAGE = '#F4F4F4'
const BG_TINT = '#FAFAFA'
const BORDER = '#E5E5E5'

const FONT_AR = `'IBM Plex Sans Arabic', 'Tahoma', 'Geneva', sans-serif`
const FONT_LATIN = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

/* ──────────────────────────────────────────────────────────────────────────
 * Strings
 * ──────────────────────────────────────────────────────────────────────── */

type Strings = {
  brandFull: string
  emailSubject: string
  eyebrow: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  bodyIntro: string
  cta: string
  fallbackLabel: string
  expiryLine: (minutes: string) => string
  ignoreLine: string
  signoff: string
  copyright: (year: number) => string
  supportLine: (email: string) => string
}

const L: Record<EmailVerificationLocale, Strings> = {
  ar: {
    brandFull: 'د. خالد غطاس',
    emailSubject: 'تأكيد بريدك الإلكتروني — د. خالد غطاس',
    eyebrow: 'تأكيد البريد الإلكتروني',
    greetingNamed: (n) => `أهلاً ${n}،`,
    greetingFallback: 'أهلاً،',
    bodyIntro:
      'شكراً لإنشاء حسابك. اضغط الزر أدناه لتأكيد بريدك الإلكتروني والوصول إلى مكتبتك وهداياك.',
    cta: 'تأكيد بريدي',
    fallbackLabel: 'أو افتح هذا الرابط في متصفحك:',
    expiryLine: (minutes) => `ينتهي هذا الرابط بعد ${minutes} دقيقة.`,
    ignoreLine: 'إن لم تنشئ حساباً، يمكنك تجاهل هذه الرسالة بأمان.',
    signoff: '— فريق د. خالد',
    copyright: (year) => `© ${toArabicNumerals(year)} د. خالد غطاس`,
    supportLine: (email) => `لأي سؤال، تواصل معنا على ${email}`,
  },
  en: {
    brandFull: 'Dr. Khaled Ghattass',
    emailSubject: 'Verify your email — Dr. Khaled Ghattass',
    eyebrow: 'Email verification',
    greetingNamed: (n) => `Hi ${n},`,
    greetingFallback: 'Hi,',
    bodyIntro:
      'Thanks for creating your account. Tap the button below to verify your email and unlock your library and gifts.',
    cta: 'Verify my email',
    fallbackLabel: 'Or open this link in your browser:',
    expiryLine: (minutes) => `This link expires in ${minutes} minutes.`,
    ignoreLine: "If you didn't create an account, you can safely ignore this email.",
    signoff: "— Dr. Khaled's team",
    copyright: (year) => `© ${year} Dr. Khaled Ghattass`,
    supportLine: (email) => `If you have any issue, contact us at ${email}`,
  },
}

/* ──────────────────────────────────────────────────────────────────────────
 * Public builder
 * ──────────────────────────────────────────────────────────────────────── */

export function buildEmailVerificationEmail(
  input: EmailVerificationInput,
): BuiltEmail {
  const t = L[input.locale]
  return {
    subject: t.emailSubject,
    html: buildHtml(input),
    text: buildText(input),
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * HTML
 * ──────────────────────────────────────────────────────────────────────── */

function buildHtml(input: EmailVerificationInput): string {
  const { locale } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]

  const trimmedName =
    input.recipientName && input.recipientName.trim().length > 0
      ? input.recipientName.trim()
      : null
  const greeting = trimmedName
    ? t.greetingNamed(escapeHtml(truncate(trimmedName, 60)))
    : t.greetingFallback

  const expiresInMinutes = Math.max(1, Math.floor(input.expiresInMinutes ?? 60))
  const minutesText = isRtl
    ? toArabicNumerals(expiresInMinutes)
    : String(expiresInMinutes)

  const safeUrl = encodeAttr(input.verificationUrl)
  const fallbackUrlHtml = `<a href="${safeUrl}" style="color:${ACCENT};text-decoration:underline;word-break:break-all;">${escapeHtml(input.verificationUrl)}</a>`

  return `<!doctype html>
<html lang="${locale}" dir="${dir}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(t.emailSubject)}</title>
  </head>
  <body style="margin:0;padding:0;background:${BG_PAGE};">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_PAGE};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:${BG};border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">

            ${headerHtml({ font, t })}

            <tr>
              <td dir="${dir}" style="padding:8px 32px 16px;">
                <div style="font-family:${font};font-size:16px;font-weight:600;color:${FG1};line-height:1.6;">
                  ${greeting}
                </div>
                <div style="height:8px;line-height:8px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                  ${escapeHtml(t.bodyIntro)}
                </div>
              </td>
            </tr>

            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <a href="${safeUrl}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${font};font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:9999px;">
                  ${escapeHtml(t.cta)}
                </a>
                <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:12.5px;color:${FG3};line-height:1.6;">
                  ${escapeHtml(t.fallbackLabel)}
                </div>
                <div style="height:4px;line-height:4px;font-size:0;">&nbsp;</div>
                <div style="font-family:${FONT_LATIN};font-size:12px;line-height:1.5;">
                  ${fallbackUrlHtml}
                </div>
              </td>
            </tr>

            <tr>
              <td dir="${dir}" style="padding:0 32px 16px;">
                <div style="background:${BG_TINT};border:1px solid ${BORDER};border-radius:10px;padding:14px 18px;">
                  <div style="font-family:${font};font-size:13px;color:${FG2};line-height:1.7;">
                    ${escapeHtml(t.expiryLine(minutesText))}
                  </div>
                  <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                  <div style="font-family:${font};font-size:13px;color:${FG3};line-height:1.7;">
                    ${escapeHtml(t.ignoreLine)}
                  </div>
                </div>
              </td>
            </tr>

            <tr>
              <td dir="${dir}" style="padding:0 32px 24px;">
                <div style="font-family:${font};font-size:14px;color:${FG2};line-height:1.7;">
                  ${escapeHtml(t.signoff)}
                </div>
              </td>
            </tr>

            ${footerHtml({ font, dir, t, supportEmail: input.supportEmail, recipientEmail: input.recipientEmail })}

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function headerHtml(args: { font: string; t: Strings }): string {
  const { font, t } = args
  return `
            <tr>
              <td style="height:6px;line-height:6px;font-size:0;background:${ACCENT};">&nbsp;</td>
            </tr>
            <tr>
              <td style="padding:28px 32px 16px;">
                <div style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${ACCENT};">
                  ${escapeHtml(t.eyebrow)}
                </div>
                <div style="height:6px;line-height:6px;font-size:0;">&nbsp;</div>
                <div style="font-family:${font};font-size:22px;font-weight:700;color:${FG1};line-height:1.25;">
                  ${escapeHtml(t.brandFull)}
                </div>
              </td>
            </tr>`
}

function footerHtml(args: {
  font: string
  dir: string
  t: Strings
  supportEmail: string
  recipientEmail: string
}): string {
  const { font, dir, t, supportEmail, recipientEmail } = args
  const year = new Date().getUTCFullYear()
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
                  ${escapeHtml(`${recipientEmail} · ${t.copyright(year).replace(/^©\s*/, '© ')}`)}
                </div>
              </td>
            </tr>`
}

/* ──────────────────────────────────────────────────────────────────────────
 * Plain-text fallback
 * ──────────────────────────────────────────────────────────────────────── */

function buildText(input: EmailVerificationInput): string {
  const t = L[input.locale]
  const trimmedName =
    input.recipientName && input.recipientName.trim().length > 0
      ? input.recipientName.trim()
      : null
  const minutes = Math.max(1, Math.floor(input.expiresInMinutes ?? 60))
  const lines: string[] = []
  lines.push(t.brandFull)
  lines.push(t.eyebrow)
  lines.push('')
  lines.push(trimmedName ? t.greetingNamed(trimmedName) : t.greetingFallback)
  lines.push(t.bodyIntro)
  lines.push('')
  lines.push(`${t.cta}: ${input.verificationUrl}`)
  lines.push('')
  lines.push(t.expiryLine(String(minutes)))
  lines.push(t.ignoreLine)
  lines.push('')
  lines.push(t.signoff)
  lines.push('')
  lines.push(t.supportLine(input.supportEmail))
  lines.push(t.copyright(new Date().getUTCFullYear()))
  return lines.join('\n')
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function encodeAttr(s: string): string {
  return escapeHtml(s)
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)) + '…'
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
