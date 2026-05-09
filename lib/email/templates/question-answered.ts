/**
 * Phase B2 — "Your question has been answered" notification.
 *
 * Sent when admin transitions a PENDING question to ANSWERED with a URL as
 * the answer reference. If the reference is a free-text note (not a URL),
 * the action layer skips the email entirely — there's no link to deliver.
 *
 * Locale-switched (Arabic OR English, not bilingual). Mirrors the structure
 * of post-purchase.ts:
 *   1. Header  — Sienna accent bar + brand + eyebrow
 *   2. Greeting + context line
 *   3. Question subject + answer CTA + plain-text fallback URL
 *   4. Footer — accent rule, signoff, copyright, sent-to
 *
 * Why hex literals here when Qalem v2 normally forbids them: email clients
 * (Outlook desktop, Gmail mobile, Apple Mail) don't support CSS custom
 * properties. Same exception documented in post-purchase.ts.
 *
 * Why string-map instead of next-intl: emails render outside the normal
 * request-locale context. A small inline `L[locale][key]` map keeps the
 * template self-contained and matches the existing pattern.
 */

export type QuestionAnsweredLocale = 'ar' | 'en'

export type QuestionAnsweredEmailInput = {
  locale: QuestionAnsweredLocale
  /** Asker's display name. Falls back to a generic greeting when null/empty. */
  recipientName: string | null
  /** The original subject line — shown in the body so the asker remembers
   *  which question was answered (they may have submitted several). */
  questionSubject: string
  /** Public URL to Dr. Khaled's answer (Instagram reel, story, YouTube,
   *  article). The action layer guarantees this is an http(s) URL — the
   *  template doesn't re-validate. */
  answerUrl: string
  /** Public support inbox shown in the footer. */
  supportEmail: string
}

export type BuiltEmail = {
  subject: string
  html: string
  text: string
}

/* ──────────────────────────────────────────────────────────────────────────
 * Palette — visually matches Qalem v2 light tokens. Email clients don't
 * support CSS custom properties so we resolve to hex literals here.
 * Same constants as post-purchase.ts to keep the brand consistent.
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

const MAX_SUBJECT_LEN = 120

/* ──────────────────────────────────────────────────────────────────────────
 * Strings
 * ──────────────────────────────────────────────────────────────────────── */

type Strings = {
  brandFull: string
  emailSubject: string
  eyebrow: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  bodyIntro: (subject: string) => string
  cta: string
  fallbackLabel: string
  signoff: string
  copyright: (year: number) => string
  sentTo: (email: string) => string
  supportLine: (email: string) => string
}

const L: Record<QuestionAnsweredLocale, Strings> = {
  ar: {
    brandFull: 'د. خالد غطاس',
    emailSubject: 'تمت الإجابة على سؤالك',
    eyebrow: 'إجابة على سؤالك',
    greetingNamed: (n) => `أهلاً ${n}،`,
    greetingFallback: 'أهلاً،',
    bodyIntro: (subject) =>
      `أجاب الدكتور خالد على سؤالك: «${subject}». الرابط أدناه يأخذك مباشرةً إلى الإجابة.`,
    cta: 'مشاهدة الإجابة',
    fallbackLabel: 'أو افتح هذا الرابط:',
    signoff: '— فريق د. خالد',
    copyright: (year) => `© ${toArabicNumerals(year)} د. خالد غطاس`,
    sentTo: (email) => `أُرسل هذا البريد إلى ${email}`,
    supportLine: (email) =>
      `إذا واجهت أي مشكلة، تواصل معنا على ${email}`,
  },
  en: {
    brandFull: 'Dr. Khaled Ghattass',
    emailSubject: 'Your question has been answered',
    eyebrow: 'A reply to your question',
    greetingNamed: (n) => `Hi ${n},`,
    greetingFallback: 'Hi,',
    bodyIntro: (subject) =>
      `Dr. Khaled has answered your question titled "${subject}". The link below takes you straight to the reply.`,
    cta: 'View the answer',
    fallbackLabel: 'Or open this link:',
    signoff: "— Dr. Khaled's team",
    copyright: (year) => `© ${year} Dr. Khaled Ghattass`,
    sentTo: (email) => `This email was sent to ${email}`,
    supportLine: (email) =>
      `If you have any issue, contact us at ${email}`,
  },
}

/* ──────────────────────────────────────────────────────────────────────────
 * Public builder
 * ──────────────────────────────────────────────────────────────────────── */

export function buildQuestionAnsweredEmail(
  input: QuestionAnsweredEmailInput,
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

function buildHtml(input: QuestionAnsweredEmailInput): string {
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

  const subjectShown = escapeHtml(truncate(input.questionSubject, MAX_SUBJECT_LEN))
  const intro = t.bodyIntro(subjectShown) // already escaped above
  const safeUrl = encodeAttr(input.answerUrl)
  // The fallback URL is rendered as plain text below the CTA so admins of
  // the asker's email client (Outlook 2010, etc.) that strip the button
  // styling still see something clickable. Long URLs wrap with overflow-wrap.
  const fallbackUrlHtml = `<a href="${safeUrl}" style="color:${ACCENT};text-decoration:underline;word-break:break-all;">${escapeHtml(input.answerUrl)}</a>`

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
                  ${intro}
                </div>
              </td>
            </tr>

            <tr>
              <td dir="${dir}" style="padding:8px 32px 24px;">
                <div style="background:${BG_TINT};border:1px solid ${BORDER};border-radius:10px;padding:18px;">
                  <div style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${ACCENT};">
                    ${escapeHtml(t.eyebrow)}
                  </div>
                  <div style="height:10px;line-height:10px;font-size:0;">&nbsp;</div>
                  <a href="${safeUrl}" style="display:inline-block;background:${ACCENT};color:${BG};font-family:${font};font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:9999px;">
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

            ${footerHtml({ font, dir, t, supportEmail: input.supportEmail })}

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
}): string {
  const { font, dir, t, supportEmail } = args
  const year = new Date().getUTCFullYear()
  const supportText = t.supportLine(supportEmail)
  const supportHtml = supportText.replace(
    supportEmail,
    `<a href="mailto:${encodeAttr(supportEmail)}" style="color:${ACCENT};text-decoration:underline;">${escapeHtml(supportEmail)}</a>`,
  )
  // We don't render a recipient line here because the email comes from a
  // private 1:1 channel; "sent to <email>" is implicit and would feel
  // bureaucratic in this short notification.
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
              </td>
            </tr>`
}

/* ──────────────────────────────────────────────────────────────────────────
 * Plain-text fallback
 * ──────────────────────────────────────────────────────────────────────── */

function buildText(input: QuestionAnsweredEmailInput): string {
  const t = L[input.locale]
  const trimmedName =
    input.recipientName && input.recipientName.trim().length > 0
      ? input.recipientName.trim()
      : null
  const lines: string[] = []
  lines.push(t.brandFull)
  lines.push(t.eyebrow)
  lines.push('')
  lines.push(trimmedName ? t.greetingNamed(trimmedName) : t.greetingFallback)
  lines.push(t.bodyIntro(input.questionSubject))
  lines.push('')
  lines.push(`${t.cta}: ${input.answerUrl}`)
  lines.push('')
  lines.push(t.signoff)
  lines.push('')
  lines.push(t.supportLine(input.supportEmail))
  lines.push(t.copyright(new Date().getUTCFullYear()))
  return lines.join('\n')
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers (kept inline so the template module is self-contained)
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
