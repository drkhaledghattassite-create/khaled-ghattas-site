'use client'

import { useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import {
  bookingAdminSchema,
  BOOKING_PRODUCT_TYPES,
  BOOKING_STATES,
  type BookingAdminInput,
} from '@/lib/validators/booking'
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
import { Switch } from '@/components/ui/switch'
import { StorageKeyUploadField } from './StorageKeyUploadField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  createBookingAction,
  deleteBookingAction,
  updateBookingAction,
} from '@/app/[locale]/(admin)/admin/booking/actions'

const DEFAULTS: BookingAdminInput = {
  slug: '',
  productType: 'ONLINE_SESSION',
  titleAr: '',
  titleEn: '',
  descriptionAr: '',
  descriptionEn: '',
  coverImage: '',
  priceUsd: 0,
  currency: 'USD',
  nextCohortDate: '',
  cohortLabelAr: '',
  cohortLabelEn: '',
  durationMinutes: null,
  formatAr: '',
  formatEn: '',
  maxCapacity: 1,
  bookingState: 'CLOSED',
  displayOrder: 0,
  isActive: true,
}

type Props = {
  mode: 'create' | 'edit'
  bookingId?: string
  initialValues?: Partial<BookingAdminInput>
}

export function BookingForm({ mode, bookingId, initialValues }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.booking_booking_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const [pending, startTransition] = useTransition()

  const form = useForm<BookingAdminInput>({
    resolver: zodResolver(bookingAdminSchema) as Resolver<BookingAdminInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  function onSubmit(values: BookingAdminInput) {
    startTransition(async () => {
      const payload: BookingAdminInput = {
        ...values,
        nextCohortDate: values.nextCohortDate
          ? new Date(values.nextCohortDate).toISOString()
          : '',
      }

      const result =
        mode === 'create'
          ? await createBookingAction(payload)
          : await updateBookingAction(bookingId!, payload)

      if (!result.ok) {
        if (result.error === 'capacity_below_commitment') {
          const committed = result.data.currentBookings + result.data.currentHolds
          toast.error(
            tActions('error_capacity_below_commitment_body', {
              committed,
              booked: result.data.currentBookings,
              holds: result.data.currentHolds,
            }),
          )
          return
        }
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(
        mode === 'create'
          ? tActions('success_created')
          : tActions('success_saved'),
      )
      router.push('/admin/booking/bookings')
    })
  }

  function onDelete() {
    if (!bookingId) return
    startTransition(async () => {
      const result = await deleteBookingAction(bookingId)
      if (!result.ok) {
        if (result.error === 'has_orders') {
          toast.error(tActions('error_has_orders'))
        } else {
          toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        }
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/booking/bookings')
    })
  }

  const isEdit = mode === 'edit'

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
        noValidate
      >
        <div className="space-y-6">
          {/* Basics — slug, productType, titles, descriptions, cover */}
          <Section title={t('section_basics')}>
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('slug')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="reconsider-course" />
                  </FormControl>
                  <p className="text-[11px] text-fg3">{t('slug_hint')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="productType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('product_type')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOOKING_PRODUCT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type === 'RECONSIDER_COURSE'
                            ? t('product_type_reconsider')
                            : t('product_type_session')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="titleAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title_ar')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="titleEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="descriptionAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_ar')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} dir="rtl" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptionEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_en')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cover_image')}</FormLabel>
                  <FormControl>
                    <StorageKeyUploadField
                      context="booking-cover"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      placeholder="/bookings/reconsider.jpg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          {/* Pricing */}
          <Section title={t('section_pricing')}>
            <div className="grid gap-4 md:grid-cols-[1fr_140px]">
              <FormField
                control={form.control}
                name="priceUsd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('price_usd')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <p className="text-[11px] text-fg3">
                      {t('price_usd_hint', {
                        dollars: (Number(field.value) / 100).toFixed(2),
                        cents: Number(field.value) || 0,
                      })}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('currency')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Schedule — cohort */}
          <Section title={t('section_schedule')}>
            <FormField
              control={form.control}
              name="nextCohortDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('next_cohort_date')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <p className="text-[11px] text-fg3">
                    {t('next_cohort_date_hint')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cohortLabelAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('cohort_label_ar')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        dir="rtl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cohortLabelEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('cohort_label_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('duration_minutes')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const v = e.target.value
                          field.onChange(v === '' ? null : Number(v))
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="formatAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('format_ar')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        dir="rtl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="formatEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('format_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Capacity & state */}
          <Section title={t('section_capacity')}>
            <FormField
              control={form.control}
              name="maxCapacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('max_capacity')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      readOnly={isEdit}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <p className="text-[11px] text-fg3">
                    {isEdit
                      ? t('max_capacity_edit_hint')
                      : t('max_capacity_hint')}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bookingState"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('booking_state')}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isEdit}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BOOKING_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state === 'OPEN'
                            ? t('booking_state_open')
                            : state === 'CLOSED'
                            ? t('booking_state_closed')
                            : t('booking_state_sold_out')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isEdit && (
                    <p className="text-[11px] text-fg3">
                      {t('booking_state_edit_hint')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>
        </div>

        <aside className="space-y-5 self-start rounded-md border border-border bg-bg-elevated p-5">
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between gap-4">
                <div>
                  <FormLabel>{t('is_active')}</FormLabel>
                  <p className="text-[11px] text-fg3">{t('is_active_hint')}</p>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="displayOrder"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('display_order')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-bg font-display font-semibold transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60"
            >
              {pending
                ? tForms('saving')
                : mode === 'create'
                ? t('save_create')
                : t('save_update')}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-border px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-fg1 font-display font-semibold hover:bg-bg-deep transition-colors"
            >
              {tForms('cancel')}
            </button>
            {mode === 'edit' && bookingId && (
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent font-display font-semibold transition-colors hover:bg-accent hover:text-accent-fg">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t('delete_button')}
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tConfirm('delete_booking_title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tConfirm('delete_booking_body', {
                        title:
                          form.getValues('titleEn') ||
                          form.getValues('titleAr') ||
                          form.getValues('slug'),
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={pending}>
                      {tForms('cancel')}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      disabled={pending}
                      variant="destructive"
                    >
                      {tConfirm('delete_booking_confirm')}
                    </AlertDialogAction>
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

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="space-y-4 rounded-md border border-border bg-bg-elevated p-5">
      <legend className="px-1 text-[11px] uppercase tracking-[0.08em] text-fg3 font-display font-semibold">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}
