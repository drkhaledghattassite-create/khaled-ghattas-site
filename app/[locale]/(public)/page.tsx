import { setRequestLocale } from 'next-intl/server'
import { Hero } from '@/components/sections/Hero'
import { AboutTeaser } from '@/components/sections/AboutTeaser'
import { StoreShowcase } from '@/components/sections/StoreShowcase'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { InterviewRotator } from '@/components/sections/InterviewRotator'
import { Newsletter } from '@/components/sections/Newsletter'
import { getArticles, getBooks, getInterviews } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const [articles, books, interviews] = await Promise.all([
    getArticles({ limit: 6 }),
    getBooks({ limit: 10 }),
    getInterviews({ limit: 5 }),
  ])

  return (
    <>
      <Hero />
      <AboutTeaser />
      <StoreShowcase books={books} />
      <ArticlesList articles={articles} />
      <InterviewRotator interviews={interviews} />
      <Newsletter />
    </>
  )
}
