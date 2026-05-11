/**
 * Gift revoked / refunded email — sent to recipient (and optionally sender
 * for USER_PURCHASE) when a gift is revoked by admin OR refunded via
 * Stripe. Plain, professional tone — neither apologetic nor defensive.
 *
 * The same template handles both REVOKED and REFUNDED with conditional copy:
 *   - REVOKED: include the admin-supplied reason verbatim.
 *   - REFUNDED: lean on a generic "due to a payment issue, contact your
 *     sender for resolution" — no admin reason because the trigger was
 *     external (Stripe chargeback / payment failure).
 */

import {
  FONT_AR,
  FONT_LATIN,
  PALETTE,
  itemTitle,
  type GiftDisplayItem,
  type GiftEmailLocale,
} from './gift-shared'

export type GiftRevokedKind = 'REVOKED' | 'REFUNDED'

export type GiftRevokedEmailInput = {
  locale: GiftEmailLocale
  /** Either the recipient or the sender — same template, audience differs. */
  toEmail: string
  audience: 'recipient' | 'sender'
  kind: GiftRevokedKind
  item: GiftDisplayItem
  /** Required when kind === 'REVOKED'. Ignored otherwise. */
  reason: string | null
  supportEmail: string
}

type Strings = {
  brand: string
  subjectRevoked: string
  subjectRefunded: string
  receiptLabelRevoked: string
  receiptLabelRefunded: string
  headingRevokedRecipient: string
  headingRevokedSender: string
  headingRefundedRecipient: string
  headingRefundedSender: string
  introRevokedRecipient: string
  introRevokedSender: string
  introRefundedRecipient: string
  introRefundedSender: string
  reasonHeading: string
  supportLine: (email: string) => string
  copyright: string
  sentTo: (email: string) => string
}

