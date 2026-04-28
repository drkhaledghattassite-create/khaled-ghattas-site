import { getTranslations } from 'next-intl/server'

export default async function Loading() {
  const t = await getTranslations('loading')

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-bg"
    >
      <span className="sr-only">{t('intro')}</span>

      <div
        aria-hidden
        className="relative h-12 w-12 animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <span className="absolute inset-0 rounded-full border-2 border-border" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-accent)]" />
      </div>

      <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-fg3 font-display rtl:font-arabic-body rtl:text-[12.5px] rtl:tracking-[0.04em] rtl:normal-case rtl:font-bold">
        {t('intro')}
      </span>
    </div>
  )
}
