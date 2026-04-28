'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { contactSchema, type ContactInput } from '@/lib/validators/contact'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const inputClass =
  'h-12 rounded-md border border-border bg-bg-elevated px-3 text-[16px] text-fg1 placeholder:text-fg3/70 focus-visible:border-accent focus-visible:ring-0'

const textareaClass =
  'rounded-md border border-border bg-bg-elevated px-3 py-3 text-[16px] text-fg1 placeholder:text-fg3/70 focus-visible:border-accent focus-visible:ring-0'

export function ContactForm() {
  const t = useTranslations('contact.form')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  })

  async function onSubmit(values: ContactInput) {
    setSubmitting(true)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      if (res.ok) {
        toast.success(t('submitted'))
        form.reset()
        return
      }
      if (res.status === 429) {
        toast.error(t('error_rate_limited'))
        return
      }
      if (res.status === 400) {
        toast.error(t('error_validation'))
        return
      }
      toast.error(t('error_generic'))
    } catch (err) {
      console.error('[ContactForm]', err)
      toast.error(t('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="section-eyebrow !text-fg3">
                {t('name')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('name_placeholder')}
                  className={inputClass}
                />
              </FormControl>
              <FormMessage className="text-accent" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="section-eyebrow !text-fg3">
                {t('email')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder={t('email_placeholder')}
                  className={inputClass}
                />
              </FormControl>
              <FormMessage className="text-accent" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="section-eyebrow !text-fg3">
                {t('subject')}
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={t('subject_placeholder')}
                  className={inputClass}
                />
              </FormControl>
              <FormMessage className="text-accent" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="section-eyebrow !text-fg3">
                {t('message')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder={t('message_placeholder')}
                  className={textareaClass}
                />
              </FormControl>
              <FormMessage className="text-accent" />
            </FormItem>
          )}
        />

        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-pill btn-pill-primary disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </Form>
  )
}
