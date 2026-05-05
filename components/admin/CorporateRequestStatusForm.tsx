'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CORPORATE_REQUEST_STATUSES } from '@/lib/validators/corporate'
import type { CorporateRequest, CorporateRequestStatus } from '@/lib/db/queries'

type Props = {
  request: CorporateRequest
}

export function CorporateRequestStatusForm({ request }: Props) {
  const t = useTranslations('admin.corporate_requests')
  const tStatus = useTranslations('status')
  const tForms = useTranslations('admin.forms')
  const tActions = useTranslations('admin.actions')
  const router = useRouter()

  const [status, setStatus] = useState<CorporateRequestStatus>(request.status)
  const [adminNotes, setAdminNotes] = useState(request.adminNotes ?? '')
  const [saving, setSaving] = useState(false)

  // Map enum → translation key under `status.*` (already wired in StatusBadge).
  const STATUS_LABEL_KEYS: Record<CorporateRequestStatus, string> = {
    NEW: 'new',
    CONTACTED: 'contacted',
    SCHEDULED: 'scheduled',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/corporate/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes.length > 0 ? adminNotes : null,
        }),
      })
      if (!res.ok) {
        toast.error(tActions('error_generic'))
        return
      }
      toast.success(tActions('success_saved'))
      router.refresh()
    } catch (err) {
      console.error('[CorporateRequestStatusForm/save]', err)
      toast.error(tActions('error_generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg3 font-display">
          {t('status_label')}
        </Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as CorporateRequestStatus)}
        >
          <SelectTrigger className="w-full max-w-[260px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CORPORATE_REQUEST_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {tStatus(STATUS_LABEL_KEYS[s])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg3 font-display">
          {t('admin_notes')}
        </Label>
        <Textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={5}
          placeholder={t('admin_notes_placeholder')}
          maxLength={4000}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-full border border-fg1 bg-fg1 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-bg transition-colors hover:bg-accent hover:border-accent hover:text-accent-fg disabled:opacity-60 font-display"
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {saving ? tForms('saving') : t('save_status')}
        </button>
      </div>
    </div>
  )
}
