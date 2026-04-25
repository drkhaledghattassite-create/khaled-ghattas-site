import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { NumberedEntries } from '@/components/sections/NumberedEntries'
import { Ornament } from '@/components/shared/Ornament'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'about.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('about')
  const isRtl = locale === 'ar'

  const entries = [
    { number: '01', text: t('entry_1') },
    { number: '02', text: t('entry_2') },
    { number: '03', text: t('entry_3') },
    { number: '04', text: t('entry_4') },
  ]

  const stats = [
    { value: '1000+', label: t('stats.articles') },
    { value: '30+', label: t('stats.interviews') },
    { value: '5+', label: t('stats.books') },
    { value: '4', label: t('stats.decades') },
  ]

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('hero.description')}
        chapterNumber=".01"
      />

      <NumberedEntries entries={entries} />

      <section className="relative z-[2] bg-paper px-[var(--section-pad-x)] py-[var(--section-pad-y)]">
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 items-start gap-[var(--spacing-xl)] md:grid-cols-[1fr_1.3fr]">
          {/* Portrait — printed frame */}
          <div className="frame-print relative mx-auto aspect-[3/4] w-full max-w-[420px]">
            <div className="relative h-full w-full overflow-hidden">
              <Image
                src="/drphoto.JPG"
                alt=""
                fill
                sizes="(min-width: 768px) 420px, 100vw"
                className="object-cover duotone-warm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-[var(--spacing-md)]">
            <div className="flex items-baseline gap-3 text-ink-muted">
              <Ornament glyph="fleuron" size={13} className="text-brass" />
              <span
                className="text-[11px] tracking-[0.18em] uppercase"
                style={{
                  fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                  fontStyle: isRtl ? 'normal' : 'italic',
                  letterSpacing: isRtl ? 0 : '0.18em',
                  textTransform: isRtl ? 'none' : 'uppercase',
                  fontWeight: 500,
                  fontSize: isRtl ? 12 : 11,
                }}
              >
                {isRtl ? 'سيرة ومسار' : 'Biographical Note'}
              </span>
            </div>

            <p
              className="dropcap text-pretty text-ink"
              style={{
                fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                fontSize: isRtl ? 19 : 19,
                lineHeight: isRtl ? 1.95 : 1.65,
                fontWeight: 400,
              }}
            >
              {t('bio_paragraph')}
            </p>

            <div className="rule-ornament my-2" />

            <ul className="grid grid-cols-2 gap-y-6 gap-x-6 md:grid-cols-4">
              {stats.map((s) => (
                <li key={s.label} className="flex flex-col gap-1">
                  <span
                    className="tabular-nums text-brass"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 'clamp(36px, 5.5vw, 60px)',
                      lineHeight: 1,
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="mt-1 text-[10.5px] tracking-[0.18em] text-ink-muted uppercase"
                    style={{
                      fontFamily: isRtl ? 'var(--font-arabic)' : 'var(--font-display)',
                      letterSpacing: isRtl ? 0 : '0.18em',
                      textTransform: isRtl ? 'none' : 'uppercase',
                      fontWeight: 500,
                      fontSize: isRtl ? 12 : 10.5,
                    }}
                  >
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
