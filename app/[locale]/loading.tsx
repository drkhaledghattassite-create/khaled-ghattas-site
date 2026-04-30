import { getTranslations } from 'next-intl/server'
import { LoadingSequence } from '@/components/layout/LoadingSequence'

export default async function Loading() {
  const t = await getTranslations('loading')
  return <LoadingSequence label={t('intro')} />
}
