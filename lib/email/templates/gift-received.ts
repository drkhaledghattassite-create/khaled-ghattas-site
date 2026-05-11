/**
 * Gift received email — sent to the recipient when a USER_PURCHASE gift is
 * created (after successful Stripe webhook). Editorial tone, mirrors the
 * cinematic claim page.
 *
 * Locale-switched (AR or EN, not bilingual). The recipient picks the locale
 * by way of the sender's choice on the gift form.
 */

import {
  FONT_AR,
  FONT_LATIN,
  PALETTE,
  clampMessage,
  fmtDate,
  itemTitle,
  itemTypeLabel,
  type GiftDisplayItem,
  type GiftEmailLocale,
} from './gift-shared'

export type GiftReceivedEmailInput = {
  locale: GiftEmailLocale
  recipientEmail: string
  /**
   * Display name of the sender. For ADMIN_GRANT this is "Dr. Khaled
   * Ghattass team" / "فريق د. خالد غطاس" — set by the caller, not derived.
   */
  senderDisplayName: string
  item: GiftDisplayItem
  senderMessage: string | null
  claimUrl: string
  expiresAt: Date
  supportEmail: string
}

type Strings = {
  brand: string
  subject: (sender: string) => string
  eyebrow: string
  greeting: (sender: string) => string
  intro: string
  fromLabel: (sender: string) => string
  expiresOn: (d: string) => string
  claimCta: string
  ifNotExpected: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
  messageHeading: string
}

const L: Record<GiftEmailLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subject: (sender) => `${sender} أرسل لك هدية`,
    eyebrow: 'هدية لك',
    greeting: (sender) => `${sender} أرسل لك هدية`,
    intro:
      'لقد استلمت هدية عبر موقع د. خالد غطاس. اضغط الزر أدناه لاستلامها.',
    fromLabel: (sender) => `من ${sender}`,
    expiresOn: (d) => `تنتهي صلاحية هذه الهدية بتاريخ ${d}.`,
    claimCta: 'استلم هديتك',
    ifNotExpected: 'إذا لم تكن تتوقع هذه الرسالة، يمكنك تجاهلها بأمان.',
    supportLine: (email) =>
      `للاستفسار، تواصل معنا على <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
    messageHeading: 'رسالة من المُرسِل',
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subject: (sender) => `${sender} sent you a gift`,
    eyebrow: 'A gift for you',
    greeting: (sender) => `${sender} sent you a gift`,
    intro:
      "You've received a gift through Dr. Khaled Ghattass's website. Press the button below to claim it.",
    fromLabel: (sender) => `From ${sender}`,
    expiresOn: (d) => `This gift expires on ${d}.`,
    claimCta: 'Claim your gift',
    ifNotExpected:
      "If you weren't expecting this gift, you can safely ignore this email.",
    supportLine: (email) =>
      `For any questions, write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
    messageHeading: 'A message from your sender',
  },
}

export function buildGiftReceivedSubject(
  locale: GiftEmailLocale,
  senderDisplayName: string,
): string {
  return L[locale].subject(senderDisplayName)
}

