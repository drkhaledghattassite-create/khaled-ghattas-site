'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

export function Newsletter() {
  const t = useTranslations('newsletter')
  const locale = useLocale()
  const isRtl = locale === 'ar'
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    toast.success(t('success_message'))
    setEmail('')
    setLoading(false)
    setDone(true)
  }

  const kicker = isRtl ? 'دعوة شخصية' : 'A personal invitation'
  const statement = isRtl
    ? 'لا أكتب نشرةً للترويج. أكتبها لأنّني أحبّ أن أُكمل حديثي معك في الأسبوع، حتى لو لم نلتقِ. مقالةٌ واحدة، رسالةٌ صغيرة، وكثير من المعنى.'
    : 'I do not write a newsletter to market. I write it because I want our conversation to continue through the week, even when we do not meet. One essay, a small letter, plenty of meaning.'
  const sign = isRtl ? '— خالد' : '— Khaled'
  const placeholder = isRtl ? 'بريدك الإلكتروني' : 'your@email.com'
  const cta = isRtl ? 'انضمّ إليّ' : 'Join me'
  const priv = isRtl
    ? 'لا إعلانات. لن أُشارك بريدك. ألغِ في أيّ وقت.'
    : 'No ads. I will never share your address. Unsubscribe any time.'
  const readers = isRtl ? 'يقرؤها أكثر من مليون متابع' : 'Read by a million across platforms'
  const successCopy = isRtl
    ? 'وصل بريدك. شكراً — أراك الأسبوع القادم.'
    : "I have your address. Thank you — I'll see you next week."

  return (
    <section
      id="newsletter"
      className="bg-[var(--color-bg-elevated)] border-t border-[var(--color-border)] [padding:clamp(96px,12vw,160px)_clamp(20px,5vw,56px)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto max-w-[760px] text-start">
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="eyebrow-invitation block mb-[18px]"
        >
          {kicker}
        </motion.span>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.05 }}
          className={`m-0 mb-3.5 text-[clamp(22px,3vw,32px)] leading-[1.55] font-medium text-[var(--color-fg1)] tracking-[-0.005em] [text-wrap:pretty] ${
            isRtl ? 'font-arabic-display' : 'font-arabic-display !leading-[1.4] tracking-[-0.015em]'
          }`}
        >
          {statement}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
          className={`m-0 mb-9 text-[16px] font-medium text-[var(--color-fg2)] ${
            isRtl ? 'font-arabic-display italic' : 'font-arabic-display italic'
          }`}
          style={{ fontStyle: 'italic' }}
        >
          {sign}
        </motion.p>

        {done ? (
          <p className="py-4 m-0 border-b border-[var(--color-border)] text-[18px] font-semibold text-[var(--color-accent)]">
            {successCopy}
          </p>
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.25 }}
            onSubmit={handleSubmit}
            noValidate
            className="grid grid-cols-[1fr_auto] items-center gap-3 pb-3 border-b border-[var(--color-fg1)]"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={placeholder}
              required
              disabled={loading}
              aria-label={t('email_label')}
              className={`bg-transparent border-0 outline-none text-[18px] text-[var(--color-fg1)] placeholder:text-[var(--color-fg3)] py-3 px-0 w-full ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            />
            <button
              type="submit"
              disabled={loading || !email}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--color-accent)] text-[var(--color-accent-fg)] text-[14px] font-semibold whitespace-nowrap transition-[background-color] duration-200 hover:bg-[var(--color-accent-hover)] disabled:opacity-70 disabled:cursor-progress ${
                isRtl ? 'font-arabic-body !text-[15px] !font-bold' : 'font-display'
              }`}
            >
              {loading ? <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-accent-fg)]/40 border-t-[var(--color-accent-fg)] rounded-full animate-spin" aria-hidden /> : cta}
              {!loading && <span aria-hidden>{isRtl ? '←' : '→'}</span>}
            </button>
          </motion.form>
        )}

        <div
          className={`mt-[18px] flex flex-wrap items-center gap-2.5 text-[12px] text-[var(--color-fg3)] tracking-[0.02em] ${
            isRtl ? 'font-arabic-body !text-[13px]' : 'font-display'
          }`}
        >
          <span>{readers}</span>
          <span aria-hidden>·</span>
          <span>{priv}</span>
        </div>
      </div>
    </section>
  )
}
