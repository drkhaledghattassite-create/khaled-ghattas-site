/**
 * Corporate-program request — internal notification email.
 *
 * Sent to the team inbox (default Team@drkhaledghattass.com, override via
 * `CORPORATE_INBOX_EMAIL`) every time a public form submission lands. Best-
 * effort: the API route swallows send failures so the user never sees a
 * 500 just because Resend is unconfigured.
 */

import type { CorporateProgram } from '@/lib/db/schema'
import { sendEmail, type SendEmailResult } from '../send'

export type CorporateRequestEmailInput = {
  name: string
  email: string
  organization: string
  position?: string | null
  phone?: string | null
  program?: CorporateProgram | null
  preferredDate?: string | null
  attendeeCount?: number | null
  message?: string | null
}

const DEFAULT_INBOX = 'Team@drkhaledghattass.com'

function escape(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function row(label: string, value: string | null | undefined) {
  if (!value) return ''
  return `<tr><td style="padding:6px 0;color:#737373;width:160px;font-family:Inter,sans-serif;font-size:13px;">${escape(
    label,
  )}</td><td style="padding:6px 0;color:#0a0a0a;font-family:Inter,sans-serif;font-size:14px;font-weight:600;">${escape(
    value,
  )}</td></tr>`
}

function buildHtml(input: CorporateRequestEmailInput): string {
  const programTitle = input.program
    ? `${input.program.titleEn}${
        input.program.titleAr ? ` — ${input.program.titleAr}` : ''
      }`
    : 'Not specified'
  const messageBlock = input.message
    ? `<div style="margin-top:24px;padding:16px;border:1px solid #e5e5e5;border-radius:8px;background:#fafafa;font-family:Inter,sans-serif;font-size:14px;line-height:1.7;color:#404040;white-space:pre-wrap;">${escape(
        input.message,
      )}</div>`
    : ''

  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#f4f4f4;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;">
      <tr>
        <td style="padding:28px 32px;border-bottom:1px solid #e5e5e5;">
          <p style="margin:0;color:#b85440;font-family:Inter,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;">Corporate request</p>
          <h1 style="margin:6px 0 0;font-family:Inter,sans-serif;font-size:20px;font-weight:700;color:#0a0a0a;">New request from ${escape(input.organization)}</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            ${row('Contact', input.name)}
            ${row('Email', input.email)}
            ${row('Phone', input.phone)}
            ${row('Position', input.position)}
            ${row('Organization', input.organization)}
            ${row('Program', programTitle)}
            ${row('Preferred date', input.preferredDate)}
            ${row('Attendees', input.attendeeCount ? String(input.attendeeCount) : null)}
          </table>
          ${messageBlock}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 28px;border-top:1px solid #e5e5e5;color:#737373;font-family:Inter,sans-serif;font-size:12px;">
          Reply directly to this email to reach <a href="mailto:${escape(input.email)}" style="color:#b85440;">${escape(input.email)}</a> — or open the request in the admin panel.
        </td>
      </tr>
    </table>
  </body>
</html>`
}

export async function sendCorporateRequestEmail(
  input: CorporateRequestEmailInput,
): Promise<SendEmailResult> {
  const to = process.env.CORPORATE_INBOX_EMAIL ?? DEFAULT_INBOX
  return sendEmail({
    to,
    subject: `New corporate request — ${input.organization}`,
    html: buildHtml(input),
    // Resend supports reply_to via the `replyTo` field, but our shared
    // wrapper only exposes the basics — use `from` to set a friendly name
    // and let the user reply via the address listed in the body.
  })
}
