import { notFound } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { BookForm } from '@/components/admin/BookForm'
import { getBooks } from '@/lib/db/queries'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditBookPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const books = await getBooks()
  const book = books.find((b) => b.id === id)
  if (!book) notFound()

  return (
    <BookForm
      mode="edit"
      bookId={book.id}
      initialValues={{
        slug: book.slug,
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        subtitleAr: book.subtitleAr ?? '',
        subtitleEn: book.subtitleEn ?? '',
        descriptionAr: book.descriptionAr,
        descriptionEn: book.descriptionEn,
        coverImage: book.coverImage,
        price: book.price ?? '',
        currency: book.currency,
        digitalFile: book.digitalFile ?? '',
        externalUrl: book.externalUrl ?? '',
        publisher: book.publisher ?? '',
        publicationYear: book.publicationYear,
        status: book.status,
        featured: book.featured,
        orderIndex: book.orderIndex,
      }}
    />
  )
}
