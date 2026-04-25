import { setRequestLocale } from 'next-intl/server'
import { BulkUpload } from '@/components/admin/BulkUpload'

type Props = { params: Promise<{ locale: string }> }

export default async function NewGalleryUploadPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  return <BulkUpload />
}
