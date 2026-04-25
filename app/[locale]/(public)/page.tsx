import { setRequestLocale } from 'next-intl/server'
import { PageLoader } from '@/components/layout/PageLoader'
import { Hero } from '@/components/sections/Hero'
import { CrossingTapes } from '@/components/sections/CrossingTapes'
import { StatsLogos } from '@/components/sections/StatsLogos'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { ArticlesBridgeMarquee } from '@/components/sections/ArticlesBridgeMarquee'
import { InterviewRotator } from '@/components/sections/InterviewRotator'
import { BookCardFan } from '@/components/sections/BookCardFan'
import { BooksBridgeMarquee } from '@/components/sections/BooksBridgeMarquee'
import { GalleryOrbit } from '@/components/sections/GalleryOrbit'
import {
  getArticles,
  getBooks,
  getGalleryItems,
  getInterviews,
} from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [articles, books, interviews, gallery] = await Promise.all([
    getArticles({ limit: 8 }),
    getBooks({ limit: 4 }),
    getInterviews({ limit: 5 }),
    getGalleryItems({ limit: 6 }),
  ])

  return (
    <>
      <PageLoader />
      <Hero />
      <CrossingTapes />
      <StatsLogos />
      <ArticlesList articles={articles} />
      <ArticlesBridgeMarquee />
      <InterviewRotator interviews={interviews} />
      <BookCardFan books={books} />
      <BooksBridgeMarquee />
      <GalleryOrbit gallery={gallery} />
    </>
  )
}
