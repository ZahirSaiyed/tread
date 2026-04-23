'use client'

import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import type { JobPhoto } from '@/types/domain'
import type { JobStatus } from '@/types/enums'
import type { PhotoType } from '@/types/enums'

const TYPES: PhotoType[] = ['before', 'during', 'after']

const LABELS: Record<PhotoType, string> = {
  before: 'Before',
  during: 'During',
  after: 'After',
}

const BUCKET = 'job-photos'

function objectPathForDelete(photo: JobPhoto): string | null {
  if (photo.storage_path && !photo.storage_path.startsWith('http')) return photo.storage_path
  const u = photo.storage_url
  if (!u.startsWith('http://') && !u.startsWith('https://')) return u
  return null
}

export interface JobPhotoSlotsProps {
  jobId: string
  tenantId: string
  jobStatus: JobStatus
  photos: JobPhoto[]
  onUpdated: () => void
}

export function JobPhotoSlots({ jobId, tenantId, jobStatus, photos, onUpdated }: JobPhotoSlotsProps) {
  const [busyType, setBusyType] = useState<PhotoType | null>(null)
  const inputs = useRef<Partial<Record<PhotoType, HTMLInputElement | null>>>({})

  const terminal = jobStatus === 'complete' || jobStatus === 'cancelled'
  const allowCapture =
    !terminal && (jobStatus === 'assigned' || jobStatus === 'en_route' || jobStatus === 'on_site')

  const photoByType = (t: PhotoType) => photos.find((p) => p.photo_type === t)

  const onPick = async (photoType: PhotoType, file: File | null) => {
    if (!file || !allowCapture) return
    const supabase = createClient()
    setBusyType(photoType)
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser()
      if (authErr || !user) {
        toast.error('Not signed in')
        return
      }

      const existing = photoByType(photoType)
      const oldPath = existing ? objectPathForDelete(existing) : null

      if (existing?.id) {
        const { error: delRow } = await supabase.from('job_photos').delete().eq('id', existing.id)
        if (delRow) {
          toast.error(delRow.message)
          return
        }
      }
      if (oldPath) {
        const { error: rmErr } = await supabase.storage.from(BUCKET).remove([oldPath])
        if (rmErr) {
          toast.error(rmErr.message)
          return
        }
      }

      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      const path = `${tenantId}/${jobId}/${photoType}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true,
        contentType: file.type || 'image/jpeg',
      })
      if (upErr) {
        toast.error(upErr.message)
        return
      }

      const { error: insErr } = await supabase.from('job_photos').insert({
        job_id: jobId,
        tenant_id: tenantId,
        photo_type: photoType,
        storage_url: path,
        uploaded_by: user.id,
      })
      if (insErr) {
        toast.error(insErr.message)
        await supabase.storage.from(BUCKET).remove([path])
        return
      }

      toast.success(`${LABELS[photoType]} photo saved`)
      onUpdated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Upload failed'
      toast.error(msg)
    } finally {
      setBusyType(null)
      const el = inputs.current[photoType]
      if (el) el.value = ''
    }
  }

  if (!allowCapture && !terminal) {
    return null
  }

  return (
    <section className="mt-6 rounded-2xl border border-trs-slate bg-trs-charcoal p-4">
      <h3 className="font-display text-base font-semibold text-white">Completion photos</h3>
      <p className="text-sm text-[#8E8E93] mt-1">
        {terminal
          ? 'This job is closed — photos are locked.'
          : 'Before, during, and after are required before you can mark the job complete.'}
      </p>
      <ul className="mt-4 space-y-4">
        {TYPES.map((type) => {
          const p = photoByType(type)
          const busy = busyType === type
          return (
            <li key={type} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-medium text-white w-16 shrink-0">{LABELS[type]}</span>
                {p ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.storage_url}
                    alt={`${LABELS[type]} evidence`}
                    className="h-16 w-16 rounded-lg object-cover border border-trs-slate shrink-0"
                  />
                ) : (
                  <span className="text-xs text-[#8E8E93]">Not uploaded</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={(el) => {
                    inputs.current[type] = el
                  }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  disabled={!allowCapture || busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    void onPick(type, f)
                  }}
                />
                <button
                  type="button"
                  disabled={!allowCapture || busy}
                  onClick={() => inputs.current[type]?.click()}
                  className="min-h-touch rounded-xl bg-trs-slate px-4 text-sm font-medium text-white hover:bg-trs-gold/20 hover:text-trs-gold transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  {busy ? 'Uploading…' : p ? 'Replace' : 'Add photo'}
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
