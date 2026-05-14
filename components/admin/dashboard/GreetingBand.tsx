import { getTranslations } from 'next-intl/server'
import {
  pickGreetingSignal,
  type GreetingSignalInputs,
} from './greeting-signal'

// Time-of-day greeting + a single notable signal. Renders on the server
// so the hour read happens once per request rather than per-tab.
//
// IMPORTANT: the hour is resolved in Asia/Beirut (Dr. Khaled's timezone),
// not the server's UTC clock. A UTC-based "good morning" cutoff fires at
// 3am Beirut time, which breaks the band's whole premise as the first
// thing the operator sees in the morning.

type Signal =
  | { kind: 'questions'; count: number }
  | { kind: 'corporate'; count: number }
  | { kind: 'gifts'; count: number }
  | { kind: 'revenue_up'; deltaPercent: number }
  | { kind: 'revenue_down'; deltaPercent: number }
  | { kind: 'booking_interest'; count: number }
  | { kind: 'all_clear' }

/**
 * Wraps the pure pickGreetingSignal with the count/delta payload the
 * component needs for its rendered copy. Priority logic itself lives in
 * `./greeting-signal` so it can be smoke-tested in isolation without a
 * next-intl runtime.
 */
function pickSignal(c: GreetingSignalInputs): Signal {
  const kind = pickGreetingSignal(c)
  switch (kind) {
    case 'questions':
      return { kind, count: c.pendingQuestions }
    case 'corporate':
      return { kind, count: c.newCorporateRequests }
    case 'gifts':
      return { kind, count: c.expiringGifts }
    case 'revenue_up':
    case 'revenue_down':
      // pickGreetingSignal already filtered non-null, but TS can't track that
      // across the boundary. The fallback is unreachable in practice.
      return { kind, deltaPercent: c.revenueDeltaPercent ?? 0 }
    case 'booking_interest':
      return { kind, count: c.pendingBookingInterest }
    case 'all_clear':
      return { kind }
  }
}

/**
 * Beirut-local hour in 24h form (0–23). Avoids the UTC-skew bug where
 * the server clock disagrees with the operator by ~3 hours.
 */
function beirutHour(): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Beirut',
    hour: 'numeric',
    hour12: false,
  })
    .formatToParts(new Date())
    .find((p) => p.type === 'hour')
  return parts ? Number(parts.value) : new Date().getUTCHours()
}

function timeOfDayKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

export async function GreetingBand({
  locale,
  userName,
  viewerRole,
  counts,
}: {
  locale: string
  userName: string | null
  /**
   * Drives the honorific. CLIENT (Dr. Khaled) always gets "Dr. " / "د. "
   * prepended. ADMIN (developer) does not. Null/undefined viewer is treated
   * like CLIENT — the band's whole framing is editorial, and a nameless
   * viewer almost certainly means the fallback ("Khaled") is rendering,
   * which should keep the title.
   */
  viewerRole: 'USER' | 'ADMIN' | 'CLIENT' | null
  counts: GreetingSignalInputs
}) {
  const t = await getTranslations({ locale, namespace: 'admin.dashboard.greeting' })
  const hour = beirutHour()
  const todKey = timeOfDayKey(hour)

  const greetingKey = `greet_${todKey}` as const
  const altKey = `greet_${todKey}_alt` as const
  const trimmedName = userName?.trim() ?? ''
  const baseName = trimmedName || t('fallback_name')
  // Honorific applies to CLIENT (the owner) and to the nameless fallback
  // case (which surfaces "Khaled" / "خالد" and should read editorially).
  // ADMIN viewers with a real name get the bare name.
  const shouldUseHonorific = viewerRole !== 'ADMIN' || trimmedName === ''
  const name = shouldUseHonorific ? `${t('honorific')}${baseName}` : baseName

  const signal = pickSignal(counts)

  const dateText = new Intl.DateTimeFormat(
    locale === 'ar' ? 'ar-EG' : 'en-US',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Beirut',
    },
  ).format(new Date())

  let summaryHtml: { strong: string; rest: string }
  let calm = false
  switch (signal.kind) {
    case 'questions':
      summaryHtml = {
        strong: t('signal_questions_strong', { count: signal.count }),
        rest: t('signal_questions_rest'),
      }
      break
    case 'corporate':
      summaryHtml = {
        strong: t('signal_corporate_strong', { count: signal.count }),
        rest: t('signal_corporate_rest'),
      }
      break
    case 'gifts':
      summaryHtml = {
        strong: t('signal_gifts_strong', { count: signal.count }),
        rest: t('signal_gifts_rest'),
      }
      break
    case 'revenue_up':
      summaryHtml = {
        strong: t('signal_revenue_up_strong', { percent: signal.deltaPercent }),
        rest: t('signal_revenue_up_rest'),
      }
      break
    case 'revenue_down':
      summaryHtml = {
        strong: t('signal_revenue_down_strong', {
          percent: Math.abs(signal.deltaPercent),
        }),
        rest: t('signal_revenue_down_rest'),
      }
      break
    case 'booking_interest':
      summaryHtml = {
        strong: t('signal_booking_strong', { count: signal.count }),
        rest: t('signal_booking_rest'),
      }
      break
    case 'all_clear':
    default:
      summaryHtml = {
        strong: t('signal_all_clear_strong'),
        rest: t('signal_all_clear_rest'),
      }
      calm = true
      break
  }

  return (
    <header className="border-b border-border pb-8 pt-2">
      <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-fg3 rtl:tracking-normal rtl:normal-case">
        {t('eyebrow')}
      </p>
      <h1 className="font-display text-fg1 font-bold leading-[1.05] tracking-[-0.02em] text-[clamp(28px,5vw,40px)] rtl:tracking-normal rtl:text-[clamp(30px,5vw,44px)] rtl:font-arabic-display">
        {t(greetingKey, { name })}
      </h1>
      <p className="mt-3 font-display text-[clamp(16px,2.2vw,22px)] font-medium tracking-[-0.005em] text-fg3 rtl:font-arabic rtl:tracking-normal">
        {t(altKey, { name })}
      </p>
      <p
        className={`mt-5 flex max-w-[720px] items-stretch gap-3 text-[16px] leading-[1.6] text-fg2 ${
          calm ? '' : ''
        }`}
      >
        <span
          aria-hidden
          className={`block w-[3px] flex-none self-stretch rounded-[2px] ${
            calm ? 'bg-border-strong' : 'bg-accent'
          }`}
        />
        <span>
          <strong className="font-semibold text-fg1">{summaryHtml.strong}</strong>{' '}
          {summaryHtml.rest}
        </span>
      </p>
      <p className="mt-4 text-[13px] tabular-nums text-fg3 num-latn">{dateText}</p>
    </header>
  )
}
