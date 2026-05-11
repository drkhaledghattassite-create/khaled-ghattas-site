/**
 * Gift claimed — sender confirmation. Sent to the SENDER (USER_PURCHASE only)
 * once the recipient successfully claims. Brief, warm. Closes the loop on
 * the gift purchase from the sender's side.
 */

import {
  FONT_AR,
  FONT_LATIN,
  PALETTE,
  itemTitle,
  type GiftDisplayItem,
  type GiftEmailLocale,
} from './gift-shared'

export type GiftClaimedSenderEmailInput = {
  locale: GiftEmailLocale
  senderEmail: string
  senderName: string | null
  recipientEmail: string
  item: GiftDisplayItem
  dashboardUrl: string
  supportEmail: string
}

type Strings = {
  brand: string
  subject: (recipient: string) => string
  receiptLabel: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  intro: (recipient: string) => string
  cta: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
}

const L: Record<GiftEmailLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subject: (recipient) => `${recipient} استلم هديتك`,
    receiptLabel: 'تم استلام الهدية',
    greetingNamed: (name) => `أهلاً ${name}`,
    greetingFallback: 'أهلاً',
    intro: (recipient) =>
      `لقد استلم ${recipient} الهدية بنجاح. شكراً لكرمك.`,
    cta: 'عرض الهدايا في حسابي',
    supportLine: (email) =>
      `للاستفسار، تواصل معنا على <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subject: (recipient) => `${recipient} claimed your gift`,
    receiptLabel: 'Gift claimed',
    greetingNamed: (name) => `Hi ${name}`,
    greetingFallback: 'Hello',
    intro: (recipient) =>
      `${recipient} has claimed your gift. Thank you for your generosity.`,
    cta: 'View gifts in my account',
    supportLine: (email) =>
      `For any questions, write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
  },
}

export function buildGiftClaimedSenderSubject(
  locale: GiftEmailLocale,
  recipientEmail: string,
): string {
  return L[locale].subject(recipientEmail)
}

export function buildGiftClaimedSenderHtml(
  input: GiftClaimedSenderEmailInput,
): string {
  const { locale, senderEmail, senderName, recipientEmail, item, dashboardUrl, supportEmail } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'en'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]
  const title = itemTitle(item, locale)
  const greeting = senderName ? t.greetingNamed(senderName) : t.greetingFallback
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.subject(recipientEmail)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:0 8px 20px 8px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;color:${PALETTE.fg1};">${t.brand}</div>
    </div>
    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:36px 32px;">
      <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.accent};margin-bottom:12px;">${t.receiptLabel}</div>
      <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;font-weight:700;color:${PALETTE.fg1};">${greeting}</h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:${PALETTE.fg2};">${t.intro(recipientEmail)}</p>
      <div style="background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
        <div style="font-size:16px;font-weight:700;color:${PALETTE.fg1};line-height:1.3;">${title}</div>
      </div>
      <div style="text-align:center;">
        <a href="${dashboardUrl}" style="display:inline-block;background:${PALETTE.fg1};color:${PALETTE.bg};padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">${t.cta}</a>
      </div>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${PALETTE.fg2};">${t.supportLine(supportEmail)}</p>
      <p style="margin:0 0 4px 0;font-size:12px;color:${PALETTE.fg3};">${t.copyright}</p>
      <p style="margin:0;font-size:11px;color:${PALETTE.fg3};">${t.sentTo(senderEmail)}</p>
    </div>
  </div>
</body>
</html>`
}

export function buildGiftClaimedSenderText(
  input: GiftClaimedSenderEmailInput,
): string {
  const { locale, senderEmail, senderName, recipientEmail, item, dashboardUrl, supportEmail } = input
  const t = L[locale]
  const title = itemTitle(item, locale)
  const greeting = senderName ? t.greetingNamed(senderName) : t.greetingFallback
  return [
    t.receiptLabel,
    '',
    greeting,
    '',
    t.intro(recipientEmail),
    '',
    `  ${title}`,
    '',
    `${t.cta}: ${dashboardUrl}`,
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(senderEmail),
  ].join('\n')
}
