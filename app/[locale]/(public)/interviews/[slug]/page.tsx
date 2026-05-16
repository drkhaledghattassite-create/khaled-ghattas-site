import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/lib/i18n/navigation'
import { Breadcrumbs } from '@/components/shared/Breadcrumbs'
import { BreadcrumbJsonLd, InterviewJsonLd } from '@/components/seo/StructuredData'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'
import { ComingSoon } from '@/components/shared/ComingSoon'
import {
  getInterviewBySlug,
  getInterviews,
  getRelatedInterviews,
} from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'
import { resolvePublicUrl } from '@/lib/storage/public-url'
import { SITE_NAME, SITE_URL } from '@/lib/constants'

const SITE_NAME_AR = 'د. خالد غطاس'

type Props = { params: Promise<{ locale: string; slug: string }> }

// High-traffic ISR — generateStaticParams pre-builds known interviews, this
// keeps them refreshing every 30 min. See /books/page.tsx for the full rationale.
export const revalidate = 1800

export async function generateStaticParams() {
  const interviews = await getInterviews()
  return interviews.flatMap((i) =>
    ['ar', 'en'].map((locale) => ({ locale, slug: i.slug })),
  )
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params
  const interview = await getInterviewBySlug(slug)
  if (!interview) return {}
  const isAr = locale === 'ar'
  const title = isAr ? interview.titleAr : interview.titleEn
  const description = (isAr ? interview.descriptionAr : interview.descriptionEn) ?? undefined
  const url = `${isAr ? SITE_URL : `${SITE_URL}/en`}/interviews/${slug}`
  // Phase F2 — resolve thumbnail (R2 storage key → signed URL; external URL
  // and local /public paths pass through). Falls back to the dynamic OG
  // route when resolution returns null (bad key / nullish).
  const image = (await resolvePublicUrl(interview.thumbnailImage)) ?? '/opengraph-image'

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        ar: `${SITE_URL}/interviews/${slug}`,
        en: `${SITE_URL}/en/interviews/${slug}`,
        'x-default': `${SITE_URL}/interviews/${slug}`,
      },
    },
    openGraph: {
      type: 'video.episode',
      title,
      description,
      url,
      siteName: isAr ? SITE_NAME_AR : SITE_NAME,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
      locale: isAr ? 'ar_LB' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function InterviewPage({ params }: Props) {
  const { locale, slug } = await params
  setRequestLocale(locale)

  const settings = await getCachedSiteSettings()
  if (settings.coming_soon_pages.includes('interviews')) {
    return <ComingSoon pageKey="interviews" />
  }

  const interview = await getInterviewBySlug(slug)
  if (!interview) notFound()

  const tNav = await getTranslations('nav')
  const tCta = await getTranslations('cta')
  const tInterview = await getTranslations('interview')
  const related = await getRelatedInterviews(slug, 3)
  const isRtl = locale === 'ar'

  // Phase F2 — resolve thumbnail storage keys server-side before any client
  // <Image src=…> render. `thumbnailImage` is schema-NOT-NULL so we fall back
  // to the original value on resolution failure (preserves the column's
  // non-null contract). Same pattern as `c.logoUrl` in /corporate.
  const resolvedInterviewThumb =
    (await resolvePublicUrl(interview.thumbnailImage)) ?? interview.thumbnailImage
  const resolvedRelated = await Promise.all(
    related.map(async (r) => ({
      ...r,
      thumbnailImage: (await resolvePublicUrl(r.thumbnailImage)) ?? r.thumbnailImage,
    })),
  )

  const title = locale === 'ar' ? interview.titleAr : interview.titleEn
  const description = (locale === 'ar' ? interview.descriptionAr : interview.descriptionEn) ?? ''
  const source = (locale === 'ar' ? interview.sourceAr : interview.source) ?? ''
  const year = interview.year

  const crumbs = [
    { href: '/', label: tNav('home') },
    { href: '/interviews', label: tNav('interviews') },
    { href: `/interviews/${interview.slug}`, label: title },
  ]

  return (
    <article
      dir={isRtl ? 'rtl' : 'ltr'}
      className="bg-[var(--color-bg)]"
    >
      <InterviewJsonLd interview={interview} locale={locale} />
      <BreadcrumbJsonLd crumbs={crumbs} locale={locale} />
      <div className="[padding:clamp(48px,6vw,80px)_clamp(20px,5vw,56px)_clamp(24px,3vw,40px)]">
        <div className="mx-auto max-w-[var(--container-max)]">
          <Breadcrumbs crumbs={crumbs} />
        </div>
      </div>

      {/* Hero — large 16:9 video frame + meta */}
      <section className="border-b border-[var(--color-border)] [padding:0_clamp(20px,5vw,56px)_clamp(64px,8vw,112px)]">
        <div className="mx-auto max-w-[var(--container-max)] flex flex-col gap-[clamp(40px,5vw,64px)]">
          {interview.videoUrl ? (
            <a
              href={interview.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden rounded-[4px] aspect-video bg-[var(--color-fg1)]"
              aria-label={title}
            >
              <Image
                src={resolvedInterviewThumb}
                alt={title}
                fill
                priority
                sizes="(min-width: 1280px) 1280px, 100vw"
                className="object-cover [filter:brightness(0.78)_contrast(1.05)] transition-[transform,filter] duration-[400ms] group-hover:scale-[1.01] group-hover:[filter:brightness(0.86)_contrast(1.05)]"
                style={{ viewTransitionName: `interview-${interview.slug}` }}
              />
              <div
                aria-hidden
                className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.55))] pointer-events-none"
              />
              <span
                aria-hidden
                className="absolute z-20 top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 w-[88px] h-[88px] rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              {(source || year !== null) && (
                <div
                  className={`absolute z-20 [inset-block-end:20px] [inset-inline-start:20px] inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/95 backdrop-blur-md text-[13px] text-[var(--color-fg2)] [font-feature-settings:"tnum"] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {source && (
                    <span className="text-[14px] font-bold text-[var(--color-fg1)]">{source}</span>
                  )}
                  {source && year !== null && <span aria-hidden>·</span>}
                  {year !== null && <span>{year}</span>}
                </div>
              )}
            </a>
          ) : (
            <div
              className="relative block overflow-hidden rounded-[4px] aspect-video bg-[var(--color-fg1)]"
              aria-label={title}
            >
              <Image
                src={resolvedInterviewThumb}
                alt={title}
                fill
                priority
                sizes="(min-width: 1280px) 1280px, 100vw"
                className="object-cover [filter:brightness(0.65)_contrast(1.02)]"
                style={{ viewTransitionName: `interview-${interview.slug}` }}
              />
              <div
                aria-hidden
                className="absolute inset-0 [background:linear-gradient(180deg,rgba(0,0,0,0)_30%,rgba(0,0,0,0.55))] pointer-events-none"
              />
              <span
                className={`absolute z-20 top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/95 backdrop-blur-md text-[14px] font-bold text-[var(--color-fg1)] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {tCta('video_coming_soon')}
              </span>
            </div>
          )}

          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-start">
            <div className="flex flex-col gap-7">
              <span className="section-eyebrow">
                {tInterview('label')}
              </span>
              <h1
                className={`m-0 text-[clamp(32px,5vw,56px)] leading-[1.05] font-extrabold tracking-[-0.02em] text-[var(--color-fg1)] [text-wrap:balance] ${
                  isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.035em]'
                }`}
              >
                {title}
              </h1>
              <span
                aria-hidden
                className="block w-12 h-[3px] bg-[var(--color-accent)]"
              />
              {description && (
                <ScrollRevealLine
                  as="p"
                  offset={['start 0.85', 'start 0.3']}
                  className={`m-0 text-[clamp(16px,1.6vw,19px)] leading-[1.65] [text-wrap:pretty] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  }`}
                >
                  {description}
                </ScrollRevealLine>
              )}
              {interview.videoUrl ? (
                <a
                  href={interview.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-pill btn-pill-accent self-start mt-2"
                >
                  {tCta('view_interview')}
                </a>
              ) : (
                <span className="btn-pill btn-pill-secondary self-start mt-2 cursor-not-allowed opacity-70">
                  {tCta('video_coming_soon')}
                </span>
              )}
            </div>

            <aside className="flex flex-col gap-6 md:pt-3">
              <dl className="grid grid-cols-2 gap-y-5 gap-x-4 m-0 pt-2 border-t border-[var(--color-border)]">
                {source && (
                  <div>
                    <dt
                      className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                        isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                      }`}
                    >
                      {tInterview('source')}
                    </dt>
                    <dd
                      className={`mt-1.5 m-0 text-[15px] font-bold text-[var(--color-fg1)] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {source}
                    </dd>
                  </div>
                )}
                {year !== null && (
                  <div>
                    <dt
                      className={`text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-fg3)] ${
                        isRtl ? 'font-arabic-body !text-[12px] !tracking-normal !normal-case !font-bold' : 'font-display'
                      }`}
                    >
                      {tInterview('year')}
                    </dt>
                    <dd
                      className={`mt-1.5 m-0 text-[15px] font-bold text-[var(--color-fg1)] [font-feature-settings:"tnum"] ${
                        isRtl ? 'font-arabic-body' : 'font-display'
                      }`}
                    >
                      {year}
                    </dd>
                  </div>
                )}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="[padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]">
          <div className="mx-auto max-w-[var(--container-max)]">
            <header className="grid items-end gap-2 pb-10 md:pb-12">
              <span className="section-eyebrow">
                {tInterview('more_interviews')}
              </span>
              <h2 className="section-title">
                {tInterview('continue_watching')}
              </h2>
            </header>

            <ul className="m-0 p-0 list-none grid grid-cols-1 gap-[clamp(28px,4vw,40px)] md:grid-cols-3">
              {resolvedRelated.map((r) => {
                const rTitle = isRtl ? r.titleAr : r.titleEn
                const rSource = (isRtl ? r.sourceAr : r.source) ?? ''
                return (
                  <li key={r.id}>
                    <Link
                      href={`/interviews/${r.slug}`}
                      className="group flex flex-col gap-3.5 transition-transform duration-[240ms] hover:-translate-y-1"
                    >
                      <div className="relative aspect-video overflow-hidden rounded-[4px] bg-[var(--color-fg1)]">
                        <Image
                          src={r.thumbnailImage}
                          alt={rTitle}
                          fill
                          sizes="(min-width: 768px) 400px, 100vw"
                          className="object-cover [filter:brightness(0.8)_contrast(1.05)] transition-[transform,filter] duration-[400ms] group-hover:scale-[1.03]"
                        />
                        <span
                          aria-hidden
                          className="absolute top-1/2 start-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/95 text-[var(--color-fg1)] inline-flex items-center justify-center ps-1 group-hover:scale-105 transition-transform duration-200"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex flex-col gap-1 px-0.5">
                        {rSource && (
                          <span
                            className={`text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)] ${
                              isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                            }`}
                          >
                            {rSource}
                          </span>
                        )}
                        <h3
                          className={`m-0 text-[16px] leading-[1.3] font-bold text-[var(--color-fg1)] group-hover:text-[var(--color-accent)] transition-colors ${
                            isRtl ? 'font-arabic-display' : 'font-arabic-display tracking-[-0.012em]'
                          }`}
                        >
                          {rTitle}
                        </h3>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </section>
      )}
    </article>
  )
}