export function buildGiftReceivedHtml(input: GiftReceivedEmailInput): string {
  const {
    locale,
    recipientEmail,
    senderDisplayName,
    item,
    claimUrl,
    expiresAt,
    supportEmail,
  } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'en'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]
  const title = itemTitle(item, locale)
  const message = clampMessage(input.senderMessage)
  const cover =
    item.coverImageUrl && /^https?:\/\//.test(item.coverImageUrl)
      ? item.coverImageUrl
      : null
  const eyebrowSpacing = isRtl ? '0' : '0.12em'
  const eyebrowCase = isRtl ? 'none' : 'uppercase'

  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t.subject(senderDisplayName)}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;padding:0 8px 20px 8px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;color:${PALETTE.fg1};">${t.brand}</div>
    </div>

    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:40px 32px;">

      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;font-size:12px;font-weight:600;letter-spacing:${eyebrowSpacing};text-transform:${eyebrowCase};color:${PALETTE.accent};margin-bottom:14px;">${t.eyebrow}</div>
        <h1 style="margin:0 0 12px 0;font-size:28px;line-height:1.2;font-weight:700;color:${PALETTE.fg1};">${t.greeting(senderDisplayName)}</h1>
        <p style="margin:0;font-size:15px;color:${PALETTE.fg2};line-height:1.55;max-width:420px;margin-${isRtl ? 'right' : 'left'}:auto;margin-${isRtl ? 'left' : 'right'}:auto;">${t.intro}</p>
      </div>

      <div style="text-align:center;padding:12px 0 28px 0;border-top:1px solid ${PALETTE.border};">
        ${cover ? `<div style="text-align:center;margin:24px 0 16px 0;"><img src="${cover}" alt="" style="max-width:160px;width:100%;border-radius:8px;border:1px solid ${PALETTE.border};display:block;margin:0 auto;" /></div>` : `<div style="height:24px;"></div>`}
        <div style="font-size:12px;font-weight:600;letter-spacing:${eyebrowSpacing};text-transform:${eyebrowCase};color:${PALETTE.fg3};margin-bottom:8px;">${itemTypeLabel(item.itemType, locale)}</div>
        <div style="font-size:22px;font-weight:700;color:${PALETTE.fg1};line-height:1.3;">${title}</div>
      </div>

      ${message ? `<div style="background:${PALETTE.bgDeep};border:1px solid ${PALETTE.border};border-radius:10px;padding:22px 24px;margin:0 0 28px 0;">
        <div style="font-size:11.5px;font-weight:600;letter-spacing:${eyebrowSpacing};text-transform:${eyebrowCase};color:${PALETTE.accent};margin-bottom:10px;text-align:center;">${t.messageHeading}</div>
        <p style="margin:0;font-size:15px;color:${PALETTE.fg1};font-style:${isRtl ? 'normal' : 'italic'};line-height:1.75;text-align:center;white-space:pre-wrap;">${escapeHtml(message)}</p>
        <div style="margin-top:14px;text-align:center;font-size:13px;color:${PALETTE.fg3};">— ${senderDisplayName}</div>
      </div>` : ''}

      <div style="text-align:center;margin-bottom:20px;">
        <a href="${claimUrl}" style="display:inline-block;background:${PALETTE.accent};color:${PALETTE.accentFg};padding:14px 32px;border-radius:9999px;font-size:15px;font-weight:600;text-decoration:none;">${t.claimCta}</a>
      </div>

      <p style="margin:0 0 6px 0;font-size:13px;color:${PALETTE.fg3};text-align:center;">${t.expiresOn(fmtDate(expiresAt, locale))}</p>
      <p style="margin:0;font-size:12px;color:${PALETTE.fg3};text-align:center;">${t.ifNotExpected}</p>
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

export function buildGiftReceivedText(input: GiftReceivedEmailInput): string {
  const {
    locale,
    recipientEmail,
    senderDisplayName,
    item,
    claimUrl,
    expiresAt,
    supportEmail,
  } = input
  const t = L[locale]
  const title = itemTitle(item, locale)
  const message = clampMessage(input.senderMessage)
  const lines: (string | null)[] = [
    t.brand,
    '',
    t.eyebrow,
    '',
    t.greeting(senderDisplayName),
    '',
    t.intro,
    '',
    `${itemTypeLabel(item.itemType, locale)}: ${title}`,
    '',
    message ? `${t.messageHeading}:` : null,
    message ? `  ${message}` : null,
    message ? `  — ${senderDisplayName}` : null,
    message ? '' : null,
    `${t.claimCta}: ${claimUrl}`,
    '',
    t.expiresOn(fmtDate(expiresAt, locale)),
    t.ifNotExpected,
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(recipientEmail),
  ]
  return lines.filter((l): l is string => l != null).join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
