'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { eventSchema, type EventInput } from '@/lib/validators/book'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const EVENT_STATUSES = ['UPCOMING', 'PAST', 'CANCELLED'] as const

const DEFAULTS: EventInput = {
  slug: '',
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  locationAr: '',
  locationEn: '',
  coverImage: '',
  startDate: new Date(),
  endDate: null,
  registrationUrl: '',
  status: 'UPCOMING',
  orderIndex: 0,
}

function toLocalInput(d: Date | null | undefined): string {
  if (!d) return ''
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

type Props = {
  initialValues?: Partial<EventInput>
  mode: 'create' | 'edit'
  eventId?: string
}

export function EventForm({ initialValues, mode, eventId }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.event_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema) as Resolver<EventInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  async function onSubmit(values: EventInput) {
    setSubmitting(true)
    try {
      const url =
        mode === 'create'
          ? '/api/admin/events'
          : `/api/admin/events/${eventId}`
      const method = mode === 'create' ? 'POST' : 'PATCH'
      const body = {
        ...values,
        startDate: values.startDate.toISOString(),
        endDate: values.endDate ? values.endDate.toISOString() : null,
      }
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      router.push('/admin/events')
    } catch (err) {
      console.error('[EventForm]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  async function onDelete() {
    if (!eventId) return
    try {
      const res = await fetch(`/api/admin/events/${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/events')
    } catch (err) {
      console.error('[EventForm/delete]', err)
      toast.error(tActions('error_generic'))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
        <div className="space-y-5">
          <FormField control={form.control} name="slug" render={({ field }) => (
            <FormItem><FormLabel>{t('slug')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="titleAr" render={({ field }) => (
              <FormItem><FormLabel>{t('title_ar')}</FormLabel><FormControl><Input {...field} dir="rtl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="titleEn" render={({ field }) => (
              <FormItem><FormLabel>{t('title_en')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <FormField control={form.control} name="descriptionAr" render={({ field }) => (
            <FormItem><FormLabel>{t('description_ar')}</FormLabel><FormControl><Textarea {...field} dir="rtl" rows={4} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="descriptionEn" render={({ field }) => (
            <FormItem><FormLabel>{t('description_en')}</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="locationAr" render={({ field }) => (
              <FormItem><FormLabel>{t('location_ar')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} dir="rtl" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="locationEn" render={({ field }) => (
              <FormItem><FormLabel>{t('location_en')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('start_date')}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(field.value)}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : new Date())}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t('end_date')}</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    value={toLocalInput(field.value)}
                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <FormField control={form.control} name="registrationUrl" render={({ field }) => (
            <FormItem><FormLabel>{t('registration_url')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://…" /></FormControl><FormMessage /></FormItem>
          )} />
        </div>

        <aside className="space-y-5 self-start rounded-md border border-border bg-bg-elevated p-5">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('status')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{EVENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="coverImage" render={({ field }) => (
            <FormItem><FormLabel>{t('cover_image')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="orderIndex" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order_index')}</FormLabel>
              <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={submitting} className="rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60">
              {submitting ? tForms('saving') : tForms('save')}
            </button>
            <button type="button" onClick={() => router.push('/admin/events')} className="rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors">
              {tForms('cancel')}
            </button>
            {mode === 'edit' && (
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent font-display font-semibold transition-colors hover:bg-accent hover:text-accent-fg">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {tForms('delete')}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{tActions('confirm_delete')}</AlertDialogTitle>
                    <AlertDialogDescription>{tActions('no_undo')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tForms('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>{tForms('delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </aside>
      </form>
    </Form>
  )
}
