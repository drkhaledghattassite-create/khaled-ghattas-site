/**
 * Gift claimed — recipient confirmation. Sent immediately after a successful
 * claim. Brief, warm, action-oriented: a "your gift is ready" message with a
 * link straight into the entitlement (library / bookings).
 */

import {
  FONT_AR,
  FONT_LATIN,
  PALETTE,
  itemTitle,
  type GiftDisplayItem,
  type GiftEmailLocale,
} from './gift-shared'

export type GiftClaimedRecipientEmailInput = {
  locale: GiftEmailLocale
  recipientEmail: string
  item: GiftDisplayItem
  /** Where the recipient should land — /dashboard/library or /dashboard/bookings. */
  itemUrl: string
  supportEmail: string
}

type Strings = {
  brand: string
  subject: string
  receiptLabel: string
  heading: string
  intro: string
  cta: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
}

const L: Record<GiftEmailLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subject: 'هديتك جاهزة',
    receiptLabel: 'تم استلام الهدية',
    heading: 'هديتك جاهزة',
    intro: 'تم استلام الهدية بنجاح. يمكنك فتحها في أي وقت من حسابك.',
    cta: 'افتح هديتك',
    supportLine: (email) =>
      `للاستفسار، تواصل معنا على <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subject: 'Your gift is ready',
    receiptLabel: 'Gift claimed',
    heading: 'Your gift is ready',
    intro: 'Your gift has been added to your account. Open it any time.',
    cta: 'Open your gift',
    supportLine: (email) =>
      `For any questions, write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
  },
}

export function buildGiftClaimedRecipientSubject(
  locale: GiftEmailLocale,
): string {
  return L[locale].subject
}

export function buildGiftClaimedRecipientHtml(
  input: GiftClaimedRecipientEmailInput,
): string {
  const { locale, recipientEmail, item, itemUrl, supportEmail } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'en'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]
  const title = itemTitle(item, locale)
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.subject}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="height:4px;background:${PALETTE.accent};border-radius:2px;margin-bottom:24px;"></div>
    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:36px 32px;">
      <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.accent};margin-bottom:12px;">${t.receiptLabel}</div>
      <h1 style="margin:0 0 8px 0;font-size:24px;line-height:1.3;font-weight:700;color:${PALETTE.fg1};">${t.heading}</h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:${PALETTE.fg2};">${t.intro}</p>
      <div style="background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;padding:18px 20px;margin-bottom:24px;">
        <div style="font-size:17px;font-weight:700;color:${PALETTE.fg1};line-height:1.3;">${title}</div>
      </div>
      <div style="text-align:center;">
        <a href="${itemUrl}" style="display:inline-block;background:${PALETTE.accent};color:${PALETTE.accentFg};padding:14px 32px;border-radius:9999px;font-size:15px;font-weight:600;text-decoration:none;">${t.cta}</a>
      </div>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${PALETTE.fg2};">${t.supportLine(supportEmail)}</p>
      <p style="margin:0 0 4px 0;font-size:12px;color:${PALETTE.fg3};">${t.copyright}</p>
      <p style="margin:0;font-size:11px;color:${PALETTE.fg3};">${t.sentTo(recipientEmail)}</p>
    </div>
  </div>
</body>
</html>`
}

export function buildGiftClaimedRecipientText(
  input: GiftClaimedRecipientEmailInput,
): string {
  const { locale, recipientEmail, item, itemUrl, supportEmail } = input
  const t = L[locale]
  const title = itemTitle(item, locale)
  return [
    t.receiptLabel,
    '',
    t.heading,
    '',
    t.intro,
    '',
    `  ${title}`,
    '',
    `${t.cta}: ${itemUrl}`,
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(recipientEmail),
  ].join('\n')
}