const L: Record<GiftEmailLocale, Strings> = {
  ar: {
    brand: 'د. خالد غطاس',
    subjectRevoked: 'تم إلغاء الوصول إلى الهدية',
    subjectRefunded: 'تم استرداد الهدية',
    receiptLabelRevoked: 'إلغاء الوصول',
    receiptLabelRefunded: 'استرداد الدفعة',
    headingRevokedRecipient: 'تم إلغاء الوصول إلى هديتك',
    headingRevokedSender: 'تم إلغاء الهدية التي أرسلتها',
    headingRefundedRecipient: 'تم استرداد الدفعة',
    headingRefundedSender: 'تم استرداد دفعتك',
    introRevokedRecipient:
      'تم إلغاء الوصول إلى الهدية. إذا كنت تحتاج إلى أي توضيح، تواصل معنا.',
    introRevokedSender:
      'تم إلغاء الهدية التي أرسلتها. لمعرفة المزيد، يمكنك التواصل معنا.',
    introRefundedRecipient:
      'تم استرداد دفعة الهدية بسبب مشكلة في الدفع. للاستفسار، تواصل مع المُرسِل.',
    introRefundedSender:
      'تم استرداد دفعتك. إذا كانت لديك أي أسئلة، تواصل معنا مباشرة.',
    reasonHeading: 'السبب',
    supportLine: (email) =>
      `للاستفسار، تواصل معنا على <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© د. خالد غطاس — جميع الحقوق محفوظة',
    sentTo: (email) => `أُرسلت هذه الرسالة إلى ${email}.`,
  },
  en: {
    brand: 'Dr. Khaled Ghattass',
    subjectRevoked: 'Gift access removed',
    subjectRefunded: 'Gift refunded',
    receiptLabelRevoked: 'Access removed',
    receiptLabelRefunded: 'Refund processed',
    headingRevokedRecipient: 'Access to your gift has been removed',
    headingRevokedSender: 'The gift you sent has been revoked',
    headingRefundedRecipient: 'Refund processed',
    headingRefundedSender: 'Your refund has been processed',
    introRevokedRecipient:
      'Access to this gift has been removed. If you need clarification, please reach out.',
    introRevokedSender:
      'The gift you sent has been revoked. Reach out if you\'d like more context.',
    introRefundedRecipient:
      'The payment for this gift was refunded due to a payment issue. For more information, please contact your sender.',
    introRefundedSender:
      'Your payment has been refunded. If you have any questions, please reach out directly.',
    reasonHeading: 'Reason',
    supportLine: (email) =>
      `For any questions, write to <a href="mailto:${email}" style="color:${PALETTE.accent};text-decoration:none">${email}</a>.`,
    copyright: '© Dr. Khaled Ghattass — All rights reserved',
    sentTo: (email) => `This email was sent to ${email}.`,
  },
}

export function buildGiftRevokedSubject(
  locale: GiftEmailLocale,
  kind: GiftRevokedKind,
): string {
  const t = L[locale]
  return kind === 'REVOKED' ? t.subjectRevoked : t.subjectRefunded
}

function pickHeading(t: Strings, kind: GiftRevokedKind, audience: 'recipient' | 'sender'): string {
  if (kind === 'REVOKED') {
    return audience === 'recipient' ? t.headingRevokedRecipient : t.headingRevokedSender
  }
  return audience === 'recipient' ? t.headingRefundedRecipient : t.headingRefundedSender
}

function pickIntro(t: Strings, kind: GiftRevokedKind, audience: 'recipient' | 'sender'): string {
  if (kind === 'REVOKED') {
    return audience === 'recipient' ? t.introRevokedRecipient : t.introRevokedSender
  }
  return audience === 'recipient' ? t.introRefundedRecipient : t.introRefundedSender
}

export function buildGiftRevokedHtml(input: GiftRevokedEmailInput): string {
  const { locale, toEmail, audience, kind, item, reason, supportEmail } = input
  const isRtl = locale === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'
  const lang = isRtl ? 'ar' : 'en'
  const font = isRtl ? FONT_AR : FONT_LATIN
  const t = L[locale]
  const title = itemTitle(item, locale)
  const heading = pickHeading(t, kind, audience)
  const intro = pickIntro(t, kind, audience)
  const showReason = kind === 'REVOKED' && reason && reason.trim().length > 0
  return `<!doctype html>
<html lang="${lang}" dir="${dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${kind === 'REVOKED' ? t.subjectRevoked : t.subjectRefunded}</title>
</head>
<body style="margin:0;padding:0;background:${PALETTE.bgDeep};font-family:${font};color:${PALETTE.fg1};line-height:1.6;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;padding:0 8px 20px 8px;">
      <div style="font-size:13px;font-weight:700;letter-spacing:0.04em;color:${PALETTE.fg1};">${t.brand}</div>
    </div>
    <div style="background:${PALETTE.bgElevated};border:1px solid ${PALETTE.border};border-radius:12px;padding:36px 32px;">
      <div style="font-size:13px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.fg2};margin-bottom:12px;">${kind === 'REVOKED' ? t.receiptLabelRevoked : t.receiptLabelRefunded}</div>
      <h1 style="margin:0 0 8px 0;font-size:22px;line-height:1.3;font-weight:700;color:${PALETTE.fg1};">${heading}</h1>
      <p style="margin:0 0 20px 0;font-size:16px;color:${PALETTE.fg2};">${intro}</p>
      <div style="background:${PALETTE.bg};border:1px solid ${PALETTE.border};border-radius:8px;padding:16px 20px;margin-bottom:20px;">
        <div style="font-size:16px;font-weight:700;color:${PALETTE.fg1};line-height:1.3;">${title}</div>
      </div>
      ${showReason ? `<div style="background:${PALETTE.bgDeep};border-${isRtl ? 'right' : 'left'}:3px solid ${PALETTE.fg3};padding:14px 18px;margin-bottom:8px;border-radius:6px;">
        <div style="font-size:11.5px;font-weight:600;letter-spacing:${isRtl ? '0' : '0.12em'};text-transform:${isRtl ? 'none' : 'uppercase'};color:${PALETTE.fg3};margin-bottom:6px;">${t.reasonHeading}</div>
        <p style="margin:0;font-size:14px;color:${PALETTE.fg2};line-height:1.55;">${escapeHtml(reason!)}</p>
      </div>` : ''}
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0 0 8px 0;font-size:13px;color:${PALETTE.fg2};">${t.supportLine(supportEmail)}</p>
      <p style="margin:0 0 4px 0;font-size:12px;color:${PALETTE.fg3};">${t.copyright}</p>
      <p style="margin:0;font-size:11px;color:${PALETTE.fg3};">${t.sentTo(toEmail)}</p>
    </div>
  </div>
</body>
</html>`
}

export function buildGiftRevokedText(input: GiftRevokedEmailInput): string {
  const { locale, toEmail, audience, kind, item, reason, supportEmail } = input
  const t = L[locale]
  const title = itemTitle(item, locale)
  const heading = pickHeading(t, kind, audience)
  const intro = pickIntro(t, kind, audience)
  const showReason = kind === 'REVOKED' && reason && reason.trim().length > 0
  const lines = [
    kind === 'REVOKED' ? t.receiptLabelRevoked : t.receiptLabelRefunded,
    '',
    heading,
    '',
    intro,
    '',
    `  ${title}`,
    showReason ? '' : null,
    showReason ? `${t.reasonHeading}:` : null,
    showReason ? `  ${reason}` : null,
    '',
    `${supportEmail}`,
    t.copyright,
    t.sentTo(toEmail),
  ]
  return lines.filter((l) => l != null).join('\n')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
