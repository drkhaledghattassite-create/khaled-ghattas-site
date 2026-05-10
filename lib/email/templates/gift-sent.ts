/**
 * Gift sent confirmation — sent to the SENDER on USER_PURCHASE checkout
 * complete. Doubles as the sender's receipt + a backup of the claim link
 * (so if the recipient never receives the email, the sender can share the
 * link directly). Transactional tone.
 */

import {
  FONT_AR,
  FONT_LATIN,
  PALETTE,
  fmtAmount,
  fmtDate,
  itemTitle,
  itemTypeLabel,
  type GiftDisplayItem,
  type GiftEmailLocale,
} from './gift-shared'

export type GiftSentEmailInput = {
  locale: GiftEmailLocale
  senderEmail: string
  senderName: string | null
  recipientEmail: string
  item: GiftDisplayItem
  amountCents: number
  currency: string
  claimUrl: string
  dashboardUrl: string
  expiresAt: Date
  supportEmail: string
}

type Strings = {
  brand: string
  subjectPrefix: string
  receiptLabel: string
  greetingNamed: (name: string) => string
  greetingFallback: string
  intro: (recipient: string) => string
  detailsHeading: string
  amountLabel: string
  recipientLabel: string
  itemTypeLabel: string
  expiresOn: (d: string) => string
  backupHeading: string
  backupBody: string
  trackCta: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
}

const L: Record<GiftEmailLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subjectPrefix: 'تأكيد إرسال الهدية —',
    receiptLabel: 'تأكيد الهدية',
    greetingNamed: (name) => `أهلاً ${name}`,
    greetingFallback: 'أهلاً',
    intro: (recipient) =>
      `هديتك إلى ${recipient} في الطريق. سنُرسل إشعاراً عند استلامها.`,
    detailsHeading: 'تفاصيل الإرسال',
    amountLabel: 'المبلغ المدفوع',
    recipientLabel: 'المستلم',
    itemTypeLabel: 'النوع',
    expiresOn: (d) => `تنتهي صلاحية الهدية بتاريخ ${d}.`,
    backupHeading: 'احتفظ بهذا الرابط',
    backupBody:
      'إذا لم يصل البريد إلى المستلم، يمكنك مشاركة هذا الرابط معه مباشرة:',
    trackCta: 'تتبّع الهدية في حسابك',
    supportLine: (email) =>
      `للاستفسار، تواصل معنا على <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subjectPrefix: 'Your gift is on its way —',
    receiptLabel: 'Gift confirmation',
    greetingNamed: (name) => `Hi ${name}`,
    greetingFallback: 'Hello',
    intro: (recipient) =>
      `Your gift to ${recipient} is on its way. We'll let you know once it's been claimed.`,
    detailsHeading: 'Gift details',
    amountLabel: 'Amount paid',
    recipientLabel: 'Recipient',
    itemTypeLabel: 'Type',
    expiresOn: (d) => `The gift expires on ${d}.`,
    backupHeading: 'Keep this link',
    backupBody:
      "If your friend doesn't receive the email, you can share this link with them directly:",
    trackCta: 'Track this gift in your account',
    supportLine: (email) =>
      `For any questions, write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
  },
}

export function buildGiftSentSubject(locale: GiftEmailLocale, recipientEmail: string): string {
  return `${L[locale].subjectPrefix} ${recipientEmail}`
}

export function buildGiftSentHtml(input: GiftSentEmailInput): string {
  const { locale, senderEmail, senderName, recipientEmail, item, amountCents, currency, claimUrl, dashboardUrl, expiresAt, supportEmail } = input
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
<title>${t.subjectPrefix} ${title}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="height:4px;background:${PALETTE.accent};border-radius:2px;margin-bottom:24px;"></div>
    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:36px 32px;">
      <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.accent};margin-bottom:12px;">${t.receiptLabel}</div>
      <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;font-weight:700;color:${PALETTE.fg1};">${greeting}</h1>
      <p style="margin:0 0 24px 0;font-size:16px;color:${PALETTE.fg2};">${t.intro(recipientEmail)}</p>

      <div style="background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;padding:20px;margin-bottom:24px;">
        <div style="font-size:11.5px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.fg3};margin-bottom:12px;">${t.detailsHeading}</div>
        <div style="font-size:17px;font-weight:700;color:${PALETTE.fg1};margin-bottom:14px;line-height:1.3;">${title}</div>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.itemTypeLabel}</td><td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${itemTypeLabel(item.itemType, locale)}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.recipientLabel}</td><td style="padding:6px 0;font-size:14px;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${recipientEmail}</td></tr>
          <tr><td style="padding:6px 0;font-size:13px;color:${PALETTE.fg3};">${t.amountLabel}</td><td style="padding:6px 0;font-size:15px;font-weight:700;color:${PALETTE.fg1};text-align:${isRtl ? 'left' : 'right'};">${fmtAmount(amountCents, currency, locale)}</td></tr>
        </table>
      </div>

      <div style="margin-bottom:24px;padding:16px 20px;border:1px dashed ${PALETTE.border};border-radius:8px;background:${PALETTE.bgDeep};">
        <div style="font-size:11.5px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.fg2};margin-bottom:8px;">${t.backupHeading}</div>
        <p style="margin:0 0 8px 0;font-size:13px;color:${PALETTE.fg2};">${t.backupBody}</p>
        <a href="${claimUrl}" style="word-break:break-all;font-size:12px;color:${PALETTE.accent};text-decoration:underline;">${claimUrl}</a>
      </div>

      <div style="text-align:center;margin-bottom:8px;">
        <a href="${dashboardUrl}" style="display:inline-block;background:${PALETTE.fg1};color:${PALETTE.bg};padding:12px 24px;border-radius:9999px;font-size:14px;font-weight:600;text-decoration:none;">${t.trackCta}</a>
      </div>
      <p style="margin:16px 0 0 0;font-size:13px;color:${PALETTE.fg3};text-align:center;">${t.expiresOn(fmtDate(expiresAt, locale))}</p>
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

export function buildGiftSentText(input: GiftSentEmailInput): string {
  const { locale, senderEmail, senderName, recipientEmail, item, amountCents, currency, claimUrl, dashboardUrl, expiresAt, supportEmail } = input
  const t = L[locale]
  const title = itemTitle(item, locale)
  const greeting = senderName ? t.greetingNamed(senderName) : t.greetingFallback
  const lines = [
    t.receiptLabel,
    '',
    greeting,
    '',
    t.intro(recipientEmail),
    '',
    `${t.detailsHeading}:`,
    `  ${title}`,
    `  ${t.itemTypeLabel}: ${itemTypeLabel(item.itemType, locale)}`,
    `  ${t.recipientLabel}: ${recipientEmail}`,
    `  ${t.amountLabel}: ${fmtAmount(amountCents, currency, locale)}`,
    '',
    `${t.backupHeading}:`,
    `  ${t.backupBody}`,
    `  ${claimUrl}`,
    '',
    `${t.trackCta}: ${dashboardUrl}`,
    '',
    t.expiresOn(fmtDate(expiresAt, locale)),
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(senderEmail),
  ]
  return lines.join('\n')
}
