import type { Metadata } from 'next'
import Image from 'next/image'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { NumberedEntries } from '@/components/sections/NumberedEntries'

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
      />

      <NumberedEntries entries={entries} />

      <section className="relative z-[2] bg-cream px-[var(--spacing-md)] py-[var(--spacing-xl)]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-start gap-[var(--spacing-xl)] md:grid-cols-[1fr_1.2fr]">
          <div className="dotted-outline relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden bg-cream-warm">
            <Image
              src="/drphoto.JPG"
              alt=""
              fill
              sizes="(min-width: 768px) 420px, 100vw"
              className="object-cover grayscale"
            />
          </div>
          <div className="flex flex-col gap-[var(--spacing-md)]">
            <p
              className="text-ink"
              style={{
                fontFamily: locale === 'ar' ? 'var(--font-arabic)' : 'var(--font-serif)',
                fontSize: locale === 'ar' ? '22px' : '24px',
                lineHeight: locale === 'ar' ? 1.8 : 1.6,
              }}
            >
              {t('bio_paragraph')}
            </p>

            <ul className="grid grid-cols-2 gap-6 border-t border-dashed border-ink/30 pt-[var(--spacing-md)] md:grid-cols-4">
              {stats.map((s) => (
                <li key={s.label} className="flex flex-col gap-1">
                  <span
                    className="text-amber"
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontStyle: 'italic',
                      fontSize: 'clamp(32px, 5vw, 56px)',
                      lineHeight: 1,
                    }}
                  >
                    {s.value}
                  </span>
                  <span className="font-label text-[12px] text-ink-muted">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
