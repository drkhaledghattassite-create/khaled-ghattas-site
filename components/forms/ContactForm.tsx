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

export function ContactForm() {
  const t = useTranslations('contact.form')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ContactInput>({
    resolver: zodResolver(contactSchema),
    defaultValues: { name: '', email: '', subject: '', message: '' },
  })

  async function onSubmit(values: ContactInput) {
    setSubmitting(true)
    // TODO: wire to /api/contact when backend is live
    await new Promise((r) => setTimeout(r, 400))
    setSubmitting(false)
    toast.success(t('submitted'))
    form.reset()
    return values
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
              <FormLabel className="font-label text-[12px] text-ink-muted">
                {t('name')}
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('name_placeholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-label text-[12px] text-ink-muted">
                {t('email')}
              </FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder={t('email_placeholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-label text-[12px] text-ink-muted">
                {t('subject')}
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder={t('subject_placeholder')} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-label text-[12px] text-ink-muted">
                {t('message')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={6}
                  placeholder={t('message_placeholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <button
            type="submit"
            disabled={submitting}
            className="font-label inline-flex items-center gap-2 rounded-full border border-dashed border-ink bg-ink px-5 py-2.5 text-[12px] text-cream-soft transition-colors duration-300 hover:bg-transparent hover:text-ink disabled:opacity-60"
            style={{ letterSpacing: '0.08em' }}
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-cream-soft" />
            {submitting ? t('submitting') : t('submit')}
          </button>
        </div>
      </form>
    </Form>
  )
}
