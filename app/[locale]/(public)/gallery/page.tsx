import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { InnerHero } from '@/components/shared/InnerHero'
import { GalleryMasonry } from '@/components/sections/GalleryMasonry'
import { getGalleryItems } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'gallery.meta' })
  return { title: t('title'), description: t('description') }
}

export default async function GalleryPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('gallery.page')
  const gallery = await getGalleryItems()

  return (
    <>
      <InnerHero
        eyebrow={t('eyebrow')}
        headingItalic={t('hero.italic')}
        headingSans={t('hero.sans')}
        description={t('description')}
        align="center"
      />
      <GalleryMasonry gallery={gallery} />
    </>
  )
}
