'use client'

import { useLocale, useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { Clock, Users } from 'lucide-react'
import type { CorporateProgram } from '@/lib/db/queries'
import {
  staggerContainerWith,
  staggerItem,
} from '@/lib/motion/variants'
import { ScrollRevealLine } from '@/components/motion/ScrollRevealLine'

type Props = {
  programs: CorporateProgram[]
  /** Anchor id of the request form section, used by the per-card CTA. */
  requestAnchorId: string
  /** Hidden field name on the form so cards can prefill the program select. */
  programFieldName?: string
}

/**
 * Programs grid — four cards in a 2-up layout, alternating dark/light per
 * the original /cooperate page on drkhaledghattass.com. The dark variant
 * uses fg1 background + bg-elevated foreground for contrast.
 *
 * The "Request this program" CTA is an in-page anchor jump; the form below
 * reads ?program=<id> on click via window.location.hash so the program
 * select pre-populates without a route change.
 */
export function CorporateProgramsGrid({
  programs,
  requestAnchorId,
  programFieldName = 'programId',
}: Props) {
  const t = useTranslations('corporate.programs')
  const locale = useLocale()
  const isRtl = locale === 'ar'

  if (programs.length === 0) return null

  return (
    <section
      dir={isRtl ? 'rtl' : 'ltr'}
      className="border-b border-[var(--color-border)] [padding:clamp(80px,10vw,128px)_clamp(20px,5vw,56px)] bg-[var(--color-bg)]"
      id="programs"
    >
      <div className="mx-auto max-w-[var(--container-max)]">
        <header className="grid items-end gap-6 pb-12 md:grid-cols-[1fr_auto] md:pb-14">
          <div>
            <span className="section-eyebrow">{t('eyebrow')}</span>
            <h2 className="section-title mt-3.5">{t('heading')}</h2>
            <ScrollRevealLine
              as="p"
              offset={['start 0.85', 'start 0.4']}
              className={`mt-4 max-w-[640px] text-[clamp(15px,1.6vw,18px)] leading-[1.7] [text-wrap:pretty] ${
                isRtl ? 'font-arabic-body' : 'font-display'
              }`}
            >
              {t('subheading')}
            </ScrollRevealLine>
          </div>
        </header>

        <motion.ul
          variants={staggerContainerWith(0.12, 0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-10%' }}
          className="m-0 list-none p-0 grid gap-[clamp(20px,3vw,32px)] md:grid-cols-2"
        >
          {programs.map((program, index) => {
            const dark = index % 2 === 0
            const title = isRtl ? program.titleAr : program.titleEn
            const description = isRtl
              ? program.descriptionAr
              : program.descriptionEn
            const duration = isRtl ? program.durationAr : program.durationEn
            const audience = isRtl ? program.audienceAr : program.audienceEn

            return (
              <motion.li
                key={program.id}
                variants={staggerItem}
                className={`group relative flex flex-col gap-6 overflow-hidden rounded-[6px] [padding:clamp(28px,4vw,48px)] transition-[transform,box-shadow] duration-300 hover:[transform:translateY(-2px)] ${
                  dark
                    ? 'bg-[var(--color-fg1)] text-[var(--color-bg-elevated)] hover:[box-shadow:var(--shadow-lift)]'
                    : 'bg-[var(--color-bg-deep)] text-[var(--color-fg1)] border border-[var(--color-border)] hover:[box-shadow:var(--shadow-lift)]'
                }`}
              >
                <header className="flex flex-col gap-4">
                  <span
                    aria-hidden
                    className={`block w-10 h-[3px] ${
                      dark
                        ? 'bg-[var(--color-accent)]'
                        : 'bg-[var(--color-accent)]'
                    }`}
                  />
                  <h3
                    className={`m-0 text-[clamp(26px,3.4vw,38px)] leading-[1.1] font-extrabold tracking-[-0.02em] [text-wrap:balance] ${
                      isRtl
                        ? 'font-arabic-display'
                        : 'font-arabic-display !tracking-[-0.03em]'
                    }`}
                  >
                    {title}
                  </h3>
                </header>

                <p
                  className={`m-0 text-[clamp(14.5px,1.4vw,16px)] leading-[1.75] [text-wrap:pretty] ${
                    isRtl ? 'font-arabic-body' : 'font-display'
                  } ${dark ? 'opacity-90' : 'text-[var(--color-fg2)]'}`}
                >
                  {description}
                </p>

                {(duration || audience) && (
                  <ul
                    className={`mt-auto m-0 list-none p-0 flex flex-wrap gap-x-6 gap-y-2 pt-4 border-t ${
                      dark
                        ? 'border-white/10'
                        : 'border-[var(--color-border)]'
                    }`}
                  >
                    {duration && (
                      <li className="flex items-center gap-2">
                        <Clock
                          className={`h-3.5 w-3.5 ${dark ? 'opacity-70' : 'text-[var(--color-fg3)]'}`}
                          aria-hidden
                        />
                        <span
                          className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
                            isRtl
                              ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                              : 'font-display'
                          } ${dark ? 'opacity-80' : 'text-[var(--color-fg3)]'}`}
                        >
                          {t('duration_label')}:
                        </span>
                        <span
                          className={`text-[13.5px] font-medium ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {duration}
                        </span>
                      </li>
                    )}
                    {audience && (
                      <li className="flex items-center gap-2">
                        <Users
                          className={`h-3.5 w-3.5 ${dark ? 'opacity-70' : 'text-[var(--color-fg3)]'}`}
                          aria-hidden
                        />
                        <span
                          className={`text-[12px] font-semibold uppercase tracking-[0.12em] ${
                            isRtl
                              ? 'font-arabic-body !text-[13px] !tracking-normal !normal-case !font-bold'
                              : 'font-display'
                          } ${dark ? 'opacity-80' : 'text-[var(--color-fg3)]'}`}
                        >
                          {t('audience_label')}:
                        </span>
                        <span
                          className={`text-[13.5px] font-medium ${
                            isRtl ? 'font-arabic-body' : 'font-display'
                          }`}
                        >
                          {audience}
                        </span>
                      </li>
                    )}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  {/*
                   * In-page anchor: data-program-id is read by the request
                   * form below via a `prefillProgramId` callback so the
                   * select pre-populates without a route change.
                   */}
                  <a
                    href={`#${requestAnchorId}`}
                    data-corporate-program-id={program.id}
                    data-corporate-program-field={programFieldName}
                    onClick={() => {
                      // Side-channel for the form to read. Using a custom
                      // event keeps this loosely coupled — the form
                      // listens, the card emits.
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(
                          new CustomEvent('kg:corporate:select-program', {
                            detail: { programId: program.id },
                          }),
                        )
                      }
                    }}
                    className={`btn-pill ${
                      dark ? 'btn-pill-accent' : 'btn-pill-primary'
                    }`}
                  >
                    {t('request_cta')}
                    <span aria-hidden>{isRtl ? '←' : '→'}</span>
                  </a>
                </div>
              </motion.li>
            )
          })}
        </motion.ul>
      </div>
    </section>
  )
}
