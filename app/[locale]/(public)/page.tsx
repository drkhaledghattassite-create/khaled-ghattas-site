import { setRequestLocale } from 'next-intl/server'
import { Hero } from '@/components/sections/Hero'
import { AboutTeaser } from '@/components/sections/AboutTeaser'
import { StoreShowcase } from '@/components/sections/StoreShowcase'
import { ArticlesList } from '@/components/sections/ArticlesList'
import { InterviewRotator } from '@/components/sections/InterviewRotator'
import { Newsletter } from '@/components/sections/Newsletter'
import { getArticles, getBooks, getInterviews } from '@/lib/db/queries'
import { getCachedSiteSettings } from '@/lib/site-settings/get'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  console.log('[HomePage] start')
  const { locale } = await params
  setRequestLocale(locale)
  console.log('[HomePage] locale=', locale)

  let settings, articles, books, interviews
  try {
    settings = await getCachedSiteSettings()
    console.log('[HomePage] settings ok')
  } catch (e) { console.error('[HomePage] settings failed', e); throw e }
  try {
    articles = await getArticles({ limit: 6 })
    console.log('[HomePage] articles count=', articles.length)
  } catch (e) { console.error('[HomePage] articles failed', e); throw e }
  try {
    books = await getBooks({ limit: 10 })
    console.log('[HomePage] books count=', books.length)
  } catch (e) { console.error('[HomePage] books failed', e); throw e }
  try {
    interviews = await getInterviews({ limit: 5 })
    console.log('[HomePage] interviews count=', interviews.length)
  } catch (e) { console.error('[HomePage] interviews failed', e); throw e }

  const { homepage, hero_ctas, featured, features } = settings
  const showNewsletter = homepage.show_newsletter && features.newsletter_form_enabled

  // DIAGNOSTIC: minimal JSX to confirm whether sections cause the crash.
  // If this loads cleanly, the error is in one of the sections.
  // If it still crashes, the error is in PublicLayout / LocaleLayout chrome.
  void homepage; void hero_ctas; void featured; void showNewsletter
  void articles; void books; void interviews
  console.log('[HomePage] returning minimal JSX')
  return (
    <div style={{ padding: 64, fontFamily: 'sans-serif' }}>
      <h1>HomePage diagnostic render</h1>
      <p>If you see this, the error is in one of the homepage sections.</p>
      <p>articles: {articles.length} · books: {books.length} · interviews: {interviews.length}</p>
    </div>
  )
}
