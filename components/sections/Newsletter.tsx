'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

export function Newsletter() {
  const t = useTranslations('newsletter')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!email.includes('@')) return
    setStatus('submitting')
    // TODO Phase 8: wire real Resend API subscription
    console.log('[Newsletter] Subscribe:', email)
    setTimeout(() => setStatus('done'), 800)
  }

  return (
    <section
      className="relative z-[2] bg-paper-deep px-[var(--section-pad-x)] py-20 md:py-[120px] lg:py-40"
    >
      <div className="mx-auto max-w-[640px] text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: EASE_OUT_QUART }}
        >
          <h2
            className="text-balance text-ink font-display font-semibold text-[clamp(32px,6vw,56px)] leading-none tracking-[-0.022em] [dir=rtl]:font-arabic-display [dir=rtl]:font-medium [dir=rtl]:tracking-normal"
          >
            {t('heading')}
          </h2>

          <p
            className="mt-4 text-ink-soft font-serif italic text-[18px] leading-[1.6] [dir=rtl]:font-arabic [dir=rtl]:not-italic"
          >
            {t('description')}
          </p>

          {status === 'done' ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: EASE_OUT_QUART }}
              className="mt-8 font-serif italic text-[18px] text-sky-deep [dir=rtl]:font-arabic [dir=rtl]:not-italic"
            >
              {t('success_message')}
            </motion.p>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              noValidate
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('email_placeholder')}
                required
                className="min-w-0 flex-1 bg-transparent border border-ink/30 rounded-full px-5 py-[10px] text-ink text-[15px] outline-none min-h-11 font-display [dir=rtl]:font-arabic"
              />
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="shrink-0 inline-flex items-center gap-2 px-5 py-[10px] min-h-[42px] rounded-full border border-ink bg-ink text-paper-soft text-[13px] font-medium tracking-[0.08em] uppercase select-none transition-[background-color,color,border-color,transform] hover:bg-brass-deep hover:border-brass-deep active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed [dir=rtl]:normal-case [dir=rtl]:tracking-normal [dir=rtl]:font-semibold [dir=rtl]:text-[13.5px]"
              >
                <span aria-hidden className="block h-[6px] w-[6px] rounded-full bg-current" />
                {status === 'submitting' ? t('submitting') : t('subscribe')}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
