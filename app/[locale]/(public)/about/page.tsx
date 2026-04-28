import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { PersonJsonLd } from '@/components/seo/StructuredData'
import { pageMetadata } from '@/lib/seo/page-metadata'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about.meta' })
  return pageMetadata({
    locale,
    path: '/about',
    title: t('title'),
    description: t('description'),
  })
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')
  const isRtl = locale === 'ar'

  const entries = [
    { number: t('numbers.1'), text: t('entry_1') },
    { number: t('numbers.2'), text: t('entry_2') },
    { number: t('numbers.3'), text: t('entry_3') },
    { number: t('numbers.4'), text: t('entry_4') },
  ]

  const stats = [
    { value: '1,000+', label: t('stats.articles') },
    { value: '30+', label: t('stats.interviews') },
    { value: '6', label: t('stats.books') },
    { value: '15+', label: t('stats.decades') },
  ]

  const venues = ['Harvard', 'Cornell', 'Stanford', 'AUB Beirut']
  const outlets = t.raw('outlets') as string[]

  return (
    <>
      <PersonJsonLd locale={locale} />
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('hero.description')}
        folio={t('folio')}
      />

      {/* Manifesto / numbered entries — distilled identity statements */}
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
      >
        <div className="mx-auto max-w-[var(--container-max)]">
          <header className="grid items-end gap-2 pb-10 md:pb-12">
            <span className="section-eyebrow">{t('in_summary')}</span>
            <h2 className="section-title">{t('in_four_lines')}</h2>
          </header>

          <ol className="m-0 p-0 list-none grid grid-cols-1 md:grid-cols-2 gap-x-[clamp(32px,5vw,72px)]">
            {entries.map((entry) => (
              <li
                key={entry.number}
                className="grid grid-cols-[auto_1fr] items-baseline gap-5 py-6 border-b border-[var(--color-border)]"
              >
                <span
                  className={`text-[clamp(28px,4vw,40px)] leading-none font-extrabold tracking-[-0.02em] text-[var(--color-accent)] [font-feature-settings:"tnum"] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display'
                  }`}
                >
                  {entry.number}
                </span>
                <p
                  className={`m-0 text-[clamp(17px,1.8vw,21px)] leading-[1.55] font-medium text-[var(--color-fg1)] [text-wrap:pretty] ${
                    isRtl ? 'font-arabic-display' : 'font-arabic-display !tracking-[-0.005em]'
                  }`}
                >
                  {entry.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Bio + portrait — editorial pull-quote treatment */}
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
      >
        <div className="mx-auto max-w-[var(--container-max)] grid gap-[clamp(40px,6vw,80px)] md:grid-cols-[1fr_1.3fr] md:items-start">
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-[var(--color-bg-deep)]">
              <Image
                src="/drphoto.JPG"
                alt=""
                fill
                sizes="(min-width: 768px) 420px, 100vw"
                className="object-cover [filter:saturate(0.82)_contrast(1.04)] dark:[filter:saturate(0.65)_contrast(1.06)_brightness(0.88)]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-7">
            <span className="section-eyebrow">{t('bio_eyebrow')}</span>
            <blockquote className="m-0 relative ps-[clamp(20px,3vw,32px)] py-1 border-s-[3px] border-[var(--color-accent)]">
              <p
                className={`m-0 text-[clamp(17px,1.7vw,21px)] leading-[1.65] font-medium text-[var(--color-fg1)] [text-wrap:pretty] ${
                  isRtl ? 'font-arabic-body' : 'font-display'
                }`}
              >
                {t('bio_paragraph')}
              </p>
            </blockquote>

            <dl className="grid grid-cols-2 md:grid-cols-4 gap-6 m-0 pt-7 border-t border-[var(--color-border)]">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col">
                  <dt
                    className={`text-[clamp(28px,3vw,40px)] leading-[0.95] font-extrabold tracking-[-0.02em] text-[var(--color-fg1)] [font-feature-settings:"tnum"] ${
                      isRtl ? 'font-arabic-display' : 'font-arabic-display'
                    }`}
                  >
                    <span dir="ltr" className="num-latn inline-block">
                      {s.value}
                    </span>
                  </dt>
                  <dd className="mt-2.5 m-0 text-[12px] tracking-[0.04em] text-[var(--color-fg3)]">
                    {s.label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Featured-on — venues + outlets */}
      <section
        dir={isRtl ? 'rtl' : 'ltr'}
        className="border-b border-[var(--color-border)] [padding:clamp(64px,8vw,112px)_clamp(20px,5vw,56px)]"
      >
        <div className="mx-auto max-w-[var(--container-max)] grid grid-cols-1 gap-10">
          <header className="grid items-end gap-2">
            <span className="section-eyebrow">{t('featured_eyebrow')}</span>
            <h2 className="section-title">{t('stages_outlets')}</h2>
          </header>

          {[
            { label: t('spoken_at'), items: venues, strong: true },
            { label: t('media_appearances'), items: outlets, strong: false },
          ].map((row) => (
            <div
              key={row.label}
              className="grid items-start gap-6 pt-6 border-t border-[var(--color-border)] md:grid-cols-[200px_1fr]"
            >
              <span
                className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-fg3)] pt-1 ${
                  isRtl ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold' : 'font-display'
                }`}
              >
                {row.label}
              </span>
              <ul className="m-0 p-0 list-none flex flex-wrap gap-y-1.5 gap-x-[22px]">
                {row.items.map((item, i, arr) => (
                  <li
                    key={item}
                    className={`relative tracking-[-0.005em] ${
                      isRtl ? 'font-arabic-body' : 'font-display'
                    } ${
                      row.strong
                        ? 'text-[16px] font-semibold text-[var(--color-fg1)]'
                        : 'text-[15px] font-medium text-[var(--color-fg2)]'
                    } ${
                      !row.strong && i < arr.length - 1
                        ? "after:content-[''] after:absolute after:[inset-inline-end:-13px] after:top-1/2 after:-translate-y-1/2 after:w-[3px] after:h-[3px] after:rounded-full after:bg-[var(--color-border-strong)]"
                        : ''
                    }`}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
