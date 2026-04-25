'use client'

import { useState } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { interviewSchema, type InterviewInput } from '@/lib/validators/book'
import { CONTENT_STATUSES } from '@/lib/validators/article'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const DEFAULTS: InterviewInput = {
  slug: '',
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  thumbnailImage: '',
  videoUrl: '',
  source: '',
  sourceAr: '',
  year: null,
  status: 'DRAFT',
  featured: false,
  orderIndex: 0,
}

type Props = {
  initialValues?: Partial<InterviewInput>
  mode: 'create' | 'edit'
  interviewId?: string
}

export function InterviewForm({ initialValues, mode, interviewId }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.interview_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<InterviewInput>({
    resolver: zodResolver(interviewSchema) as Resolver<InterviewInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  async function onSubmit(values: InterviewInput) {
    setSubmitting(true)
    console.log(`[admin] would ${mode} interview`, values)
    await new Promise((r) => setTimeout(r, 300))
    setSubmitting(false)
    toast.success(tActions('success_saved'))
    router.push('/admin/interviews')
  }

  async function onDelete() {
    console.log(`[admin] would delete interview ${interviewId}`)
    toast.success(tActions('success_deleted'))
    router.push('/admin/interviews')
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
            <FormItem><FormLabel>{t('description_ar')}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} dir="rtl" rows={4} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="descriptionEn" render={({ field }) => (
            <FormItem><FormLabel>{t('description_en')}</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} rows={4} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="videoUrl" render={({ field }) => (
            <FormItem><FormLabel>{t('video_url')}</FormLabel><FormControl><Input {...field} placeholder="https://www.youtube.com/watch?v=…" /></FormControl><FormMessage /></FormItem>
          )} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField control={form.control} name="source" render={({ field }) => (
              <FormItem><FormLabel>{t('source')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Al Jazeera" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="sourceAr" render={({ field }) => (
              <FormItem><FormLabel>{t('source_ar')}</FormLabel><FormControl><Input {...field} value={field.value ?? ''} dir="rtl" placeholder="الجزيرة" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        <aside className="space-y-5 self-start rounded-md border border-dashed border-ink/30 bg-cream-soft p-5">
          <FormField control={form.control} name="status" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('status')}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                <SelectContent>{CONTENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FormItem>
          )} />
          <FormField control={form.control} name="thumbnailImage" render={({ field }) => (
            <FormItem><FormLabel>{t('thumbnail_image')}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="year" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('year')}</FormLabel>
              <FormControl>
                <Input type="number" value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="featured" render={({ field }) => (
            <FormItem className="flex items-center gap-2 space-y-0">
              <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              <FormLabel className="!mt-0">{t('featured')}</FormLabel>
            </FormItem>
          )} />
          <FormField control={form.control} name="orderIndex" render={({ field }) => (
            <FormItem>
              <FormLabel>{t('order_index')}</FormLabel>
              <FormControl><Input type="number" min={0} {...field} onChange={(e) => field.onChange(Number(e.target.value))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex flex-col gap-2 pt-2">
            <button type="submit" disabled={submitting} className="font-label rounded-full border border-dashed border-ink bg-ink px-4 py-2 text-[12px] text-cream-soft hover:bg-transparent hover:text-ink disabled:opacity-60" style={{ letterSpacing: '0.08em' }}>
              {submitting ? tForms('saving') : tForms('save')}
            </button>
            <button type="button" onClick={() => router.push('/admin/interviews')} className="font-label rounded-full border border-dashed border-ink/40 px-4 py-2 text-[12px] text-ink hover:bg-cream-warm/40" style={{ letterSpacing: '0.08em' }}>
              {tForms('cancel')}
            </button>
            {mode === 'edit' && (
              <AlertDialog>
                <AlertDialogTrigger className="font-label inline-flex items-center justify-center gap-1.5 rounded-full border border-dashed border-amber/60 px-4 py-2 text-[12px] text-amber hover:bg-amber hover:text-cream-soft" style={{ letterSpacing: '0.08em' }}>
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
