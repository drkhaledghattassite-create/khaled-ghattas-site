import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { ArticleForm } from '@/components/admin/ArticleForm'
import { getArticles } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditArticlePage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const articles = await getArticles()
  const article = articles.find((a) => a.id === id)
  if (!article) notFound()

  return (
    <ArticleForm
      mode="edit"
      articleId={article.id}
      initialValues={{
        slug: article.slug,
        titleAr: article.titleAr,
        titleEn: article.titleEn,
        excerptAr: article.excerptAr,
        excerptEn: article.excerptEn,
        contentAr: article.contentAr,
        contentEn: article.contentEn,
        coverImage: article.coverImage ?? '',
        category: article.category,
        status: article.status,
        featured: article.featured,
        orderIndex: article.orderIndex,
      }}
    />
  )
}
