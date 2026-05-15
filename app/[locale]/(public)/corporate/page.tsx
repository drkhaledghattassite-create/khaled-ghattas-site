import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { ArrowRight, BadgeCheck, MailCheck, Sparkles } from 'lucide-react'
import { InnerHero } from '@/components/shared/InnerHero'
import { ComingSoon } from '@/components/shared/ComingSoon'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'
import { CorporateClientStrip } from '@/components/corporate/CorporateClientStrip'
import { CorporateProgramsGrid } from '@/components/corporate/CorporateProgramsGrid'
import { CorporateRequestForm } from '@/components/corporate/CorporateRequestForm'
import {
  getCorporateClients,
  getCorporatePrograms,
} from '@/lib/db/queries'
import { pageMetadata } from '@/lib/seo/page-metadata'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'

type Props = { params: Promise<{ locale: string }> }

const REQUEST_ANCHOR = 'request'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'corporate.meta' })
  return pageMetadata({
    locale,
    path: '/corporate',
    title: t('title'),
    description: t('description'),
  })
}

export default async function CorporatePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('corporate')) {
    return <ComingSoon pageKey="corporate" />
  }

  const t = await getTranslations('corporate')
  const isRtl = locale === 'ar'

  const [programs, clients] = await Promise.all([
    getCorporatePrograms({ publishedOnly: true }),
    getCorporateClients({ publishedOnly: true }),
  ])

  // Phase F2 — resolve client logos (R2 storage keys → signed URLs;
  // external URLs and local /public assets pass through). `logoUrl` is
  // schema-NOT-NULL, so we keep the original on failed resolution rather
  // than coercing to null (which would change the column's nullability).
  const resolvedClients = await Promise.all(
    clients.map(async (c) => ({
      ...c,
      logoUrl: (await resolvePublicUrl(c.logoUrl)) ?? c.logoUrl,
    })),
  )

  // Three "what happens next" steps drawn straight from i18n so an admin can
  // tweak copy without touching code. Icons are intentionally generic.
  const steps = [
    {
      icon: MailCheck,
      title: t('request.info_step_1_title'),
      body: t('request.info_step_1_body'),
    },
    {
      icon: Sparkles,
      title: t('request.info_step_2_title'),
      body: t('request.info_step_2_body'),
    },
    {
      icon: BadgeCheck,
      title: t('request.info_step_3_title'),
      body: t('request.info_step_3_body'),
    },
  ] as const

  return (
    <>
      <InnerHero
        eyebrow={t('page.eyebrow')}
        headingItalic={t('page.hero.italic')}
        headingSans={t('page.hero.sans')}
        description={t('page.description')}
        folio={t('page.folio')}
      />

      {/* Approach line — short editorial follow-up to the hero. */}
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(40px,5vw,72px)_clamp(20px,5vw,56px)] bg-[var(--color-bg-deep)]"
      >
        <div className="mx-auto grid max-w-[var(--container-max)] gap-3 md:grid-cols-[auto_1fr] md:items-baseline md:gap-10">
          <span
            className={`section-eyebrow whitespace-nowrap ${
              isRtl ? '!text-[13px] !tracking-normal !normal-case !font-bold' : ''
            }`}
          >
            {t('page.approach_label')}
          </span>
          <ScrollRevealLine
            as="p"
            offset={['start 0.85', 'start 0.45']}
            className={`m-0 max-w-[80ch] text-[clamp(15px,1.5vw,17px)] leading-[1.75] [text-wrap:pretty] ${
              isRtl ? 'font-arabic-body' : 'font-display'
            }`}
          >
            {t('page.approach_text')}
          </ScrollRevealLine>
        </div>
      </section>

      <CorporateClientStrip clients={resolvedClients} />

      <CorporateProgramsGrid
        programs={programs}
        requestAnchorId={REQUEST_ANCHOR}
      />

      {/*
       * Request section — split: form on the dominant column, "what happens
       * next" rail on the side. Anchored so the per-card "Request this
       * program" CTAs jump here without a route change.
       */}
      <section
        id={REQUEST_ANCHOR}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(72px,9vw,120px)_clamp(20px,5vw,56px)] bg-[var(--color-bg)] [scroll-margin-top:80px]"
      >
        <div className="mx-auto max-w-[var(--container-max)]">
          <header className="grid items-end gap-4 pb-12 md:grid-cols-[1fr_auto] md:pb-14">
            <div>
              <span className="section-eyebrow">{t('request.eyebrow')}</span>
              <h2 className="section-title mt-3.5">{t('request.heading')}</h2>
              <ScrollRevealLine
                as="p"
                offset={['start 0.85', 'start 0.4']}
                className={`mt-4 max-w-[58ch] text-[clamp(15px,1.6vw,18px)] leading-[1.7] [text-wrap:pretty] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('request.subheading')}
              </ScrollRevealLine>
            </div>
          </header>

          <div className="grid gap-[clamp(40px,5vw,64px)] md:grid-cols-[1.4fr_1fr]">
            {/* Form card */}
            <div className="rounded-[6px] border border-[var(--color-border)] bg-[var(--color-bg-elevated)] [padding:clamp(28px,4vw,48px)]">
              <header className="grid items-end gap-2 mb-8">
                <span className="section-eyebrow">
                  {t('request.form_eyebrow')}
                </span>
                <h3
                  className={`m-0 text-[clamp(20px,2.2vw,26px)] leading-[1.2] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${
                    isRtl
                      ? 'font-arabic-display'
                      : 'font-arabic-display !tracking-[-0.02em]'
                  }`}
                >
                  {t('request.form_heading')}
                </h3>
              </header>
              <CorporateRequestForm programs={programs} />
            </div>

            {/* Side rail — "what happens next" */}
            <aside className="flex flex-col gap-7 md:pt-2">
              <div className="flex flex-col gap-2">
                <span className="section-eyebrow">{t('request.eyebrow')}</span>
                <h3
                  className={`m-0 text-[clamp(18px,2vw,22px)] leading-[1.25] font-bold tracking-[-0.005em] text-[var(--color-fg1)] ${
                    isRtl
                      ? 'font-arabic-display'
                      : 'font-arabic-display !tracking-[-0.02em]'
                  }`}
                >
                  {t('request.info_heading')}
                </h3>
              </div>
              <ol className="m-0 list-none p-0 flex flex-col gap-5">
                {steps.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <li
                      key={s.title}
                      className="grid items-start gap-3 grid-cols-[auto_1fr]"
                    >
                      <span
                        aria-hidden
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex flex-col gap-1 leading-tight">
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] num-latn ${
                            isRtl
                              ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold'
                              : 'font-display'
                          }`}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span
                          className={`text-[15px] font-semibold text-[var(--color-fg1)] ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {s.title}
                        </span>
                        <span
                          className={`text-[13.5px] leading-[1.6] text-[var(--color-fg2)] ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {s.body}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ol>

              <div className="rounded-[6px] border-s-[3px] border-[var(--color-accent)] bg-[var(--color-bg-elevated)] p-5">
                <p
                  className={`m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
                    isRtl
                      ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                      : 'font-display'
                  }`}
                >
                  {t('trust.eyebrow')}
                </p>
                <p
                  className={`m-0 text-[14px] leading-[1.7] text-[var(--color-fg2)] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('trust.subheading')}
                </p>
                <a
                  href="#programs"
                  className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--color-fg1)] hover:text-[var(--color-accent)] transition-colors ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {t('programs.heading')}
                  <ArrowRight
                    aria-hidden
                    className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`}
                  />
                </a>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  )
}
