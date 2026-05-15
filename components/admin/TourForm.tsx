'use client'

import { useTransition } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import {
  tourAdminSchema,
  TOUR_REGIONS,
  type TourAdminInput,
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
import { StorageKeyUploadField } from './StorageKeyUploadField'
import {
  createTourAction,
  deleteTourAction,
  updateTourAction,
} from '@/app/[locale]/(admin)/admin/booking/actions'

// Sentinel value used by the region <Select> for the "no selection" option.
// Base UI's Select doesn't accept `value=""` for an item, so we use this
// stand-in and translate to/from null at the form boundary.
const REGION_NONE = '__none__'

const REGION_KEY: Record<(typeof TOUR_REGIONS)[number], string> = {
  MENA: 'region_option_mena',
  GCC: 'region_option_gcc',
  EUROPE: 'region_option_europe',
  NORTH_AMERICA: 'region_option_north_america',
  ASIA: 'region_option_asia',
  AFRICA: 'region_option_africa',
  OTHER: 'region_option_other',
}

const DEFAULTS: TourAdminInput = {
  slug: '',
  titleAr: '',
  titleEn: '',
  cityAr: '',
  cityEn: '',
  countryAr: '',
  countryEn: '',
  regionAr: '',
  regionEn: '',
  date: '',
  venueAr: '',
  venueEn: '',
  descriptionAr: '',
  descriptionEn: '',
  externalBookingUrl: '',
  coverImage: '',
  attendedCount: null,
  isActive: true,
  displayOrder: 0,
}

type Props = {
  mode: 'create' | 'edit'
  tourId?: string
  initialValues?: Partial<TourAdminInput>
}

export function TourForm({ mode, tourId, initialValues }: Props) {
  const router = useRouter()
  const t = useTranslations('admin.booking_tour_form')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.booking_actions')
  const tConfirm = useTranslations('admin.booking_confirm')
  const [pending, startTransition] = useTransition()

  const form = useForm<TourAdminInput>({
    resolver: zodResolver(tourAdminSchema) as Resolver<TourAdminInput>,
    defaultValues: { ...DEFAULTS, ...initialValues },
  })

  function onSubmit(values: TourAdminInput) {
    startTransition(async () => {
      // datetime-local emits "YYYY-MM-DDTHH:mm" without seconds or zone.
      // `new Date(...)` interprets that as local time; the server action
      // coerces with `new Date(value)`, which round-trips correctly across
      // the wire because we ship .toISOString() here explicitly.
      const dateIso = values.date ? new Date(values.date).toISOString() : ''
      const payload: TourAdminInput = { ...values, date: dateIso }

      const result =
        mode === 'create'
          ? await createTourAction(payload)
          : await updateTourAction(tourId!, payload)

      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(
        mode === 'create'
          ? tActions('success_created')
          : tActions('success_saved'),
      )
      router.push('/admin/booking/tours')
    })
  }

  function onDelete() {
    if (!tourId) return
    startTransition(async () => {
      const result = await deleteTourAction(tourId)
      if (!result.ok) {
        toast.error(tActions(`error_${result.error}` as 'error_db_failed'))
        return
      }
      toast.success(tActions('success_deleted'))
      router.push('/admin/booking/tours')
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_320px]"
        noValidate
      >
        <div className="space-y-6">
          {/* Basics */}
          <Section title={t('section_basics')}>
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('slug')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="riyadh-2026" />
                  </FormControl>
                  <p className="text-[11px] text-fg3">{t('slug_hint')}</p>
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
          </Section>

          {/* Location */}
          <Section title={t('section_location')}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="cityAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('city_ar')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cityEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('city_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="countryAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('country_ar')}</FormLabel>
                    <FormControl>
                      <Input {...field} dir="rtl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="countryEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('country_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Single region select drives both regionAr + regionEn — admins
                store the same enum value (e.g. "MENA") in both columns so
                the public chip vocabulary stays tight. */}
            <FormField
              control={form.control}
              name="regionEn"
              render={({ field }) => {
                const selected = field.value && field.value.length > 0
                  ? field.value
                  : REGION_NONE
                return (
                  <FormItem>
                    <FormLabel>{t('region_en')}</FormLabel>
                    <Select
                      value={selected}
                      onValueChange={(next) => {
                        const value = next === REGION_NONE ? '' : next
                        field.onChange(value)
                        form.setValue('regionAr', value, { shouldDirty: true })
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={REGION_NONE}>—</SelectItem>
                        {TOUR_REGIONS.map((region) => (
                          <SelectItem key={region} value={region}>
                            {t(REGION_KEY[region] as 'region_option_mena')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )
              }}
            />
          </Section>

          {/* Schedule */}
          <Section title={t('section_schedule')}>
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('date')}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="venueAr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('venue_ar')}</FormLabel>
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
                name="venueEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('venue_en')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Section>

          {/* Extras: description, external URL, display */}
          <Section title={t('section_extras')}>
            <FormField
              control={form.control}
              name="descriptionAr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description_ar')}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      dir="rtl"
                      rows={4}
                    />
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
                    <Textarea
                      {...field}
                      value={field.value ?? ''}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="externalBookingUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('external_booking_url')}</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      {...field}
                      value={field.value ?? ''}
                      placeholder="https://"
                    />
                  </FormControl>
                  <p className="text-[11px] text-fg3">
                    {t('external_booking_url_hint')}
                  </p>
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
            name="coverImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('cover_image')}</FormLabel>
                <FormControl>
                  <StorageKeyUploadField
                    context="tour-cover"
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    placeholder="/tours/riyadh.jpg"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="attendedCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('attended_count')}</FormLabel>
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
            {mode === 'edit' && tourId && (
              <AlertDialog>
                <AlertDialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-full border border-accent/60 px-4 py-2 text-[12px] uppercase tracking-[0.08em] text-accent font-display font-semibold transition-colors hover:bg-accent hover:text-accent-fg">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  {t('delete_button')}
                </AlertDialogTrigger>
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {tConfirm('delete_tour_title')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {tConfirm('delete_tour_body', {
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
                      {tConfirm('delete_tour_confirm')}
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
